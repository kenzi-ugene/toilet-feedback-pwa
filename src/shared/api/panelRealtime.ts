import type { PanelDataProvider, PanelState } from "../types/panelState";

type RealtimeStatus = "connecting" | "live" | "reconnecting" | "stale" | "fallback" | "error";

interface SensorMetricsEventPayload {
  panel_id?: number;
  /** Canonical keys from FeedbackPanelRealtimeService */
  footfall?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  /** Legacy / alternate names */
  footfall_today?: number | null;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  sensor_timestamp?: string | null;
  received_at?: string | null;
}

interface RealtimeUrls {
  streamUrl?: string;
  latestMetricsUrl?: string;
}

interface CreatePanelRealtimeProviderOptions {
  locationLabel: string;
  panelId?: number;
  urls: RealtimeUrls;
  staleAfterMs?: number;
  fallbackPollIntervalMs?: number;
  reconnectToFallbackThreshold?: number;
  onStatusChange?: (status: RealtimeStatus) => void;
  now?: () => number;
  fetchImpl?: typeof fetch;
  /** When true, EventSource uses cookie credentials (same-site or CORS with credentials). */
  eventSourceWithCredentials?: boolean;
  eventSourceFactory?: (url: string, withCredentials?: boolean) => EventSource;
}

interface PanelRealtimeProvider extends PanelDataProvider {
  getStatus(): RealtimeStatus;
}

interface ParsedMetricsEvent {
  panelId?: number;
  update: Partial<PanelState>;
}

const DEFAULT_STALE_AFTER_MS = 45_000;
const DEFAULT_FALLBACK_POLL_INTERVAL_MS = 15_000;
const DEFAULT_RECONNECT_TO_FALLBACK_THRESHOLD = 3;

export function createPanelRealtimeProvider(options: CreatePanelRealtimeProviderOptions): PanelRealtimeProvider {
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const fallbackPollIntervalMs = options.fallbackPollIntervalMs ?? DEFAULT_FALLBACK_POLL_INTERVAL_MS;
  const reconnectThreshold = options.reconnectToFallbackThreshold ?? DEFAULT_RECONNECT_TO_FALLBACK_THRESHOLD;
  const fetchImpl = options.fetchImpl ?? fetch;
  const streamWithCredentials =
    options.eventSourceWithCredentials === true ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_PANEL_STREAM_WITH_CREDENTIALS === "true");
  const eventSourceFactory =
    options.eventSourceFactory ??
    ((url: string, withCredentials?: boolean) => {
      if (withCredentials) {
        return new EventSource(url, { withCredentials: true });
      }
      return new EventSource(url);
    });
  const now = options.now ?? (() => Date.now());

  let snapshot: PanelState = emptyPanelSnapshot(options.locationLabel);
  let status: RealtimeStatus = "connecting";
  let reconnectErrors = 0;
  let lastEventAtMs: number | null = null;
  let eventSource: EventSource | null = null;
  let staleCheckTimer: number | null = null;
  let fallbackPollTimer: number | null = null;

  const listeners = new Set<() => void>();

  const emit = (): void => {
    listeners.forEach((listener) => listener());
  };

  const setStatus = (nextStatus: RealtimeStatus): void => {
    if (status === nextStatus) {
      return;
    }
    status = nextStatus;
    options.onStatusChange?.(status);
    emit();
  };

  const applySnapshotUpdate = (update: Partial<PanelState>): void => {
    snapshot = mergePanelSnapshot(snapshot, update, options.locationLabel);
    lastEventAtMs = now();
    reconnectErrors = 0;
    setStatus("live");
    emit();
  };

  const readLatestMetrics = async (): Promise<void> => {
    if (!options.urls.latestMetricsUrl) {
      return;
    }
    try {
      const response = await fetchImpl(options.urls.latestMetricsUrl, { method: "GET", credentials: "include" });
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const payload = (await response.json()) as unknown;
      const parsed = parsePanelMetricsPayload(payload);
      if (!parsed) {
        return;
      }
      if (typeof options.panelId === "number" && typeof parsed.panelId === "number" && parsed.panelId !== options.panelId) {
        return;
      }
      applySnapshotUpdate(parsed.update);
    } catch {
      setStatus("error");
    }
  };

  const ensureFallbackPolling = (): void => {
    if (fallbackPollTimer !== null || !options.urls.latestMetricsUrl) {
      return;
    }
    setStatus("fallback");
    void readLatestMetrics();
    fallbackPollTimer = window.setInterval(() => {
      void readLatestMetrics();
    }, fallbackPollIntervalMs);
  };

  const stopFallbackPolling = (): void => {
    if (fallbackPollTimer !== null) {
      window.clearInterval(fallbackPollTimer);
      fallbackPollTimer = null;
    }
  };

  const connectStream = (): void => {
    if (!options.urls.streamUrl) {
      ensureFallbackPolling();
      return;
    }
    setStatus("connecting");
    eventSource = eventSourceFactory(options.urls.streamUrl, streamWithCredentials);

    eventSource.addEventListener("open", () => {
      if (status !== "live") {
        setStatus("connecting");
      }
    });

    eventSource.addEventListener("sensor.metrics", (event) => {
      const parsed = parsePanelMetricsEvent((event as MessageEvent).data);
      if (!parsed) {
        return;
      }
      if (typeof options.panelId === "number" && typeof parsed.panelId === "number" && parsed.panelId !== options.panelId) {
        return;
      }
      applySnapshotUpdate(parsed.update);
    });

    eventSource.addEventListener("message", (event) => {
      const parsed = parsePanelMetricsEvent((event as MessageEvent).data);
      if (!parsed) {
        return;
      }
      if (typeof options.panelId === "number" && typeof parsed.panelId === "number" && parsed.panelId !== options.panelId) {
        return;
      }
      applySnapshotUpdate(parsed.update);
    });

    eventSource.addEventListener("error", () => {
      reconnectErrors += 1;
      setStatus("reconnecting");
      if (reconnectErrors >= reconnectThreshold) {
        eventSource?.close();
        eventSource = null;
        ensureFallbackPolling();
      }
    });
  };

  return {
    getSnapshot(): PanelState {
      return snapshot;
    },
    getStatus(): RealtimeStatus {
      return status;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(): void {
      connectStream();
      if (staleCheckTimer === null) {
        staleCheckTimer = window.setInterval(() => {
          if (lastEventAtMs === null || status === "fallback") {
            return;
          }
          if (now() - lastEventAtMs > staleAfterMs) {
            setStatus("stale");
          }
        }, 5_000);
      }
    },
    stop(): void {
      eventSource?.close();
      eventSource = null;
      stopFallbackPolling();
      if (staleCheckTimer !== null) {
        window.clearInterval(staleCheckTimer);
        staleCheckTimer = null;
      }
    },
  };
}

