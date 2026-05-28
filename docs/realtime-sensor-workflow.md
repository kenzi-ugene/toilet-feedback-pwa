# Realtime sensor workflow (frontend)

This document describes how the **toilet feedback PWA** consumes **live panel metrics** on Tier 1. Backend implementation details belong in your API docs; here we document **URLs**, **behavior**, and **frontend types**.

---

## URLs

Built in **`src/shared/api/endpoints.ts`** via **`buildPanelRealtimeUrls(realtimeBaseUrl, feedbackPanelId)`**:

| Purpose | Pattern |
|---------|---------|
| **SSE stream** | `{realtimeBase}/api/feedback/panels/{panelId}/stream` |
| **Snapshot fallback** | `{realtimeBase}/api/feedback/panels/{panelId}/latest-metrics` |

`realtimeBase` comes from **`VITE_PANEL_STREAM_BASE_URL`** (optional in defaults) and/or fields merged from the gate **`getFeedbackPanelItems`** response. **`feedbackPanelId`** is set from the authenticated panel payload (**`mapPanelResponseToConfigPatch`**).

If either base URL or panel id is missing, the provider runs with **no stream/fallback URLs** (metrics stay empty / stale until configured).

---

## Client implementation

**File:** **`src/shared/api/panelRealtime.ts`**

- **`createPanelRealtimeProvider`** implements **`PanelDataProvider`** (`shared/types/panelState.ts`).
- Prefers **Server-Sent Events** when **`streamUrl`** is set; tracks reconnects and may fall back to periodic **`latest-metrics`** GET when the stream is unhealthy or unavailable.
- Parses JSON payloads into **`Partial<PanelState>`** (footfall, temperature, humidity, timestamps). Field names may include aliases such as `footfall_today`, `temperature_c`, `humidity_pct` depending on backend payloads (see parser in the same module).
- Exposes **`RealtimeStatus`**: `connecting` | `live` | `reconnecting` | `stale` | `fallback` | `error` — surfaced on Tier 1 for operator-facing copy (**`Tier1Screen.tsx`**).

---

## Panel snapshot shape

**`PanelState`** (`src/shared/types/panelState.ts`):

- **`locationLabel`** — shown top-left; driven by **`locationCode`** from gate until overwritten by provider snapshot logic.
- **`footfall`**, **`temperatureC`**, **`humidityPct`** — nullable numbers for display formatting (“N/A” when missing).
- **`updatedAt`** — string used for “last updated” messaging.

---

## Security

- Browser calls go to **HTTPS** origins configured at build/deploy time.
- Optional **`VITE_PANEL_STREAM_WITH_CREDENTIALS`** enables credentialed **`EventSource`** when same-site/CORS requires cookies (see **`panelRealtime.ts`**).

---

## Operational notes

- After deploy, **invalidate CDN cache** if Tier 1 HTML or JS bundles are cached aggressively (see README redeploy section).
- For full gate + panel API contracts, align with your **`getFeedbackPanelItems`** and feedback submit endpoints consumed by **`gateApi.ts`** and **`feedbackApi.ts`**.
