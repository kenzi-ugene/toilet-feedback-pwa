import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      VITE_PANEL_STREAM_BASE_URL: "http://ifsc.test",
      VITE_FEEDBACK_PANEL_ITEMS_PATH: "/api/feedback/getFeedbackPanelItems",
    },
  },
});
