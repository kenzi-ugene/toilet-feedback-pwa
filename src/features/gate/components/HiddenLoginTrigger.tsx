import { useCallback, useRef } from "react";
import type { ReactElement } from "react";

const REQUIRED_TAPS = 10;
const TAP_WINDOW_MS = 2500;

interface HiddenLoginTriggerProps {
  onActivated: () => void;
}

/**
 * Invisible hit-zone pinned to the bottom-right corner. Tapping it 10 times within
 * TAP_WINDOW_MS reveals the panel access (login) screen. Lets staff reach the gate
 * without exposing it to the public kiosk view.
 */
export function HiddenLoginTrigger({ onActivated }: HiddenLoginTriggerProps): ReactElement {
  const tapCountRef = useRef(0);
  const lastTapAtRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapAtRef.current > TAP_WINDOW_MS) {
      tapCountRef.current = 0;
    }
    lastTapAtRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= REQUIRED_TAPS) {
      tapCountRef.current = 0;
      onActivated();
    }
  }, [onActivated]);

  return (
    <div
      className="hidden-login-trigger"
      role="presentation"
      aria-hidden="true"
      onPointerDown={handleTap}
    />
  );
}
