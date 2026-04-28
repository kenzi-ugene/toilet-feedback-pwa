import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { FeedbackApp } from "../features/feedback/components/FeedbackApp";
import { GateScreen } from "../features/gate/components/GateScreen";
import { getStoredGateSetup, saveGateSetup } from "../features/gate/storage";
import { OrientationLock, useLandscapeGuard } from "../features/orientation/orientation";
import type { PanelConfig } from "../entities/panel/config";
import { loadPanelConfig } from "../entities/panel/config";
import type { FeedbackPanelApiResponse } from "../shared/api/types";
import { buildPanelRealtimeUrls } from "../shared/api/endpoints";
import { authenticateGateWithBackend } from "../shared/api/gateApi";
import { mapPanelResponseToConfigPatch } from "../shared/api/panelMappers";

interface RuntimeState {
  config: PanelConfig;
  locationCode: string;
}

export function RootApp(): ReactElement {
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [initialConfig, setInitialConfig] = useState<PanelConfig | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [isCheckingGate, setIsCheckingGate] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useLandscapeGuard();

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
  const loadedConfig = await loadPanelConfig(configPatch);
  const realtimeUrls = buildPanelRealtimeUrls(loadedConfig.realtimeBaseUrl, loadedConfig.feedbackPanelId);
  return {
    ...loadedConfig,
    panelStreamUrl: realtimeUrls.streamUrl,
    panelLatestMetricsUrl: realtimeUrls.latestMetricsUrl,
  };
}
