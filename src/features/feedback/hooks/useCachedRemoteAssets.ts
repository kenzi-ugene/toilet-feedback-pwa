import { useEffect, useRef, useState } from "react";
import {
  isRemoteAssetUrl,
  loadRemoteAssetUrl,
  revokeAssetObjectUrl,
} from "../../../shared/lib/remoteAssetCache";

export function useCachedRemoteAssets(remoteUrls: readonly string[]): Record<string, string> {
  const [urlsByRemote, setUrlsByRemote] = useState<Record<string, string>>({});
  const objectUrlsRef = useRef<string[]>([]);
  const urlKey = remoteUrls.filter(isRemoteAssetUrl).sort().join("|");

  useEffect(() => {
    let cancelled = false;
    const uniqueUrls = urlKey === "" ? [] : urlKey.split("|");
    const resolved = new Set<string>();

    const remember = (remoteUrl: string, localUrl: string): void => {
      if (cancelled) {
        revokeAssetObjectUrl(localUrl);
        return;
      }
      objectUrlsRef.current.push(localUrl);
      setUrlsByRemote((current) => {
        const previous = current[remoteUrl];
        if (previous === localUrl) {
          return current;
        }
        if (previous) {
          revokeAssetObjectUrl(previous);
        }
        return { ...current, [remoteUrl]: localUrl };
      });
    };

    const hydrate = async (): Promise<void> => {
      for (const remoteUrl of uniqueUrls) {
        if (cancelled) {
          return;
        }
        if (resolved.has(remoteUrl)) {
          continue;
        }
        const localUrl = await loadRemoteAssetUrl(remoteUrl);
        if (localUrl && localUrl !== remoteUrl) {
          resolved.add(remoteUrl);
          remember(remoteUrl, localUrl);
        }
      }
    };

    void hydrate();

    const onOnline = (): void => {
      void hydrate();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
    }

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
      for (const objectUrl of objectUrlsRef.current) {
        revokeAssetObjectUrl(objectUrl);
      }
      objectUrlsRef.current = [];
    };
  }, [urlKey]);

  return urlsByRemote;
}
