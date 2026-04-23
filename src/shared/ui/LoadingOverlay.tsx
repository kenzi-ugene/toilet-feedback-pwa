import type { ReactElement } from "react";

interface LoadingOverlayProps {
  isVisible: boolean;
  text: string;
}

export function LoadingOverlay({ isVisible, text }: LoadingOverlayProps): ReactElement {
  return (
    <div className="feedback-loading-overlay" hidden={!isVisible}>
      <div className="feedback-loading-card" role="status" aria-live="polite">
        <div className="feedback-loading-spinner" aria-hidden="true" />
        <p className="feedback-loading-text">{text}</p>
      </div>
    </div>
  );
}
