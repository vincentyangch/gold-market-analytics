# Multi-Provider AI Support

## Problem

Report generation is hardcoded to the OpenAI Responses API via raw fetch. The app should support multiple AI providers (OpenAI-compatible, Anthropic Claude, Google Gemini) as interchangeable backends, configured via environment variables.

## Design

### Provider Interface

```typescript
// lib/ai/types.ts
export interface AiProvider {
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}
```

A single method that takes a system prompt and user prompt, returns the raw text response. Each provider handles its own SDK/API specifics internally.

### File Structure

```
lib/ai/
  types.ts              # AiProvider interface
  factory.ts            # createProvider() factory
  providers/
    openai.ts           # OpenAI-compatible (Chat Completions API)
    anthropic.ts        # Anthropic Claude via @anthropic-ai/sdk
    gemini.ts           # Google Gemini via REST API
```

### Provider Implementations

**OpenAI-compatible** (`openai.ts`):
- Uses `/v1/chat/completions` endpoint (not Responses API) for broad proxy compatibility
- Reads `AI_API_KEY`, `AI_BASE_URL` (optional), `AI_MODEL`
- Raw fetch — no SDK dependency needed

**Anthropic Claude** (`anthropic.ts`):
- Uses `@anthropic-ai/sdk` (already in package.json)
- Reads `AI_API_KEY`, `AI_BASE_URL` (optional), `AI_MODEL`
- Default model: `claude-sonnet-4-6` if `AI_MODEL` not set

**Google Gemini** (`gemini.ts`):
- Uses raw fetch to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Reads `AI_API_KEY`, `AI_MODEL`
- Default model: `gemini-2.0-flash` if `AI_MODEL` not set

### Factory

```typescript
// lib/ai/factory.ts
export function createProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER;
  switch (provider) {
    case "openai":    return new OpenAiProvider();
    case "anthropic": return new AnthropicProvider();
    case "gemini":    return new GeminiProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER: "${provider}". Use "openai", "anthropic", or "gemini".`);
  }
}
```

### Integration Point

`lib/reports/generate.ts` changes from raw fetch to:

```typescript
const provider = createProvider();
const text = await provider.generateCompletion(SYSTEM_PROMPT, userPrompt);
```

The rest of `generateReport()` (JSON parsing, report construction) stays the same.

### Environment Variables

Replace `OPENAI_*` vars with generic `AI_*` vars:

```env
AI_PROVIDER=openai          # "openai" | "anthropic" | "gemini"
AI_API_KEY=sk-...
AI_BASE_URL=https://...     # optional, for proxies
AI_MODEL=gpt-5.4            # provider-specific model name
```

### Error Handling

- Missing `AI_PROVIDER` → throw with clear message listing valid options
- Missing `AI_API_KEY` → throw at provider construction time
- API errors → each provider wraps its error with provider name and status code

### Files Changed

- **Create:** `lib/ai/types.ts`, `lib/ai/factory.ts`, `lib/ai/providers/openai.ts`, `lib/ai/providers/anthropic.ts`, `lib/ai/providers/gemini.ts`
- **Modify:** `lib/reports/generate.ts` (use factory instead of raw fetch)
- **Modify:** `.env.example` (rename OPENAI_* to AI_*)
- **Remove:** `openai` package from dependencies (raw fetch used instead)
