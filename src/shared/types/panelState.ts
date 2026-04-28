export interface PanelState {
  locationLabel: string;
  footfall: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  updatedAt: string;
}

export type Unsubscribe = () => void;

export interface PanelDataProvider {
  getSnapshot(): PanelState;
  subscribe(listener: () => void): Unsubscribe;
  start?(): void;
  stop?(): void;
}
