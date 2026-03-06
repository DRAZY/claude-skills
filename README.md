# Claude Code Custom Skills

A production-grade collection of 15 custom [Claude Code](https://claude.ai/claude-code) skills for content creation, AI development, security auditing, defensive research, community management, and AI framework expertise.

These skills use advanced Claude Code features including `context: fork` for isolated execution, `allowed-tools` for precise tool access, dynamic context injection (`!`command``), skill chaining, and structured output templates.

---

## Quick Start

```bash
# Clone into your Claude Code skills directory
git clone https://github.com/DRAZY/claude-skills.git ~/.claude/skills

# That's it — open Claude Code and type / to see all available skills
```

**Requirements:** [Claude Code CLI](https://claude.ai/claude-code) installed and configured.

**Optional:** [Ghost Security plugin](https://github.com/anthropics/claude-code-plugins) for automated security scanning (`/secure-review` and `/stack-check` use it if available, but work without it).

---

## Skills Overview

| Skill | Category | Key Features |
|---|---|---|
| [`/content-plan`](#content-plan) | Content | WebSearch for trends, 9 platforms (incl. Bluesky/Threads/Mastodon), analytics-informed planning, skill chaining |
| [`/script-writer`](#script-writer) | Content | 6 formats (youtube, short, blog, thread, podcast, newsletter), code tutorial variant, word count targets |
| [`/seo-optimize`](#seo-optimize) | Content | 4 platforms (youtube, blog, podcast, github), before/after comparison, keyword research, volume disclaimers |
| [`/social-repurpose`](#social-repurpose) | Content | 8 platforms (incl. Bluesky, Threads, Reddit), hard character limits, de-duplication, posting schedule |
| [`/content-review`](#content-review) | Content | Performance analytics ingestion, pattern analysis, benchmarks, actionable recommendations |
| [`/tool-review`](#tool-review) | Content | Forked context, rating scale anchors, competitor tables, accessibility assessment, privacy audit |
| [`/project-ideas`](#project-ideas) | Development | Diversity requirements, existing project detection, similar project check, quick-start commands |
| [`/app-scaffold`](#app-scaffold) | Development | Node/Bun/Deno runtime support, latest version verification, CI/CD, security defaults, post-build validation |
| [`/claude-api`](#claude-api) | Development | Claude API/SDK patterns, streaming, tool use, prompt caching, batch API, agent patterns |
| [`/secure-review`](#secure-review) | Security | Forked context, 3-layer audit, Ghost + manual, confidence levels |
| [`/stack-check`](#stack-check) | Security | Forked context, health score, license audit, exact upgrade commands |
| [`/community-manager`](#community-manager) | Community | 7 focus areas, parameterizable community profile, competitor intel, templates, metrics dashboards |
| [`/defense-analyst`](#defense-analyst) | Security | macOS binary analysis, CVSS scoring, defensive tools, vuln reports |
| [`/red-team-scaffold`](#red-team-scaffold) | Security | GenAI red team infra — exfil server, vulnerable MCP, sandbox |
| [`/mastra-expert`](#mastra-expert) | Development | Mastra AI framework — agents, workflows, memory, RAG, MCP, voice, evals, deployment |

---

## Advanced Features Used

These skills leverage Claude Code's full capabilities:

| Feature | Skills Using It | Purpose |
|---|---|---|
| `context: fork` | secure-review, stack-check, tool-review, defense-analyst | Runs in isolated subagent — verbose output stays out of main context |
| `allowed-tools` | ALL | Declares exactly which tools each skill needs |
| `disable-model-invocation` | app-scaffold, secure-review, defense-analyst, red-team-scaffold | Prevents auto-triggering on side-effect-heavy skills |
| Dynamic context `!`cmd`` | content-plan, app-scaffold, secure-review, stack-check, seo-optimize | Pre-fetches project data before Claude starts processing |
| Skill chaining | ALL | Every skill suggests next skills to run in a pipeline |
| Structured output | ALL | Consistent templates with tables, code blocks, and checklists |

---

## Content Creation Skills

### `/content-plan`

Generates a 7-day content calendar with web-searched trending topics. Supports 9 platforms.

```
/content-plan AI tools and workflows
/content-plan Claude Code tutorials week of 3/1
```

**What's included:**
- Trending topic research via WebSearch (with source dates)
- Calendar table with exact format (day, platform, type, title, production time)
- Detailed breakdown per day: hook, key points, CTA, repurpose chain
- Posting time recommendations for 9 platforms: YouTube, Twitter/X, LinkedIn, Bluesky, Threads, Mastodon, TikTok, Blog, Newsletter
- Performance-informed planning when past analytics data is available
- Weekly theme summary + quick win + hero content identification
- Skill chain: suggests `/script-writer` → `/seo-optimize` → `/social-repurpose`

**Handles:** No input (asks + suggests trending topics), too-broad topics (narrows with 3 angles), multiple topics (mixed calendar), weekend exclusions, past performance data.

---

### `/script-writer`

Creates ready-to-use scripts with word count targets and production cues. Now supports 6 formats.

```
/script-writer Building an AI Agent youtube
/script-writer Top 5 AI Tools 2026 short
/script-writer Prompt Engineering Guide blog
/script-writer Claude Code Tips thread
/script-writer AI Security Trends podcast
/script-writer Weekly AI Roundup newsletter
```

| Format | Output Details |
|---|---|
| `youtube` | 5-15 min script (~150 words/min), timestamps, `[B-ROLL]`/`[SCREEN RECORDING]` cues, 3 thumbnail concepts, sponsor section |
| `short` | 30-60 sec TikTok/Reels/Shorts with text overlay cues |
| `blog` | 800-1,500 words with H2 structure, meta description, code snippet suggestions. Code tutorial variant with step-by-step structure, prerequisites, expected output, and troubleshooting |
| `thread` | 8-12 tweets, each under 280 chars, standalone-worthy, with pinned reply |
| `podcast` | 20-45 min solo or interview format, segment structure, guest questions, show notes, audiogram candidates |
| `newsletter` | 500-1,000 word standalone newsletter with subject lines, preview text, quick hits, personal note |

**Voice:** Conversational, direct, energetic — never corporate. Includes example sentences showing target tone. Facts verified via WebSearch.

---

### `/seo-optimize`

Optimizes content for search with before/after comparisons and competition analysis. Supports 4 platforms.

```
/seo-optimize "Building an AI App with Claude" youtube
/seo-optimize "Getting Started with Prompt Engineering" blog
/seo-optimize "AI Security Weekly" podcast
/seo-optimize my-awesome-tool github
```

**What's included:**
- Before/after title comparison with explanations
- 3 optimized title variants (under 60 chars, keyword front-loaded)
- Full description template with timestamps and links sections
- 15-20 tags (exact match, long-tail, competitor names, misspellings)
- Keyword analysis table (volume, competition, recommendation) with honest disclaimer about estimation accuracy
- Content gap analysis (what top-ranking content misses)
- Saturation check with color-coded assessment
- **Podcast SEO:** Episode titles, show descriptions, Apple Podcasts tags, Spotify topics, transcript SEO, directory submissions
- **GitHub SEO:** Repo naming, README structure, topics/tags, social preview images, discoverability tips
- Validation tool suggestions (TubeBuddy, vidIQ, Ahrefs)

---

### `/social-repurpose`

Transforms one piece of content into native posts for 8 platforms.

```
/social-repurpose ./blog-post.md
/social-repurpose [paste content directly]
```

**Platforms with hard character limits enforced:**

| Platform | Limit | What You Get |
|---|---|---|
| Twitter/X | 280/tweet | 8-12 tweet thread + pinned reply |
| Bluesky | 300/post | Thread with authentic, community-oriented tone — no hashtags |
| Threads | 500/post | Casual, conversation-driving posts — no hashtags |
| LinkedIn | 3,000 chars | Hook-first post with professional tone |
| Reddit | ~40,000 chars | Value-first post with subreddit targeting and anti-promotional norms |
| Instagram | 2,200 chars | Caption + carousel concept + hashtags |
| TikTok/Shorts | 60 sec | Script with text overlays |
| Newsletter | ~500 words | 3 subject lines + preview text + body |

**Key feature:** De-duplication rule — each platform leads with a DIFFERENT angle from the source material. Includes staggered posting schedule with dates and times.

---

### `/content-review`

Analyzes content performance data and generates actionable insights. Accepts CSV files, pasted metrics, or screenshots.

```
/content-review [paste analytics data]
/content-review ~/analytics/youtube-march.csv
```

**What's included:**
- Content performance table and platform-level summary
- Top performer analysis — what worked and why, with replication plans
- Underperformer analysis — what failed and whether to fix or kill
- Pattern analysis: best content type, platform, posting day, time, and length
- Industry benchmark comparison
- Prioritized actionable recommendations (double down, fix, kill, experiment)
- Next-week content brief informed by the analysis

---

### `/tool-review`

Researches AI tools and generates structured review outlines. Runs in a forked context to keep research output clean.

```
/tool-review Cursor IDE
/tool-review Claude Code
/tool-review Midjourney v7
```

**What's included:**
- Pricing table (verified via web search with date)
- Feature ratings (Game-changer / Solid / Meh / Broken)
- Competitor comparison table
- Rating with defined scale anchors (9-10: exceptional, 7-8: strong, 5-6: situational, etc.)
- Hands-on demo plan with wow-factor ratings and quick test checklist
- Accessibility assessment (keyboard nav, screen reader, color contrast, mobile, i18n)
- Video production kit (3 titles, thumbnail, talking points, demo sequence)
- Data privacy assessment (storage, training, compliance, incidents)

---

## Development Skills

### `/project-ideas`

Generates 5 buildable project ideas with diversity requirements.

```
/project-ideas
/project-ideas intermediate nextjs AI
/project-ideas beginner python automation exclude: chatbots
```

**Per idea:** Name, description, verified tech stack, features, APIs (with pricing), difficulty, build time, learning outcomes, content angle (episode count, wow factor), monetization potential, and **quick-start command** (`/app-scaffold [description]`).

**Diversity enforced:** At least 3 different stacks, 2 difficulty levels, 1 weekend project, 1 ambitious series project. Checks for similar existing projects via web search. Detects existing projects in your workspace and GitHub repos to avoid duplicates and suggest complementary builds.

---

### `/app-scaffold`

Scaffolds production-ready projects with verified latest versions. Supports Node.js, Bun, and Deno runtimes with automatic detection. Manual-invoke only (`disable-model-invocation: true`) since it creates files and runs commands.

```
/app-scaffold AI chatbot with Next.js and Supabase
/app-scaffold SaaS dashboard with Stripe billing
/app-scaffold CLI tool in Rust
/app-scaffold API server with Bun and Hono
```

**What's created:**
- Clean folder structure following framework conventions
- `CLAUDE.md` — Stack, scripts, conventions, architecture decisions
- `README.md` — Setup instructions with pinned version numbers
- `.github/workflows/ci.yml` — GitHub Actions for lint + test + build
- `tests/example.test.ts` — At least one working test
- `.env.example` — All env vars documented (no real secrets)
- Security defaults: CORS, input validation (zod/joi/pydantic), CSP headers, auth boilerplate

**Post-scaffold validation:** Runs `install`, `build`, and `test` to verify the scaffold actually works before presenting it.

---

### `/claude-api`

Build applications with the Claude API, Anthropic SDKs, and Agent SDK. Auto-triggers when code imports `anthropic` or `@anthropic-ai/sdk`.

```
/claude-api Set up streaming chat with tool use
/claude-api Add prompt caching to reduce costs
/claude-api Build an agent loop with tool calling
/claude-api Use the batch API for bulk processing
```

**What's included:**
- SDK setup patterns (TypeScript + Python)
- Core API patterns: messages, streaming, tool use, vision, prompt caching, extended thinking, batch API
- Model selection guide with cost/speed tradeoffs
- Cost optimization strategies (caching, batching, model routing)
- Error handling with typed exceptions
- Agent tool loop patterns (manual and SDK-based)
- Latest SDK version verification via web search

---

## Security Skills

### `/secure-review`

Comprehensive security audit running in forked context. Manual-invoke only.

```
/secure-review
/secure-review src/api/
/secure-review auth-module
```

**Three-layer audit:**

| Layer | What It Does | Tools |
|---|---|---|
| Automated | Ghost Security: secrets, deps, SAST, combined report | Ghost plugin (graceful fallback if unavailable) |
| Manual | Auth/authz, injection, data protection, API security, infra, client-side | Code analysis with line-number precision |
| Dependencies | Outdated, deprecated, EOL, supply-chain risk | WebSearch + Ghost scan-deps |

**Output includes:**
- Executive summary with risk level and top 3 actions
- Each finding: severity, confidence (Confirmed/Likely/Possible), OWASP category, CWE, exact code, working fix
- Remediation checklist ordered by priority
- Scan coverage summary table

**Checks git history** for committed `.env` files. Scales audit depth to project size.

---

### `/stack-check`

Audits every dependency with a health score. Runs in forked context.

```
/stack-check
/stack-check ./my-app
```

**Detects:** Node.js, Python, Go, Ruby, Rust, Java/Kotlin, PHP, .NET, Docker base images, GitHub Actions, framework configs. Also checks runtime versions.

**For each package:**
- Current version vs. latest stable (verified via web search with date)
- Status: ✅ Current / 🔵 Minor / 🟠 Major / ⚠️ Deprecated / 🔴 EOL / 🚨 Vulnerable
- **Exact upgrade command** (not "consider upgrading")
- Breaking changes and migration notes for major updates

**Health score:** 0-100 with clear scoring formula. **License audit** flags GPL/AGPL in commercial projects. **Upgrade order** ensures safe sequential updates.

---

### `/defense-analyst`

Defensive security research analyst for macOS binary analysis. Runs in forked context. Manual-invoke only.

```
/defense-analyst Analyze this disassembly for integer overflow patterns
/defense-analyst Generate CVSS score for the library injection vulnerability
/defense-analyst Create a monitoring script to detect DYLD injection attempts
/defense-analyst Write a responsible disclosure report for these findings
/defense-analyst Organize all IPC-related vulnerabilities into an index
```

**Capabilities:**
- macOS binary analysis (ARM64/x86_64, Mach-O, code signatures, entitlements)
- Vulnerability assessment with CVSS scoring (full vector breakdowns)
- Defensive monitoring tool development (Python/Bash — detection only, never exploitation)
- Responsible disclosure report generation
- Research organization across 30+ analysis files
- Chromium-based app security (multi-process architecture, IPC, sandbox)

**Output templates:** Vulnerability reports with executive summary + technical details + PoC detection + impact + remediation. Defensive tool templates with mandatory safety headers and ethical guardrails. Research index with attack chain maps and evidence catalogs.

**Strict ethical boundaries:** Defensive only. Creates detection tools, never exploitation tools. Refuses any request that crosses into offensive tooling.

---

### `/red-team-scaffold`

Scaffolds GenAI red team testing infrastructure. Manual-invoke only.

```
/red-team-scaffold exfil-server
/red-team-scaffold mcp-vuln
/red-team-scaffold sandbox
/red-team-scaffold full
```

**Three components:**

| Component | What It Builds |
|---|---|
| `exfil-server` | Multi-protocol exfiltration detection server (HTTP, DNS, WebSocket, SMTP) with PostgreSQL logging, Prometheus metrics, and rate limiting |
| `mcp-vuln` | 4 intentionally vulnerable MCP servers (filesystem, database, web/SSRF, API gateway) for testing LLM agent security boundaries |
| `sandbox` | Containerized code execution environment with network/filesystem/syscall monitoring and threat classification |

**Safety features in every component:**
- Docker isolation (no host network access)
- All test data is fake (no real credentials)
- Production environment auto-detection and shutdown
- Prominent defensive research warnings in all code and UI
- Complete audit logging of all activity
- Vulnerability toggles via environment variables

**Tech stack:** TypeScript, Node.js, Docker, PostgreSQL, Prisma, @modelcontextprotocol/sdk, seccomp-bpf.

---

## Community Management

### `/community-manager`

Community management assistant. Default profile: [0DIN.ai](https://0din.ai) GenAI bug bounty. Supports any community via `--community` flag.

```
/community-manager                                    # Weekly action plan
/community-manager blog ideas for March               # Content ideas
/community-manager plan a CTF event                   # Event planning
/community-manager re-engagement campaign             # Engagement tactics
/community-manager monthly metrics report template    # Reporting
/community-manager what is HackerOne doing for community  # Competitor intel
/community-manager --community "Rust Discord — 2k devs"  # Custom community
```

**7 focus areas:**

| Area | What It Generates |
|---|---|
| Engagement | Activation campaigns, retention plays, re-engagement sequences, referral programs |
| Blog & Content | Researcher spotlights, vuln deep dives, how-tos, program updates, beginner pathways |
| Activities & Events | CTFs, Hack-The-Model, live hacking, AMAs, workshops, bug bash, mentor matching |
| Onboarding & Growth | Signup funnels, skill paths, university outreach, cross-pollination |
| Recognition | Achievements, researcher of the month, leaderboard campaigns, exclusive access, swag |
| Communication | Templates for Discord, X, LinkedIn, email — announcements, digests, outreach, crisis |
| Metrics | Dashboard templates, KPIs, monthly/quarterly report frameworks |

**Includes:** Competitor intelligence via WebSearch (HackerOne, Bugcrowd, Immunefi, Intigriti). Every tactic includes implementation steps, effort level, expected impact, and success metrics.

---

## AI Framework Skills

### `/mastra-expert`

Expert-level guidance for the Mastra TypeScript AI framework. Multi-file skill with 8 domain reference guides and 6 workflow templates.

```
/mastra-expert Create an agent that can search and summarize documents
/mastra-expert Build a workflow with human approval steps
/mastra-expert Set up a new Mastra project
/mastra-expert Add semantic memory with vector search
/mastra-expert Deploy to Vercel
```

**Domains covered (with dedicated reference files):**

| Domain | File | Coverage |
|---|---|---|
| Agents | `Agents.md` | Agent class, networks, processors, guardrails, structured output |
| Workflows | `WorkflowEngine.md` | createWorkflow, control flow, suspend/resume, snapshots |
| Memory & RAG | `MemoryAndRag.md` | 4 memory types, 17+ vector DBs, chunking, reranking |
| MCP & Tools | `McpAndTools.md` | MCPClient/Server, createTool, OAuth, resources |
| Models | `ModelsAndProviders.md` | 2,436 models, 81 providers, fallbacks, dynamic routing |
| Server | `ServerAndDeployment.md` | Hono server, 8 auth providers, deployment targets |
| Voice | `VoiceAndStreaming.md` | 10+ voice providers, TTS/STT, real-time streaming |
| Evals | `EvalsAndObservability.md` | createScorer, 20+ scorers, 12+ tracing exporters |

**6 guided workflows:** SetupProject, CreateAgent, BuildWorkflow, ConfigureMemory, AddEvals, DeployProject — each with step-by-step instructions and code generation.

---

## Skill Pipeline

These skills are designed to chain together:

```
/project-ideas          → Pick what to build
    ↓
/app-scaffold           → Set up the project (Node/Bun/Deno)
    ↓
/stack-check            → Verify all versions current
    ↓
  [ Build the app ]
    ↓
/secure-review          → Audit before shipping
    ↓
/script-writer          → Create content (video, blog, podcast, newsletter)
    ↓
/seo-optimize           → Optimize for discovery (YouTube, blog, podcast, GitHub)
    ↓
/social-repurpose       → Distribute everywhere (8 platforms)
    ↓
/content-plan           → Plan next week's content
    ↓
/content-review         → Analyze performance → feed back into planning
```

For Claude API development:
```
/claude-api             → Build with Claude API/SDK
    ↓
/app-scaffold           → Set up the project structure
    ↓
/secure-review          → Audit API key handling and data exposure
    ↓
/stack-check            → Verify SDK version is current
```

For community management:
```
/community-manager      → Plan engagement activities (any community)
    ↓
/content-plan           → Schedule community content
    ↓
/script-writer          → Script event promos and recaps
    ↓
/social-repurpose       → Distribute across platforms
    ↓
/content-review         → Measure engagement → refine strategy
```

For Mastra AI framework development:
```
/mastra-expert          → Build agents, workflows, RAG pipelines
    ↓
/stack-check            → Verify all Mastra package versions
    ↓
/secure-review          → Audit the application
    ↓
/script-writer          → Create content about the build
    ↓
/social-repurpose       → Distribute everywhere
```

For defensive security research:
```
/red-team-scaffold      → Build testing infrastructure
    ↓
/defense-analyst        → Analyze binaries and findings
    ↓
/secure-review          → Audit the tools themselves
    ↓
/stack-check            → Verify all dependency versions
    ↓
/script-writer          → Create content about the research
```

For content performance optimization:
```
/content-review         → Analyze what's working
    ↓
/content-plan           → Plan based on performance data
    ↓
/script-writer          → Script in top-performing formats
    ↓
/seo-optimize           → Optimize for discovery
    ↓
/social-repurpose       → Distribute to winning platforms
    ↓
/content-review         → Measure again → continuous improvement
```

---

## Installation

### Fresh Install
```bash
git clone https://github.com/andre-zilla/claude-skills.git ~/.claude/skills
```

### Sync Across Machines
```bash
cd ~/.claude/skills && git pull
```

### Verify
Open Claude Code and type `/` — all skills should appear in autocomplete.

---

## Customization

Each skill is a standalone `SKILL.md` with YAML frontmatter. Edit any skill and changes take effect immediately — no restart needed.

### Creating Your Own

```bash
mkdir ~/.claude/skills/my-skill
```

```yaml
---
name: my-skill
description: What it does and when to use it
argument-hint: "[args]"
allowed-tools:
  - WebSearch
  - Read
---

Your instructions here...
```

### Key Frontmatter Options

| Field | Purpose | Example |
|---|---|---|
| `allowed-tools` | Which tools the skill can use | `[WebSearch, Bash, Read]` |
| `context: fork` | Run in isolated subagent | For heavy/verbose skills |
| `disable-model-invocation` | Manual-only (prevents auto-trigger) | For skills with side effects |
| `argument-hint` | Shown in autocomplete | `"[topic] [format]"` |
| `model` | Route to specific model | `sonnet`, `opus`, `haiku` |

---

## License

MIT — use, modify, and share freely.
