import { describe, expect, it } from "vitest";
import { localTier2IconByName } from "./feedbackAssets";

describe("localTier2IconByName", () => {
  it("maps known labels to bundled public icons", () => {
    expect(localTier2IconByName("Dirty Wall")).toBe("/icon-dirty-wall.png");
    expect(localTier2IconByName("dirty wc")).toBe("/icon-dirty-wc.png");
    expect(localTier2IconByName("Soap Empty")).toBe("/icon-soap-empty.png");
  });

  it("falls back to a local icon when the name is unknown", () => {
    expect(localTier2IconByName("Something New")).toBe("/icon-dirty-wc.png");
  });
});
