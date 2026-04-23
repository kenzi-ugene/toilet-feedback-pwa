import type { PanelConfig } from "../../entities/panel/config";
import type { FeedbackPanelApiResponse, GateAuthResult } from "./types";

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

export async function authenticateGateWithBackend(
  config: PanelConfig,
  payload: GateAuthPayload,
): Promise<GateAuthResult> {
  const endpoint = config.feedbackPanelItemsApiUrl?.trim();
  if (!endpoint) {
    return INVALID_AUTH_RESULT;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_code: payload.locationCode,
        password: payload.password,
      }),
    });
    if (!response.ok) {
      return INVALID_AUTH_RESULT;
    }

    const raw = await response.json();
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
