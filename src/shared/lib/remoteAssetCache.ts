const REMOTE_ASSET_CACHE_NAME = "simpple-feedback-remote-assets";

export interface RemoteAssetStore {
  match(url: string): Promise<Blob | null>;
  put(url: string, blob: Blob): Promise<void>;
}

export interface LoadRemoteAssetOptions {
  store?: RemoteAssetStore;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
}

export function isRemoteAssetUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") {
    return false;
  }
  return /^https?:\/\//i.test(url.trim());
}

export function createAssetObjectUrl(blob: Blob): string {
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(blob);
  }
  return "blob:cached-asset";
}

export function revokeAssetObjectUrl(url: string | null | undefined): void {
  if (typeof url !== "string" || !url.startsWith("blob:")) {
    return;
  }
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function createCacheApiAssetStore(): RemoteAssetStore {
  return {
    async match(url: string): Promise<Blob | null> {
      const cache = await openRemoteAssetCache();
      if (!cache) {
        return null;
      }
      const response = await cache.match(url);
      if (!response || !response.ok) {
        return null;
      }
      const blob = await response.blob();
      return blob.size > 0 ? blob : null;
    },
    async put(url: string, blob: Blob): Promise<void> {
      const cache = await openRemoteAssetCache();
      if (!cache) {
        return;
      }
      const headers = new Headers();
      headers.set("Content-Type", blob.type || "image/png");
      await cache.put(url, new Response(blob, { headers }));
    },
  };
}

const defaultStore: RemoteAssetStore = createCacheApiAssetStore();

function isBrowserOnline(isOnline?: () => boolean): boolean {
  if (isOnline) {
    return isOnline();
  }
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine !== false;
}

async function openRemoteAssetCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") {
    return null;
  }
  try {
    return await caches.open(REMOTE_ASSET_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Prefer a previously downloaded copy. Only hits the network when nothing is stored
 * and the kiosk is online.
 */
export async function loadRemoteAssetUrl(
  remoteUrl: string,
  options: LoadRemoteAssetOptions = {},
): Promise<string | null> {
  if (!isRemoteAssetUrl(remoteUrl)) {
    return remoteUrl;
  }

  const store = options.store ?? defaultStore;
  const cached = await store.match(remoteUrl);
  if (cached) {
    return createAssetObjectUrl(cached);
  }

  if (!isBrowserOnline(options.isOnline)) {
    return null;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(remoteUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    await store.put(remoteUrl, blob);
    return createAssetObjectUrl(blob);
  } catch {
    return null;
  }
}

export { REMOTE_ASSET_CACHE_NAME };
