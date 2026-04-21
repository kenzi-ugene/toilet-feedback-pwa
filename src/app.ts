import type { PanelConfig } from "./config";
import { buildTier1RatingRows, buildTier2Categories } from "./feedbackAssets";
import { nextScreenAfterRating } from "./flow";
import { clearGateSetup } from "./gate";
import type { Screen } from "./flow";
import type { Rating } from "./types/rating";
import type { PanelDataProvider, PanelState } from "./types/panelState";

interface AppModel {
  screen: Screen;
  rating: Rating | null;
  categoryId: string | null;
}

export function createApp(
  root: HTMLElement,
  config: PanelConfig,
  data: PanelDataProvider,
): void {
  const model: AppModel = {
    screen: "tier1",
    rating: null,
    categoryId: null,
  };

  let thankYouTimer: ReturnType<typeof setTimeout> | null = null;
  let renderedScreen: Screen | null = null;

  const shell = document.createElement("div");
  shell.className = "shell";
  root.appendChild(shell);

  const logout = document.createElement("button");
  logout.type = "button";
  logout.className = "logout-btn";
  logout.textContent = "Log out";
  logout.addEventListener("click", () => {
    clearGateSetup();
    window.location.reload();
  });
  root.appendChild(logout);

  const render = (): void => {
    const snapshot = data.getSnapshot();

    if (renderedScreen === model.screen) {
      if (model.screen === "tier1") {
        updateTier1Snapshot(shell, snapshot);
      }
      return;
    }

    shell.innerHTML = "";

    const bg = document.createElement("div");
    bg.className = model.screen === "tier2" ? "bg bg-tier2" : "bg";
    shell.appendChild(bg);

    if (model.screen === "tier1") {
      shell.appendChild(renderTier1(snapshot, config, onPickRating));
    } else if (model.screen === "tier2") {
      shell.appendChild(renderTier2(config, onPickCategory));
    } else {
      shell.appendChild(renderTier3(config, onThankYouDone));
    }

    renderedScreen = model.screen;
  };

  function clearThankYouTimer(): void {
    if (thankYouTimer) {
      clearTimeout(thankYouTimer);
      thankYouTimer = null;
    }
  }

  function scheduleResetTier1(): void {
    clearThankYouTimer();
    thankYouTimer = setTimeout(() => {
      model.screen = "tier1";
      model.rating = null;
      model.categoryId = null;
      renderedScreen = null;
      render();
    }, config.thankYouResetMs);
  }

  function onPickRating(rating: Rating): void {
    const previousScreen = model.screen;
    model.rating = rating;
    model.screen = nextScreenAfterRating(rating);
    if (previousScreen !== model.screen) {
      renderedScreen = null;
    }
    if (model.screen === "tier3") {
      logFeedbackEvent(config, model);
      scheduleResetTier1();
    }
    render();
  }

  function onPickCategory(categoryId: string): void {
    model.categoryId = categoryId;
    if (model.screen !== "tier3") {
      renderedScreen = null;
    }
    model.screen = "tier3";
    logFeedbackEvent(config, model);
    scheduleResetTier1();
    render();
  }

  function onThankYouDone(): void {
    clearThankYouTimer();
    model.screen = "tier1";
    model.rating = null;
    model.categoryId = null;
    renderedScreen = null;
    render();
  }

  const unsubscribe = data.subscribe(() => {
    if (model.screen === "tier1") {
      render();
    }
  });
  render();

  window.addEventListener(
    "beforeunload",
    () => {
      unsubscribe();
      data.stop?.();
      clearThankYouTimer();
    },
    { once: true },
  );
}

function logFeedbackEvent(config: PanelConfig, model: AppModel): void {
  const payload = {
    toiletId: config.toiletId,
    rating: model.rating,
    categoryId: model.categoryId,
    at: new Date().toISOString(),
  };
  console.info("[toilet-feedback] submission (Phase 1 demo)", payload);
}

function renderTier1(
  snapshot: PanelState,
  config: PanelConfig,
  onPick: (rating: Rating) => void,
): DocumentFragment {
  const frag = document.createDocumentFragment();
  const wrap = document.createElement("div");
  wrap.className = "tier1";

  const location = document.createElement("div");
  location.className = "location";
  location.dataset.role = "location-label";
  location.textContent = snapshot.locationLabel;

  const main = document.createElement("div");
  main.className = "tier1-main";

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";
  sidebar.appendChild(
    metricCard("Today’s Footfall", String(snapshot.footfallToday), "/icon-footfall.png", "footfall"),
  );
  sidebar.appendChild(
    metricCard("Temperature", `${snapshot.temperatureC}°C`, "/icon-temperature.png", "temp"),
  );
  sidebar.appendChild(
    metricCard("Humidity", `${snapshot.humidityPct}%`, "/icon-humidity.png", "humidity"),
  );

  const panel = document.createElement("div");
  panel.className = "glass-panel tier1-panel";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.setAttribute("aria-hidden", "true");
  brand.innerHTML = buildBrandMarkup(config.brandTitle);

  const greeting = document.createElement("p");
  greeting.className = "greeting";
  greeting.textContent = `${timeOfDayGreeting()} ${config.greeting}`;

  const ratings = document.createElement("div");
  ratings.className = "ratings";
  const ratingsMeta = buildTier1RatingRows(config);
  for (const item of ratingsMeta) {
    ratings.appendChild(ratingButton(item, onPick));
  }

  const qrRow = document.createElement("div");
  qrRow.className = "qr-row";
  const qr = document.createElement("div");
  qr.className = "qr-placeholder";
  qr.setAttribute("role", "img");
  qr.setAttribute("aria-label", "QR code placeholder");
  qrRow.appendChild(qr);

  const note = document.createElement("p");
  note.className = "sanitise-note";
  note.textContent = "The screen is sanitised regularly.";

  panel.appendChild(brand);
  panel.appendChild(greeting);
  panel.appendChild(ratings);
  panel.appendChild(qrRow);
  panel.appendChild(note);

  main.appendChild(sidebar);
  main.appendChild(panel);

  wrap.appendChild(location);
  wrap.appendChild(main);
  frag.appendChild(wrap);
  return frag;
}

