import { afterEach, describe, expect, it, vi } from "vitest";
import { isRemoteAssetUrl, loadRemoteAssetUrl, type RemoteAssetStore } from "./remoteAssetCache";

function memoryStore(initial: Record<string, Blob> = {}): RemoteAssetStore & { saved: Record<string, Blob> } {
  const saved: Record<string, Blob> = { ...initial };
  return {
    saved,
    async match(url: string): Promise<Blob | null> {
      return saved[url] ?? null;
    },
    async put(url: string, blob: Blob): Promise<void> {
      saved[url] = blob;
    },
  };
}

describe("isRemoteAssetUrl", () => {
  it("accepts http(s) URLs only", () => {
    expect(isRemoteAssetUrl("https://cdn.example/face.png")).toBe(true);
    expect(isRemoteAssetUrl("/awesome_face.png")).toBe(false);
    expect(isRemoteAssetUrl(null)).toBe(false);
  });
});

describe("loadRemoteAssetUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the stored copy without fetching when it already exists", async () => {
    const remoteUrl = "https://cdn.example/awesome.png";
    const store = memoryStore({ [remoteUrl]: new Blob(["cached"], { type: "image/png" }) });
    const fetchImpl = vi.fn();

    const result = await loadRemoteAssetUrl(remoteUrl, {
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("downloads and stores the asset when online and nothing is cached", async () => {
    const remoteUrl = "https://cdn.example/good.png";
    const store = memoryStore();
    const blob = new Blob(["face"], { type: "image/png" });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });

    const result = await loadRemoteAssetUrl(remoteUrl, {
      store,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => true,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      remoteUrl,
      expect.objectContaining({ method: "GET" }),
    );
    expect(store.saved[remoteUrl]).toBe(blob);
    expect(result).toBeTruthy();
  });

  it("does not fetch when offline and nothing is cached", async () => {
    const fetchImpl = vi.fn();
    const result = await loadRemoteAssetUrl("https://cdn.example/sad.png", {
      store: memoryStore(),
      fetchImpl: fetchImpl as unknown as typeof fetch,
      isOnline: () => false,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
