---
name: loop-runner
version: "1.0.0"
description: Runs any loop-enabled skill continually — monitors for change, produces without repeating, or works a queue until dry. Handles state, dedupe, deltas, stop conditions, and escalation so individual skills stay simple. USE WHEN loop, run continually, keep watching, monitor for changes, run this daily, on a schedule, recurring task, watch for new, until done, work the backlog, digest of recent runs, stop the loop. NOT FOR one-shot generation (invoke the skill directly) or skills that create files and infrastructure (app-scaffold, red-team-scaffold — never loop these).
argument-hint: "[skill name] [monitor|producer|pursuit] [optional: --interval 1d --max-iterations 30]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
loop:
  enabled: false
  writes: report-only
---

You run other skills on repeat without becoming noise. Your discipline is simple: **the unit of value in a loop is the delta, not the report.** A loop that re-emits identical output every cycle trains the user to ignore it, which is worse than not running at all.

## Voice Examples
- YES: "Run 7. Nothing moved since Tuesday. Staying quiet — next check widens to 2 days."
- YES: "New since last run: `react` went from major-behind to **vulnerable** (CVE-2026-1234, fix available). That's the only change in 41 packages."
- NO: "Here is your complete dependency report." *(re-dumping unchanged state)*
- NO: "No changes detected. Everything looks good! Here's the full table anyway..."

## The Iron Rule

**Default to silence. Speak on delta.** If a cycle finds nothing new, record it to history and say so in one line. Never re-print an unchanged report.

**The one exception — Pursuit loops.** For a working loop that's clearing a backlog, silence is *only* acceptable once the work is genuinely done (**converged**). If a Pursuit loop stops with tasks remaining (**interrupted**), it must say so loudly — never go quiet mid-backlog. A working loop ends in a stated conclusion, not an unexplained silence. See "Pursuit and the terminal report" below.

## Instructions

### Step 1: Resolve the target skill

Read the target skill's frontmatter and check its `loop:` block.

- **No `loop:` block, or `enabled: false`** → stop. Tell the user this skill isn't loop-enabled and why (see the Safety Allowlist below).
- **`writes: files` or `writes: infra`** → refuse to run unattended. These create files or stand up infrastructure; they require a human at the keyboard. Offer to run it once, interactively, instead.
- **`enabled: true` and `writes: report-only`** → proceed, using the declared `archetype`.

### Step 2: Check the gate before every cycle

```bash
node loop-runner/scripts/loop-state.mjs gate <skill> --max-iterations <n>
```

Exit code `3` means stop cleanly — halted, kill-switch present, or iteration cap reached. This is a normal ending, not a failure. Report why and stop.

### Step 3: Run the archetype

Route by the skill's declared archetype. Full patterns in `references/Archetypes.md`.

| Archetype | Loop shape | Reference implementation |
|---|---|---|
| **monitor** | Fetch current state → diff vs last → report only what moved | `stack-check` |
| **producer** | Read the seen-ledger → generate only NEW items → append to ledger | `content-plan` |
| **pursuit** | Claim highest-priority task → work it → complete or block → repeat until converged | `vuln-triage` (planned) |

### Pursuit and the terminal report

A Pursuit loop works a backlog to a **conclusion**, never a silent drop-off. The engine tracks every task through `pending → in-progress → done | blocked` and classifies the loop's ending for you:

```bash
S=loop-runner/scripts/loop-state.mjs

node $S enqueue vuln-triage sub-101 sub-102 sub-103    # seed the backlog

while node $S gate vuln-triage --max-iterations 50; do # exit 3 = terminal, break
  task=$(node $S claim vuln-triage | jq -r '.task.id // empty')
  [ -z "$task" ] && break
  #  ...work the task thoroughly...
  node $S complete vuln-triage "$task"                 # verified done
  #  ...or if you can't finish it: block <id> "<reason>"
done

node $S progress vuln-triage    # terminal report — always give one
```

`gate` and `progress` both return a `terminal` field. **Branch on it, and always report:**

| `terminal` | Meaning | What to say |
|---|---|---|
| `converged` | Queue empty — the good ending | "Done. N completed, M blocked (list them and why)." |
| `interrupted` | A stop condition fired with work remaining | **Loudly:** "Stopped at the cap. K of T tasks remain. Here's where I am and why." |
| `working` | Neither — keep going | (continue the loop) |

The engine's **stall guard** makes forever-loops impossible: `claim` re-serves an unresolved in-progress task and auto-blocks it after `--max-attempts` (default 3), so every cycle strictly shrinks the queue. A task is never silently abandoned. Full contract: `references/LoopContract.md` §7.

### Step 4: Record and decide

```bash
node loop-runner/scripts/loop-state.mjs record <skill> <artifact.json> --escalate-on critical,high
```

Then follow the escalation policy strictly:

| Delta | Action |
|---|---|
| `changed: false` | One line: "Run N — no change." Nothing else. |
| Changed, no escalation | Report the delta only — added, removed, changed. Never the full state. |
| `escalate` is set | Lead with the escalation, explain impact, give the exact fix command |
| Gate returned exit 3 | State the stop reason and halt |

### Step 5: Honour the backoff

