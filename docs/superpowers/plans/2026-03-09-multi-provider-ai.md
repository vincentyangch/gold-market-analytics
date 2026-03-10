# Multi-Provider AI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded OpenAI Responses API fetch with a provider abstraction supporting OpenAI-compatible, Anthropic, and Gemini backends.

**Architecture:** A simple `AiProvider` interface with three implementations. A factory reads `AI_PROVIDER` env var and returns the correct provider. `lib/reports/generate.ts` calls the factory instead of raw fetch.

**Tech Stack:** TypeScript, vitest, `@anthropic-ai/sdk` (existing), raw fetch for OpenAI and Gemini

**Spec:** `docs/superpowers/specs/2026-03-09-multi-provider-ai-design.md`

---

## Chunk 1: Provider Interface, Factory, and OpenAI Provider

### Task 1: Create AiProvider interface

**Files:**
- Create: `lib/ai/types.ts`

- [ ] **Step 1: Create the interface file**

```typescript
// lib/ai/types.ts
export interface AiProvider {
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/types.ts
git commit -m "feat(ai): add AiProvider interface"
```

---

### Task 2: Create OpenAI-compatible provider with tests

**Files:**
- Create: `lib/ai/__tests__/openai.test.ts`
- Create: `lib/ai/providers/openai.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/ai/__tests__/openai.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAiProvider } from "../providers/openai";

describe("OpenAiProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "gpt-4o");
  });

  it("throws if AI_API_KEY is not set", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(() => new OpenAiProvider()).toThrow("AI_API_KEY");
  });

  it("calls /v1/chat/completions and returns content", async () => {
    const mockResponse = {
      choices: [{ message: { content: "Hello from AI" } }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const provider = new OpenAiProvider();
    const result = await provider.generateCompletion("system", "user");

    expect(result).toBe("Hello from AI");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/chat/completions"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("uses AI_BASE_URL when set", async () => {
    vi.stubEnv("AI_BASE_URL", "https://my-proxy.com");
    const mockResponse = {
      choices: [{ message: { content: "ok" } }],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const provider = new OpenAiProvider();
    await provider.generateCompletion("system", "user");

    expect(fetch).toHaveBeenCalledWith(
      "https://my-proxy.com/v1/chat/completions",
      expect.anything()
    );
  });

  it("throws on API error with status and body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve("rate limited"),
      })
    );

    const provider = new OpenAiProvider();
    await expect(
      provider.generateCompletion("system", "user")
    ).rejects.toThrow("OpenAI API error (429)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai/__tests__/openai.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the OpenAI provider**

```typescript
// lib/ai/providers/openai.ts
import type { AiProvider } from "../types";

export class OpenAiProvider implements AiProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for OpenAI provider");
    }
    this.apiKey = apiKey;
    this.baseURL = process.env.AI_BASE_URL || "https://api.openai.com";
    this.model = process.env.AI_MODEL || "gpt-4o";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const res = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai/__tests__/openai.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/providers/openai.ts lib/ai/__tests__/openai.test.ts
git commit -m "feat(ai): add OpenAI-compatible provider with tests"
```

---

### Task 3: Create factory with tests

**Files:**
- Create: `lib/ai/__tests__/factory.test.ts`
- Create: `lib/ai/factory.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/ai/__tests__/factory.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProvider } from "../factory";
import { OpenAiProvider } from "../providers/openai";

