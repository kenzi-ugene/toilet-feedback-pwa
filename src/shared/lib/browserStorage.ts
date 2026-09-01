export function readLocalStorageItem(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota / private-mode failures; the app must still run.
  }
}

export function removeLocalStorageItem(key: string): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access failures.
  }
}
