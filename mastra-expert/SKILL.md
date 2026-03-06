---
name: mastra-expert
version: "1.0.0"
description: Expert-level guidance for Mastra AI framework — agents, workflows, memory, RAG, MCP, tools, voice, models, evals, observability, server, and deployment. USE WHEN building Mastra apps, creating agents, designing workflows, configuring memory, setting up RAG pipelines, integrating MCP servers, adding voice, routing models, writing evals, or deploying to cloud.
argument-hint: "[task or question about Mastra]"
allowed-tools:
  - WebSearch
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# MastraExpert

Expert guidance for the Mastra TypeScript AI framework — building agents, workflows, memory systems, RAG pipelines, MCP integration, voice capabilities, model routing, evals, observability, server configuration, and deployment.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateAgent** | "create agent", "new agent", "build agent", "agent with tools" | `Workflows/CreateAgent.md` |
| **BuildWorkflow** | "create workflow", "build workflow", "orchestrate steps", "suspend resume" | `Workflows/BuildWorkflow.md` |
| **SetupProject** | "setup mastra", "new mastra project", "init mastra", "getting started" | `Workflows/SetupProject.md` |
| **ConfigureMemory** | "add memory", "configure memory", "RAG pipeline", "vector store", "semantic search" | `Workflows/ConfigureMemory.md` |
| **AddEvals** | "add evals", "create scorer", "evaluate agent", "observability", "tracing" | `Workflows/AddEvals.md` |
| **DeployProject** | "deploy mastra", "mastra build", "production deploy", "cloud deploy" | `Workflows/DeployProject.md` |

## Examples

**Example 1: Create an AI agent with tools**
```
User: "Create a Mastra agent that can search and summarize documents"
-> Invokes CreateAgent workflow
-> Guides through Agent class, tool creation, memory setup
-> Generates agent + tool + registration code
```

**Example 2: Build a multi-step workflow**
```
User: "Build a workflow that processes documents with human approval"
-> Invokes BuildWorkflow workflow
-> Guides through createWorkflow, createStep, suspend/resume
-> Generates workflow with HITL pattern
```

**Example 3: Set up a new Mastra project**
```
User: "Set up a new Mastra project with TypeScript"
-> Invokes SetupProject workflow
-> Runs through npx create-mastra@latest or manual install
-> Creates project structure with agent, tool, and Mastra entry point
```

**Example 4: Configure memory and RAG**
```
User: "Add semantic memory to my agent with vector search"
-> Invokes ConfigureMemory workflow
-> Sets up Memory class, vector store, embeddings, chunking
-> Generates complete RAG pipeline code
```

**Example 5: Add evaluation scorers**
```
User: "Add evals to measure my agent's response quality"
-> Invokes AddEvals workflow
-> Creates scorers with createScorer()
-> Sets up CI integration and observability
```

**Example 6: Deploy to production**
```
User: "Deploy my Mastra app to Vercel"
-> Invokes DeployProject workflow
-> Runs mastra build, configures deployment target
-> Sets up environment variables and monitoring
```

## Quick Reference

### Core Domains

| Domain | Context File |
|--------|--------------|
| Agents, networks, guardrails, processors | `Agents.md` |
| Workflow engine, control flow, HITL | `WorkflowEngine.md` |
| Memory system + RAG pipeline | `MemoryAndRag.md` |
| Server, auth, middleware, client | `ServerAndDeployment.md` |
| Voice providers, streaming patterns | `VoiceAndStreaming.md` |
| Evals, scorers, tracing, logging | `EvalsAndObservability.md` |
| MCP client/server, tool creation | `McpAndTools.md` |
| Model routing, gateways, providers | `ModelsAndProviders.md` |

### Key APIs

| API | Import | Purpose |
|-----|--------|---------|
| `Agent` | `@mastra/core/agent` | Create AI agents with tools, memory, voice |
| `createWorkflow` | `@mastra/core/workflows` | Graph-based workflow orchestration |
| `createStep` | `@mastra/core/workflows` | Individual workflow step |
| `createTool` | `@mastra/core/tools` | Define tools for agents |
| `Memory` | `@mastra/memory` | Agent memory (history, working, semantic) |
| `MDocument` | `@mastra/rag` | Document chunking for RAG |
| `MCPClient` | `@mastra/mcp` | Connect to MCP servers |
| `MCPServer` | `@mastra/mcp` | Expose resources as MCP |
| `Mastra` | `@mastra/core` | Central orchestrator/registry |
| `MastraClient` | `@mastra/client-js` | Type-safe API client |
| `createScorer` | `@mastra/evals` | Build evaluation scorers |
| `CompositeVoice` | `@mastra/core/voice` | Mix voice providers |
| `ModelRouterEmbeddingModel` | `@mastra/core/llm` | Unified embedding access |

