export type Rating = "excellent" | "good" | "neutral" | "poor";

export function isNegativePathRating(rating: Rating): boolean {
  return rating === "neutral" || rating === "poor";
}
