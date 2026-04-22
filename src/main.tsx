import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { FeedbackApp, GateScreen, installLandscapeGuard, OrientationLock } from "./app";
import type { FeedbackPanelApiResponse } from "./backend";
import { authenticateGateWithBackend, mapPanelResponseToConfigPatch } from "./backend";
import { loadPanelConfig, type PanelConfig } from "./config";
import { getStoredGateSetup, saveGateSetup } from "./gate";
import "./style.css";

interface RuntimeState {
  config: PanelConfig;
  locationCode: string;
}

function RootApp(): ReactElement {
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [initialConfig, setInitialConfig] = useState<PanelConfig | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [isCheckingGate, setIsCheckingGate] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = installLandscapeGuard();
    return cleanup;
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const config = await loadPanelConfig();
        setInitialConfig(config);
        const stored = getStoredGateSetup();
        if (!stored) {
          return;
        }

        const auth = await authenticateGateWithBackend(config, {
          locationCode: stored.locationCode,
          password: stored.password,
        });
        if (!auth.isValid) {
          return;
        }

        const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
        setRuntimeState({
          config: mergedConfig,
          locationCode: stored.locationCode,
        });
      } catch (error: unknown) {
        setBootError(error instanceof Error ? error.message : String(error));
      }
    })();
  }, []);

  const onGateSubmit = useCallback(
    async (locationCode: string, password: string): Promise<void> => {
      if (!initialConfig) {
        return;
      }

      const trimmedLocation = locationCode.trim();
      if (trimmedLocation === "") {
        setGateError("Please enter a location code.");
        return;
      }

      setIsCheckingGate(true);
      setGateError(null);
      try {
        const auth = await authenticateGateWithBackend(initialConfig, {
          locationCode: trimmedLocation,
          password: password.trim(),
        });

        if (!auth.isValid) {
          setGateError("Credentials not valid.");
          return;
        }

        saveGateSetup(trimmedLocation, password.trim());
        const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
        setRuntimeState({
          config: mergedConfig,
          locationCode: trimmedLocation,
        });
      } finally {
        setIsCheckingGate(false);
      }
    },
    [initialConfig],
  );

  if (bootError) {
    return (
      <pre style={{ color: "#fff", padding: "1.25rem", fontSize: "14px", whiteSpace: "pre-wrap" }}>
        {bootError}
      </pre>
    );
  }

  if (!initialConfig) {
    return <div className="gate-screen">Loading...</div>;
  }

  if (!runtimeState) {
    return (
      <>
        <GateScreen isSubmitting={isCheckingGate} error={gateError} onSubmit={onGateSubmit} />
        <OrientationLock />
      </>
    );
  }

  return (
    <>
      <FeedbackApp config={runtimeState.config} locationCode={runtimeState.locationCode} />
      <OrientationLock />
    </>
  );
}

async function buildRuntimeConfig(panelResponse: FeedbackPanelApiResponse | null): Promise<PanelConfig> {
  const configPatch = mapPanelResponseToConfigPatch(panelResponse);
  return loadPanelConfig(configPatch);
}

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("app");
  if (!rootElement) {
    throw new Error("Missing #app root element");
  }

  createRoot(rootElement).render(<RootApp />);

  if (import.meta.env.PROD) {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  }
}

void bootstrap();
