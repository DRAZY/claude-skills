# Mastra Models & Providers

## Model Format

```typescript
// Direct: "provider/model-name"
model: "openai/gpt-5.1"
model: "anthropic/claude-opus-4-8"
model: "google/gemini-2.5-flash"
model: "xai/grok-4"

// Gateway: "gateway/provider/model"
model: "openrouter/anthropic/claude-haiku-4-5"
model: "vercel/alibaba/qwen-3-14b"

// Local/Custom
model: { id: "lmstudio/qwen3-30b", url: "http://localhost:1234/v1" }
model: { id: "custom/my-model", url: "http://your-endpoint.com/v1" }

// With custom headers
model: {
  id: "openai/gpt-4-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  headers: { "OpenAI-Organization": "org-abc123" },
}
```

## Dynamic Model Selection

```typescript
const agent = new Agent({
  id: "dynamic-agent",
  model: ({ requestContext }) => {
    const tier = requestContext.get("user-tier");
    if (tier === "enterprise") return "openai/gpt-5";
    if (tier === "pro") return "openai/gpt-4o";
    return "openai/gpt-4o-mini";
  },
});
```

## Model Fallbacks

```typescript
const agent = new Agent({
  id: "resilient-agent",
  model: [
    { model: "openai/gpt-5", maxRetries: 3 },
    { model: "anthropic/claude-opus-4-8", maxRetries: 2 },
    { model: "google/gemini-2.5-pro", maxRetries: 2 },
  ],
});
```

## AI SDK Provider Integration

```typescript
import { groq } from "@ai-sdk/groq";

const agent = new Agent({
  id: "groq-agent",
  model: groq("gemma2-9b-it"),
});

// Mix AI SDK with fallbacks
model: [
  groq("gemma2-9b-it"),
  { model: "openai/gpt-5", maxRetries: 2 },
]
```

## Provider-Specific Options

```typescript
// OpenAI
const response = await agent.generate("Hello", {
  providerOptions: {
    openai: { reasoningEffort: "high" },
  },
});

// Anthropic
const response = await agent.generate("Hello", {
  providerOptions: {
    anthropic: {
      thinking: { type: "adaptive", budgetTokens: 5000 },
      effort: "high",
    },
  },
});

// Google
const response = await agent.generate("Hello", {
  providerOptions: {
    google: {
      thinkingConfig: { thinkingBudget: 3000 },
      structuredOutputs: true,
    },
  },
});
```

## Embedding Models

```typescript
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embedMany, embed } from "ai";

// Generate embeddings
const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
  values: ["Hello world", "Semantic search"],
});

// Single embedding
const { embedding } = await embed({
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
  value: "search query",
});

// Custom local embedder
const embedder = new ModelRouterEmbeddingModel({
  providerId: "ollama",
  modelId: "nomic-embed-text",
  url: "http://localhost:11434/v1",
  apiKey: "not-needed",
});

// With dimension reduction (OpenAI text-embedding-3 only)
const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
  options: { dimensions: 256 },
  values: chunks,
});
```

## Common Embedding Dimensions

| Model | Dimensions |
|-------|-----------|
| `openai/text-embedding-3-small` | 1536 (or custom) |
| `openai/text-embedding-3-large` | 3072 (or custom) |
| `openai/text-embedding-ada-002` | 1536 |
| `google/gemini-embedding-001` | 768 |

## Major Providers

| Provider | Env Variable | Example Model |
|----------|-------------|---------------|
| OpenAI | `OPENAI_API_KEY` | `openai/gpt-5.1` |
| Anthropic | `ANTHROPIC_API_KEY` | `anthropic/claude-opus-4-8` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | `google/gemini-2.5-flash` |
| xAI | `XAI_API_KEY` | `xai/grok-4` |
| Mistral | `MISTRAL_API_KEY` | `mistral/mistral-large-latest` |
| Cohere | `COHERE_API_KEY` | `cohere/command-r-plus` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek/deepseek-chat` |
| Groq | `GROQ_API_KEY` | `groq/llama-3.1-70b` |

## Gateways

| Gateway | Models | Env Variable |
|---------|--------|-------------|
| OpenRouter | 183+ | `OPENROUTER_API_KEY` |
| Vercel | 189+ | `VERCEL_API_KEY` |
| Azure OpenAI | Custom | `AZURE_OPENAI_API_KEY` |
| Netlify | Custom | `NETLIFY_API_KEY` |
| AWS Bedrock | Various | AWS credentials |
| Fireworks | Various | `FIREWORKS_API_KEY` |

## Mastra Class Registration

```typescript
import { Mastra } from "@mastra/core";

export const mastra = new Mastra({
  agents: { myAgent },
  // Custom gateways
  gateways: {
    myGateway: new MyModelGateway({ apiKey: "..." }),
  },
});
```
