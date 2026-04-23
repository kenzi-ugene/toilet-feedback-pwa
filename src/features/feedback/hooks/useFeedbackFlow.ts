import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { clearGateSetup } from "../../gate/storage";
import { buildTier1RatingRows, buildTier2Categories } from "../../../entities/panel/feedbackAssets";
import type { PanelConfig } from "../../../entities/panel/config";
import { submitNegativeRatingFeedback, submitPositiveRatingFeedback } from "../../../shared/api/feedbackApi";
import { MockPanelDataProvider } from "../services/mockPanelDataProvider";
import type { PanelState } from "../../../shared/types/panelState";
import { isNegativePathRating, type Rating } from "../../../shared/types/rating";
import { buildInitialFeedbackModel, feedbackReducer } from "../model/reducer";

interface UseFeedbackFlowResult {
  model: ReturnType<typeof buildInitialFeedbackModel>;
  snapshot: PanelState;
  tier1Ratings: ReturnType<typeof buildTier1RatingRows>;
  tier2Categories: ReturnType<typeof buildTier2Categories>;
  isSubmittingFeedback: boolean;
  onPickRating: (rating: Rating) => Promise<void>;
  onToggleCategory: (categoryId: string) => void;
  onSubmitTier2Feedback: () => Promise<void>;
  onDismissTier3: () => void;
  onLogout: () => void;
}

export function useFeedbackFlow(config: PanelConfig, locationCode: string): UseFeedbackFlowResult {
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

  const [model, dispatch] = useReducer(feedbackReducer, buildInitialFeedbackModel(config));
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [snapshot, setSnapshot] = useState<PanelState>(() => ({
    ...dataProvider.getSnapshot(),
    locationLabel: locationCode,
  }));

  useEffect(() => {
    dispatch({ type: "reset", config });
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
    tier1Ratings: buildTier1RatingRows(config),
    tier2Categories: buildTier2Categories(config),
    isSubmittingFeedback,
    onPickRating,
    onToggleCategory,
    onSubmitTier2Feedback,
    onDismissTier3,
    onLogout,
  };
}