### Model Format

```typescript
// Direct provider: "provider/model-name"
model: "openai/gpt-5.1"
model: "anthropic/claude-4-5-sonnet"
model: "google/gemini-2.5-flash"

// Gateway: "gateway/provider/model"
model: "openrouter/anthropic/claude-haiku-4-5"
model: "vercel/alibaba/qwen-3-14b"

// Local/custom
model: { id: "lmstudio/qwen3-30b", url: "http://localhost:1234/v1" }

// Dynamic
model: ({ requestContext }) => requestContext.get("tier") === "enterprise"
  ? "openai/gpt-5" : "openai/gpt-4o-mini"

// Fallbacks
model: [
  { model: "openai/gpt-5", maxRetries: 3 },
  { model: "anthropic/claude-4-5-sonnet", maxRetries: 2 },
]
```

### Project Structure

```
src/mastra/
├── index.ts          # Mastra entry point
├── agents/           # Agent definitions
├── tools/            # Tool definitions
├── workflows/        # Workflow definitions
└── scorers/          # Eval scorers
```

### Essential Commands

```bash
# Create new project
npx create-mastra@latest

# Development
mastra dev          # Start dev server + Studio

# Build & deploy
mastra build        # Build for production
mastra start        # Start production server

# Studio
mastra studio       # Standalone Studio UI
```

## Domain Summaries

### Agents
- `Agent` class with instructions, model, tools, memory, voice
- Agent networks for multi-agent routing
- Processors (input/output) for guardrails, moderation, PII detection
- Structured output with Zod schemas
- Tool approval and suspension patterns
- **Full guide:** Read `Agents.md`

### Workflow Engine
- `createWorkflow()` + `createStep()` for graph-based orchestration
- Control flow: `.then()`, `.parallel()`, `.branch()`, `.map()`, `.foreach()`, `.dountil()`
- Suspend/resume for human-in-the-loop
- Snapshots for state persistence
- Streaming with `writer` API
- **Full guide:** Read `WorkflowEngine.md`

### Memory & RAG
- 4 memory types: message history, working memory, semantic recall, observational
- 10+ storage adapters (PostgreSQL, libSQL, MongoDB, etc.)
- RAG pipeline: chunk -> embed -> store -> query -> rerank
- 17+ vector databases supported
- GraphRAG for relationship-based retrieval
- **Full guide:** Read `MemoryAndRag.md`

### Server & Deployment
- Hono-based HTTP server with middleware
- 8+ auth providers (JWT, Supabase, Auth0, Clerk, Firebase, WorkOS)
- RequestContext for dynamic runtime configuration
- MastraClient for type-safe API access
- Deploy to Vercel, Netlify, Cloudflare, AWS, Azure, DO, Mastra Cloud
- **Full guide:** Read `ServerAndDeployment.md`

### Voice & Streaming
- 10+ voice providers (OpenAI, ElevenLabs, PlayAI, Google, Deepgram, Azure)
- TTS, STT, real-time speech-to-speech
- CompositeVoice for mixing providers
- AI SDK integration for voice models
- **Full guide:** Read `VoiceAndStreaming.md`

### Evals & Observability
- `createScorer()` with fluent builder API
- 20+ built-in scorers (hallucination, toxicity, faithfulness)
- CI integration for automated evaluation
- 12+ tracing exporters (Langfuse, LangSmith, Datadog, Sentry)
- Custom span processors and formatters
- **Full guide:** Read `EvalsAndObservability.md`

### MCP & Tools
- MCPClient: connect to external MCP servers (stdio, SSE, HTTP)
- MCPServer: expose your agents/tools as MCP
- OAuth, elicitation, resources, prompts
- `createTool()` with lifecycle hooks
- `createVectorQueryTool()` and `createGraphRAGTool()`
- **Full guide:** Read `McpAndTools.md`

### Models & Providers
- 2,436 models from 81 providers via unified `"provider/model"` format
- Gateways: OpenRouter (183 models), Vercel (189 models)
- Model fallbacks with automatic retry
- Dynamic model selection via RequestContext
- Embedding models with ModelRouterEmbeddingModel
- **Full guide:** Read `ModelsAndProviders.md`

## Next Steps
After building with Mastra:
- Run `/stack-check` to verify all dependency versions are current
- Run `/secure-review` to audit the application's security
- Run `/script-writer [Mastra topic] youtube` to create content about the build
