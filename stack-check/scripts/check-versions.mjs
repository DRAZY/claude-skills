#!/usr/bin/env node
/**
 * check-versions — deterministic dependency version audit.
 *
 * Queries package registries directly instead of asking a model to web-search
 * "latest version" forty times. Same input always produces the same output,
 * which is what makes a Monitor loop's diff trustworthy.
 *
 * Zero dependencies. Node 18+ (uses global fetch).
 *
 *   node check-versions.mjs [projectDir] --out artifact.json [--audit]
 *
 * Emits the loop artifact schema documented in loop-runner/references/LoopContract.md.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CONCURRENCY = 8;
const STALE_MONTHS = 12;
const REQUEST_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// argv
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith("--")) {
    const [key, inline] = arg.slice(2).split("=");
    if (inline !== undefined) flags[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) flags[key] = argv[++i];
    else flags[key] = true;
  } else positional.push(arg);
}

const projectDir = resolve(positional[0] || ".");

// ---------------------------------------------------------------------------
// version helpers
// ---------------------------------------------------------------------------

/** Strip range operators to the first concrete version in a spec. */
function coerceVersion(spec) {
  if (typeof spec !== "string") return null;
  const trimmed = spec.trim();
  // Unresolvable / non-registry specs — nothing meaningful to compare.
  if (/^(workspace:|file:|link:|git\+|github:|https?:|npm:)/.test(trimmed)) return null;
  if (trimmed === "" || trimmed === "*" || trimmed === "latest" || trimmed === "next") return null;
  const match = trimmed.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  const loose = trimmed.match(/(\d+)(?:\.(\d+))?/);
  if (loose) return `${loose[1]}.${loose[2] ?? 0}.0`;
  return null;
}

function parseVersion(version) {
  if (!version) return null;
  const core = String(version).split("-")[0].split("+")[0];
  const parts = core.split(".").map((n) => Number.parseInt(n, 10));
  if (parts.some(Number.isNaN)) return null;
  return { major: parts[0] ?? 0, minor: parts[1] ?? 0, patch: parts[2] ?? 0 };
}

function classify(currentRaw, latestRaw) {
  const current = parseVersion(currentRaw);
  const latest = parseVersion(latestRaw);
  if (!current || !latest) return "unknown";
  if (latest.major > current.major) return "major-behind";
  if (latest.major < current.major) return "ahead";
  if (latest.minor > current.minor) return "minor-behind";
  if (latest.minor === current.minor && latest.patch > current.patch) return "patch-behind";
  return "current";
}

const SEVERITY_BY_STATUS = {
  vulnerable: "critical",
  deprecated: "high",
  abandoned: "medium",
  "major-behind": "medium",
  "minor-behind": "low",
  "patch-behind": "low",
  current: "info",
  ahead: "info",
  unknown: "info",
};

function monthsSince(isoDate) {
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return null;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30.44);
}

// ---------------------------------------------------------------------------
// manifest parsing
// ---------------------------------------------------------------------------

function readNpmManifest(dir) {
  const path = join(dir, "package.json");
  if (!existsSync(path)) return [];
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  const groups = [
    ["dependencies", pkg.dependencies],
    ["devDependencies", pkg.devDependencies],
    ["optionalDependencies", pkg.optionalDependencies],
  ];
  const out = [];
  for (const [group, deps] of groups) {
    for (const [name, spec] of Object.entries(deps ?? {})) {
      out.push({ ecosystem: "npm", name, spec, group, current: coerceVersion(spec) });
    }
  }
  return out;
}

