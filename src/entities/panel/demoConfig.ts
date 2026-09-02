import type { PanelState } from "../../shared/types/panelState";
import type { PanelConfig } from "./config";

/** Location code shown while no panel session is stored. Never persisted or sent to the backend. */
export const DEMO_LOCATION_CODE = "-";

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildDemoPanelSnapshot(locationLabel: string): PanelState {
  return {
    locationLabel,
    footfall: 1,
    temperatureC: randomIntInclusive(300, 320) / 10,
    humidityPct: randomIntInclusive(70, 75),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fake panel config used when storage has no saved gate setup / panel session yet
 * (fresh install, or after a logout). Keeps the kiosk screen populated and fully
 * interactive offline: no `feedbackPanelId`/`panelHeartbeatUrl`/`panelLatestMetricsUrl`
 * means rating submissions and realtime polling are both no-ops (see feedbackApi.ts,
 * panelRealtime.ts) rather than failing network calls.
 */
export const DEMO_PANEL_CONFIG: PanelConfig = {
  thankYouResetMs: 8000,
  timezone: "Asia/Singapore",
  enableRatingsFeedback: true,
  feedbackRatings: [
    { rating: 4, caption: "Awesome", active: 1 },
    { rating: 3, caption: "Good", active: 1 },
    { rating: 2, caption: "Neutral", active: 1 },
    { rating: 1, caption: "Poor", active: 1 },
  ],
  feedbackItems: [
    { id: 1, name: "Dirty Wall" },
    { id: 2, name: "Dirty WC" },
    { id: 3, name: "Dirty Basin" },
    { id: 4, name: "Dirty Cubicle" },
    { id: 5, name: "Wet Floor" },
    { id: 6, name: "Smelly" },
    { id: 7, name: "Toilet Roll Empty" },
    { id: 8, name: "Soap Empty" },
  ],
};
