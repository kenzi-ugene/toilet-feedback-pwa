/**
 * Extra guards for kiosk-style panels: viewport meta should already set
 * user-scalable=no; this blocks Ctrl+wheel zoom (desktop / trackpad) and
 * WebKit pinch gestures where supported.
 */
export function installViewportZoomGuards(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  const blockGestureZoom = (event: Event): void => {
    event.preventDefault();
  };

  document.addEventListener("gesturestart", blockGestureZoom, { passive: false });
  document.addEventListener("gesturechange", blockGestureZoom, { passive: false });
}
