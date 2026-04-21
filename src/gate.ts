const STORAGE_KEY = "simpple-feedback-panel-setup";
const STORAGE_VERSION = 1;
/** Kiosk unlock password (fixed for Phase 1). */
const GATE_PASSWORD = "123456";

interface StoredSetup {
  v: number;
  locationCode: string;
}

function readStored(): StoredSetup | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as StoredSetup;
    if (data.v !== STORAGE_VERSION || typeof data.locationCode !== "string" || data.locationCode.trim() === "") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeStored(locationCode: string): void {
  const payload: StoredSetup = {
    v: STORAGE_VERSION,
    locationCode: locationCode.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearGateSetup(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * On first visit (no stored setup), shows a full-screen gate for password + location code.
 * Returns the location code to use for the panel (from storage or fresh input).
 */
export function runGate(root: HTMLElement): Promise<string> {
  const existing = readStored();
  if (existing) {
    return Promise.resolve(existing.locationCode);
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
    form.appendChild(pwdLabel);
    form.appendChild(pwd);
    form.appendChild(locLabel);
    form.appendChild(loc);
    form.appendChild(submit);

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(form);
    wrap.appendChild(card);
    root.appendChild(wrap);

    pwd.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      err.hidden = true;
      err.textContent = "";

      const password = pwd.value.trim();
      const locationCode = loc.value.trim();

      if (locationCode === "") {
        err.textContent = "Please enter a location code.";
        err.hidden = false;
        loc.focus();
        return;
      }

      if (password !== GATE_PASSWORD) {
        err.textContent = "Incorrect password.";
        err.hidden = false;
        pwd.value = "";
        pwd.focus();
        return;
      }

      writeStored(locationCode);
      root.innerHTML = "";
      resolve(locationCode);
    });
  });
}
