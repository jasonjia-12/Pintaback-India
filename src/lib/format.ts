// Client-safe helpers (no server-only imports). Used by both server and client code.
export function parseJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(s: string | null): Record<string, unknown> {
  if (!s) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

const CURRENCIES: Record<string, { symbol: string; decimals: number }> = {
  INR: { symbol: "₹", decimals: 2 },
  CNY: { symbol: "¥", decimals: 2 },
  USD: { symbol: "$", decimals: 2 },
};

export function currencyMeta(currency: string) {
  return CURRENCIES[currency] ?? { symbol: currency, decimals: 2 };
}

export function formatMoney(minor: number, currency: string): string {
  const { symbol, decimals } = currencyMeta(currency);
  const value = (minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return `${symbol} ${value}`;
}
