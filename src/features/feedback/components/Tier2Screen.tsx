import type { ReactElement } from "react";
import type { FeedbackItem } from "../../../entities/feedback/items";

interface Tier2ScreenProps {
  categories: FeedbackItem[];
  selectedCategoryIds: string[];
  isSubmittingFeedback: boolean;
  onToggleCategory: (categoryId: string) => void;
  onSubmitFeedback: () => Promise<void>;
}

export function Tier2Screen({
  categories,
  selectedCategoryIds,
  isSubmittingFeedback,
  onToggleCategory,
  onSubmitFeedback,
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
      <div className="tier2-actions">
        <button
          type="button"
          className="text-btn"
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
