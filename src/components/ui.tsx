import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "../lib/format";
import { Ic, type IconName } from "./icons";
import { useApp } from "../store";
import type { Priority, ResStatus } from "../lib/types";

// ── Buttons ────────────────────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost" | "danger" | "dark" | "gold";
  size?: "xs" | "sm" | "md";
  icon?: IconName;
};
export function Btn({ variant = "outline", size = "sm", icon, className, children, ...rest }: BtnProps) {
  const v = {
    solid: "btn-grad text-[#F2F7F3]",
    dark: "bg-pine-900 text-pine-100 hover:bg-pine-800 border border-pine-900 shadow-sm",
    outline: "bg-card text-ink border border-line2 hover:border-brand hover:text-brand-deep",
    ghost: "bg-transparent text-mute hover:bg-black/5 hover:text-ink border border-transparent",
    danger: "bg-danger text-white hover:bg-[#a2301f] border border-danger shadow-sm",
    gold: "bg-gold text-white hover:bg-[#a86d0d] border border-gold shadow-sm",
  }[variant];
  const s = { xs: "h-6 px-2 text-[11px] gap-1", sm: "h-8 px-3 text-[12.5px] gap-1.5", md: "h-10 px-4 text-[13.5px] gap-2" }[size];
  return (
    <button
      className={cx("inline-flex items-center justify-center rounded-md font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap", v, s, className)}
      {...rest}
    >
      {icon && <Ic name={icon} size={size === "xs" ? 12 : size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export function IconBtn({ label, name, onClick, className, size = 15, tone }: { label: string; name: IconName; onClick?: (e: React.MouseEvent) => void; className?: string; size?: number; tone?: string }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={cx("inline-flex h-7 w-7 items-center justify-center rounded-md text-mute hover:bg-black/5 hover:text-ink transition-colors", tone, className)}>
      <Ic name={name} size={size} />
    </button>
  );
}

// ── Badges & status ────────────────────────────────────────────────────────
const TONES: Record<string, string> = {
  ok: "bg-brand-soft text-brand-deep",
  warn: "bg-gold-soft text-[#8a5c07]",
  danger: "bg-danger-soft text-danger",
  info: "bg-sea-soft text-sea",
  plum: "bg-plum-soft text-plum",
  mute: "bg-black/5 text-mute",
  ink: "bg-pine-900 text-pine-100",
};
export function Badge({ tone = "mute", children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", TONES[tone] ?? TONES.mute, className)}>{children}</span>;
}

/** Status dot — NEVER colour alone: always paired with a text label. */
export function Dot({ tone, label, pulse }: { tone: "ok" | "warn" | "danger" | "info" | "mute"; label: string; pulse?: boolean }) {
  const c = { ok: "bg-brand", warn: "bg-gold", danger: "bg-danger", info: "bg-sea", mute: "bg-faint" }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/80">
      <span className={cx("h-2 w-2 rounded-full shrink-0", c, pulse && tone === "danger" && "dot-pulse")} aria-hidden="true" />
      {label}
    </span>
  );
}

export const RES_STATUS: Record<ResStatus, { label: string; tone: string }> = {
  enquiry: { label: "Enquiry", tone: "mute" },
  pending: { label: "Pending", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "ok" },
  deposit_paid: { label: "Deposit paid", tone: "info" },
  checked_in: { label: "Checked in", tone: "plum" },
  checked_out: { label: "Checked out", tone: "mute" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "danger" },
};
export function StatusChip({ status }: { status: ResStatus }) {
  const s = RES_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-black/5 text-mute" },
  medium: { label: "Medium", cls: "bg-sea-soft text-sea" },
  high: { label: "High", cls: "bg-gold-soft text-[#8a5c07]" },
  urgent: { label: "Urgent", cls: "bg-[#F3D1C8] text-[#93331f]" },
  emergency: { label: "Emergency", cls: "bg-danger text-white" },
};
export function PriorityChip({ p }: { p: Priority }) {
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", PRIORITY[p].cls)}>{PRIORITY[p].label}</span>;
}

// ── Surfaces ───────────────────────────────────────────────────────────────
export function Card({ title, sub, action, children, className, pad = true }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx("rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(26,38,32,0.05)]", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <div>
            <h3 className="font-display text-[13.5px] font-bold text-ink">{title}</h3>
            {sub && <p className="text-[11px] text-mute">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Modal({ open, onClose, title, children, footer, w = 520 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; w?: number }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-pine-950/45 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="anim-pop frame frame-2 w-full rounded-lg bg-card shadow-2xl" style={{ maxWidth: w }}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
          <IconBtn label="Close dialog" name="x" onClick={onClose} />
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, width = 380 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: number }) {
  return (
    <div className={cx("fixed inset-0 z-[70]", !open && "pointer-events-none")} aria-hidden={!open}>
      <div className={cx("absolute inset-0 bg-pine-950/30 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onMouseDown={onClose} />
      <aside className={cx("absolute right-0 top-0 h-full border-l border-line bg-paper shadow-2xl transition-transform duration-300 ease-out flex flex-col", open ? "translate-x-0" : "translate-x-full")} style={{ width }} role="complementary">
        {title && (
          <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3">
            <div className="font-display text-[14px] font-bold text-ink">{title}</div>
            <IconBtn label="Close panel" name="x" onClick={onClose} />
          </header>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-black/[0.03] p-1">
      {tabs.map((tb) => (
        <button
          key={tb.id} role="tab" aria-selected={active === tb.id} onClick={() => onChange(tb.id)}
          className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-all", active === tb.id ? "bg-card text-ink shadow-sm border border-line" : "text-mute hover:text-ink")}
        >
          {tb.label}
          {tb.count !== undefined && <span className={cx("rounded-full px-1.5 text-[10px] font-bold", active === tb.id ? "bg-brand-soft text-brand-deep" : "bg-black/8 text-mute")}>{tb.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Forms ──────────────────────────────────────────────────────────────────
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}
const inputCls = "w-full h-9 rounded-md border border-line2 bg-card px-3 text-[13px] text-ink placeholder:text-faint focus:border-brand focus:outline-none transition-colors";
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(inputCls, "pr-8 appearance-auto", p.className)} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(inputCls, "h-auto min-h-[80px] py-2 leading-relaxed", p.className)} />;
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx("relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-brand" : "bg-line2")}>
      <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200", checked ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}
export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx("relative", className)}>
      <Ic name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search"} className={cx(inputCls, "pl-8")} />
    </div>
  );
}

// ── Empty / misc ───────────────────────────────────────────────────────────
export function Empty({ icon = "checkCircle", title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Ic name={icon} size={22} />
      </span>
      <p className="font-display text-[14px] font-bold text-ink">{title}</p>
      {body && <p className="max-w-[300px] text-[12px] leading-relaxed text-mute">{body}</p>}
      {action}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

// ── Charts (hand-set SVG) ──────────────────────────────────────────────────
export function Spark({ points, color = "#0E6B4E", h = 36, w = 120, fill = true }: { points: number[]; color?: string; h?: number; w?: number; fill?: boolean }) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const px = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`);
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      {fill && <polygon points={`0,${h} ${px.join(" ")} ${w},${h}`} fill={color} opacity="0.12" />}
      <polyline points={px.join(" ")} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" className="line-draw" />
    </svg>
  );
}

export function Hist({ data, labels, color = "#0E6B4E", h = 120 }: { data: number[]; labels: string[]; color?: string; h?: number }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: h }} role="img" aria-label={`Histogram: ${data.map((d, i) => `${labels[i]} ${d}`).join(", ")}`}>
      {data.map((v, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-mute opacity-0 transition-opacity group-hover:opacity-100">{v}</span>
          <div className="bar-grow w-full rounded-t-sm transition-colors group-hover:opacity-80" style={{ height: `${(v / max) * (h - 30)}px`, background: color, animationDelay: `${i * 40}ms` }} />
          <span className="text-[9.5px] font-semibold text-faint">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ slices, size = 130 }: { slices: { value: number; color: string; label: string }[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} role="img" aria-label={slices.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}>
      {slices.map((s, i) => {
        const frac = s.value / total;
        const off = acc;
        acc += frac;
        return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${frac * c - 2} ${c - frac * c + 2}`} strokeDashoffset={-off * c} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
      })}
    </svg>
  );
}

export function TrendLines({ series, h = 180, colors, labels }: { series: number[][]; h?: number; colors: string[]; labels: string[] }) {
  const w = 560;
  const all = series.flat();
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const span = max - min || 1;
  const toPts = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - 8 - ((v - min) / span) * (h - 24)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={labels.join(" vs ")}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#DDE2D3" strokeDasharray="3 5" />
        ))}
        {series.map((arr, i) => (
          <g key={i}>
            <polygon points={`0,${h} ${toPts(arr)} ${w},${h}`} fill={colors[i]} opacity="0.08" />
            <polyline points={toPts(arr)} fill="none" stroke={colors[i]} strokeWidth="2.2" strokeLinejoin="round" className="line-draw" />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex gap-4">
        {labels.map((l, i) => (
          <span key={l} className="flex items-center gap-1.5 text-[11px] font-semibold text-mute">
            <span className="h-2 w-2 rounded-sm" style={{ background: colors[i] }} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Ring({ value, size = 44, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const ok = value >= 0.8;
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={`${label ?? "progress"}: ${Math.round(value * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E7DB" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ok ? "#0E6B4E" : value >= 0.5 ? "#9A6A0B" : "#B42318"} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${value * c} ${c}`} />
      </svg>
      <span className="absolute font-mono text-[10.5px] font-bold text-ink">{Math.round(value * 100)}%</span>
    </div>
  );
}

export function Avatar({ name, color, size = 28 }: { name: string; color?: string; size?: number }) {
  const init = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: color ?? "#0E6B4E", fontSize: size * 0.36 }} aria-hidden="true">
      {init}
    </span>
  );
}

// ── Live hooks & hosts ─────────────────────────────────────────────────────
export function useCountUp(target: number, dur = 650): number {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(from + (target - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

export function LiveRegion({ text }: { text: string }) {
  return <div aria-live="polite" role="status" className="sr-live">{text}</div>;
}

export function ToastHost() {
  const toasts = useApp((s) => s.toasts);
  const dismiss = useApp((s) => s.dismissToast);
  const icons: Record<string, IconName> = { ok: "checkCircle", warn: "alertTri", err: "alertCirc", info: "info" };
  const tones: Record<string, string> = { ok: "border-brand/40 text-brand-deep", warn: "border-gold/50 text-[#8a5c07]", err: "border-danger/50 text-danger", info: "border-sea/50 text-sea" };
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[90] flex w-full max-w-[420px] -translate-x-1/2 flex-col gap-2 px-3">
      {toasts.map((t) => (
        <div key={t.id} className={cx("anim-toast pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-card px-3.5 py-2.5 shadow-lg", tones[t.tone])} role="status">
          <Ic name={icons[t.tone]} size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-ink">{t.title}</p>
            {t.body && <p className="text-[11.5px] leading-snug text-mute">{t.body}</p>}
          </div>
          <IconBtn label="Dismiss notification" name="x" size={13} onClick={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="font-display text-[19px] font-bold leading-tight text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[12px] text-mute">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
