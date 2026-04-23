import type { ReactElement } from "react";
import { MetricCard } from "../../../shared/ui/MetricCard";
import type { PanelConfig } from "../../../entities/panel/config";
import type { Tier1RatingRow } from "../../../entities/panel/feedbackAssets";
import type { PanelState } from "../../../shared/types/panelState";
import type { Rating } from "../../../shared/types/rating";

interface Tier1ScreenProps {
  config: PanelConfig;
  snapshot: PanelState;
  ratings: Tier1RatingRow[];
  onPickRating: (rating: Rating) => Promise<void>;
}

export function Tier1Screen({ config, snapshot, ratings, onPickRating }: Tier1ScreenProps): ReactElement {
  return (
    <div className="tier1">
      <div className="location">{snapshot.locationLabel}</div>
      <div className="tier1-main">
        <aside className="sidebar">
          <MetricCard title="Today’s Footfall" value={String(snapshot.footfallToday)} iconSrc="/icon-footfall.png" />
          <MetricCard title="Temperature" value={`${snapshot.temperatureC}°C`} iconSrc="/icon-temperature.png" />
          <MetricCard title="Humidity" value={`${snapshot.humidityPct}%`} iconSrc="/icon-humidity.png" />
        </aside>
        <div className="glass-panel tier1-panel">
          <div className="brand" aria-hidden="true" />
          <p className="greeting">{`${timeOfDayGreeting()} ${config.greeting}`}</p>
          <div className="ratings">
            {ratings.map((item) => (
              <button type="button" className="rating-btn" key={item.rating} onClick={() => void onPickRating(item.rating)}>
                {item.imageUrl ? (
                  <img className="rating-face" src={item.imageUrl} alt="" aria-hidden="true" />
                ) : (
                  <span className="rating-face">{item.emojiFallback}</span>
                )}
                <span className="rating-label">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="qr-row">
            {config.qrCodeBase64 ? (
              <img src={`data:image/png;base64,${config.qrCodeBase64}`} alt="QR code" className="qr-placeholder qr-image" />
            ) : (
              <div className="qr-placeholder" role="img" aria-label="QR code placeholder" />
            )}
          </div>
          <p className="sanitise-note">The screen is sanitised regularly.</p>
        </div>
      </div>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning!";
  }
  if (hour < 18) {
    return "Good afternoon!";
  }
  return "Good evening!";
}
