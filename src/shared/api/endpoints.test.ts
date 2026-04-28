import { describe, expect, it } from "vitest";
import { buildPanelRealtimeUrls } from "./endpoints";

describe("buildPanelRealtimeUrls", () => {
  it("builds stream and latest endpoints from base + panel ID", () => {
    const urls = buildPanelRealtimeUrls("https://stage.simpple.app/", 7);
    expect(urls.streamUrl).toBe("https://stage.simpple.app/api/feedback/panels/7/stream");
    expect(urls.latestMetricsUrl).toBe("https://stage.simpple.app/api/feedback/panels/7/latest-metrics");
  });

  it("returns empty object when base or panel ID is missing", () => {
    expect(buildPanelRealtimeUrls(undefined, 7)).toEqual({});
    expect(buildPanelRealtimeUrls("https://stage.simpple.app", undefined)).toEqual({});
  });
});
