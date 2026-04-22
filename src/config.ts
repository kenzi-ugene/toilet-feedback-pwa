import type { Rating } from "./types/rating";

/** Matches Laravel `FeedbackRating` rows used on the legacy Blade panel. */
export interface FeedbackRatingConfig {
  rating: number;
  caption: string;
  image?: string | null;
  /** Laravel: 1 = active; omit or non-0 treated as active. */
  active?: number;
}

/** Matches Laravel `feedback_panel.items[]` (pivot to feedback panel). */
export interface FeedbackItemConfig {
  id: number;
  name: string;
  image: string;
}

export interface PanelConfig {
  /** Greeting line on Tier 1 (time-of-day prefix can be added in UI). */
  greeting: string;
  /** After Tier 3, return to Tier 1 automatically. */
  thankYouResetMs: number;
  /** Simulate changing metrics for demos (Phase 1 only). */
  simulateLiveUpdates: boolean;
  /** Optional IANA timezone for mock midnight footfall reset (Phase 1 demo). */
  timezone: string;
  /**
   * Base URL for uploaded assets (Laravel `RESOURCE_URL`), no trailing slash.
   * Used with `feedbackRatings[].image` and `feedbackItems[].image` paths.
   */
  resourceUrl?: string;
  /**
   * When present, Tier 1 uses these ratings (API order: higher `rating` = more positive).
   * Maps to internal ratings: 4 → excellent, 3 → good, 2 → neutral, 1 → poor.
   */
  feedbackRatings?: FeedbackRatingConfig[];
  /** Mirrors Laravel `feedback_panel.enable_ratings_feedback`. */
  enableRatingsFeedback?: boolean | null;
  /**
   * When present, Tier 2 shows these items with `Voyager`-style image paths.
   * Falls back to bundled static categories if missing or no resolvable images.
   */
  feedbackItems?: FeedbackItemConfig[];
  /** Optional base64 QR PNG payload from API (`qr_code`). */
  qrCodeBase64?: string;
  /** `feedback_panel.id` used by submit APIs. */
  feedbackPanelId?: number;
  /** Backend endpoint to fetch panel data after gate. */
  feedbackPanelItemsApiUrl?: string;
}

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

const defaultConfig: PanelConfig = {
  greeting: "Please rate our toilet!",
  thankYouResetMs: 8000,
  simulateLiveUpdates: true,
  timezone: "Asia/Singapore",
  enableRatingsFeedback: null,
  feedbackPanelItemsApiUrl: "http://ifsc.test/api/feedback/getFeedbackPanelItems",
};

/** Uses defaults as base and applies API-derived overrides. */
export async function loadPanelConfig(apiPatch: Partial<PanelConfig> = {}): Promise<PanelConfig> {
  return mergePanelConfig(defaultConfig, apiPatch);
}

/** Keep base config while applying backend/config patches. */
export function mergePanelConfig(base: PanelConfig, patch: Partial<PanelConfig>): PanelConfig {
  return { ...base, ...patch };
}
