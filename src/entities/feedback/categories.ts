/** Tier-2 tile: `iconSrc` is the resolved image URL from getFeedbackPanelItems (`url` + panel item `image`), or null if missing. */
export interface FeedbackItem {
  id: string;
  label: string;
  iconSrc: string | null;
}

