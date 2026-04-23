import type { ReactElement } from "react";
import type { FeedbackCategory } from "../../../entities/feedback/categories";

interface Tier2ScreenProps {
  categories: FeedbackCategory[];
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
        {categories.map((category) => (
          <button
            type="button"
            className={selectedCategoryIds.includes(category.id) ? "icon-tile icon-tile-selected" : "icon-tile"}
            key={category.id}
            data-category={category.id}
            onClick={() => onToggleCategory(category.id)}
          >
            <img className="icon-tile-symbol" src={category.iconSrc} alt="" aria-hidden="true" />
            <span className="icon-tile-label">{category.label}</span>
          </button>
        ))}
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
