import { useEffect } from "react";
import type { ReactElement } from "react";

export function installLandscapeGuard(): () => void {
  const portraitQuery = window.matchMedia("(orientation: portrait)");
  const updateOrientationState = (): void => {
    document.body.classList.toggle("portrait-blocked", portraitQuery.matches);
  };

  updateOrientationState();
  portraitQuery.addEventListener("change", updateOrientationState);
  window.addEventListener("resize", updateOrientationState);

  return () => {
    portraitQuery.removeEventListener("change", updateOrientationState);
    window.removeEventListener("resize", updateOrientationState);
    document.body.classList.remove("portrait-blocked");
  };
}

export function useLandscapeGuard(): void {
  useEffect(() => {
    return installLandscapeGuard();
  }, []);
}

export function OrientationLock(): ReactElement {
  return (
    <div className="orientation-lock" role="alert" aria-live="assertive">
      <div className="orientation-lock-card">
        <p className="orientation-lock-title">Landscape mode required</p>
        <p className="orientation-lock-text">Rotate this device to landscape to continue.</p>
      </div>
    </div>
  );
}
