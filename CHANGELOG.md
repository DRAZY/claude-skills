# Changelog

All notable changes to this skill collection are documented here.

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