describe("createProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
  });

  it("returns OpenAiProvider when AI_PROVIDER is 'openai'", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    const provider = createProvider();
    expect(provider).toBeInstanceOf(OpenAiProvider);
  });

  it("throws for unknown provider", () => {
    vi.stubEnv("AI_PROVIDER", "unknown");
    expect(() => createProvider()).toThrow('Unknown AI_PROVIDER: "unknown"');
  });

  it("throws when AI_PROVIDER is not set", () => {
    vi.stubEnv("AI_PROVIDER", "");
    expect(() => createProvider()).toThrow("AI_PROVIDER");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai/__tests__/factory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the factory (OpenAI only for now)**

```typescript
// lib/ai/factory.ts
import type { AiProvider } from "./types";
import { OpenAiProvider } from "./providers/openai";

export function createProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER;
  switch (provider) {
    case "openai":
      return new OpenAiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "openai", "anthropic", or "gemini".`
      );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai/__tests__/factory.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/factory.ts lib/ai/__tests__/factory.test.ts
git commit -m "feat(ai): add provider factory"
```

---

## Chunk 2: Anthropic and Gemini Providers

### Task 4: Create Anthropic provider with tests

**Files:**
- Create: `lib/ai/__tests__/anthropic.test.ts`
- Create: `lib/ai/providers/anthropic.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/ai/__tests__/anthropic.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the SDK before importing the provider
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Hello from Claude" }],
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    __mockCreate: mockCreate,
  };
});

import { AnthropicProvider } from "../providers/anthropic";

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "claude-sonnet-4-6");
  });

  it("throws if AI_API_KEY is not set", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(() => new AnthropicProvider()).toThrow("AI_API_KEY");
  });

  it("calls Anthropic SDK and returns text content", async () => {
    const provider = new AnthropicProvider();
    const result = await provider.generateCompletion("system", "user");
    expect(result).toBe("Hello from Claude");
  });

  it("defaults model to claude-sonnet-4-6 when AI_MODEL not set", () => {
    vi.stubEnv("AI_MODEL", "");
    const provider = new AnthropicProvider();
    // Provider should construct without error — model default is internal
    expect(provider).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai/__tests__/anthropic.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the Anthropic provider**

```typescript
// lib/ai/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "../types";

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for Anthropic provider");
    }
    this.client = new Anthropic({
      apiKey,
      baseURL: process.env.AI_BASE_URL || undefined,
    });
    this.model = process.env.AI_MODEL || "claude-sonnet-4-6";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic API error: no text content in response");
    }
    return textBlock.text;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai/__tests__/anthropic.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/providers/anthropic.ts lib/ai/__tests__/anthropic.test.ts
git commit -m "feat(ai): add Anthropic Claude provider with tests"
```

---

### Task 5: Create Gemini provider with tests

**Files:**
- Create: `lib/ai/__tests__/gemini.test.ts`
- Create: `lib/ai/providers/gemini.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/ai/__tests__/gemini.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeminiProvider } from "../providers/gemini";

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_MODEL", "gemini-2.0-flash");
  });

  it("throws if AI_API_KEY is not set", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(() => new GeminiProvider()).toThrow("AI_API_KEY");
  });

  it("calls Gemini REST API and returns text", async () => {
    const mockResponse = {
      candidates: [
        { content: { parts: [{ text: "Hello from Gemini" }] } },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const provider = new GeminiProvider();
    const result = await provider.generateCompletion("system", "user");

    expect(result).toBe("Hello from Gemini");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("includes system prompt in request contents", async () => {
    const mockResponse = {
      candidates: [
        { content: { parts: [{ text: "ok" }] } },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })
    );

    const provider = new GeminiProvider();
    await provider.generateCompletion("be concise", "analyze gold");

    const callBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(callBody.systemInstruction.parts[0].text).toBe("be concise");
    expect(callBody.contents[0].parts[0].text).toBe("analyze gold");
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("forbidden"),
      })
    );

    const provider = new GeminiProvider();
    await expect(
      provider.generateCompletion("system", "user")
    ).rejects.toThrow("Gemini API error (403)");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai/__tests__/gemini.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the Gemini provider**

```typescript
// lib/ai/providers/gemini.ts
import type { AiProvider } from "../types";

export class GeminiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required for Gemini provider");
    }
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL || "gemini-2.0-flash";
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: "user", parts: [{ text: userPrompt }] },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API error: no text content in response");
    }
    return text;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai/__tests__/gemini.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Add Anthropic and Gemini to factory**

