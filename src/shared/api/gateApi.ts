import type { PanelConfig } from "../../entities/panel/config";
import type { FeedbackPanelApiResponse, GateAuthFailureReason, GateAuthResult } from "./types";

interface GateAuthPayload {
  locationCode: string;
  password: string;
}

function asPanelResponse(data: unknown): FeedbackPanelApiResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  return data as FeedbackPanelApiResponse;
}

function invalidAuthResult(failureReason: GateAuthFailureReason): GateAuthResult {
  return {
    isValid: false,
    panelResponse: null,
    failureReason,
  };
}

export async function authenticateGateWithBackend(
  config: PanelConfig,
  payload: GateAuthPayload,
  signal?: AbortSignal,
): Promise<GateAuthResult> {
  const endpoint = config.feedbackPanelItemsApiUrl?.trim();
  if (!endpoint) {
    return invalidAuthResult("no_endpoint");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_code: payload.locationCode,
        password: payload.password,
      }),
      signal,
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return invalidAuthResult("invalid_credentials");
      }
      return invalidAuthResult("http_error");
    }

    const raw = await response.json();
    if (raw === false) {
      return invalidAuthResult("invalid_credentials");
    }

    const data = asPanelResponse(raw);
    if (!data) {
      return invalidAuthResult("invalid_response");
    }

    return { isValid: true, panelResponse: data };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return invalidAuthResult("network_error");
  }
}
