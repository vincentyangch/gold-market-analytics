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
