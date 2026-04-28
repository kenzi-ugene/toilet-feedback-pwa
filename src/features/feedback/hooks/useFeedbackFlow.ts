import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { clearGateSetup } from "../../gate/storage";
import { buildTier1RatingRows, buildTier2Items } from "../../../entities/panel/feedbackAssets";
import type { PanelConfig } from "../../../entities/panel/config";
import { submitNegativeRatingFeedback, submitPositiveRatingFeedback } from "../../../shared/api/feedbackApi";
import type { PanelState } from "../../../shared/types/panelState";
import { isNegativePathRating, type Rating } from "../../../shared/types/rating";
import { createPanelRealtimeProvider, type RealtimeStatus } from "../../../shared/api/panelRealtime";
import { buildInitialFeedbackModel, feedbackReducer } from "../model/reducer";

interface UseFeedbackFlowResult {
  model: ReturnType<typeof buildInitialFeedbackModel>;
  snapshot: PanelState;
  tier1Ratings: ReturnType<typeof buildTier1RatingRows>;
  tier2Items: ReturnType<typeof buildTier2Items>;
  isSubmittingFeedback: boolean;
  realtimeStatus: RealtimeStatus;
  onPickRating: (rating: Rating) => Promise<void>;
  onToggleCategory: (categoryId: string) => void;
  onSubmitTier2Feedback: () => Promise<void>;
  onDismissTier3: () => void;
  onLogout: () => void;
}

function emptyPanelSnapshot(locationLabel: string): PanelState {
  return {
    locationLabel,
    footfall: null,
    temperatureC: null,
    humidityPct: null,
    updatedAt: "N/A",
  };
}

export function useFeedbackFlow(config: PanelConfig, locationCode: string): UseFeedbackFlowResult {
  const [model, dispatch] = useReducer(feedbackReducer, buildInitialFeedbackModel(config));
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [snapshot, setSnapshot] = useState<PanelState>(() => emptyPanelSnapshot(locationCode));
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");

  const tier1Ratings = useMemo(() => buildTier1RatingRows(config), [config]);
  const tier2Items = useMemo(() => buildTier2Items(config), [config]);

  useEffect(() => {
    dispatch({ type: "reset", config });
  }, [config]);

  useEffect(() => {
    setSnapshot((previous) => ({ ...previous, locationLabel: locationCode }));
  }, [locationCode]);

  useEffect(() => {
    const provider = createPanelRealtimeProvider({
      locationLabel: locationCode,
      panelId: config.feedbackPanelId,
      urls: {
        streamUrl: config.panelStreamUrl,
        latestMetricsUrl: config.panelLatestMetricsUrl,
      },
      onStatusChange: setRealtimeStatus,
    });
    const unsubscribe = provider.subscribe(() => {
      setSnapshot(provider.getSnapshot());
      setRealtimeStatus(provider.getStatus());
    });
    provider.start?.();
    setSnapshot(provider.getSnapshot());
    setRealtimeStatus(provider.getStatus());

    return () => {
      unsubscribe();
      provider.stop?.();
    };
  }, [config.feedbackPanelId, config.panelLatestMetricsUrl, config.panelStreamUrl, locationCode]);

  useEffect(() => {
    if (model.screen !== "tier3") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "tier3Dismissed", config });
    }, config.thankYouResetMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [config, model.screen, config.thankYouResetMs]);

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

      dispatch({ type: "ratingSelected", rating });
    },
    [config, isSubmittingFeedback],
  );

  const onToggleCategory = useCallback((categoryId: string): void => {
    dispatch({ type: "tier2CategoryToggled", categoryId });
  }, []);

  const onSubmitTier2Feedback = useCallback(async (): Promise<void> => {
    if (model.selectedTier2CategoryIds.length === 0 || isSubmittingFeedback) {
      return;
    }

    const submitRating: Rating = model.rating && isNegativePathRating(model.rating) ? model.rating : "poor";
    setIsSubmittingFeedback(true);
    try {
      await submitNegativeRatingFeedback(config, submitRating, model.selectedTier2CategoryIds);
      dispatch({ type: "tier2Submitted", rating: submitRating });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "ITEM_ID_REQUIRED") {
        window.alert("Selected feedback items do not contain valid API item IDs.");
        return;
      }
      if (error instanceof Error && error.message === "CANT_GET_IP") {
        window.alert("Can't get IP.");
        return;
      }
      if (error instanceof Error && error.message === "FEEDBACK_COOLDOWN") {
        window.alert("You need to wait 5 mins before submitting another feedback.");
        return;
      }
      window.alert("Feedback submission failed. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [config, isSubmittingFeedback, model.rating, model.selectedTier2CategoryIds]);

  const onDismissTier3 = useCallback((): void => {
    dispatch({ type: "tier3Dismissed", config });
  }, [config]);

  const onLogout = useCallback((): void => {
    clearGateSetup();
    window.location.reload();
  }, []);

  return {
    model,
    snapshot,
    tier1Ratings,
    tier2Items,
    isSubmittingFeedback,
    realtimeStatus,
    onPickRating,
    onToggleCategory,
    onSubmitTier2Feedback,
    onDismissTier3,
    onLogout,
  };
}
