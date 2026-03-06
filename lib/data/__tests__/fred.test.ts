import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMacroData } from "../fred";

// Mock next/cache since unstable_cache doesn't exist in vitest
vi.mock("next/cache", () => ({
  unstable_cache: (fn: Function) => fn,
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFredResponse(value: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        observations: [{ date: "2025-12-01", value }],
      }),
  };
}

describe("FRED client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRED_API_KEY = "test-key";
  });

  it("fetches and computes macro data including real rate", async () => {
    mockFetch
      .mockResolvedValueOnce(mockFredResponse("5.33"))  // fed funds
      .mockResolvedValueOnce(mockFredResponse("314.5"))  // CPI
      .mockResolvedValueOnce(mockFredResponse("4.25"))   // 10Y treasury
      .mockResolvedValueOnce(mockFredResponse("2.35"));  // 5Y breakeven

    const data = await getMacroData();

    expect(data.fedFundsRate).toBe(5.33);
    expect(data.cpi).toBe(314.5);
    expect(data.treasury10Y).toBe(4.25);
    expect(data.breakeven5Y).toBe(2.35);
    expect(data.realRate).toBeCloseTo(2.98); // 5.33 - 2.35
  });

  it("throws if FRED_API_KEY is missing", async () => {
    delete process.env.FRED_API_KEY;
    await expect(getMacroData()).rejects.toThrow("FRED_API_KEY");
  });
});
