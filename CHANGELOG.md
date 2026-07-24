# Changelog

All notable changes to this skill collection are documented here.

## [1.2.0] - 2026-07-24

Continual-loop architecture. Skills can now run on a schedule without becoming
noise — the governing rule is that a loop reports the **delta**, not the report.

### New Skills
- **`/loop-runner`** (v1.0.0) — Meta-skill that runs any loop-enabled skill continually. Owns state, dedupe, delta computation, stop conditions, backoff, and escalation policy so individual skills stay simple. Three archetypes: monitor, producer, pursuit.
- **`/prompt-injection-probe`** (v1.0.0) — Pursuit-loop robustness tester for a system prompt or agent definition you own or are authorized to test. Runs a structured battery of injection, indirect-injection, jailbreak, extraction, guardrail-bypass, encoding, tool-abuse, multi-turn, and context-manipulation probes; scores each HELD/BYPASSED/PARTIAL with the canary principle (prove a failure without generating harmful content); clusters bypasses by root cause. The "run the tests" counterpart to `/red-team-scaffold`. Manual-invoke, report-only, strictly defensive and authorization-gated.
- **`/vuln-triage`** (v1.0.0) — Pursuit-loop triage for GenAI bug-bounty submissions: validity, duplicate-by-root-cause, severity, CVSS-adapted score, reproduction quality, AI-native category, and a drafted researcher response. A submission is triaged (done) or blocked-with-reason, never silently dropped; criticals escalate immediately.
- **`/disclosure-writer`** (v1.0.0) — Generator (not a loop) for a coordinated responsible-disclosure package — report, reproduction, impact, remediation, disclosure timeline, optional CVE-request draft — tuned for GenAI vuln classes. Coordinated posture: vendor first, public later, window respected; public artifacts de-fanged.

### New Infrastructure
- **`loop-runner/scripts/loop-state.mjs`** — Zero-dependency state and delta engine. Commands: `init`, `status`, `gate`, `hash`, `seen`, `remember`, `record`, `digest`, `enqueue`, `claim`, `complete`, `block`, `progress`, `halt`, `resume`, `reset`. Diffs artifacts item-by-item with volatile fields (timestamps, durations) stripped so a re-run with no real change reports `changed: false`; manages a Pursuit task queue with a status lifecycle and stall guard.
- **`stack-check/scripts/check-versions.mjs`** — Zero-dependency dependency audit querying npm and PyPI registries directly, with deprecation and abandonment detection, optional `npm audit` CVE overlay, and a reproducible health score. Replaces per-package web searching, which was slow, expensive, and non-deterministic — and therefore unusable as a loop baseline.
- **`.github/workflows/nightly-stack-check.yml`** — Working CI loop: gate → artifact → delta → open an issue only on escalation. The deterministic half runs with no secrets configured.
- **`loop-runner/references/LoopContract.md`** — Frontmatter schema, artifact schema, state layout, `id` selection guidance, volatile-field rules, and the checklist for making an existing skill loopable.
- **`loop-runner/references/Archetypes.md`** — Monitor / producer / pursuit patterns, each with its failure modes and discipline.

### Pursuit hardening — working loops end in a conclusion, not a drop-off
- **Task status lifecycle in the engine.** Every Pursuit task moves through `pending → in-progress → done | blocked` in `queue.json`. A task is never silently abandoned; `blocked` is a first-class reported outcome carrying a reason. New commands: `enqueue`, `claim`, `complete`, `block`, `progress`.
- **Two terminal classes.** `gate` and `progress` classify a Pursuit loop as **converged** (queue empty — the good ending) or **interrupted** (a stop condition fired with work remaining — reported loudly). Going quiet mid-backlog with no report is now the one explicitly forbidden ending.
- **Stall guard.** `claim` re-serves an unresolved in-progress task and auto-blocks it after `--max-attempts` (default 3), so every cycle strictly reduces the queue and no loop can spin forever on one item.
- Documented the doctrine in `LoopContract.md` §7 (Completion vs interruption), a sharpened Pursuit section in `Archetypes.md`, and the `loop-runner` SKILL.md — including the refined Iron Rule: silence means success for a Monitor, but for a Pursuit loop it means success *only* when converged.

### Safety
- Added a `loop:` frontmatter contract to all affected skills. The `writes` field (`report-only` | `files` | `infra`) is a hard gate: **only `report-only` may run unattended.**
- Explicitly loop-excluded `app-scaffold` and `red-team-scaffold` (`writes: infra`) and `defense-analyst` (findings require human judgment). Exclusion is now declared in frontmatter rather than left to convention.
- Added root `.gitignore` splitting loop state along the sensitivity line — version snapshots and topic ledgers are safe to commit; `secure-review`, `defense-analyst`, `vuln-triage`, and `prompt-injection-probe` state is not, because it describes unfixed vulnerabilities.

### Enhanced Skills

