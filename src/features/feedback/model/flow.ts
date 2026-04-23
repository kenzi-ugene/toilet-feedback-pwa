import { isNegativePathRating } from "../../../shared/types/rating";
import type { Rating } from "../../../shared/types/rating";

export type Screen = "tier1" | "tier2" | "tier3";

export function nextScreenAfterRating(rating: Rating): "tier2" | "tier3" {
  return isNegativePathRating(rating) ? "tier2" : "tier3";
}
