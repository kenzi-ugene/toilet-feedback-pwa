import type { PanelConfig } from "../../entities/panel/config";
import { ratingToSubmitLabel } from "../../entities/panel/config";
import type { Rating } from "../types/rating";
import { buildFeedbackEndpoints, buildTier2SubmitUrl } from "./endpoints";
import { getCurrentIpv4Address } from "./ip";

export async function submitPositiveRatingFeedback(config: PanelConfig, rating: Rating): Promise<void> {
  if (!(rating === "excellent" || rating === "good")) {
    return;
  }
  if (!config.feedbackPanelId) {
    return;
  }

  const endpoints = buildFeedbackEndpoints(config.feedbackPanelItemsApiUrl);
  const ip = await getCurrentIpv4Address();
  if (!ip) {
    throw new Error("CANT_GET_IP");
  }

  try {
    const isAvailable = await callFeedbackAvailability(endpoints.availabilityUrl, config.feedbackPanelId, ip);
    if (!isAvailable) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
      throw error;
    }
  }

  const ratingLabel = ratingToSubmitLabel(rating);
  const payload = new URLSearchParams({
    rating: ratingLabel,
    description: ratingLabel,
    feedback_panel_id: String(config.feedbackPanelId),
    ip,
    patron_name: "",
    patron_mobile_number: "",
    lat: "",
    lng: "",
  });

  try {
    const submitResponse = await fetch(endpoints.submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: payload.toString(),
    });
    if (!submitResponse.ok) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
    const submitData = (await submitResponse.json()) as unknown;
    if (submitData === false) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
      throw error;
    }
    throw new Error("FEEDBACK_COOLDOWN");
  }
}

export async function submitNegativeRatingFeedback(
  config: PanelConfig,
  rating: Rating,
  selectedItemIds: string[],
): Promise<void> {
  if (!(rating === "neutral" || rating === "poor")) {
    return;
  }
  if (!config.feedbackPanelId || selectedItemIds.length === 0) {
    return;
  }

  const endpoints = buildFeedbackEndpoints(config.feedbackPanelItemsApiUrl);
  const submitUrl = buildTier2SubmitUrl(config.feedbackPanelItemsApiUrl, endpoints.submitUrl);
  const ip = await getCurrentIpv4Address();
  if (!ip) {
    throw new Error("CANT_GET_IP");
  }

  try {
    const isAvailable = await callFeedbackAvailability(endpoints.availabilityUrl, config.feedbackPanelId, ip);
    if (!isAvailable) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
      throw error;
    }
  }

  const ratingLabel = toNegativeSubmitLabel(rating);
  const normalizedItemIds = normalizeNumericItemIds(selectedItemIds);
  if (normalizedItemIds.length === 0) {
    throw new Error("ITEM_ID_REQUIRED");
  }
  const payload = new URLSearchParams({
    rating: ratingLabel,
    description: ratingLabel,
    feedback_panel_id: String(config.feedbackPanelId),
    ip,
    patron_name: "",
    patron_mobile_number: "",
    comments: "",
    lat: "",
    lng: "",
  });

  for (const itemId of normalizedItemIds) {
    payload.append("item_id[]", itemId);
  }

  try {
    const submitResponse = await fetch(submitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: payload.toString(),
    });
    if (!submitResponse.ok) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
    const submitData = (await submitResponse.json()) as unknown;
    if (submitData === false) {
      throw new Error("FEEDBACK_COOLDOWN");
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
      throw error;
    }
    throw new Error("FEEDBACK_COOLDOWN");
  }
}

function normalizeNumericItemIds(selectedItemIds: string[]): string[] {
  const numericIds = new Set<string>();
  for (const itemId of selectedItemIds) {
    const trimmed = itemId.trim();
    if (/^\d+$/.test(trimmed)) {
      numericIds.add(trimmed);
    }
  }
  return [...numericIds];
}

function toNegativeSubmitLabel(rating: Rating): string {
  if (rating === "poor") {
    return "Bad";
  }
  return ratingToSubmitLabel(rating);
}

async function callFeedbackAvailability(availabilityUrl: string, feedbackPanelId: number, ip: string): Promise<boolean> {
  const url = new URL(availabilityUrl);
  url.searchParams.set("feedback_panel_id", String(feedbackPanelId));
  url.searchParams.set("ip", ip);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return true;
  }

  const data = (await response.json()) as unknown;
  return data !== false;
}
