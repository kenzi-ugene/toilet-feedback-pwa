import type { FeedbackItemConfig, FeedbackRatingConfig, PanelConfig } from "./config";
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

const LOCAL_RATING_IMAGE_BY_RATING: Record<Rating, string> = {
  excellent: "/awesome_face.png",
  good: "/good_face.png",
  neutral: "/neutral_face.png",
  poor: "/sad_face.png",
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

/** Tier 1 rating buttons: prefer backend-provided `feedbackRatings` + `resourceUrl`. */
export function buildTier1RatingRows(config: PanelConfig): Tier1RatingRow[] {
  if (config.enableRatingsFeedback !== true) {
    return [];
  }

  const list = config.feedbackRatings;
  if (!list?.length) {
    return [];
  }

  const sorted = [...list]
    .filter((r: FeedbackRatingConfig) => r.active === 1)
    .sort((a, b) => b.rating - a.rating);

  const out: Tier1RatingRow[] = [];
  for (const row of sorted) {
    const rating = apiRatingToRating(row.rating);
    if (!rating) {
      continue;
    }
    const imageUrl = resolveResourceImageUrl(config.resourceUrl, row.image) ?? LOCAL_RATING_IMAGE_BY_RATING[rating];
    out.push({
      rating,
      label: row.caption,
      imageUrl,
      emojiFallback: EMOJI_BY_RATING[rating],
    });
  }

  return out;
}

/** Tier 2 grid: API items when resolvable, else bundled static categories. */
export function buildTier2Categories(config: PanelConfig): FeedbackCategory[] {
  const items = config.feedbackItems;
  if (!items?.length) {
    return [...TIER2_CATEGORIES];
  }

  const out: FeedbackCategory[] = [];
  for (const it of items) {
    const category = toFeedbackCategory(config, it);
    if (!category) {
      continue;
    }
    out.push(category);
  }

  return out.length > 0 ? out : [...TIER2_CATEGORIES];
}

function toFeedbackCategory(config: PanelConfig, item: FeedbackItemConfig): FeedbackCategory | null {
  const iconSrc =
    resolveResourceImageUrl(config.resourceUrl, item.image) ?? resolveFallbackTier2IconByName(item.name);

  return {
    id: String(item.id),
    label: item.name,
    iconSrc,
  };
}

function resolveFallbackTier2IconByName(name: string): string {
  const normalized = name.trim().toLowerCase();
  const matched = TIER2_CATEGORIES.find((category) => category.label.trim().toLowerCase() === normalized);
  return matched?.iconSrc ?? "/icon-dirty-wc.png";
}
