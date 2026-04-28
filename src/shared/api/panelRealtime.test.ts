import { describe, expect, it } from "vitest";
import { mergePanelSnapshot, parsePanelMetricsEvent } from "./panelRealtime";
import type { PanelState } from "../types/panelState";

describe("parsePanelMetricsEvent", () => {
  it("maps legacy key names to panel state", () => {
    const result = parsePanelMetricsEvent(
      JSON.stringify({
        panel_id: 3,
        footfall_today: 5,
        temperature_c: 22,
        humidity_pct: 40,
        received_at: "2026-04-23T12:00:00Z",
      }),
    );
    expect(result?.update.footfall).toBe(5);
    expect(result?.update.temperatureC).toBe(22);
    expect(result?.update.humidityPct).toBe(40);
  });

  it("parses canonical backend payload (footfall, temperature, humidity)", () => {
    const result = parsePanelMetricsEvent(
      JSON.stringify({
        panel_id: 22,
        footfall: 120,
        temperature: 27.4,
        humidity: 68.1,
        sensor_timestamp: "2026-04-23T10:22:10Z",
      }),
    );

    expect(result?.panelId).toBe(22);
    expect(result?.update.footfall).toBe(120);
    expect(result?.update.temperatureC).toBe(27.4);
    expect(result?.update.humidityPct).toBe(68.1);
  });

  it("returns null for invalid JSON", () => {
    expect(parsePanelMetricsEvent("{bad json}")).toBeNull();
  });
});

describe("mergePanelSnapshot", () => {
  it("keeps previous values for undefined updates", () => {
    const current: PanelState = {
      locationLabel: "L1",
      footfall: 50,
      temperatureC: 25.3,
      humidityPct: 65.2,
      updatedAt: "2026-04-23T10:00:00Z",
    };

    const merged = mergePanelSnapshot(current, { humidityPct: undefined }, "L1");
    expect(merged.footfall).toBe(50);
    expect(merged.temperatureC).toBe(25.3);
    expect(merged.humidityPct).toBe(65.2);
  });

  it("accepts explicit null values from backend", () => {
    const current: PanelState = {
      locationLabel: "L2",
      footfall: 12,
      temperatureC: 20,
      humidityPct: 55,
      updatedAt: "2026-04-23T10:00:00Z",
    };

    const merged = mergePanelSnapshot(current, { temperatureC: null }, "L2");
    expect(merged.temperatureC).toBeNull();
  });
});
