export interface FeedbackCategory {
  id: string;
  label: string;
  iconSrc: string;
}

export const TIER2_CATEGORIES: readonly FeedbackCategory[] = [
  { id: "dirty_wall", label: "Dirty Wall", iconSrc: "/icon-dirty-wall.png" },
  { id: "dirty_wc", label: "Dirty WC", iconSrc: "/icon-dirty-wc.png" },
  { id: "dirty_basin", label: "Dirty Basin", iconSrc: "/icon-dirty-basin.png" },
  { id: "dirty_cubicle", label: "Dirty Cubicle", iconSrc: "/icon-dirty-cubicle.png" },
  { id: "wet_floor", label: "Wet Floor", iconSrc: "/icon-wet-floor.png" },
  { id: "smelly", label: "Smelly", iconSrc: "/icon-smelly.png" },
  { id: "toilet_roll_empty", label: "Toilet Roll Empty", iconSrc: "/icon-toilet-roll-empty.png" },
  { id: "soap_empty", label: "Soap Empty", iconSrc: "/icon-soap-empty.png" },
  { id: "sanitary_bin_full", label: "Sanitary Bin Full", iconSrc: "/icon-sanitary-bin-full.png" },
  { id: "faulty_water_fixture", label: "Faulty Water Fixture", iconSrc: "/icon-faulty-water-fixture.png" },
  { id: "soap_dispenser_faulty", label: "Soap Dispenser Faulty", iconSrc: "/icon-soap-dispenser-faulty.png" },
  { id: "faulty_lights", label: "Faulty Lights", iconSrc: "/icon-faulty-lights.png" },
];
