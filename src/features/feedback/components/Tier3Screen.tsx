import type { ReactElement } from "react";

interface Tier3ScreenProps {
  resetMs: number;
  onDismiss: () => void;
}

export function Tier3Screen({ onDismiss, resetMs }: Tier3ScreenProps): ReactElement {
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
