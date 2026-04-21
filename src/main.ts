import { createApp } from "./app";
import { loadPanelConfig } from "./config";
import { MockPanelDataProvider } from "./data/mockPanelDataProvider";
import { runGate } from "./gate";
import "./style.css";

async function bootstrap(): Promise<void> {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }

  const locationCode = await runGate(root);

  const baseUrl = import.meta.env.BASE_URL;
  const config = await loadPanelConfig(baseUrl);
  const mergedConfig = { ...config, locationLabel: locationCode };

  const provider = new MockPanelDataProvider(
    {
      locationLabel: mergedConfig.locationLabel,
      footfallToday: 10,
      temperatureC: 26,
      humidityPct: 64.4,
    },
    { simulateLiveUpdates: mergedConfig.simulateLiveUpdates, timezone: mergedConfig.timezone },
  );

  provider.start?.();

  createApp(root, mergedConfig, provider);
  installLandscapeGuard(root);

  if (import.meta.env.PROD) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
}

function installLandscapeGuard(root: HTMLElement): void {
  const blocker = document.createElement("div");
  blocker.className = "orientation-lock";
  blocker.setAttribute("role", "alert");
  blocker.setAttribute("aria-live", "assertive");
  blocker.innerHTML = `
    <div class="orientation-lock-card">
      <p class="orientation-lock-title">Landscape mode required</p>
      <p class="orientation-lock-text">Rotate this device to landscape to continue.</p>
    </div>
  `;
  root.appendChild(blocker);

  const portraitQuery = window.matchMedia("(orientation: portrait)");
  const updateOrientationState = (): void => {
    document.body.classList.toggle("portrait-blocked", portraitQuery.matches);
  };

  updateOrientationState();
  portraitQuery.addEventListener("change", updateOrientationState);
  window.addEventListener("resize", updateOrientationState);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  const root = document.getElementById("app");
  const message = error instanceof Error ? error.message : String(error);
  if (root) {
    root.innerHTML = `<pre style="color:#fff;padding:1.25rem;font-size:14px;white-space:pre-wrap;">${escapeHtml(
      message,
    )}</pre>`;
  }
});

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] ?? ch;
  });
}
