// ── Trellis formatting + date/money utilities ─────────────────────────────
// Money is ALWAYS integer minor units + explicit currency code. Never floats.

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const CURRENCIES: Record<string, { symbol: string; exp: number }> = {
  IDR: { symbol: "Rp", exp: 0 },
  EUR: { symbol: "€", exp: 2 },
  USD: { symbol: "$", exp: 2 },
  AUD: { symbol: "A$", exp: 2 },
  GBP: { symbol: "£", exp: 2 },
};

const nf = (exp: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: exp, maximumFractionDigits: exp });

/** minor units → display string, e.g. 4200000 IDR → "Rp 4,200,000" */
export function money(minor: number, code = "IDR", opts?: { compact?: boolean; sign?: boolean }): string {
  const c = CURRENCIES[code] ?? CURRENCIES.USD;
  const major = minor / 10 ** c.exp;
  if (opts?.compact) {
    const abs = Math.abs(major);
    let v: string;
    if (abs >= 1_000_000_000) v = (major / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B";
    else if (abs >= 1_000_000) v = (major / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
    else if (abs >= 10_000) v = (major / 1000).toFixed(0) + "k";
    else v = nf(c.exp).format(major);
    return `${opts.sign && minor > 0 ? "+" : ""}${c.symbol} ${v}`;
  }
  return `${opts?.sign && minor > 0 ? "+" : ""}${c.symbol} ${nf(c.exp).format(major)}`;
}

export function fromMajor(amount: number, code = "IDR"): number {
  const c = CURRENCIES[code] ?? CURRENCIES.USD;
  return Math.round(amount * 10 ** c.exp);
}

// ── Dates (night-based, half-open [checkIn, checkOut)) ─────────────────────
const MS_DAY = 86_400_000;

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
export function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function dayKey(d: Date | string): string {
  const x = typeof d === "string" ? parseKey(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}
export function addDays(d: Date | string, n: number): Date {
  const x = typeof d === "string" ? parseKey(d) : new Date(d);
  const r = new Date(x);
  r.setDate(r.getDate() + n);
  return r;
}
export function nightsBetween(a: Date | string, b: Date | string): number {
  const da = typeof a === "string" ? parseKey(a).getTime() : new Date(a).setHours(0, 0, 0, 0);
  const db = typeof b === "string" ? parseKey(b).getTime() : new Date(b).setHours(0, 0, 0, 0);
  return Math.round((db - da) / MS_DAY);
}
export function isToday(d: Date | string): boolean {
  return dayKey(d) === dayKey(today());
}
export function isWeekend(d: Date): boolean {
  const g = d.getDay();
  return g === 0 || g === 6;
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function fmtDate(d: Date | string, opts?: { year?: boolean }): string {
  const x = typeof d === "string" ? parseKey(d) : d;
  return `${DOW[x.getDay()]} ${x.getDate()} ${MON[x.getMonth()]}${opts?.year ? ` ${x.getFullYear()}` : ""}`;
}
export function fmtShort(d: Date | string): string {
  const x = typeof d === "string" ? parseKey(d) : d;
  return `${x.getDate()} ${MON[x.getMonth()]}`;
}
export function monthLabel(d: Date | string): string {
  const x = typeof d === "string" ? parseKey(d) : d;
  return `${MONF[x.getMonth()]} ${x.getFullYear()}`;
}
export function relDay(d: Date | string): string {
  const n = nightsBetween(today(), d);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1) return `in ${n} days`;
  return `${-n} days ago`;
}
export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${fmtShort(d)}, ${hh}:${mm}`;
}
export function hoursLeft(ts: number): number {
  return Math.round((ts - Date.now()) / 3_600_000);
}

// ── misc ───────────────────────────────────────────────────────────────────
let seq = 1000;
export function uid(prefix = "id"): string {
  seq += 1;
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
}
export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
export function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}
export function download(name: string, content: string, mime = "text/csv"): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => (String(c).includes(",") || String(c).includes('"') ? `"${String(c).replace(/"/g, '""')}"` : c)).join(","))
    .join("\n");
}
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
export function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  return Promise.resolve();
}
