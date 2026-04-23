/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Required at runtime. Feedback API origin (no trailing slash). Set in .env — see .env.example. */
  readonly VITE_FEEDBACK_API_BASE_URL?: string;
  /** Required at runtime. Path to getFeedbackPanelItems. Set in .env — see .env.example. */
  readonly VITE_FEEDBACK_PANEL_ITEMS_PATH?: string;
  /** Required at runtime. Base URL for panel asset paths (e.g. S3). Set in .env — see .env.example. */
  readonly VITE_AWS_RESOURCE_BASE_URL?: string;
}
