#!/usr/bin/env node
/**
 * loop-state — state, dedupe, and delta engine for looping skills.
 *
 * Zero dependencies. Node 18+. Every command prints JSON to stdout so a skill
 * body can consume it directly.
 *
 * State layout (per project, per skill):
 *   .claude/skill-state/<skill>/
 *     ├── state.json      run counter, halt flag, no-change streak
 *     ├── seen.json       dedupe ledger (content hashes -> first-seen date)
 *     ├── latest.json     most recent artifact
 *     └── history/        timestamped artifacts + deltas
 *
 * Override the root with --state-dir or $SKILL_STATE_DIR.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const SEVERITY_ORDER = ["info", "low", "medium", "high", "critical"];

// ---------------------------------------------------------------------------
// argv
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=");
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[key] = argv[++i];
      else flags[key] = true;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const command = positional[0];

// ---------------------------------------------------------------------------
// paths + io
// ---------------------------------------------------------------------------

function stateRoot() {
  return resolve(flags["state-dir"] || process.env.SKILL_STATE_DIR || ".claude/skill-state");
}

function skillDir(skill) {
  if (!skill) fail("missing <skill> argument");
  return join(stateRoot(), skill);
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`cannot parse ${path}: ${err.message}`);
  }
}

function writeJson(path, data) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function fail(message) {
  process.stderr.write(`loop-state: ${message}\n`);
  process.exit(1);
}

function emit(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

/** Deterministic stringify — key order must never create a phantom delta. */
function stable(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
}

function hash(value) {
  const input = typeof value === "string" ? value : stable(value);
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState(skill) {
  return {
    skill,
    runs: 0,
    firstRun: null,
    lastRun: null,
    consecutiveNoChange: 0,
    halted: false,
    haltReason: null,
    lastArtifactHash: null,
  };
}

function loadState(skill) {
  return readJson(join(skillDir(skill), "state.json"), defaultState(skill));
}

function saveState(skill, state) {
  writeJson(join(skillDir(skill), "state.json"), state);
}

// ---------------------------------------------------------------------------
// pursuit queue — the working-loop backbone
// ---------------------------------------------------------------------------
//
// A Pursuit loop works a backlog to a *conclusion*, never a silent drop-off.
// Every task lives in exactly one of four states, and the only two ways a loop
// may go quiet are CONVERGED (queue empty) and INTERRUPTED (a stop condition
// fired with work remaining — reported loudly). A task is never abandoned: it
// is pending, in-progress, done, or blocked. `blocked` is a *reported* outcome
// with a reason, not a disappearance.

const TASK_STATES = ["pending", "in-progress", "done", "blocked"];
const DEFAULT_MAX_ATTEMPTS = 3;

function queuePath(skill) {
  return join(skillDir(skill), "queue.json");
}

function defaultQueue(skill) {
  return { skill, tasks: {} };
}

function loadQueue(skill) {
  return readJson(queuePath(skill), defaultQueue(skill));
}

function saveQueue(skill, queue) {
  writeJson(queuePath(skill), queue);
}

/** Counts by status, plus the derived remaining/resolved totals. */
function queueTally(queue) {
  const tally = { pending: 0, "in-progress": 0, done: 0, blocked: 0 };
  for (const task of Object.values(queue.tasks)) {
    tally[task.status] = (tally[task.status] ?? 0) + 1;
  }
  return {
    ...tally,
    total: Object.keys(queue.tasks).length,
    remaining: tally.pending + tally["in-progress"],
    resolved: tally.done + tally.blocked,
  };
}

/**
 * Terminal classification for a Pursuit loop. This is the whole point of the
 * hardening: a working loop ends in a named conclusion, not an unexplained
 * silence.
 *   converged   — remaining == 0. The good ending. Report what completed.
 *   interrupted — a stop condition fired with work still remaining. Report
 *                 LOUDLY: where it stopped, how much is left, why.
 *   working     — neither; keep going.
 */
function classifyTerminal(tally, interrupted) {
  if (tally.remaining === 0) return "converged";
  if (interrupted) return "interrupted";
  return "working";
}

// ---------------------------------------------------------------------------
// artifact normalisation
// ---------------------------------------------------------------------------

/**
 * Fields that legitimately change every run and must never count as a delta.
 * Extend per-invocation with --ignore=field1,field2.
 */
function volatileFields() {
  const extra = typeof flags.ignore === "string" ? flags.ignore.split(",").map((s) => s.trim()) : [];
  return new Set(["generated", "generatedAt", "timestamp", "durationMs", "elapsed", ...extra]);
}

function stripVolatile(obj, volatile) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => stripVolatile(v, volatile));
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (volatile.has(key)) continue;
    out[key] = stripVolatile(value, volatile);
  }
  return out;
}

