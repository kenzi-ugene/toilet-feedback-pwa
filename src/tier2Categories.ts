export interface FeedbackCategory {
  id: string;
  label: string;
  /** Simple symbol for Phase 1 (replace with SVG assets later). */
  symbol: string;
}

export const TIER2_CATEGORIES: readonly FeedbackCategory[] = [
  { id: "dirty_wall", label: "Dirty Wall", symbol: "🧱" },
  { id: "dirty_wc", label: "Dirty WC", symbol: "🚽" },
  { id: "dirty_basin", label: "Dirty Basin", symbol: "🚰" },
  { id: "dirty_cubicle", label: "Dirty Cubicle", symbol: "🚪" },
  { id: "wet_floor", label: "Wet Floor", symbol: "⚠️" },
  { id: "smelly", label: "Smelly", symbol: "👃" },
  { id: "toilet_roll_empty", label: "Toilet Roll Empty", symbol: "🧻" },
  { id: "soap_empty", label: "Soap Empty", symbol: "🧴" },
  { id: "sanitary_bin_full", label: "Sanitary Bin Full", symbol: "🗑️" },
  { id: "faulty_water_fixture", label: "Faulty Water Fixture", symbol: "💧" },
  { id: "soap_dispenser_faulty", label: "Soap Dispenser Faulty", symbol: "🧼" },
  { id: "faulty_lights", label: "Faulty Lights", symbol: "💡" },
];
