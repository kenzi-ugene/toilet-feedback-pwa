# Toilet feedback panel (PWA)

Phase 1 delivers a **kiosk-style Progressive Web App** with three tiers:

1. **Tier 1** — Location (top-left), today’s footfall, temperature, humidity, and four rating actions.
2. **Tier 2** — Twelve improvement categories on a **single viewport** (6×2 grid on typical tablet landscape; reflows on narrow widths).
3. **Tier 3** — Thank you, then automatic return to Tier 1 (timer configurable).

Metrics use a **mock data provider** with optional simulated updates. The shape matches the planned Phase 2 API fields (`footfallToday`, `temperatureC`, `humidityPct`, `locationLabel`, `updatedAt`) so swapping in a real provider later is straightforward.

Feedback submissions are **logged to the browser console** in Phase 1 (no backend).

## Requirements

- Node.js 18+ and npm.

## Scripts

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build to dist/
npm run preview  # serve dist/ locally
npm test         # Vitest (tier navigation logic)
```

Deploy the contents of `**dist/**` to any HTTPS static host (S3, Netlify, nginx, etc.). PWAs require **HTTPS** (except `localhost`).

## Configuration

The app now uses in-code defaults for kiosk/base settings and loads feedback panel items/ratings from backend API after successful gate login (`/api/feedback/getFeedbackPanelItems`).


## Viewport and layout

- For the **6×2** Tier 2 layout without reflow, target at least **~1100px width** in landscape (see plan: e.g. **1280×800** tablets).
- The app uses `overflow: hidden` on the document to discourage scrolling on kiosk displays.

## Android kiosk: install and lock

These steps vary slightly by device and Android version; verify on your hardware.

1. **Open the panel URL in Chrome** (must be HTTPS in production).
2. **Install the PWA**: Chrome menu → **Install app** / **Add to Home screen** (wording varies).
3. **Open the installed app** from the home screen (runs in standalone/fullscreen-style mode).
4. **Lock to this app** (pick one approach):
  - **Screen pinning**: Settings → Security (or Accessibility) → enable **Screen pinning**. Open the PWA, tap Overview (Recents), pin this app. To unpin, hold Back + Overview per device instructions.
  - **Dedicated device / kiosk** (recommended for production): use **Android Enterprise**, **Kiosk Launcher**, or MDM (Intune, Workspace ONE, etc.) to allow only the browser or this PWA.
5. **Disable sleep** and set **brightness** as needed for a wall-mounted panel.

## Redeploy workflow (no USB updates)

1. Change config or UI in git.
2. Run `npm run build`.
3. Upload `**dist/`** to your host (invalidate CDN cache if applicable).
4. On the tablet, **close and reopen** the installed PWA (or clear site data if you cache aggressively). Service worker updates are handled by the generated worker (`registerSW`); a refresh after deploy usually picks up a new version.

## Phase 2 (not in this repo scope)

Backend REST snapshot, SSE/WebSocket push, VS121/GS301 ingestion, server-side midnight footfall, and POST + webhooks will replace the mock provider without changing the tier flow documented in the product plan.