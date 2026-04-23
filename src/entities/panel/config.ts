import type { Rating } from "../../shared/types/rating";

export interface FeedbackRatingConfig {
  rating: number;
  caption: string;
  image?: string | null;
  active?: number;
}

export interface FeedbackItemConfig {
  id: number;
  name: string;
  image: string;
}

export interface PanelConfig {
  greeting: string;
  thankYouResetMs: number;
  simulateLiveUpdates: boolean;
  timezone: string;
  resourceUrl?: string;
  feedbackRatings?: FeedbackRatingConfig[];
  enableRatingsFeedback?: boolean | null;
  feedbackItems?: FeedbackItemConfig[];
  qrCodeBase64?: string;
  feedbackPanelId?: number;
  feedbackPanelItemsApiUrl?: string;
}

const defaultConfig: PanelConfig = {
  greeting: "Please rate our toilet!",
  thankYouResetMs: 8000,
  simulateLiveUpdates: true,
  timezone: "Asia/Singapore",
  enableRatingsFeedback: null,
  feedbackPanelItemsApiUrl: "http://ifsc.test/api/feedback/getFeedbackPanelItems",
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
