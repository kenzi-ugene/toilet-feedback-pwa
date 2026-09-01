export const NETWORK_RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 30_000] as const;

export function nextNetworkRetryDelayMs(attemptIndex: number): number {
  const lastIndex = NETWORK_RETRY_DELAYS_MS.length - 1;
  return NETWORK_RETRY_DELAYS_MS[Math.min(Math.max(attemptIndex, 0), lastIndex)];
}

export function waitForRetry(ms: number, shouldStop: () => boolean): Promise<void> {
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
