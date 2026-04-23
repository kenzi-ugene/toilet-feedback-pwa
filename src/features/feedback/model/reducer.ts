import type { Rating } from "../../../shared/types/rating";
import type { PanelConfig } from "../../../entities/panel/config";
import { nextScreenAfterRating, type Screen } from "./flow";

export interface FeedbackModel {
  screen: Screen;
  rating: Rating | null;
  categoryIds: string[];
  selectedTier2CategoryIds: string[];
}

type FeedbackAction =
  | { type: "reset"; config: PanelConfig }
  | { type: "ratingSelected"; rating: Rating }
  | { type: "tier2CategoryToggled"; categoryId: string }
  | { type: "tier2Submitted"; rating: Rating }
  | { type: "tier3Dismissed"; config: PanelConfig };

export function buildInitialFeedbackModel(config: PanelConfig): FeedbackModel {
  return {
    screen: config.enableRatingsFeedback === true ? "tier1" : "tier2",
    rating: null,
    categoryIds: [],
    selectedTier2CategoryIds: [],
  };
}

export function feedbackReducer(state: FeedbackModel, action: FeedbackAction): FeedbackModel {
  switch (action.type) {
    case "reset":
    case "tier3Dismissed":
      return buildInitialFeedbackModel(action.config);
    case "ratingSelected": {
      const nextScreen = nextScreenAfterRating(action.rating);
      return {
        ...state,
        rating: action.rating,
        screen: nextScreen,
        categoryIds: nextScreen === "tier2" ? [] : state.categoryIds,
        selectedTier2CategoryIds: nextScreen === "tier2" ? [] : state.selectedTier2CategoryIds,
      };
    }
    case "tier2CategoryToggled": {
      const selected = state.selectedTier2CategoryIds.includes(action.categoryId)
        ? state.selectedTier2CategoryIds.filter((id) => id !== action.categoryId)
        : [...state.selectedTier2CategoryIds, action.categoryId];
      return {
        ...state,
        selectedTier2CategoryIds: selected,
      };
    }
    case "tier2Submitted":
      return {
        ...state,
        rating: action.rating,
        screen: "tier3",
        categoryIds: [...state.selectedTier2CategoryIds],
        selectedTier2CategoryIds: [],
      };
    default:
      return state;
  }
}
