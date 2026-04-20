/**
 * Normalized panel metrics aligned with the planned Phase 2 API payload.
 */
export interface PanelState {
  locationLabel: string;
  footfallToday: number;
  temperatureC: number;
  humidityPct: number;
  updatedAt: string;
}

export type Unsubscribe = () => void;

export interface PanelDataProvider {
  getSnapshot(): PanelState;
  subscribe(listener: () => void): Unsubscribe;
  start?(): void;
  stop?(): void;
}
