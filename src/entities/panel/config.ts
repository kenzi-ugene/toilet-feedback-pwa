import type { Rating } from "../../shared/types/rating";

export interface FeedbackRatingConfig {
  rating: number;
  caption: string;
  image?: string | null;
  active?: number;
}

/** Shape aligned with getFeedbackPanelItems panel `items` (id, name, image path or absolute URL). */
export interface FeedbackItemConfig {
  id: number;
  name: string;
  image?: string | null;
}

export interface PanelConfig {
  thankYouResetMs: number;
  timezone: string;
  resourceUrl?: string;
  feedbackRatings?: FeedbackRatingConfig[];
  enableRatingsFeedback?: boolean | null;
  feedbackItems?: FeedbackItemConfig[];
  qrCodeBase64?: string;
  feedbackPanelId?: number;
  feedbackPanelItemsApiUrl?: string;
}

export class MissingFeedbackPanelEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingFeedbackPanelEnvError";
  }
}

type FeedbackPanelItemsEnvKey = "VITE_FEEDBACK_API_BASE_URL" | "VITE_FEEDBACK_PANEL_ITEMS_PATH";

function requireStringEnv(name: FeedbackPanelItemsEnvKey): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.trim() === "") {
    const instruction = `Add ${name} to a .env file in the project root (copy from .env.example). Without it the app cannot call getFeedbackPanelItems. Restart the dev server after changing .env.`;
    const message = `${name} is missing or empty.\n\n${instruction}`;
    console.error(`[toilet-feedback-pwa] ${message}`);
    throw new MissingFeedbackPanelEnvError(message);
  }
  return value.trim();
}

function buildFeedbackPanelItemsApiUrlFromEnv(): string {
  const base = requireStringEnv("VITE_FEEDBACK_API_BASE_URL");
  const path = requireStringEnv("VITE_FEEDBACK_PANEL_ITEMS_PATH");
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

let cachedFeedbackPanelItemsApiUrl: string | undefined;

/**
 * Full URL for the getFeedbackPanelItems endpoint. Required env: {@link VITE_FEEDBACK_API_BASE_URL}, {@link VITE_FEEDBACK_PANEL_ITEMS_PATH}.
 * Throws {@link MissingFeedbackPanelEnvError} with a clear message if either is unset.
 */
export function getFeedbackPanelItemsApiUrl(): string {
  if (cachedFeedbackPanelItemsApiUrl !== undefined) {
    return cachedFeedbackPanelItemsApiUrl;
  }
  cachedFeedbackPanelItemsApiUrl = buildFeedbackPanelItemsApiUrlFromEnv();
  return cachedFeedbackPanelItemsApiUrl;
}

const defaultPanelConfig: Omit<PanelConfig, "feedbackPanelItemsApiUrl"> = {
  thankYouResetMs: 8000,
  timezone: "Asia/Singapore",
  enableRatingsFeedback: null,
};

export function ratingToSubmitLabel(rating: Rating): string {
  switch (rating) {
    case "excellent":
      return "Awesome";
    case "good":
      return "Good";
    case "neutral":
      return "Neutral";
    case "poor":
      return "Poor";
    default:
      return rating;
  }
}

export async function loadPanelConfig(apiPatch: Partial<PanelConfig> = {}): Promise<PanelConfig> {
  return mergePanelConfig(
    { ...defaultPanelConfig, feedbackPanelItemsApiUrl: getFeedbackPanelItemsApiUrl() },
    apiPatch,
  );
}

export function mergePanelConfig(base: PanelConfig, patch: Partial<PanelConfig>): PanelConfig {
  return { ...base, ...patch };
}
