/** Tier-2 tile: `iconSrc` is the resolved image URL (S3 base + panel item `image`), or null if missing. */
export interface FeedbackItem {
  id: string;
  label: string;
  iconSrc: string | null;
}