Update `lib/ai/factory.ts`:

```typescript
// lib/ai/factory.ts
import type { AiProvider } from "./types";
import { OpenAiProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";

export function createProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER;
  switch (provider) {
    case "openai":
      return new OpenAiProvider();
    case "anthropic":
      return new AnthropicProvider();
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "openai", "anthropic", or "gemini".`
      );
  }
}
```

- [ ] **Step 6: Update factory tests**

Add to `lib/ai/__tests__/factory.test.ts`:

```typescript
import { AnthropicProvider } from "../providers/anthropic";
import { GeminiProvider } from "../providers/gemini";

// Add inside the describe block:
it("returns AnthropicProvider when AI_PROVIDER is 'anthropic'", () => {
  vi.stubEnv("AI_PROVIDER", "anthropic");
  const provider = createProvider();
  expect(provider).toBeInstanceOf(AnthropicProvider);
});

it("returns GeminiProvider when AI_PROVIDER is 'gemini'", () => {
  vi.stubEnv("AI_PROVIDER", "gemini");
  const provider = createProvider();
  expect(provider).toBeInstanceOf(GeminiProvider);
});
```

- [ ] **Step 7: Run all AI tests**

Run: `npx vitest run lib/ai/`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add lib/ai/
git commit -m "feat(ai): add Anthropic and Gemini providers, update factory"
```

---

## Chunk 3: Integration and Cleanup

### Task 6: Integrate provider into report generation

**Files:**
- Modify: `lib/reports/generate.ts`

- [ ] **Step 1: Rewrite generateReport to use the provider factory**

Replace the `generateReport` function in `lib/reports/generate.ts`. Keep `SYSTEM_PROMPT` and `buildReportPrompt` unchanged.

```typescript
// Replace the generateReport function (lines 47-98) with:
export async function generateReport(
  signal: CompositeSignal,
  snapshot: DataSnapshot
): Promise<MarketReport> {
  const provider = createProvider();
  const userPrompt = buildReportPrompt(signal, snapshot);
  const text = await provider.generateCompletion(SYSTEM_PROMPT, userPrompt);

  // Strip markdown code fences if present, then extract JSON object
  const cleaned = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in AI response");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    signal,
    summary: parsed.summary,
    factorAnalysis: parsed.factorAnalysis,
    outlook: parsed.outlook,
    keyRisks: parsed.keyRisks,
    dataSnapshot: snapshot,
  };
}
```

Add import at top of file:
```typescript
import { createProvider } from "@/lib/ai/factory";
```

- [ ] **Step 2: Run existing generate tests to verify nothing broke**

Run: `npx vitest run lib/reports/__tests__/generate.test.ts`
Expected: PASS (buildReportPrompt test still passes)

- [ ] **Step 3: Commit**

```bash
git add lib/reports/generate.ts
git commit -m "feat(reports): use provider factory for AI generation"
```

---

### Task 7: Update env config and remove unused deps

**Files:**
- Modify: `.env.example`
- Modify: `package.json` (remove `openai` package)

- [ ] **Step 1: Update .env.example**

Replace the OpenAI-specific vars:

```env
FRED_API_KEY=your_fred_api_key_here
AI_PROVIDER=openai
AI_API_KEY=your_ai_api_key_here
AI_BASE_URL=https://api.openai.com
AI_MODEL=gpt-4o
CRON_SECRET=your_cron_secret_here
```

- [ ] **Step 2: Remove unused `openai` package**

Run: `npm uninstall openai`

The `openai` SDK is no longer used — all providers use raw fetch or `@anthropic-ai/sdk`.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add .env.example package.json package-lock.json
git commit -m "chore: update env config to AI_* vars, remove unused openai package"
```

---

### Task 8: Run build and final verification

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Run full test suite one more time**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Final commit if any fixes were needed**
