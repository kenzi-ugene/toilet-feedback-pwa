import type { FormEvent } from "react";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { submitPositiveRatingFeedback } from "./backend";
import type { PanelConfig } from "./config";
import { MockPanelDataProvider } from "./data/mockPanelDataProvider";
import { buildTier1RatingRows, buildTier2Categories } from "./feedbackAssets";
import { nextScreenAfterRating, type Screen } from "./flow";
import { clearGateSetup } from "./gate";
import type { PanelState } from "./types/panelState";
import type { Rating } from "./types/rating";

interface AppModel {
  screen: Screen;
  rating: Rating | null;
  categoryId: string | null;
}

interface FeedbackAppProps {
  config: PanelConfig;
  locationCode: string;
}

interface GateScreenProps {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (locationCode: string, password: string) => Promise<void>;
}

function initialScreen(config: PanelConfig): Screen {
  return config.enableRatingsFeedback === true ? "tier1" : "tier2";
}

function buildInitialModel(config: PanelConfig): AppModel {
  return {
    screen: initialScreen(config),
    rating: null,
    categoryId: null,
  };
}

export function FeedbackApp(props: FeedbackAppProps): ReactElement {
  const { config, locationCode } = props;
  const dataProvider = useMemo(
    () =>
      new MockPanelDataProvider(
        {
          locationLabel: locationCode,
          footfallToday: 10,
          temperatureC: 26,
          humidityPct: 64.4,
        },
        {
          simulateLiveUpdates: config.simulateLiveUpdates,
          timezone: config.timezone,
        },
      ),
    [config.simulateLiveUpdates, config.timezone, locationCode],
  );
  const [model, setModel] = useState<AppModel>(() => buildInitialModel(config));
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [snapshot, setSnapshot] = useState<PanelState>(() => ({
    ...dataProvider.getSnapshot(),
    locationLabel: locationCode,
  }));

  const resetToInitial = useCallback((): void => {
    setModel(buildInitialModel(config));
  }, [config]);

  useEffect(() => {
    dataProvider.start?.();
    const unsubscribe = dataProvider.subscribe(() => {
      setSnapshot({
        ...dataProvider.getSnapshot(),
        locationLabel: locationCode,
      });
    });
    return () => {
      unsubscribe();
      dataProvider.stop?.();
    };
  }, [dataProvider, locationCode]);

  useEffect(() => {
    if (model.screen !== "tier3") {
      return;
    }
    const timer = window.setTimeout(() => {
      resetToInitial();
    }, config.thankYouResetMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [config.thankYouResetMs, model.screen, resetToInitial]);

  const onPickRating = useCallback(
    async (rating: Rating): Promise<void> => {
      if (isSubmittingFeedback) {
        return;
      }

      const shouldSubmitFeedback = (rating === "excellent" || rating === "good") && Boolean(config.feedbackPanelId);
      if (shouldSubmitFeedback) {
        setIsSubmittingFeedback(true);
        try {
          await submitPositiveRatingFeedback(config, rating);
        } catch (error: unknown) {
          if (error instanceof Error && error.message === "CANT_GET_IP") {
            window.alert("Can't get IP.");
            return;
          }
          if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
            window.alert("You need to wait 5 mins before submitting another feedback.");
            return;
          }
          window.alert("Feedback submission failed. Please try again.");
          return;
        } finally {
          setIsSubmittingFeedback(false);
        }
      }

      setModel((currentModel) => {
        const nextScreen = nextScreenAfterRating(rating);
        const nextModel: AppModel = {
          screen: nextScreen,
          rating,
          categoryId: currentModel.categoryId,
        };
        if (nextScreen === "tier3") {
          logFeedbackEvent(nextModel);
        }
        return nextModel;
      });
    },
    [config, isSubmittingFeedback],
  );

  const onPickCategory = useCallback((categoryId: string): void => {
    setModel((currentModel) => {
      const nextModel: AppModel = {
        screen: "tier3",
        rating: currentModel.rating,
        categoryId,
      };
      logFeedbackEvent(nextModel);
      return nextModel;
    });
  }, []);

  const onLogout = useCallback((): void => {
    clearGateSetup();
    window.location.reload();
  }, []);

  const tier2Categories = useMemo(() => buildTier2Categories(config), [config]);
  const tier1Ratings = useMemo(() => buildTier1RatingRows(config), [config]);
  const isTier2 = model.screen === "tier2";

  return (
    <>
      <div className="shell">
        <div className={isTier2 ? "bg bg-tier2" : "bg"} />
        {model.screen === "tier1" && (
          <Tier1Screen
            config={config}
            snapshot={snapshot}
            ratings={tier1Ratings}
            onPickRating={onPickRating}
          />
        )}
        {model.screen === "tier2" && <Tier2Screen categories={tier2Categories} onPickCategory={onPickCategory} />}
        {model.screen === "tier3" && (
          <Tier3Screen resetMs={config.thankYouResetMs} onDismiss={resetToInitial} />
        )}
      </div>
      <div className="feedback-loading-overlay" hidden={!isSubmittingFeedback}>
        <div className="feedback-loading-card" role="status" aria-live="polite">
          <div className="feedback-loading-spinner" aria-hidden="true" />
          <p className="feedback-loading-text">Submitting feedback...</p>
        </div>
      </div>
      <button type="button" className="logout-btn" onClick={onLogout}>
        Log out
      </button>
      <button type="button" className="reload-btn" aria-label="Reload panel items" onClick={() => window.location.reload()}>
        <img src="/reload.png" alt="" aria-hidden="true" className="reload-btn-icon" />
      </button>
    </>
  );
}

export function GateScreen(props: GateScreenProps): ReactElement {
  const { isSubmitting, error, onSubmit } = props;
  const [locationCode, setLocationCode] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onSubmit(locationCode, password);
  };

  return (
    <div className="gate-screen">
      <div className="gate-card" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <h1 id="gate-title" className="gate-title">
          Panel access
        </h1>
        <p className="gate-subtitle">Enter the access password and location code to continue.</p>
        <form className="gate-form" noValidate onSubmit={handleSubmit}>
          {error && (
            <p className="gate-error" role="alert">
              {error}
            </p>
          )}
          <label className="gate-label" htmlFor="gate-location">
            Location code
          </label>
          <input
            id="gate-location"
            type="text"
            className="gate-input"
            autoComplete="off"
            required
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
          />
          <label className="gate-label" htmlFor="gate-password">
            Password
          </label>
          <input
            id="gate-password"
            type="password"
            className="gate-input"
            autoComplete="off"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button type="submit" className="gate-submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Tier1Screen(props: {
  config: PanelConfig;
  snapshot: PanelState;
  ratings: ReturnType<typeof buildTier1RatingRows>;
  onPickRating: (rating: Rating) => Promise<void>;
}): ReactElement {
  const { config, snapshot, ratings, onPickRating } = props;
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

function Tier2Screen(props: {
  categories: ReturnType<typeof buildTier2Categories>;
  onPickCategory: (categoryId: string) => void;
}): ReactElement {
  const { categories, onPickCategory } = props;
  return (
    <div className="tier2">
      <h1 className="tier2-title">Let us know the areas for improvement</h1>
      <div className="icon-grid">
        {categories.map((category) => (
          <button
            type="button"
            className="icon-tile"
            key={category.id}
            data-category={category.id}
            onClick={() => onPickCategory(category.id)}
          >
            <img className="icon-tile-symbol" src={category.iconSrc} alt="" aria-hidden="true" />
            <span className="icon-tile-label">{category.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Tier3Screen(props: { resetMs: number; onDismiss: () => void }): ReactElement {
  const { onDismiss, resetMs } = props;
  return (
    <div className="tier3">
      <div className="glass-panel thank-panel">
        <h1 className="thank-title">Thank you!</h1>
        <p className="thank-sub">Your feedback helps us keep facilities clean and comfortable.</p>
        <p className="thank-hint">{`Returning to the start in ${Math.round(resetMs / 1000)}s…`}</p>
        <button type="button" className="text-btn" onClick={onDismiss}>
          Start over now
        </button>
      </div>
    </div>
  );
}

function MetricCard(props: { title: string; value: string; iconSrc: string }): ReactElement {
  const { title, value, iconSrc } = props;
  return (
    <div className="glass-card metric">
      <div className="metric-top">
        <img className="metric-icon" src={iconSrc} alt="" aria-hidden="true" />
        <span className="metric-title">{title}</span>
      </div>
      <div className="metric-divider" aria-hidden="true" />
      <div className="metric-value">{value}</div>
    </div>
  );
}

function logFeedbackEvent(model: AppModel): void {
  const payload = {
    rating: model.rating,
    categoryId: model.categoryId,
    at: new Date().toISOString(),
  };
  console.info("[toilet-feedback] submission (Phase 1 demo)", payload);
}

export function installLandscapeGuard(): () => void {
  const portraitQuery = window.matchMedia("(orientation: portrait)");
  const updateOrientationState = (): void => {
    document.body.classList.toggle("portrait-blocked", portraitQuery.matches);
  };
  updateOrientationState();
  portraitQuery.addEventListener("change", updateOrientationState);
  window.addEventListener("resize", updateOrientationState);

  return () => {
    portraitQuery.removeEventListener("change", updateOrientationState);
    window.removeEventListener("resize", updateOrientationState);
    document.body.classList.remove("portrait-blocked");
  };
}

export function OrientationLock(): ReactElement {
  return (
    <div className="orientation-lock" role="alert" aria-live="assertive">
      <div className="orientation-lock-card">
        <p className="orientation-lock-title">Landscape mode required</p>
        <p className="orientation-lock-text">Rotate this device to landscape to continue.</p>
      </div>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) {
    return "Good morning!";
  }
  if (h < 18) {
    return "Good afternoon!";
  }
  return "Good evening!";
}