function updateTier1Snapshot(shell: HTMLElement, snapshot: PanelState): void {
  const location = shell.querySelector<HTMLElement>('[data-role="location-label"]');
  if (location) {
    location.textContent = snapshot.locationLabel;
  }

  const footfall = shell.querySelector<HTMLElement>('[data-metric="footfall"] .metric-value');
  if (footfall) {
    footfall.textContent = String(snapshot.footfallToday);
  }

  const temperature = shell.querySelector<HTMLElement>('[data-metric="temp"] .metric-value');
  if (temperature) {
    temperature.textContent = `${snapshot.temperatureC}°C`;
  }

  const humidity = shell.querySelector<HTMLElement>('[data-metric="humidity"] .metric-value');
  if (humidity) {
    humidity.textContent = `${snapshot.humidityPct}%`;
  }
}

function metricCard(title: string, value: string, iconSrc: string, testId: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "glass-card metric";
  card.dataset.metric = testId;

  const top = document.createElement("div");
  top.className = "metric-top";
  const ic = document.createElement("img");
  ic.className = "metric-icon";
  ic.src = iconSrc;
  ic.alt = "";
  ic.setAttribute("aria-hidden", "true");
  const ttl = document.createElement("span");
  ttl.className = "metric-title";
  ttl.textContent = title;
  top.appendChild(ic);
  top.appendChild(ttl);

  const divider = document.createElement("div");
  divider.className = "metric-divider";
  divider.setAttribute("aria-hidden", "true");

  const val = document.createElement("div");
  val.className = "metric-value";
  val.textContent = value;

  card.appendChild(top);
  card.appendChild(divider);
  card.appendChild(val);
  return card;
}

function ratingButton(
  item: {
    rating: Rating;
    label: string;
    imageUrl: string | null;
    emojiFallback: string;
  },
  onPick: (rating: Rating) => void,
): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rating-btn";
  btn.dataset.rating = item.rating;

  if (item.imageUrl) {
    const face = document.createElement("img");
    face.className = "rating-face";
    face.src = item.imageUrl;
    face.alt = "";
    face.setAttribute("aria-hidden", "true");
    btn.appendChild(face);
  } else {
    const face = document.createElement("span");
    face.className = "rating-face";
    face.textContent = item.emojiFallback;
    btn.appendChild(face);
  }

  const label = document.createElement("span");
  label.className = "rating-label";
  label.textContent = item.label;

  btn.appendChild(label);
  btn.addEventListener("click", () => onPick(item.rating));
  return btn;
}

function renderTier2(config: PanelConfig, onPick: (id: string) => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "tier2";

  const title = document.createElement("h1");
  title.className = "tier2-title";
  title.textContent = "Let us know the areas for improvement";

  const grid = document.createElement("div");
  grid.className = "icon-grid";

  for (const cat of buildTier2Categories(config)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-tile";
    btn.dataset.category = cat.id;

    const sym = document.createElement("img");
    sym.className = "icon-tile-symbol";
    sym.src = cat.iconSrc;
    sym.alt = "";
    sym.setAttribute("aria-hidden", "true");

    const lab = document.createElement("span");
    lab.className = "icon-tile-label";
    lab.textContent = cat.label;

    btn.appendChild(sym);
    btn.appendChild(lab);
    btn.addEventListener("click", () => onPick(cat.id));
    grid.appendChild(btn);
  }

  wrap.appendChild(title);
  wrap.appendChild(grid);
  return wrap;
}

function renderTier3(config: PanelConfig, onDismiss: () => void): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "tier3";

  const panel = document.createElement("div");
  panel.className = "glass-panel thank-panel";

  const title = document.createElement("h1");
  title.className = "thank-title";
  title.textContent = "Thank you!";

  const sub = document.createElement("p");
  sub.className = "thank-sub";
  sub.textContent = "Your feedback helps us keep facilities clean and comfortable.";

  const hint = document.createElement("p");
  hint.className = "thank-hint";
  hint.textContent = `Returning to the start in ${Math.round(config.thankYouResetMs / 1000)}s…`;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "text-btn";
  btn.textContent = "Start over now";
  btn.addEventListener("click", onDismiss);

  panel.appendChild(title);
  panel.appendChild(sub);
  panel.appendChild(hint);
  panel.appendChild(btn);
  wrap.appendChild(panel);
  return wrap;
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) {
    return "Good morning!";
  }
  if (h < 18) {
    return "Good afternoon!";
  }
  return "Good evening!";
}

function buildBrandMarkup(brandTitle: string): string {
  const safe = escapeHtml(brandTitle);
  if (safe.length === 0) {
    return "";
  }
  const first = safe.slice(0, 1);
  const rest = safe.slice(1);
  return `<span class="brand-letter brand-letter-a">${first}</span><span class="brand-rest">${rest}</span>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] ?? ch;
  });
}
