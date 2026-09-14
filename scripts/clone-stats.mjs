#!/usr/bin/env node
// clone-stats.mjs — accumulate GitHub clone traffic into stats/clones.json.
//
// GitHub only keeps 14 days of clone traffic and only shows it to the owner,
// so a public "clones" badge needs something that reads the window every day
// and keeps a running total. This script merges the per-day rows from
// /repos/{owner}/{repo}/traffic/clones into stats/clones.json keyed by date,
// so daily runs never double count a day, then writes the file the README's
// shields.io dynamic badge reads.
//
//   TRAFFIC_TOKEN=... node scripts/clone-stats.mjs            # fetch + merge
//   node scripts/clone-stats.mjs --from-file traffic.json     # merge a saved API response
//
// The token needs only "Administration: read" on this repository (fine-grained
// PAT). The default Actions GITHUB_TOKEN cannot read traffic.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const REPO = process.env.GITHUB_REPOSITORY || "DRAZY/claude-skills";
const OUT = "stats/clones.json";

async function fetchTraffic() {
  const token = process.env.TRAFFIC_TOKEN;
  if (!token) { console.error("TRAFFIC_TOKEN is not set; nothing fetched."); process.exit(2); }
  const res = await fetch(`https://api.github.com/repos/${REPO}/traffic/clones`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!res.ok) { console.error(`traffic API ${res.status}: ${await res.text()}`); process.exit(1); }
  return res.json();
}

function load() {
  try { return JSON.parse(readFileSync(OUT, "utf8")); }
  catch { return { schema: "clone-stats/v1", since: null, updated: null, total_clones: 0, unique_cloners_14d: 0, days: {} }; }
}

const fileArg = process.argv.indexOf("--from-file");
const traffic = fileArg !== -1 ? JSON.parse(readFileSync(process.argv[fileArg + 1], "utf8")) : await fetchTraffic();
const stats = load();
for (const row of traffic.clones ?? []) {
  const day = String(row.timestamp).slice(0, 10);
  // A day inside the 14-day window can still grow until it closes; keep the max seen.
  const prev = stats.days[day] ?? { count: 0, uniques: 0 };
  stats.days[day] = { count: Math.max(prev.count, row.count), uniques: Math.max(prev.uniques, row.uniques) };
}
const days = Object.keys(stats.days).sort();
stats.since = days[0] ?? null;
stats.updated = new Date().toISOString();
stats.total_clones = days.reduce((n, d) => n + stats.days[d].count, 0);
stats.unique_cloners_14d = traffic.uniques ?? stats.unique_cloners_14d;
mkdirSync("stats", { recursive: true });
writeFileSync(OUT, JSON.stringify(stats, null, 2) + "\n");
console.log(`clones since ${stats.since}: ${stats.total_clones} total, ${stats.unique_cloners_14d} unique in the last 14 days`);
