import type { PanelDataProvider, PanelState } from "../types/panelState";

type RealtimeStatus = "connecting" | "live" | "stale" | "error";

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
  latestMetricsUrl?: string;
}

interface CreatePanelRealtimeProviderOptions {
  locationLabel: string;
  panelId?: number;
  urls: RealtimeUrls;
  pollIntervalMs?: number;
  staleAfterMs?: number;
  onStatusChange?: (status: RealtimeStatus) => void;
  now?: () => number;
  fetchImpl?: typeof fetch;
}

interface PanelRealtimeProvider extends PanelDataProvider {
  getStatus(): RealtimeStatus;
  start(): void;
  stop(): void;
}

interface ParsedMetricsEvent {
  panelId?: number;
  update: Partial<PanelState>;
}

const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_STALE_AFTER_MS = 150_000;

export function createPanelRealtimeProvider(options: CreatePanelRealtimeProviderOptions): PanelRealtimeProvider {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => Date.now());

  let snapshot: PanelState = emptyPanelSnapshot(options.locationLabel);
  let status: RealtimeStatus = "connecting";
  let lastSuccessAtMs: number | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let staleCheckTimer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  let stopped = true;
  let abortController: AbortController | null = null;

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
    lastSuccessAtMs = now();
    setStatus("live");
    emit();
  };

  const readLatestMetrics = async (): Promise<void> => {
    if (stopped || inFlight || !options.urls.latestMetricsUrl) {
      return;
    }
    inFlight = true;
    abortController = new AbortController();
    try {
      const response = await fetchImpl(options.urls.latestMetricsUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: abortController.signal,
      });
      if (stopped) {
        return;
      }
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const payload = (await response.json()) as unknown;
      const parsed = parsePanelMetricsPayload(payload);
      if (!parsed) {
        setStatus("error");
        return;
      }
      if (typeof options.panelId === "number" && typeof parsed.panelId === "number" && parsed.panelId !== options.panelId) {
        return;
      }
      applySnapshotUpdate(parsed.update);
    } catch (error) {
      if (stopped || (error instanceof Error && error.name === "AbortError")) {
        return;
      }
      setStatus("error");
    } finally {
      inFlight = false;
      abortController = null;
    }
  };

  const onVisibilityChange = (): void => {
    if (typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }
    void readLatestMetrics();
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
      stopped = false;
      if (!options.urls.latestMetricsUrl) {
        setStatus("error");
        return;
      }
      setStatus("connecting");
      void readLatestMetrics();
      if (pollTimer === null) {
        pollTimer = setInterval(() => {
          void readLatestMetrics();
        }, pollIntervalMs);
      }
      if (staleCheckTimer === null) {
        staleCheckTimer = setInterval(() => {
          if (lastSuccessAtMs === null || status === "error") {
            return;
          }
          if (now() - lastSuccessAtMs > staleAfterMs) {
            setStatus("stale");
          }
        }, 5_000);
      }
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
    },
    stop(): void {
      stopped = true;
      abortController?.abort();
      abortController = null;
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (staleCheckTimer !== null) {
        clearInterval(staleCheckTimer);
        staleCheckTimer = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
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
