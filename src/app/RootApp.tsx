import { useCallback, useEffect, useRef, useState } from "react";
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

const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 30_000] as const;

function waitForRetry(ms: number, shouldStop: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const finish = (): void => {
      window.clearTimeout(timer);
      window.removeEventListener("online", finish);
      resolve();
    };

    const timer = window.setTimeout(finish, ms);
    window.addEventListener("online", finish, { once: true });

    if (shouldStop()) {
      finish();
    }
  });
}

function isConfirmedInvalidCredentials(failureReason: string | undefined): boolean {
  return failureReason === "invalid_credentials";
}

export function RootApp(): ReactElement {
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [initialConfig, setInitialConfig] = useState<PanelConfig | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateStatus, setGateStatus] = useState<string | null>(null);
  const [isCheckingGate, setIsCheckingGate] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const runtimeStateRef = useRef<RuntimeState | null>(null);

  useLandscapeGuard();

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const config = await loadPanelConfig();
        if (!cancelled) {
          setInitialConfig(config);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : String(error));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialConfig || runtimeState) {
      return;
    }

    const stored = getStoredGateSetup();
    if (!stored) {
      return;
    }

    let cancelled = false;
    let attemptIndex = 0;

    const shouldStop = (): boolean => cancelled || runtimeStateRef.current !== null;

    void (async () => {
      setIsCheckingGate(true);
      setGateError(null);
      setGateStatus("Saved credentials found. Signing in...");

      while (!shouldStop()) {
        const auth = await authenticateGateWithBackend(initialConfig, stored);
        if (shouldStop()) {
          return;
        }

        if (auth.isValid) {
          const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
          if (shouldStop()) {
            return;
          }
          setRuntimeState({
            config: mergedConfig,
            locationCode: stored.locationCode,
          });
          setGateError(null);
          setGateStatus(null);
          setIsCheckingGate(false);
          return;
        }

        if (isConfirmedInvalidCredentials(auth.failureReason)) {
          setGateStatus(null);
          setGateError("Credentials not valid.");
          setIsCheckingGate(false);
          return;
        }

        const waitMs = RETRY_DELAYS_MS[Math.min(attemptIndex, RETRY_DELAYS_MS.length - 1)];
        setIsCheckingGate(false);
        setGateStatus(`Network unavailable. Retrying login in ${Math.round(waitMs / 1000)}s...`);
        await waitForRetry(waitMs, shouldStop);
        attemptIndex += 1;
        if (shouldStop()) {
          return;
        }
        setIsCheckingGate(true);
        setGateStatus("Retrying login...");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialConfig, runtimeState]);

  const onGateSubmit = useCallback(
    async (locationCode: string, password: string): Promise<void> => {
      if (!initialConfig) {
        return;
      }

      const trimmedLocation = locationCode.trim();
      const trimmedPassword = password.trim();
      if (trimmedLocation === "") {
        setGateError("Please enter a location code.");
        setGateStatus(null);
        return;
      }

      setIsCheckingGate(true);
      setGateError(null);
      setGateStatus("Signing in...");
      try {
        const auth = await authenticateGateWithBackend(initialConfig, {
          locationCode: trimmedLocation,
          password: trimmedPassword,
        });

        if (!auth.isValid) {
          if (isConfirmedInvalidCredentials(auth.failureReason)) {
            setGateError("Credentials not valid.");
            setGateStatus(null);
            return;
          }
          setGateError("Network unavailable. Check the connection and try again.");
          setGateStatus(null);
          return;
        }

        try {
          saveGateSetup(trimmedLocation, trimmedPassword);
        } catch {
          // Login should still proceed if localStorage is unavailable.
        }
        const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
        setRuntimeState({
          config: mergedConfig,
          locationCode: trimmedLocation,
        });
        setGateError(null);
        setGateStatus(null);
      } finally {
        setIsCheckingGate(false);
      }
    },
    [initialConfig],
  );

  if (bootError) {
    return (
      <pre
        style={{
          color: "#1f2a37",
          background: "#f4f7fa",
          margin: "1.25rem",
          padding: "1.25rem",
          fontSize: "14px",
          whiteSpace: "pre-wrap",
          borderRadius: "12px",
        }}
      >
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
        <GateScreen
          isSubmitting={isCheckingGate}
          error={gateError}
          status={gateStatus}
          onSubmit={onGateSubmit}
        />
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
