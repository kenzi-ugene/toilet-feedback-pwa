import { createApp } from "./app";
import { loadPanelConfig } from "./config";
import { MockPanelDataProvider } from "./data/mockPanelDataProvider";
import "./style.css";

async function bootstrap(): Promise<void> {
  const baseUrl = import.meta.env.BASE_URL;
  const config = await loadPanelConfig(baseUrl);

  const provider = new MockPanelDataProvider(
    {
      locationLabel: config.locationLabel,
      footfallToday: 10,
      temperatureC: 26,
      humidityPct: 64.4,
    },
    { simulateLiveUpdates: config.simulateLiveUpdates, timezone: config.timezone },
  );

  provider.start?.();

  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element");
  }

  createApp(root, config, provider);

  if (import.meta.env.PROD) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
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
