import type { PanelDataProvider, PanelState, Unsubscribe } from "../types/panelState";

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Phase 1 mock: scripted metrics with optional timers. Field names match the planned API.
 */
export class MockPanelDataProvider implements PanelDataProvider {
  private state: PanelState;
  private listeners = new Set<() => void>();
  private footfallTimer: ReturnType<typeof setInterval> | null = null;
  private envTimer: ReturnType<typeof setInterval> | null = null;
  private midnightTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    initial: Partial<PanelState>,
    private readonly options: {
      simulateLiveUpdates: boolean;
      /** IANA timezone string for calendar day boundary (demo). */
      timezone: string;
    },
  ) {
    this.state = {
      locationLabel: initial.locationLabel ?? "—",
      footfallToday: initial.footfallToday ?? 0,
      temperatureC: initial.temperatureC ?? 26,
      humidityPct: initial.humidityPct ?? 64.4,
      updatedAt: initial.updatedAt ?? isoNow(),
    };
  }

  getSnapshot(): PanelState {
    return { ...this.state };
  }

  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.state = { ...this.state, updatedAt: isoNow() };
    for (const listener of this.listeners) {
      listener();
    }
  }

  start(): void {
    if (!this.options.simulateLiveUpdates) {
      this.scheduleMidnightReset();
      return;
    }

    this.footfallTimer = setInterval(() => {
      const increment = Math.random() > 0.7 ? 1 : 0;
      this.state.footfallToday += increment;
      this.emit();
    }, 4000);

    this.envTimer = setInterval(() => {
      this.state.temperatureC = round1(
        clamp(this.state.temperatureC + (Math.random() - 0.5) * 0.4, 18, 32),
      );
      this.state.humidityPct = round1(
        clamp(this.state.humidityPct + (Math.random() - 0.5) * 1.2, 30, 95),
      );
      this.emit();
    }, 10000);

    this.scheduleMidnightReset();
  }

  stop(): void {
    if (this.footfallTimer) {
      clearInterval(this.footfallTimer);
      this.footfallTimer = null;
    }
    if (this.envTimer) {
      clearInterval(this.envTimer);
      this.envTimer = null;
    }
    if (this.midnightTimer) {
      clearInterval(this.midnightTimer);
      this.midnightTimer = null;
    }
  }

  /**
   * Demo-only: reset footfall at local midnight in the configured timezone.
   */
  private scheduleMidnightReset(): void {
    const tick = (): void => {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: this.options.timezone,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      }).formatToParts(now);
      const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
      const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
      const second = Number(parts.find((p) => p.type === "second")?.value ?? "0");
      if (hour === 0 && minute === 0 && second === 0) {
        this.state.footfallToday = 0;
        this.emit();
      }
    };

    this.midnightTimer = setInterval(tick, 1000);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
