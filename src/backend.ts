import type { FeedbackItemConfig, FeedbackRatingConfig, PanelConfig } from "./config";
import { ratingToSubmitLabel } from "./config";
import type { Rating } from "./types/rating";

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

interface GateAuthPayload {
  locationCode: string;
  password: string;
}

const INVALID_AUTH_RESULT: GateAuthResult = {
  isValid: false,
  panelResponse: null,
};

function asPanelResponse(data: unknown): FeedbackPanelApiResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as FeedbackPanelApiResponse;
}

export interface GateAuthResult {
  isValid: boolean;
  panelResponse: FeedbackPanelApiResponse | null;
}

/**
 * Authenticates gate credentials and fetches feedback panel items/ratings.
 * API is expected to return `false` for invalid credentials.
 */
export async function authenticateGateWithBackend(
  config: PanelConfig,
  payload: GateAuthPayload,
): Promise<GateAuthResult> {
  const endpoint = config.feedbackPanelItemsApiUrl?.trim();
  if (!endpoint) {
    return INVALID_AUTH_RESULT;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_code: payload.locationCode,
        password: payload.password,
      }),
    });
    if (!res.ok) {
      return INVALID_AUTH_RESULT;
    }

    const raw = await res.json();
    if (raw === false) {
      return INVALID_AUTH_RESULT;
    }

    const data = asPanelResponse(raw);
    if (!data) {
      return INVALID_AUTH_RESULT;
    }

    return { isValid: true, panelResponse: data };
  } catch {
    return INVALID_AUTH_RESULT;
  }
}

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
    // Continue submit flow for network/temporary availability-check errors.
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

function buildFeedbackEndpoints(panelItemsUrl: string | undefined): { availabilityUrl: string; submitUrl: string } {
  const fallbackBase = "http://ifsc.test/api/feedback";
  const raw = panelItemsUrl?.trim() ?? "";
  if (!raw) {
    return {
      availabilityUrl: `${fallbackBase}/getFeedbackAvailability`,
      submitUrl: `${fallbackBase}/getFeedback`,
    };
  }

  const base = raw.replace(/\/getFeedbackPanelItems(?:\?.*)?$/i, "");
  if (base !== raw) {
    return {
      availabilityUrl: `${base}/getFeedbackAvailability`,
      submitUrl: `${base}/getFeedback`,
    };
  }

  try {
    const url = new URL(raw);
    const root = `${url.origin}/api/feedback`;
    return {
      availabilityUrl: `${root}/getFeedbackAvailability`,
      submitUrl: `${root}/getFeedback`,
    };
  } catch {
    return {
      availabilityUrl: `${fallbackBase}/getFeedbackAvailability`,
      submitUrl: `${fallbackBase}/getFeedback`,
    };
  }
}

async function callFeedbackAvailability(
  availabilityUrl: string,
  feedbackPanelId: number,
  ip: string,
): Promise<boolean> {
  const url = new URL(availabilityUrl);
  url.searchParams.set("feedback_panel_id", String(feedbackPanelId));
  url.searchParams.set("ip", ip);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return true;
  }

  const data = (await response.json()) as unknown;
  if (data === false) {
    return false;
  }
  return true;
}

async function getCurrentIpv4Address(): Promise<string | null> {
  return getIpv4FromIpify();
}

function isIpv4Address(value: string): boolean {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }
  return match.slice(1).every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

async function getIpv4FromIpify(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { ip?: unknown };
    if (typeof data.ip !== "string") {
      return null;
    }

    const ip = data.ip.trim();
    return isIpv4Address(ip) ? ip : null;
  } catch {
    return null;
  }
}
