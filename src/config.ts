export interface PanelConfig {
  locationLabel: string;
  toiletId: string;
  /** Greeting line on Tier 1 (time-of-day prefix can be added in UI). */
  greeting: string;
  /** Brand / site title shown near the top (e.g. client logo text). */
  brandTitle: string;
  /** After Tier 3, return to Tier 1 automatically. */
  thankYouResetMs: number;
  /** Simulate changing metrics for demos (Phase 1 only). */
  simulateLiveUpdates: boolean;
  /** Optional IANA timezone for mock midnight footfall reset (Phase 1 demo). */
  timezone: string;
}

const defaultConfig: PanelConfig = {
  locationLabel: "Level 3 • North Wing • Toilet A",
  toiletId: "demo-1",
  greeting: "Please rate our toilet!",
  brandTitle: "",
  thankYouResetMs: 8000,
  simulateLiveUpdates: true,
  timezone: "Asia/Singapore",
};

/**
 * Vite sets `import.meta.env.BASE_URL` to `/` or `./` etc. Empty string is invalid
 * as the second argument to `new URL()` and throws "Failed to construct 'URL'".
 */
function resolveConfigFetchUrl(baseUrl: string): string {
  const raw = baseUrl?.trim() ?? "";
  if (!raw) {
    return new URL("panel.config.json", new URL("./", window.location.href)).href;
  }
  if (/^https?:\/\//i.test(raw)) {
    const withSlash = raw.endsWith("/") ? raw : `${raw}/`;
    return new URL("panel.config.json", withSlash).href;
  }
  return new URL("panel.config.json", new URL(raw, window.location.href)).href;
}

export async function loadPanelConfig(baseUrl: string): Promise<PanelConfig> {
  const url = resolveConfigFetchUrl(baseUrl);
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return defaultConfig;
    }
    const data = (await res.json()) as Partial<PanelConfig>;
    return { ...defaultConfig, ...data };
  } catch {
    return defaultConfig;
  }
}
