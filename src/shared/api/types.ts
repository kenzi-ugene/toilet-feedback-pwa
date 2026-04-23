import type { FeedbackItemConfig, FeedbackRatingConfig } from "../../entities/panel/config";

export interface FeedbackPanelApiResponse {
  feedback_panel?: FeedbackPanelApiResponse | null;
  url?: string | null;
  qr_code?: string | null;
  id?: number;
  location_code?: string | null;
  location?: string | null;
  enable_ratings_feedback?: boolean | number;
  feedback_ratings?: FeedbackRatingConfig[];
  items?: FeedbackItemConfig[];
}

export interface GateAuthResult {
  isValid: boolean;
  panelResponse: FeedbackPanelApiResponse | null;
}
