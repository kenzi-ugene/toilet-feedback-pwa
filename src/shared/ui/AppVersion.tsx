import type { ReactElement } from "react";

export const APP_VERSION = __APP_VERSION__;

interface AppVersionProps {
  isDemo?: boolean;
}

export function AppVersion({ isDemo = false }: AppVersionProps): ReactElement {
  const label = isDemo ? `Demo · v${APP_VERSION}` : `v${APP_VERSION}`;

  return (
    <span className="app-version" aria-hidden="true">
      {label}
    </span>
  );
}