#### `/stack-check` (v1.0.0 -> v1.1.0)
- Added Loop Mode (Monitor) — the reference implementation of the monitor archetype
- Step 2 now runs the bundled deterministic script; web search is demoted to enrichment (breaking changes, uncovered ecosystems) rather than enumeration
- Added intentional-pin memory across runs, so a pinned package isn't re-flagged every cycle
- Added backoff guidance: quiet loops widen their own interval

#### `/content-plan` (v1.1.0 -> v1.2.0)
- Added Loop Mode (Producer) — the reference implementation of the producer archetype
- Added seen-ledger integration so a weekly loop never re-suggests a burned topic
- Documented the ordering rule (`remember` after delivery, never before) and ledger-key discipline
- Added running-dry handling: surface the shortage instead of padding the calendar with repeats

## [1.1.0] - 2026-03-06

### New Skills
- **`/claude-api`** (v1.0.0) — Build apps with the Claude API and Anthropic SDKs. Covers authentication, model selection, tool use, streaming, vision, prompt caching, batch API, and agent patterns.
- **`/content-review`** (v1.0.0) — Analyzes content performance data and generates actionable insights. Ingests CSV, pasted metrics, or screenshots. Identifies patterns, benchmarks against industry standards, and feeds recommendations into content planning.

### Enhanced Skills

#### `/content-plan` (v1.0.0 -> v1.1.0)
- Added platform analytics integration — detects existing analytics files and offers to factor past performance into planning
- Added Bluesky, Threads, and Mastodon to supported platforms with posting time defaults
- Added performance-informed planning section for data-driven calendar generation

#### `/script-writer` (v1.0.0 -> v1.1.0)
- Added `podcast` format — solo and interview templates with segment structure, guest questions, show notes, and audiogram candidates
- Added `newsletter` format — full standalone newsletter with subject lines, preview text, quick hits section, and personal note
- Added code tutorial blog variant — step-by-step structure with prerequisites, code blocks, expected output, and troubleshooting tables

#### `/seo-optimize` (v1.0.0 -> v1.1.0)
- Added `podcast` platform — episode titles, show descriptions, Apple Podcasts tags, Spotify topics, transcript SEO, and directory submission list
- Added `github` platform — repository naming, README SEO structure, GitHub topics/tags, social preview images, and discoverability tips
- Added volume/competition disclaimer acknowledging estimates are qualitative and should be verified with actual tools

#### `/social-repurpose` (v1.0.0 -> v1.1.0)
- Added Bluesky — 300 char limit, anti-growth-hacking community norms, custom feed optimization, no hashtags
- Added Threads — 500 char limit, conversation-driven algorithm, native content emphasis
- Added Reddit — value-first anti-promotional norms, subreddit targeting, markdown formatting, TL;DR guidance
- Updated rules for platform-specific hashtag and emoji guidelines

#### `/tool-review` (v1.0.0 -> v1.1.0)
- Added Quick Test Checklist for hands-on testing during review sessions
- Added prompt for users to paste real screenshots/output for observation-based reviews
- Added Accessibility Assessment section — keyboard nav, screen reader, color contrast, mobile, i18n

#### `/project-ideas` (v1.0.0 -> v1.1.0)
- Added dynamic context for existing projects (~/vibecode/) and GitHub repos (via gh CLI)
- Added Step 1.5 to check existing projects and avoid suggesting duplicates
- Suggests complementary projects that build on existing work

#### `/app-scaffold` (v1.0.0 -> v1.1.0)
- Added Bun and Deno runtime detection and support
- Added Step 1.5 for automatic runtime detection with user prompt
- Added runtime-specific conventions section (Bun lockfiles, Deno permissions, CI actions)
- Added dynamic context for all available runtimes (Node, Bun, Deno, Python, Go, Rust)

#### `/community-manager` (v1.0.0 -> v1.1.0)
- Parameterized community profile — no longer hardcoded to 0DIN.ai
- Added `--community` flag for custom community descriptions
- Added custom community detection with automatic adaptation of language, channels, metrics, and scale
- 0DIN.ai remains the default profile

### All Skills
- Added `version` field to frontmatter for change tracking

## [1.0.0] - Initial Release

### Skills
- `/content-plan` — Weekly content calendar generation
- `/script-writer` — Video and blog script creation
- `/seo-optimize` — YouTube and blog SEO optimization
- `/social-repurpose` — Multi-platform content distribution
- `/tool-review` — AI tool and product review outlines
- `/project-ideas` — Buildable project idea generation
- `/app-scaffold` — Production-ready project scaffolding
- `/secure-review` — Comprehensive security auditing
- `/stack-check` — Dependency version auditing
- `/community-manager` — Community management for 0DIN.ai
- `/defense-analyst` — Defensive macOS binary analysis
- `/red-team-scaffold` — GenAI red team infrastructure
- `/mastra-expert` — Mastra AI framework expertise