function loadArtifact(path) {
  if (!path) fail("missing <artifact.json> argument");
  if (!existsSync(path)) fail(`artifact not found: ${path}`);
  const artifact = readJson(resolve(path));
  if (!Array.isArray(artifact.items)) {
    fail("artifact must contain an `items` array — see LoopContract.md");
  }
  return artifact;
}

function indexItems(items) {
  const map = new Map();
  for (const item of items) {
    // `id` is preferred; fall back to a content hash so unkeyed artifacts still diff.
    const key = item.id ?? hash(item);
    map.set(String(key), item);
  }
  return map;
}

function diffItems(previous, current, volatile) {
  const before = indexItems(previous?.items ?? []);
  const after = indexItems(current.items ?? []);

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of after) {
    if (!before.has(id)) {
      added.push(item);
      continue;
    }
    const prevClean = stripVolatile(before.get(id), volatile);
    const nextClean = stripVolatile(item, volatile);
    if (stable(prevClean) === stable(nextClean)) continue;

    const changes = {};
    const keys = new Set([...Object.keys(prevClean), ...Object.keys(nextClean)]);
    for (const key of keys) {
      const from = prevClean[key];
      const to = nextClean[key];
      if (stable(from) !== stable(to)) changes[key] = { from: from ?? null, to: to ?? null };
    }
    changed.push({ id, item, changes });
  }

  for (const [id, item] of before) {
    if (!after.has(id)) removed.push(item);
  }

  return { added, removed, changed };
}

function highestSeverity(items) {
  let best = null;
  let bestRank = -1;
  for (const item of items) {
    const severity = String(item?.severity ?? item?.item?.severity ?? "").toLowerCase();
    const rank = SEVERITY_ORDER.indexOf(severity);
    if (rank > bestRank) {
      bestRank = rank;
      best = severity;
    }
  }
  return best || null;
}

/** Back off when nothing is moving, so a quiet loop gets quieter. */
function suggestBackoff(consecutiveNoChange) {
  if (consecutiveNoChange >= 7) return { multiplier: 4, note: "7+ quiet runs — widen the interval 4x" };
  if (consecutiveNoChange >= 3) return { multiplier: 2, note: "3+ quiet runs — widen the interval 2x" };
  return { multiplier: 1, note: "active — keep the configured interval" };
}

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

