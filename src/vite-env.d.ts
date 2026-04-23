/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FEEDBACK_API_BASE_URL?: string;
  /** Base URL for panel asset paths (e.g. S3). No trailing slash required. */
  readonly VITE_AWS_RESOURCE_BASE_URL?: string;
}
