import type { FeedbackCategory } from "../feedback/categories";
import { TIER2_CATEGORIES } from "../feedback/categories";
import type { FeedbackItemConfig, FeedbackRatingConfig, PanelConfig } from "./config";
import type { Rating } from "../../shared/types/rating";

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

export function resolveResourceImageUrl(resourceUrl: string | undefined, imagePath: string | null | undefined): string | null {
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

export function buildTier1RatingRows(config: PanelConfig): Tier1RatingRow[] {
  if (config.enableRatingsFeedback !== true) {
    return [];
  }

  const list = config.feedbackRatings;
  if (!list?.length) {
    return [];
  }

  const sorted = [...list]
    .filter((ratingRow: FeedbackRatingConfig) => ratingRow.active !== 0)
    .sort((left, right) => right.rating - left.rating);

  const rows: Tier1RatingRow[] = [];
  for (const row of sorted) {
    const rating = apiRatingToRating(row.rating);
    if (!rating) {
      continue;
    }
    const imageUrl = resolveResourceImageUrl(config.resourceUrl, row.image) ?? LOCAL_RATING_IMAGE_BY_RATING[rating];
    rows.push({
      rating,
      label: row.caption,
      imageUrl,
      emojiFallback: EMOJI_BY_RATING[rating],
    });
  }

  return rows;
}

export function buildTier2Categories(config: PanelConfig): FeedbackCategory[] {
  const items = config.feedbackItems;
  if (!items?.length) {
    return [...TIER2_CATEGORIES];
  }

  const categories: FeedbackCategory[] = [];
  for (const item of items) {
    const category = toFeedbackCategory(config, item);
    if (category) {
      categories.push(category);
    }
  }

  return categories.length > 0 ? categories : [...TIER2_CATEGORIES];
}

function toFeedbackCategory(config: PanelConfig, item: FeedbackItemConfig): FeedbackCategory | null {
  const iconSrc = resolveResourceImageUrl(config.resourceUrl, item.image) ?? resolveFallbackTier2IconByName(item.name);
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
