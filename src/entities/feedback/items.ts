/** Tier-2 tile: `iconSrc` is a local `public/` PNG so the kiosk still shows icons offline. */
export interface FeedbackItem {
  id: string;
  label: string;
  iconSrc: string | null;
}
