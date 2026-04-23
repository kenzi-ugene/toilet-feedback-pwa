import type { ReactElement } from "react";
import type { PanelConfig } from "../../../entities/panel/config";
import { LoadingOverlay } from "../../../shared/ui/LoadingOverlay";
import { Tier1Screen } from "./Tier1Screen";
import { Tier2Screen } from "./Tier2Screen";
import { Tier3Screen } from "./Tier3Screen";
import { useFeedbackFlow } from "../hooks/useFeedbackFlow";

interface FeedbackAppProps {
  config: PanelConfig;
  locationCode: string;
}

export function FeedbackApp({ config, locationCode }: FeedbackAppProps): ReactElement {
  const {
    model,
    snapshot,
    tier1Ratings,
    tier2Categories,
    isSubmittingFeedback,
    onPickRating,
    onToggleCategory,
    onSubmitTier2Feedback,
    onDismissTier3,
    onLogout,
  } = useFeedbackFlow(config, locationCode);

  const isTier2 = model.screen === "tier2";

  return (
    <>
      <div className="shell">
        <div className={isTier2 ? "bg bg-tier2" : "bg"} />
        {model.screen === "tier1" && (
          <Tier1Screen config={config} snapshot={snapshot} ratings={tier1Ratings} onPickRating={onPickRating} />
        )}
        {model.screen === "tier2" && (
          <Tier2Screen
            categories={tier2Categories}
            selectedCategoryIds={model.selectedTier2CategoryIds}
            isSubmittingFeedback={isSubmittingFeedback}
            onToggleCategory={onToggleCategory}
            onSubmitFeedback={onSubmitTier2Feedback}
          />
        )}
        {model.screen === "tier3" && <Tier3Screen resetMs={config.thankYouResetMs} onDismiss={onDismissTier3} />}
      </div>
      <LoadingOverlay isVisible={isSubmittingFeedback} text="Submitting feedback..." />
      <button type="button" className="logout-btn" onClick={onLogout}>
        Log out
      </button>
      <button type="button" className="reload-btn" aria-label="Reload panel items" onClick={() => window.location.reload()}>
        <img src="/reload.png" alt="" aria-hidden="true" className="reload-btn-icon" />
      </button>
    </>
  );
}