function readPypiManifest(dir) {
  const path = join(dir, "requirements.txt");
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const clean = line.split("#")[0].trim();
    if (!clean || clean.startsWith("-")) continue;
    const match = clean.match(/^([A-Za-z0-9._-]+)\s*(?:[=<>!~]=?\s*([0-9][^\s,;]*))?/);
    if (!match) continue;
    out.push({
      ecosystem: "pypi",
      name: match[1],
      spec: clean,
      group: "dependencies",
      current: coerceVersion(match[2] ?? ""),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// registry lookups
// ---------------------------------------------------------------------------

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "claude-skills-stack-check" },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: await res.json() };
  } catch (err) {
    return { error: err.name === "AbortError" ? "timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}

async function lookupNpm(dep) {
  // The abbreviated document is far smaller than the full packument.
  const { data, error } = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(dep.name).replace("%40", "@")}`);
  if (error) return { ...dep, status: "unknown", error };

  const latest = data?.["dist-tags"]?.latest ?? null;
  const lastPublish = latest ? data?.time?.[latest] ?? null : null;
  const deprecated = Boolean(data?.versions?.[latest]?.deprecated);

  let status = classify(dep.current, latest);
  if (deprecated) status = "deprecated";
  else if (status === "current" && (monthsSince(lastPublish) ?? 0) > STALE_MONTHS) status = "abandoned";

  return {
    ...dep,
    latest,
    lastPublish,
    status,
    deprecatedMessage: data?.versions?.[latest]?.deprecated ?? null,
    homepage: data?.homepage ?? null,
  };
}

async function lookupPypi(dep) {
  const { data, error } = await fetchJson(`https://pypi.org/pypi/${encodeURIComponent(dep.name)}/json`);
  if (error) return { ...dep, status: "unknown", error };

  const latest = data?.info?.version ?? null;
  const releases = data?.releases?.[latest] ?? [];
  const lastPublish = releases[0]?.upload_time_iso_8601 ?? null;
  const yanked = Boolean(data?.info?.yanked);

  let status = classify(dep.current, latest);
  if (yanked) status = "deprecated";
  else if (status === "current" && (monthsSince(lastPublish) ?? 0) > STALE_MONTHS) status = "abandoned";

  return { ...dep, latest, lastPublish, status, homepage: data?.info?.home_page ?? null };
}

/** Simple concurrency-limited map — avoids hammering registries. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * Optional CVE overlay. `npm audit` is the authoritative deterministic source
 * for the npm ecosystem; it needs a lockfile and network access.
 */
async function npmAudit(dir) {
  const hasLock = ["package-lock.json", "npm-shrinkwrap.json"].some((f) => existsSync(join(dir, f)));
  if (!hasLock) return { available: false, reason: "no package-lock.json" };
  try {
    const { stdout } = await execFileAsync("npm", ["audit", "--json"], {
      cwd: dir,
      maxBuffer: 20 * 1024 * 1024,
    });
    return { available: true, data: JSON.parse(stdout) };
  } catch (err) {
    // npm audit exits non-zero when vulnerabilities exist — stdout is still valid.
    if (err.stdout) {
      try {
        return { available: true, data: JSON.parse(err.stdout) };
      } catch { /* fall through */ }
    }
    return { available: false, reason: err.shortMessage ?? err.message };
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const deps = [...readNpmManifest(projectDir), ...readPypiManifest(projectDir)];

if (deps.length === 0) {
  const empty = {
    skill: "stack-check",
    schema: 1,
    generated: new Date().toISOString(),
    project: projectDir,
    summary: { total: 0, note: "no package.json or requirements.txt found" },
    items: [],
  };
  const target = flags.out ? resolve(String(flags.out)) : null;
  if (target) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(empty, null, 2) + "\n");
  }
  process.stdout.write(JSON.stringify(empty, null, 2) + "\n");
  process.exit(0);
}

const checked = await mapLimit(deps, CONCURRENCY, (dep) =>
  dep.ecosystem === "npm" ? lookupNpm(dep) : lookupPypi(dep),
);

// Overlay npm audit vulnerability data when requested.
let auditNote = "not requested";
if (flags.audit) {
  const audit = await npmAudit(projectDir);
  if (audit.available) {
    const vulns = audit.data?.vulnerabilities ?? {};
    for (const item of checked) {
      const vuln = vulns[item.name];
      if (!vuln) continue;
      item.status = "vulnerable";
      item.vulnerability = {
        severity: vuln.severity ?? null,
        via: Array.isArray(vuln.via)
          ? vuln.via.map((v) => (typeof v === "string" ? v : v.title ?? v.name)).filter(Boolean).slice(0, 3)
          : [],
        fixAvailable: Boolean(vuln.fixAvailable),
      };
    }
    auditNote = `npm audit applied (${Object.keys(vulns).length} advisories)`;
  } else {
    auditNote = `npm audit unavailable: ${audit.reason}`;
  }
}

const items = checked.map((dep) => ({
  id: `${dep.ecosystem}:${dep.name}`,
  name: dep.name,
  ecosystem: dep.ecosystem,
  group: dep.group,
  spec: dep.spec,
  current: dep.current,
  latest: dep.latest ?? null,
  status: dep.status,
  severity: SEVERITY_BY_STATUS[dep.status] ?? "info",
  upgrade:
    dep.ecosystem === "npm"
      ? `npm install ${dep.name}@${dep.latest ?? "latest"}`
      : `pip install --upgrade ${dep.name}==${dep.latest ?? ""}`.trim(),
  lastPublish: dep.lastPublish ?? null,
  ...(dep.deprecatedMessage ? { deprecatedMessage: dep.deprecatedMessage } : {}),
  ...(dep.vulnerability ? { vulnerability: dep.vulnerability } : {}),
  ...(dep.error ? { error: dep.error } : {}),
}));

const tally = items.reduce((acc, item) => {
  acc[item.status] = (acc[item.status] ?? 0) + 1;
  return acc;
}, {});

// Health score — mirrors the scoring table in SKILL.md so the number is reproducible.
const PENALTY = {
  "patch-behind": 1,
  "minor-behind": 1,
  "major-behind": 5,
  deprecated: 10,
  abandoned: 10,
  vulnerable: 20,
};
const hasLockfile = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "poetry.lock"]
  .some((f) => existsSync(join(projectDir, f)));
let score = 100 - items.reduce((sum, item) => sum + (PENALTY[item.status] ?? 0), 0);
if (!hasLockfile) score -= 10;
score = Math.max(0, Math.min(100, score));

const artifact = {
  skill: "stack-check",
  schema: 1,
  generated: new Date().toISOString(),
  project: projectDir,
  summary: {
    total: items.length,
    healthScore: score,
    lockfile: hasLockfile,
    audit: auditNote,
    byStatus: tally,
  },
  items: items.sort((a, b) => a.id.localeCompare(b.id)),
};

const output = JSON.stringify(artifact, null, 2) + "\n";
if (flags.out) {
  const target = resolve(String(flags.out));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output);
  process.stderr.write(`check-versions: wrote ${items.length} items to ${target}\n`);
} else {
  process.stdout.write(output);
}
