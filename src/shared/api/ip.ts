export async function getCurrentIpv4Address(): Promise<string | null> {
  return getIpv4FromIpify();
}

function isIpv4Address(value: string): boolean {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }
  return match.slice(1).every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

async function getIpv4FromIpify(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { ip?: unknown };
    if (typeof data.ip !== "string") {
      return null;
    }
    const ip = data.ip.trim();
    return isIpv4Address(ip) ? ip : null;
  } catch {
    return null;
  }
}
