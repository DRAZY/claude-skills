# The Loop Contract

Everything a skill must declare and emit to be safely loopable. Read this when adding loop support to a skill or when an artifact fails to diff.

---

## 1. Frontmatter block

Add a `loop:` block to the skill's YAML frontmatter. Absence means "not loop-enabled" — the runner will refuse rather than improvise.

```yaml
loop:
  enabled: true
  archetype: monitor        # monitor | producer | pursuit
  default-interval: 1d      # suggested cadence; the runner may back off from here
  max-iterations: 30        # hard cap; 0 = uncapped (use with care)
  escalate-on: [critical, high]
  writes: report-only       # report-only | files | infra
  state-keys: [id]          # which artifact field identifies an item across runs
```

### Field reference

| Field | Values | Meaning |
|---|---|---|
| `enabled` | bool | Master switch. `false` or absent → runner refuses |
| `archetype` | `monitor` \| `producer` \| `pursuit` | Which loop shape applies |
| `default-interval` | `30m`, `1d`, `1w` | Starting cadence before backoff |
| `max-iterations` | int | Hard stop after N cycles. `0` = uncapped |
| `escalate-on` | severity list | Which severities break silence and notify |
| `writes` | `report-only` \| `files` \| `infra` | **Safety gate.** Only `report-only` may run unattended |
| `state-keys` | field names | Which fields form an item's stable identity |

### The `writes` gate

This is the most important field. It is not advisory.

- **`report-only`** — produces text and JSON artifacts. Safe to run unattended.
- **`files`** — creates or modifies project files. Requires a human present.
- **`infra`** — stands up servers, containers, or external resources. Never unattended, ever.

---

## 2. Artifact schema

Every loop cycle emits one JSON artifact. This is what makes the delta computable — prose cannot be diffed reliably, structured items can.

```json
{
  "skill": "stack-check",
  "schema": 1,
  "generated": "2026-07-24T04:05:30.900Z",
  "project": "/path/to/project",
  "summary": {
    "total": 41,
    "healthScore": 78,
    "byStatus": { "current": 30, "major-behind": 9, "vulnerable": 2 }
  },
  "items": [
    {
      "id": "npm:react",
      "severity": "critical",
      "status": "vulnerable",
      "current": "18.2.0",
      "latest": "19.2.8",
      "upgrade": "npm install react@19.2.8"
    }
  ]
}
```

### Required fields

| Field | Required | Purpose |
|---|---|---|
| `items` | **yes** | The diffable array. Missing → `record` errors out |
| `items[].id` | strongly recommended | Stable identity across runs. Without it, items are keyed by content hash and *any* change reads as add+remove |
| `items[].severity` | for escalation | One of `info`, `low`, `medium`, `high`, `critical` |
| `skill`, `schema`, `generated` | conventional | Provenance |
| `summary` | optional | Free-form headline numbers |

### Choosing a good `id`

The `id` is the hinge the whole diff turns on. It must be **stable across runs** and **unique within a run**.

| Skill | Good `id` | Why |
|---|---|---|
| `stack-check` | `npm:react` | Ecosystem-qualified name; survives version changes |
| `secure-review` | `CWE-89:src/db.ts:142` | Rule + location; survives re-scans |
| `tool-review` | `cursor-ide` | Product slug |
| `content-review` | `youtube:video-id` | Platform-qualified content id |

Anti-pattern: including the version or timestamp in the `id` (`react@18.2.0`). Every upgrade then reads as one item removed and a different one added, instead of one item changed.

---

## 3. Volatile fields

These are stripped before diffing, because they change every run by definition and would make every cycle look "changed":

`generated`, `generatedAt`, `timestamp`, `durationMs`, `elapsed`

Add more per-invocation with `--ignore=field1,field2`.

**This is the single most common reason a loop is noisy.** If every cycle reports a change, look for an un-stripped timestamp, a scan duration, or a re-ordered array first.

---

## 4. State layout

State lives in the **project the skill runs in**, not in the skills repo.

```
.claude/skill-state/<skill>/
├── state.json      { runs, firstRun, lastRun, consecutiveNoChange, halted, haltReason, lastArtifactHash }
├── seen.json       { "<hash>": { key, firstSeen } }   — producer dedupe ledger
├── latest.json     most recent artifact (the diff baseline)
└── history/
    ├── 2026-07-24T04-05-30-900Z.artifact.json
    └── 2026-07-24T04-05-30-900Z.delta.json
```

Override the root with `--state-dir <path>` or `$SKILL_STATE_DIR`.

### What to commit

| State | Commit? | Reasoning |
|---|---|---|
| `stack-check`, `content-plan`, `project-ideas`, `tool-review` | **yes** | History and diffs are useful; CI loops work on a fresh clone |
| `secure-review`, `defense-analyst`, `vuln-triage`, `prompt-injection-probe` | **no** | Finding hashes and triage verdicts describe *unfixed* vulnerabilities. Committing them publishes a map of what's broken and unpatched |

The repo `.gitignore` already excludes the security-sensitive paths.

---

## 5. Delta output

`record` returns this shape. It is the only thing the skill should report from.

```json
{
  "skill": "stack-check",
  "run": 3,
  "firstRun": false,
  "changed": true,
  "counts": { "added": 0, "removed": 0, "changed": 2 },
  "added": [],
  "removed": [],
  "changedItems": [
    { "id": "npm:react", "item": { }, "changes": { "status": { "from": "major-behind", "to": "vulnerable" } } }
  ],
  "escalate": "critical",
  "topSeverity": "critical",
  "consecutiveNoChange": 0,
  "backoff": { "multiplier": 1, "note": "active — keep the configured interval" }
}
```

Report rules keyed off this object:

- `changed: false` → one line, nothing more
- `escalate` non-null → lead with it, give the fix
- `firstRun: true` → everything is "added"; frame it as establishing a baseline, not as 41 new problems

---

## 6. Stop conditions

`gate` exits `3` — a clean stop, not a failure — when any of these hold:

1. `state.halted` is true (`loop-state halt <skill>`)
2. The kill-switch file exists (`.claude/skill-state/<skill>/STOP`)
3. `runs >= --max-iterations`

Always run `gate` before a cycle. CI steps should treat exit 3 as success-with-no-work.

---

## 7. Adding loop support to a skill

1. Decide the archetype (`references/Archetypes.md`)
2. Add the `loop:` frontmatter block — be honest about `writes`
3. Make the skill emit an `items[]` artifact with stable `id`s and `severity`
4. Prefer a bundled script over model-derived data for anything factual. A model re-deriving "latest version" each cycle produces phantom deltas from phrasing alone; a script produces the same bytes for the same state
5. Add a "Loop Mode" section to the skill body describing gate → run → record → report
6. Verify: run three cycles with no real change and confirm cycles 2 and 3 report `changed: false`

Step 6 is the acceptance test. A loop that can't stay quiet isn't finished.
