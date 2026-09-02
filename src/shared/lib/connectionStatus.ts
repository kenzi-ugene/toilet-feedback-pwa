import { useEffect, useState } from "react";

export type ConnectionStatus = "checking" | "online" | "offline";

const PING_ASSET_PATH = "/favicon.svg";
const PING_TIMEOUT_MS = 5000;
const DEFAULT_PING_INTERVAL_MS = 20_000;

/** Same-origin HEAD request so a live kiosk can tell "server unreachable" apart from `navigator.onLine`, which only reflects the OS network adapter and can read true with no real connectivity. */
async function pingOnce(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return false;
  }
  if (typeof fetch === "undefined") {
    return true;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const response = await fetch(`${PING_ASSET_PATH}?ping=${Date.now()}`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function useConnectionStatus(intervalMs: number = DEFAULT_PING_INTERVAL_MS): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const check = async (): Promise<void> => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      const isOnline = await pingOnce();
      inFlight = false;
      if (!cancelled) {
        setStatus(isOnline ? "online" : "offline");
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), intervalMs);

    const onOnline = (): void => void check();
    const onOffline = (): void => setStatus("offline");
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);

  return status;
}
