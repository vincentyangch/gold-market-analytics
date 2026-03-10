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
