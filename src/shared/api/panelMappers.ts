import type { PanelConfig } from "../../entities/panel/config";
import type { FeedbackPanelApiResponse } from "./types";

export function mapPanelResponseToConfigPatch(data: FeedbackPanelApiResponse | null): Partial<PanelConfig> {
  const panel = extractFeedbackPanelPayload(data);
  if (!data || !panel) {
    return {};
  }

  const patch: Partial<PanelConfig> = {};
  if (typeof panel.id === "number") {
    patch.feedbackPanelId = panel.id;
  }
  if (typeof panel.enable_ratings_feedback !== "undefined") {
    patch.enableRatingsFeedback = Boolean(panel.enable_ratings_feedback);
  }

  const feedbackRatings = Array.isArray(data.feedback_ratings)
    ? data.feedback_ratings
    : Array.isArray(panel.feedback_ratings)
      ? panel.feedback_ratings
      : undefined;
  if (feedbackRatings) {
    patch.feedbackRatings = feedbackRatings;
  }
  if (Array.isArray(panel.items)) {
    patch.feedbackItems = panel.items;
  }
  if (typeof data.url === "string" && data.url.trim() !== "") {
    patch.resourceUrl = data.url.trim();
  }
  if (typeof data.qr_code === "string" && data.qr_code.trim() !== "") {
    patch.qrCodeBase64 = data.qr_code.trim();
  }

  return patch;
}

function extractFeedbackPanelPayload(data: FeedbackPanelApiResponse | null): FeedbackPanelApiResponse | null {
  if (!data) {
    return null;
  }
  if (data.feedback_panel && typeof data.feedback_panel === "object") {
    return data.feedback_panel;
  }
  return data;
}