const commands = {
  init(skill) {
    const dir = skillDir(skill);
    mkdirSync(join(dir, "history"), { recursive: true });
    const statePath = join(dir, "state.json");
    if (!existsSync(statePath)) saveState(skill, defaultState(skill));
    if (!existsSync(join(dir, "seen.json"))) writeJson(join(dir, "seen.json"), {});
    emit({ ok: true, skill, stateDir: dir });
  },

  status(skill) {
    const state = loadState(skill);
    emit({ ...state, stateDir: skillDir(skill), backoff: suggestBackoff(state.consecutiveNoChange) });
  },

  /**
   * Stop-condition check. Exit 3 means "do not run" — a CI step or loop body
   * should treat that as a clean stop, not a failure.
   */
  gate(skill) {
    const state = loadState(skill);
    const maxIterations = Number(flags["max-iterations"] ?? 0);
    const killFile = flags["kill-file"] || join(skillDir(skill), "STOP");

    const reasons = [];
    if (state.halted) reasons.push(`halted: ${state.haltReason ?? "manually halted"}`);
    if (existsSync(killFile)) reasons.push(`kill-switch present: ${killFile}`);
    if (maxIterations > 0 && state.runs >= maxIterations) {
      reasons.push(`max-iterations reached (${state.runs}/${maxIterations})`);
    }

    // If this skill runs a Pursuit queue, fold its terminal state into the gate
    // so the caller gets a single, unambiguous stop signal with a *class*.
    const hasQueue = existsSync(queuePath(skill));
    let tally = null;
    let terminal = null;
    if (hasQueue) {
      tally = queueTally(loadQueue(skill));
      const stopFired = reasons.length > 0;
      terminal = classifyTerminal(tally, stopFired);
      if (terminal === "converged") {
        reasons.push(`converged — queue empty (${tally.done} done, ${tally.blocked} blocked)`);
      } else if (terminal === "interrupted") {
        reasons.push(`interrupted — ${tally.remaining} task(s) still remaining`);
      }
    } else if (reasons.length > 0) {
      terminal = "interrupted";
    }

    const proceed = reasons.length === 0;
    emit({
      proceed,
      skill,
      runs: state.runs,
      reasons,
      terminal, // converged | interrupted | working | null
      ...(hasQueue ? { queue: tally } : {}),
      backoff: suggestBackoff(state.consecutiveNoChange),
    });
    // Exit 3 is a CLEAN stop — but the caller must branch on `terminal`:
    // converged = celebrate and report what finished; interrupted = report
    // LOUDLY what remains. Never treat exit 3 as "silently done."
    if (!proceed) process.exit(3);
  },

  hash(...parts) {
    emit({ hash: hash(parts.join(" ")) });
  },

  /**
   * Dedupe filter. Prints only the keys this skill has NOT seen before.
   * Read-only — call `remember` once the new items are actually delivered.
   */
  seen(skill, ...keys) {
    const ledger = readJson(join(skillDir(skill), "seen.json"), {});
    const fresh = [];
    const known = [];
    for (const key of keys) {
      const digest = hash(key);
      if (ledger[digest]) known.push({ key, hash: digest, firstSeen: ledger[digest].firstSeen });
      else fresh.push({ key, hash: digest });
    }
    emit({ skill, fresh, known, freshCount: fresh.length, knownCount: known.length });
  },

  remember(skill, ...keys) {
    const path = join(skillDir(skill), "seen.json");
    const ledger = readJson(path, {});
    const recorded = [];
    for (const key of keys) {
      const digest = hash(key);
      if (!ledger[digest]) {
        ledger[digest] = { key, firstSeen: nowIso() };
        recorded.push({ key, hash: digest });
      }
    }
    writeJson(path, ledger);
    emit({ skill, recorded, ledgerSize: Object.keys(ledger).length });
  },

  // -------------------------------------------------------------------------
  // Pursuit commands — work a backlog to a conclusion
  // -------------------------------------------------------------------------

  /** Add tasks to the queue as `pending`. Idempotent — existing tasks are untouched. */
  enqueue(skill, ...ids) {
    if (ids.length === 0) fail("enqueue needs at least one task id");
    const priority = Number(flags.priority ?? 0);
    const queue = loadQueue(skill);
    const added = [];
    const existing = [];
    for (const id of ids) {
      if (queue.tasks[id]) {
        existing.push(id);
        continue;
      }
      queue.tasks[id] = {
        id,
        status: "pending",
        priority,
        attempts: 0,
        firstSeen: nowIso(),
        lastAttempt: null,
        resolvedAt: null,
        note: null,
      };
      added.push(id);
    }
    saveQueue(skill, queue);
    emit({ skill, added, existing, queue: queueTally(queue) });
  },

  /**
   * Claim the next task to work. Single-worker semantics: an unresolved
   * in-progress task is re-served (attempts++) before any new pending task is
   * picked — that re-serve IS the stall guard. Once a task hits --max-attempts
   * without a complete/block, it is auto-blocked with a stall reason so the
   * queue can never spin forever on one item. Every claim strictly moves the
   * queue toward resolution.
   */
  claim(skill) {
    const maxAttempts = Number(flags["max-attempts"] ?? DEFAULT_MAX_ATTEMPTS);
    const queue = loadQueue(skill);
    const tasks = Object.values(queue.tasks);

    // 1. Re-serve any in-progress task first — never run two at once.
    const inProgress = tasks.find((t) => t.status === "in-progress");
    if (inProgress) {
      if (inProgress.attempts >= maxAttempts) {
        inProgress.status = "blocked";
        inProgress.resolvedAt = nowIso();
        inProgress.note = `stalled: ${inProgress.attempts} attempts without completion`;
        saveQueue(skill, queue);
        emit({
          skill,
          stalled: inProgress.id,
          reason: inProgress.note,
          hint: "escalate this — it did not converge on its own",
          queue: queueTally(queue),
        });
        return;
      }
      inProgress.attempts += 1;
      inProgress.lastAttempt = nowIso();
      saveQueue(skill, queue);
      emit({ skill, task: inProgress, reclaim: true, queue: queueTally(queue) });
      return;
    }

    // 2. Otherwise pick the highest-priority pending task (tiebreak: oldest).
    const pending = tasks
      .filter((t) => t.status === "pending")
      .sort((a, b) => b.priority - a.priority || a.firstSeen.localeCompare(b.firstSeen));
    if (pending.length === 0) {
      const tally = queueTally(queue);
      emit({ skill, empty: true, terminal: classifyTerminal(tally, false), queue: tally });
      return;
    }
    const task = pending[0];
    task.status = "in-progress";
    task.attempts += 1;
    task.lastAttempt = nowIso();
    saveQueue(skill, queue);
    emit({ skill, task, reclaim: false, queue: queueTally(queue) });
  },

  /** Mark a task done — a *verified* conclusion, not "the skill ran once". */
  complete(skill, id) {
    if (!id) fail("complete needs a task id");
    const queue = loadQueue(skill);
    const task = queue.tasks[id];
    if (!task) fail(`unknown task: ${id}`);
    task.status = "done";
    task.resolvedAt = nowIso();
    saveQueue(skill, queue);
    emit({ skill, completed: id, queue: queueTally(queue) });
  },

  /** Mark a task blocked WITH a reason — a reported outcome, never a silent drop. */
  block(skill, id, ...reason) {
    if (!id) fail("block needs a task id");
    if (reason.length === 0) fail("block needs a reason — a blocker is reported, not hidden");
    const queue = loadQueue(skill);
    const task = queue.tasks[id];
    if (!task) fail(`unknown task: ${id}`);
    task.status = "blocked";
    task.resolvedAt = nowIso();
    task.note = reason.join(" ");
    saveQueue(skill, queue);
    emit({ skill, blocked: id, reason: task.note, queue: queueTally(queue) });
  },

  /**
   * The terminal report for a Pursuit loop. Pure read. Classifies the queue as
   * converged / interrupted / working and lists every blocked task loudly, so a
   * loop can never end in unexplained silence.
   */
  progress(skill) {
    if (!existsSync(queuePath(skill))) {
      return emit({ skill, terminal: "converged", queue: queueTally(defaultQueue(skill)), note: "no queue" });
    }
    const state = loadState(skill);
    const queue = loadQueue(skill);
    const tally = queueTally(queue);
    const stopFired = state.halted || existsSync(flags["kill-file"] || join(skillDir(skill), "STOP"));
    const blocked = Object.values(queue.tasks)
      .filter((t) => t.status === "blocked")
      .map((t) => ({ id: t.id, reason: t.note }));
    const remainingIds = Object.values(queue.tasks)
      .filter((t) => t.status === "pending" || t.status === "in-progress")
      .map((t) => ({ id: t.id, status: t.status }));

    emit({
      skill,
      terminal: classifyTerminal(tally, stopFired),
      queue: tally,
      blocked, // report these loudly — they need a human
      remaining: remainingIds,
    });
  },

  /**
   * The core of a Monitor loop: diff this run's artifact against the last,
   * archive both, and report what actually moved.
   */
  record(skill, artifactPath) {
    const dir = skillDir(skill);
    mkdirSync(join(dir, "history"), { recursive: true });

    const volatile = volatileFields();
    const artifact = loadArtifact(artifactPath);
    const previous = readJson(join(dir, "latest.json"), null);
    const state = loadState(skill);

    const { added, removed, changed } = diffItems(previous, artifact, volatile);
    const artifactHash = hash(stripVolatile(artifact, volatile));
    const firstRun = previous === null;
    const changedAtAll = firstRun || added.length > 0 || removed.length > 0 || changed.length > 0;

    const escalateOn = typeof flags["escalate-on"] === "string"
      ? flags["escalate-on"].split(",").map((s) => s.trim().toLowerCase())
      : ["critical", "high"];
    const topSeverity = highestSeverity([...added, ...changed]);
    const escalate = topSeverity && escalateOn.includes(topSeverity) ? topSeverity : null;

    state.runs += 1;
    state.firstRun = state.firstRun ?? nowIso();
    state.lastRun = nowIso();
    state.consecutiveNoChange = changedAtAll ? 0 : state.consecutiveNoChange + 1;
    state.lastArtifactHash = artifactHash;

    const stamp = state.lastRun.replace(/[:.]/g, "-");
    const delta = {
      skill,
      run: state.runs,
      recordedAt: state.lastRun,
      firstRun,
      changed: changedAtAll,
      counts: { added: added.length, removed: removed.length, changed: changed.length },
      added,
      removed,
      changedItems: changed,
      escalate,
      topSeverity,
      consecutiveNoChange: state.consecutiveNoChange,
      backoff: suggestBackoff(state.consecutiveNoChange),
      artifactHash,
    };

    writeJson(join(dir, "history", `${stamp}.artifact.json`), artifact);
    writeJson(join(dir, "history", `${stamp}.delta.json`), delta);
    writeJson(join(dir, "latest.json"), artifact);
    saveState(skill, state);

    emit({ ...delta, historyDir: join(dir, "history") });
  },

  /** Roll recent runs up into one summary so daily loops don't become 30 unread reports. */
  digest(skill, count = "10") {
    const dir = join(skillDir(skill), "history");
    if (!existsSync(dir)) return emit({ skill, runs: [], note: "no history yet" });

    const files = readdirSync(dir).filter((f) => f.endsWith(".delta.json")).sort().slice(-Number(count));
    const runs = files.map((file) => {
      const d = readJson(join(dir, file));
      return {
        run: d.run,
        at: d.recordedAt,
        changed: d.changed,
        counts: d.counts,
        escalate: d.escalate,
      };
    });

    const totals = runs.reduce(
      (acc, r) => ({
        added: acc.added + (r.counts?.added ?? 0),
        removed: acc.removed + (r.counts?.removed ?? 0),
        changed: acc.changed + (r.counts?.changed ?? 0),
      }),
      { added: 0, removed: 0, changed: 0 },
    );

    emit({
      skill,
      window: runs.length,
      quietRuns: runs.filter((r) => !r.changed).length,
      escalations: runs.filter((r) => r.escalate).length,
      totals,
      runs,
    });
  },

  halt(skill, ...reason) {
    const state = loadState(skill);
    state.halted = true;
    state.haltReason = reason.join(" ") || "manually halted";
    saveState(skill, state);
    emit({ ok: true, skill, halted: true, reason: state.haltReason });
  },

  resume(skill) {
    const state = loadState(skill);
    state.halted = false;
    state.haltReason = null;
    saveState(skill, state);
    emit({ ok: true, skill, halted: false });
  },

  reset(skill) {
    if (!flags.confirm) fail(`refusing to wipe state for "${skill}" without --confirm`);
    const dir = skillDir(skill);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    emit({ ok: true, skill, reset: true, stateDir: dir });
  },

  help() {
    process.stdout.write(`loop-state — state, dedupe, and delta engine for looping skills

Usage: node loop-state.mjs <command> [args] [flags]

Monitor / Producer commands
  init <skill>                       create the state directory
  status <skill>                     run count, halt flag, backoff suggestion
  gate <skill>                       stop-condition check (exit 3 = do not run)
  hash <text...>                     stable content hash
  seen <skill> <key...>              filter keys down to the unseen ones
  remember <skill> <key...>          add keys to the dedupe ledger
  record <skill> <artifact.json>     diff vs last run, archive, report the delta
  digest <skill> [n=10]              summarise the last n runs

Pursuit commands (work a backlog to a conclusion)
  enqueue <skill> <id...>            add tasks as pending (idempotent)
  claim <skill>                      claim the next task (re-serves in-progress; auto-blocks a stalled task)
  complete <skill> <id>              mark a task done (verified)
  block <skill> <id> <reason...>     mark a task blocked, WITH a reason
  progress <skill>                   terminal report: converged | interrupted | working + blocked list

Lifecycle
  halt <skill> [reason...]           stop the loop
  resume <skill>                     clear the halt flag
  reset <skill> --confirm            wipe all state for a skill

Flags
  --state-dir <path>       state root (default .claude/skill-state, or $SKILL_STATE_DIR)
  --max-iterations <n>     gate: halt once this many runs have completed
  --kill-file <path>       gate: halt if this file exists (default <stateDir>/STOP)
  --escalate-on a,b        record: severities that trigger escalation (default critical,high)
  --ignore f1,f2           record: extra fields to treat as volatile
  --priority <n>           enqueue: task priority (higher = claimed first, default 0)
  --max-attempts <n>       claim: auto-block a task after this many claims (default 3)
  --confirm                reset: required acknowledgement
`);
  },
};

// ---------------------------------------------------------------------------

if (!command || command === "help" || flags.help) {
  commands.help();
  process.exit(0);
}

const handler = commands[command];
if (!handler) fail(`unknown command "${command}" — try: node loop-state.mjs help`);

handler(...positional.slice(1));
