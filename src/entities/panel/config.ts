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

const DEFAULT_FEEDBACK_API_BASE_URL = "http://ifsc.test";
const FEEDBACK_PANEL_ITEMS_PATH = "/api/feedback/getFeedbackPanelItems";

function resolveFeedbackPanelItemsApiUrlFromBaseUrl(baseUrl: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  return `${normalizedBase}${FEEDBACK_PANEL_ITEMS_PATH}`;
}

function resolveFeedbackPanelItemsApiUrl(): string {
  const envBaseUrl = import.meta.env.VITE_FEEDBACK_API_BASE_URL?.trim();
  const baseUrl = envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : DEFAULT_FEEDBACK_API_BASE_URL;
  return resolveFeedbackPanelItemsApiUrlFromBaseUrl(baseUrl);
}

const defaultConfig: PanelConfig = {
  thankYouResetMs: 8000,
  timezone: "Asia/Singapore",
  enableRatingsFeedback: null,
  feedbackPanelItemsApiUrl: resolveFeedbackPanelItemsApiUrl(),
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
  return mergePanelConfig(defaultConfig, apiPatch);
}

export function mergePanelConfig(base: PanelConfig, patch: Partial<PanelConfig>): PanelConfig {
  return { ...base, ...patch };
}