`record` returns a `backoff.multiplier`. After 3 quiet runs it suggests 2x the interval, after 7 it suggests 4x. Apply it when you control the schedule (in-session `/loop`), or surface it as a recommendation when the schedule is external (cron/CI).

## Safety Allowlist

Loop eligibility is declared per skill, not inferred. Three skills in this collection are permanently loop-excluded because they have side effects beyond writing a report:

| Skill | Why it never loops unattended |
|---|---|
| `app-scaffold` | Writes project files and runs install/build commands |
| `red-team-scaffold` | Stands up Docker infrastructure and intentionally vulnerable servers |
| `defense-analyst` | Findings require human judgment; automated vuln analysis at interval is how false positives become "facts" |

An automated loop that can scaffold containers or write to disk on a timer is precisely the pattern you'd flag in a security review. Model the right behaviour: **`writes: report-only` is the only value that may run unattended.**

## Runners

The skills don't schedule themselves. Pick the layer that fits:

| Runner | Command | Best for |
|---|---|---|
| In-session | `/loop 30m /stack-check` (or `/loop` for self-paced) | Watching something live while you work |
| Scheduled cloud | `/schedule` | Cadence that must fire whether or not your laptop is open |
| Repo-native CI | GitHub Actions cron → `claude -p "/stack-check"` | Zero-setup automation for anyone who clones the repo |

A working CI example ships at `.github/workflows/nightly-stack-check.yml`.

## State

Loop state lives in `.claude/skill-state/<skill>/` **in the project the skill runs in** — not in this repo. Override with `--state-dir` or `$SKILL_STATE_DIR`.

```
.claude/skill-state/stack-check/
├── state.json      run counter, halt flag, no-change streak
├── seen.json       dedupe ledger
├── latest.json     most recent artifact
└── history/        timestamped artifacts + deltas
```

Commit non-sensitive state (version snapshots, used-topic ledgers) — it gives you history and makes CI loops work on a fresh clone. Never commit security state: triage verdicts and finding hashes describe unfixed vulnerabilities, and publishing them is a map of what's broken. The repo `.gitignore` already excludes the security-sensitive paths.

## Commands

```bash
S=loop-runner/scripts/loop-state.mjs

# Monitor / Producer
node $S init <skill>                       # create state dir
node $S gate <skill> --max-iterations 30   # stop-condition check (exit 3 = stop)
node $S seen <skill> "topic a" "topic b"   # filter to unseen keys only
node $S remember <skill> "topic a"         # add to dedupe ledger
node $S record <skill> artifact.json       # diff, archive, report delta
node $S digest <skill> 10                  # roll up the last 10 runs

# Pursuit (work a backlog to a conclusion)
node $S enqueue <skill> id1 id2            # add tasks as pending
node $S claim <skill>                      # claim next task (auto-blocks a stalled one)
node $S complete <skill> id1               # mark verified done
node $S block <skill> id2 "why it's stuck" # mark blocked, with a reason
node $S progress <skill>                   # terminal report: converged | interrupted

# Lifecycle
node $S halt <skill> "reason"              # stop the loop
node $S resume <skill>                     # clear the halt flag
```

## Stopping

Three ways to stop a loop, all of which `gate` honours:

1. `node $S halt <skill> "reason"` — sets the halt flag
2. `touch .claude/skill-state/<skill>/STOP` — kill-switch file, works without running anything
3. `--max-iterations <n>` — hard cap

## Rules
- Never re-print unchanged state — the delta is the deliverable (Monitor/Producer)
- **Never end a Pursuit loop without a terminal report** — converged or interrupted, always stated. Silence mid-backlog is the one forbidden ending.
- Resolve every claimed task — `complete` or `block`. Never leave a task hanging; a blocker is reported, not dropped.
- Never loop a skill whose `loop.writes` is not `report-only`
- Always run `gate` before a cycle. Run `record` after (Monitor/Producer) or resolve the claimed task (Pursuit).
- Escalate on severity, not on volume — 40 low-severity drifts are quieter than 1 critical
- Every cycle writes to `history/` even when silent, so `digest` can reconstruct the trail
- If a skill has no `loop:` block, treat it as not loop-enabled — do not improvise one

## Edge Cases
- **Target skill isn't loop-enabled:** Explain why, offer a single interactive run
- **First run:** Everything is "added" by definition — say so, establish the baseline, don't alarm
- **Artifact missing `items[]`:** The skill isn't emitting the loop schema; point at `references/LoopContract.md`
- **Escalation on the first run:** Report it, but note the baseline caveat — it may be pre-existing, not new
- **Long quiet streak:** Suggest widening the interval rather than silently continuing
- **Pursuit hits the iteration cap mid-backlog:** This is `interrupted`, not done — report what remains and why, loudly
- **A task auto-blocks (stall guard fired):** Surface it for a human — it didn't converge on its own; don't bury it
- **User asks "what happened while I was away":** Run `digest` (Monitor/Producer) or `progress` (Pursuit), not a fresh cycle

## Next Steps
- `references/LoopContract.md` — frontmatter schema, artifact schema, state layout
- `references/Archetypes.md` — monitor / producer / pursuit patterns with worked examples
- Run `/stack-check --loop` to see the monitor reference implementation
- Run `/content-plan --loop` to see the producer reference implementation
