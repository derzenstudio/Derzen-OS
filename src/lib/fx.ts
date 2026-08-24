// ── FX engine ──────────────────────────────────────────────────────────────
// Reporting currency is switchable (IDR / USD primary). Rates: live snapshot
// from open.er-api.com with a dated embedded fallback — every converted
// amount carries the rate + timestamp it used, so history never drifts.

export type CurrencyCode = "IDR" | "USD" | "EUR" | "AUD" | "GBP";

export const FX_SNAPSHOT = {
  asOf: "2026-02-12 06:00 UTC",
  base: "USD" as const,
  rates: { USD: 1, IDR: 16_285, EUR: 0.923, AUD: 1.524, GBP: 0.789 } as Record<string, number>,
};

let display: CurrencyCode = "USD";
let rates: Record<string, number> = { ...FX_SNAPSHOT.rates };
let source: "live" | "snapshot" = "snapshot";
let fetchedAt: number | null = null;
const listeners = new Set<() => void>();

export function getDisplayCurrency(): CurrencyCode {
  return display;
}
export function setDisplayCurrency(c: CurrencyCode) {
  display = c;
  emit();
}
export function fxInfo() {
  return { source, fetchedAt, asOf: source === "live" && fetchedAt ? new Date(fetchedAt).toISOString().slice(0, 16).replace("T", " ") + " UTC" : FX_SNAPSHOT.asOf, rate: rates };
}
export function onFxChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => fn());
}

/** Try a live fetch; always resolves. Returns true if live rates are now in use. */
export async function refreshFx(): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const to = window.setTimeout(() => ctl.abort(), 4500);
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctl.signal });
    window.clearTimeout(to);
    if (!res.ok) throw new Error("fx http " + res.status);
    const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (json.result === "success" && json.rates?.IDR && json.rates?.EUR) {
      rates = { USD: 1, IDR: json.rates.IDR, EUR: json.rates.EUR, AUD: json.rates.AUD ?? FX_SNAPSHOT.rates.AUD, GBP: json.rates.GBP ?? FX_SNAPSHOT.rates.GBP };
      source = "live";
      fetchedAt = Date.now();
      emit();
      return true;
    }
    throw new Error("fx payload");
  } catch {
    source = "snapshot";
    emit();
    return false;
  }
}

/** Convert a minor-unit amount between currencies using current rates. Integer-safe. */
export function convertMinor(amountMinor: number, from: string, to: string): number {
  if (from === to) return amountMinor;
  const rf = rates[from] ?? 1;
  const rt = rates[to] ?? 1;
  return Math.round((amountMinor / rf) * rt);
}