function emptyPanelSnapshot(locationLabel: string): PanelState {
  return {
    locationLabel,
    footfall: null,
    temperatureC: null,
    humidityPct: null,
    updatedAt: "N/A",
  };
}

export function parsePanelMetricsEvent(rawEvent: string): ParsedMetricsEvent | null {
  try {
    const parsed = JSON.parse(rawEvent) as unknown;
    return parsePanelMetricsPayload(parsed);
  } catch {
    return null;
  }
}

function parsePanelMetricsPayload(payload: unknown): ParsedMetricsEvent | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const row = payload as SensorMetricsEventPayload;
  const panelId = asFiniteNumber(row.panel_id);
  return {
    panelId: panelId === null ? undefined : panelId,
    update: {
      footfall: asFiniteNumber(firstDefinedMetric(row.footfall, row.footfall_today)),
      temperatureC: asFiniteNumber(firstDefinedMetric(row.temperature, row.temperature_c)),
      humidityPct: asFiniteNumber(firstDefinedMetric(row.humidity, row.humidity_pct)),
    },
  };
}

/** Prefer first argument when it is defined (including null); else second. */
function firstDefinedMetric(a: unknown, b: unknown): unknown {
  if (typeof a !== "undefined") {
    return a;
  }
  return b;
}

function asFiniteNumber(value: unknown): number | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

export function mergePanelSnapshot(current: PanelState, update: Partial<PanelState>, locationLabel: string): PanelState {
  return {
    locationLabel: update.locationLabel ?? current.locationLabel ?? locationLabel,
    footfall: pickNullableNumber(update.footfall, current.footfall),
    temperatureC: pickNullableNumber(update.temperatureC, current.temperatureC),
    humidityPct: pickNullableNumber(update.humidityPct, current.humidityPct),
    updatedAt: new Date().toISOString(),
  };
}

function pickNullableNumber(nextValue: number | null | undefined, currentValue: number | null): number | null {
  if (typeof nextValue === "number" || nextValue === null) {
    return nextValue;
  }
  return currentValue;
}

export type { PanelRealtimeProvider, RealtimeStatus, RealtimeUrls };
