import type { FeedbackRatingConfig, PanelConfig } from "./config";
import type { FeedbackCategory } from "./tier2Categories";
import { TIER2_CATEGORIES } from "./tier2Categories";
import type { Rating } from "./types/rating";

export interface Tier1RatingRow {
  rating: Rating;
  label: string;
  imageUrl: string | null;
  emojiFallback: string;
}

const EMOJI_BY_RATING: Record<Rating, string> = {
  excellent: "😍",
  good: "🙂",
  neutral: "😐",
  poor: "☹️",
};

/**
 * Resolves Laravel-style storage paths using `RESOURCE_URL`, or returns absolute URLs as-is.
 * Matches Blade: `env('RESOURCE_URL') . '/' . $path`.
 */
export function resolveResourceImageUrl(
  resourceUrl: string | undefined,
  imagePath: string | null | undefined,
): string | null {
  if (imagePath == null) {
    return null;
  }
  const trimmed = String(imagePath).trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = resourceUrl?.trim().replace(/\/$/, "") ?? "";
  if (base.length === 0) {
    return null;
  }
  const suffix = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${suffix}`;
}

/** Maps Laravel rating integers to kiosk rating keys (see legacy Blade switch). */
export function apiRatingToRating(apiRating: number): Rating | null {
  switch (apiRating) {
    case 4:
      return "excellent";
    case 3:
      return "good";
    case 2:
      return "neutral";
    case 1:
      return "poor";
    default:
      return null;
  }
}

function buildDefaultTier1Ratings(): Tier1RatingRow[] {
  const rows: { rating: Rating; label: string }[] = [
    { rating: "excellent", label: "Excellent" },
    { rating: "good", label: "Good" },
    { rating: "neutral", label: "Neutral" },
    { rating: "poor", label: "Poor" },
  ];
  return rows.map((r) => ({
    rating: r.rating,
    label: r.label,
    imageUrl: null,
    emojiFallback: EMOJI_BY_RATING[r.rating],
  }));
}

/**
 * Tier 1 rating buttons: prefer `panel.config.json` `feedbackRatings` + `resourceUrl`,
 * else emoji fallbacks (legacy Phase 1 behaviour).
 */
export function buildTier1RatingRows(config: PanelConfig): Tier1RatingRow[] {
  const list = config.feedbackRatings;
  if (!list?.length) {
    return buildDefaultTier1Ratings();
  }

  const sorted = [...list]
    .filter((r: FeedbackRatingConfig) => r.active !== 0)
    .sort((a, b) => b.rating - a.rating);

  const out: Tier1RatingRow[] = [];
  for (const row of sorted) {
    const rating = apiRatingToRating(row.rating);
    if (!rating) {
      continue;
    }
    const imageUrl = resolveResourceImageUrl(config.resourceUrl, row.image);
    out.push({
      rating,
      label: row.caption,
      imageUrl,
      emojiFallback: EMOJI_BY_RATING[rating],
    });
  }

  return out.length > 0 ? out : buildDefaultTier1Ratings();
}

/** Tier 2 grid: API items when resolvable, else bundled static categories. */
export function buildTier2Categories(config: PanelConfig): FeedbackCategory[] {
  const items = config.feedbackItems;
  if (!items?.length) {
    return [...TIER2_CATEGORIES];
  }

  const out: FeedbackCategory[] = [];
  for (const it of items) {
    const iconSrc = resolveResourceImageUrl(config.resourceUrl, it.image);
    if (!iconSrc) {
      continue;
    }
    out.push({
      id: String(it.id),
      label: it.name,
      iconSrc,
    });
  }

  return out.length > 0 ? out : [...TIER2_CATEGORIES];
}
