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

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const finish = (): void => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      window.removeEventListener("online", onOnline);
    };

    const onAbort = (): void => {
      finish();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const onOnline = (): void => {
      finish();
      resolve();
    };

    const timer = window.setTimeout(() => {
      finish();
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
    window.addEventListener("online", onOnline, { once: true });
  });
}

function isRetryableAuthFailure(failureReason: string | undefined): boolean {
  return failureReason === "network_error" || failureReason === "http_error";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function RootApp(): ReactElement {
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null);
  const [initialConfig, setInitialConfig] = useState<PanelConfig | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateStatus, setGateStatus] = useState<string | null>(null);
  const [isCheckingGate, setIsCheckingGate] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const retryControllerRef = useRef<AbortController | null>(null);

  useLandscapeGuard();

  useEffect(() => {
    const controller = new AbortController();
    retryControllerRef.current = controller;

    void (async () => {
      try {
        const config = await loadPanelConfig();
        if (controller.signal.aborted) {
          return;
        }
        setInitialConfig(config);

        const stored = getStoredGateSetup();
        if (!stored) {
          return;
        }

        setIsCheckingGate(true);
        setGateError(null);
        setGateStatus("Saved credentials found. Retrying login...");

        let attemptIndex = 0;
        while (!controller.signal.aborted) {
          const auth = await authenticateGateWithBackend(
            config,
            {
              locationCode: stored.locationCode,
              password: stored.password,
            },
            controller.signal,
          );

          if (controller.signal.aborted) {
            return;
          }

          if (auth.isValid) {
            const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
            if (controller.signal.aborted) {
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

          if (!isRetryableAuthFailure(auth.failureReason)) {
            setGateStatus(null);
            setGateError("Credentials not valid.");
            setIsCheckingGate(false);
            return;
          }

          const waitMs = RETRY_DELAYS_MS[Math.min(attemptIndex, RETRY_DELAYS_MS.length - 1)];
          setGateStatus(`Network unavailable. Retrying login in ${Math.round(waitMs / 1000)}s...`);
          await delay(waitMs, controller.signal);
          attemptIndex += 1;
          setGateStatus("Retrying login...");
        }
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }
        setBootError(error instanceof Error ? error.message : String(error));
        setIsCheckingGate(false);
      }
    })();

    return () => {
      controller.abort();
      if (retryControllerRef.current === controller) {
        retryControllerRef.current = null;
      }
    };
  }, []);

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

      retryControllerRef.current?.abort();
      retryControllerRef.current = null;

      setIsCheckingGate(true);
      setGateError(null);
      setGateStatus(null);
      try {
        const auth = await authenticateGateWithBackend(initialConfig, {
          locationCode: trimmedLocation,
          password: trimmedPassword,
        });

        if (!auth.isValid) {
          if (isRetryableAuthFailure(auth.failureReason)) {
            setGateError("Network unavailable. Check the connection and try again.");
            return;
          }
          setGateError("Credentials not valid.");
          return;
        }

        saveGateSetup(trimmedLocation, trimmedPassword);
        const mergedConfig = await buildRuntimeConfig(auth.panelResponse);
        setRuntimeState({
          config: mergedConfig,
          locationCode: trimmedLocation,
        });
      } finally {
        setIsCheckingGate(false);
        setGateStatus(null);
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
