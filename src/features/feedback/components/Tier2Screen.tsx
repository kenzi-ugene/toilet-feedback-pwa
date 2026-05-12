import type { ReactElement } from "react";
import type { FeedbackItem } from "../../../entities/feedback/items";

interface Tier2ScreenProps {
  categories: FeedbackItem[];
  selectedCategoryIds: string[];
  isSubmittingFeedback: boolean;
  onToggleCategory: (categoryId: string) => void;
  onSubmitFeedback: () => Promise<void>;
  onBackToTier1?: () => void;
}

export function Tier2Screen({
  categories,
  selectedCategoryIds,
  isSubmittingFeedback,
  onToggleCategory,
  onSubmitFeedback,
  onBackToTier1,
}: Tier2ScreenProps): ReactElement {
  return (
    <div className="tier2">
      <h1 className="tier2-title">Let us know the areas for improvement</h1>
      <div className="icon-grid">
        {categories.length === 0 ? (
          <p className="tier2-empty" role="status">
            N/A
          </p>
        ) : (
          categories.map((item) => (
            <button
              type="button"
              className={selectedCategoryIds.includes(item.id) ? "icon-tile icon-tile-selected" : "icon-tile"}
              key={item.id}
              data-category={item.id}
              onClick={() => onToggleCategory(item.id)}
            >
              {item.iconSrc ? (
                <img
                  className="icon-tile-symbol"
                  src={item.iconSrc}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <span className="icon-tile-symbol icon-tile-na" aria-hidden="true">
                  N/A
                </span>
              )}
              <span className="icon-tile-label">{item.label}</span>
            </button>
          ))
        )}
      </div>
      <div className={onBackToTier1 ? "tier2-actions tier2-actions--with-back" : "tier2-actions"}>
        {onBackToTier1 && (
          <button type="button" className="panel-back-btn panel-back-btn--tier2-row" onClick={onBackToTier1} aria-label="Back to ratings">
            <span className="panel-back-btn-label">Back</span>
          </button>
        )}
        <button
          type="button"
          className="text-btn tier2-submit-btn"
          disabled={selectedCategoryIds.length === 0 || isSubmittingFeedback}
          onClick={() => void onSubmitFeedback()}
        >
          {isSubmittingFeedback
            ? "Submitting..."
            : `Submit feedback${selectedCategoryIds.length > 0 ? ` (${selectedCategoryIds.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}
