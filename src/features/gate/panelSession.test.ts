import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPanelSession, getStoredPanelSession, savePanelSession } from "./panelSession";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("panelSession", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and restores the last successful panel payload", () => {
    savePanelSession("L1", { id: 7, location_code: "L1" });
    expect(getStoredPanelSession()).toEqual({
      locationCode: "L1",
      panelResponse: { id: 7, location_code: "L1" },
    });
  });

  it("clears the stored session", () => {
    savePanelSession("L1", { id: 7 });
    clearPanelSession();
    expect(getStoredPanelSession()).toBeNull();
  });
});
