import { describe, expect, it } from "vitest";
import { nextNetworkRetryDelayMs } from "./retry";

describe("nextNetworkRetryDelayMs", () => {
  it("uses exponential delays and then caps", () => {
    expect(nextNetworkRetryDelayMs(0)).toBe(2_000);
    expect(nextNetworkRetryDelayMs(1)).toBe(4_000);
    expect(nextNetworkRetryDelayMs(4)).toBe(30_000);
    expect(nextNetworkRetryDelayMs(9)).toBe(30_000);
  });
});
