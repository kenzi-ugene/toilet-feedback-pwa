import type { FeedbackPanelApiResponse } from "./backend";

const STORAGE_KEY = "simpple-feedback-panel-setup";
const STORAGE_VERSION = 2;

interface StoredSetup {
  v: number;
  locationCode: string;
  password: string;
}

function readStored(): StoredSetup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as StoredSetup;
    if (
      data.v !== STORAGE_VERSION ||
      typeof data.locationCode !== "string" ||
      data.locationCode.trim() === "" ||
      typeof data.password !== "string" ||
      data.password.trim() === ""
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeStored(locationCode: string, password: string): void {
  const payload: StoredSetup = {
    v: STORAGE_VERSION,
    locationCode: locationCode.trim(),
    password: password.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearGateSetup(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface StoredGateSetup {
  locationCode: string;
  password: string;
}

export function getStoredGateSetup(): StoredGateSetup | null {
  const stored = readStored();
  if (!stored) {
    return null;
  }
  return {
    locationCode: stored.locationCode,
    password: stored.password,
  };
}

export function saveGateSetup(locationCode: string, password: string): void {
  writeStored(locationCode, password);
}

interface GateValidatedPayload {
  locationCode: string;
  panelResponse: FeedbackPanelApiResponse | null;
}

interface GateValidationResult {
  isValid: boolean;
  panelResponse: FeedbackPanelApiResponse | null;
}

/**
 * On first visit (no stored setup), shows a full-screen gate for password + location code.
 * Returns the location code to use for the panel (from storage or fresh input).
 */
export async function runGate(
  root: HTMLElement,
  validateCredentials: (
    locationCode: string,
    password: string,
  ) => Promise<GateValidationResult>,
): Promise<GateValidatedPayload> {
  const existing = readStored();
  if (existing) {
    const storedResult = await validateCredentials(existing.locationCode, existing.password);
    if (storedResult.isValid) {
      return {
        locationCode: existing.locationCode,
        panelResponse: storedResult.panelResponse,
      };
    }
    clearGateSetup();
  }

  return new Promise((resolve) => {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "gate-screen";

    const card = document.createElement("div");
    card.className = "gate-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-labelledby", "gate-title");

    const title = document.createElement("h1");
    title.id = "gate-title";
    title.className = "gate-title";
    title.textContent = "Panel access";

    const subtitle = document.createElement("p");
    subtitle.className = "gate-subtitle";
    subtitle.textContent = "Enter the access password and location code to continue.";

    const form = document.createElement("form");
    form.className = "gate-form";
    form.noValidate = true;

    const err = document.createElement("p");
    err.className = "gate-error";
    err.setAttribute("role", "alert");
    err.hidden = true;

    const pwdLabel = document.createElement("label");
    pwdLabel.className = "gate-label";
    pwdLabel.htmlFor = "gate-password";
    pwdLabel.textContent = "Password";

    const pwd = document.createElement("input");
    pwd.id = "gate-password";
    pwd.type = "password";
    pwd.className = "gate-input";
    pwd.autocomplete = "off";
    pwd.required = true;

    const locLabel = document.createElement("label");
    locLabel.className = "gate-label";
    locLabel.htmlFor = "gate-location";
    locLabel.textContent = "Location code";

    const loc = document.createElement("input");
    loc.id = "gate-location";
    loc.type = "text";
    loc.className = "gate-input";
    loc.autocomplete = "off";
    loc.required = true;

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "gate-submit";
    submit.textContent = "Continue";

    form.appendChild(err);
    form.appendChild(locLabel);
    form.appendChild(loc);
    form.appendChild(pwdLabel);
    form.appendChild(pwd);
    form.appendChild(submit);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(form);
    wrap.appendChild(card);
    root.appendChild(wrap);

    pwd.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError(err);

      const password = pwd.value.trim();
      const locationCode = loc.value.trim();

      if (locationCode === "") {
        showError(err, "Please enter a location code.");
        loc.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = "Checking...";

      const result = await validateCredentials(locationCode, password);
      if (!result.isValid) {
        showError(err, "Credentials not valid.");
        pwd.value = "";
        pwd.focus();
        resetSubmitButton(submit);
        return;
      }

      writeStored(locationCode, password);
      root.innerHTML = "";
      resolve({
        locationCode,
        panelResponse: result.panelResponse,
      });
    });
  });
}

function showError(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.hidden = false;
}

function hideError(element: HTMLElement): void {
  element.textContent = "";
  element.hidden = true;
}

function resetSubmitButton(button: HTMLButtonElement): void {
  button.disabled = false;
  button.textContent = "Continue";
}
