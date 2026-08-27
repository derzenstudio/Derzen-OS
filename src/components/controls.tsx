import { useEffect, useRef, useState } from "react";
import { cx } from "../lib/format";
import { Ic } from "./icons";

// ── NumStepper — editable value with tiny up/down arrows (replaces sliders) ─
export function NumStepper({
  value, onChange, min = -200, max = 2000, step = 1, suffix = "", w = 84, label, allowNegative = true,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number;
  suffix?: string; w?: number; label?: string; allowNegative?: boolean;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(allowNegative ? min : Math.max(0, min), n)));
    else setText(String(value));
  };
  const bump = (d: number) => onChange(Math.min(max, Math.max(allowNegative ? min : Math.max(0, min), value + d * step)));
  return (
    <label className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {label && <span className="text-[10.5px] font-bold text-mute">{label}</span>}
      <span className="inline-flex items-center overflow-hidden rounded-sm border border-line2 bg-card" style={{ width: w }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.\-]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
            if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
          }}
          className="w-full min-w-0 bg-transparent px-1.5 py-1 text-right font-mono text-[11.5px] font-bold text-ink outline-none"
          aria-label={label ?? "value"}
          inputMode="decimal"
        />
        <span className="flex flex-col border-l border-line">
          <button type="button" tabIndex={-1} onClick={() => bump(1)} aria-label="Increase" className="flex h-[11px] w-[18px] items-center justify-center text-mute hover:bg-paper hover:text-ink"><Ic name="chevU" size={8} sw={3} /></button>
          <button type="button" tabIndex={-1} onClick={() => bump(-1)} aria-label="Decrease" className="flex h-[11px] w-[18px] items-center justify-center border-t border-line text-mute hover:bg-paper hover:text-ink"><Ic name="chevD" size={8} sw={3} /></button>
        </span>
        {suffix && <span className="border-l border-line bg-paper px-1 py-1 font-mono text-[9px] font-bold text-faint">{suffix}</span>}
      </span>
    </label>
  );
}

// ── ColorField — colour + hex + opacity + blend mode ────────────────────────
export function ColorField({
  value, onChange, label, blend, onBlend, allowNone,
}: {
  value: string; onChange: (hex: string) => void; label?: string;
  blend?: string; onBlend?: (m: string) => void; allowNone?: boolean;
}) {
  const solid = value.length === 9 ? value.slice(0, 7) : value || "#141811";
  const alpha = value.length === 9 ? Math.round((parseInt(value.slice(7, 9), 16) / 255) * 100) : 100;
  const setAlpha = (pct: number) => {
    const a = Math.round((Math.min(100, Math.max(0, pct)) / 100) * 255).toString(16).padStart(2, "0");
    onChange(solid + a);
  };
  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {label && <p className="text-[10.5px] font-bold text-mute">{label}</p>}
      <div className="flex items-center gap-1.5">
        <label className="relative h-7 w-9 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-line2" style={{ background: `linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)`, backgroundSize: "8px 8px", backgroundPosition: "0 0,4px 4px" }}>
          <span className="absolute inset-0" style={{ background: value || "transparent" }} />
          <input type="color" value={solid} onChange={(e) => onChange(e.target.value + (alpha < 100 ? Math.round((alpha / 100) * 255).toString(16).padStart(2, "0") : ""))} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label ?? "colour"} picker`} />
        </label>
        <input
          value={value || ""}
          onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,8}$/.test(v) || v === "") onChange(v); }}
          onBlur={(e) => { if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(e.target.value) && e.target.value !== "") onChange(value); }}
          placeholder={allowNone ? "inherit" : "#141811"}
          className="w-full min-w-0 rounded-sm border border-line2 bg-card px-1.5 py-1 font-mono text-[10.5px] font-bold text-ink outline-none focus:border-brand"
          aria-label={`${label ?? "colour"} hex value`}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-wider text-faint">α</span>
        <NumStepper value={alpha} onChange={setAlpha} min={0} max={100} step={5} suffix="%" w={76} allowNegative={false} label="" />
        {onBlend && (
          <select value={blend ?? "normal"} onChange={(e) => onBlend(e.target.value)} className="h-[24px] flex-1 rounded-sm border border-line2 bg-card px-1 font-mono text-[10px] font-bold text-mute outline-none" aria-label="Blend mode">
            {["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten", "color-burn", "color-dodge", "difference", "exclusion", "hue", "saturation", "luminosity"].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

// ── useDraggable — floating panels you can park anywhere ────────────────────
export function useDraggable(initial: { x: number; y: number }) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const off = useRef({ dx: 0, dy: 0 });
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    off.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev: PointerEvent) => {
      const x = Math.min(window.innerWidth - 80, Math.max(8, ev.clientX - off.current.dx));
      const y = Math.min(window.innerHeight - 60, Math.max(8, ev.clientY - off.current.dy));
      setPos({ x, y });
    };
    const up = () => { setDragging(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return { pos, setPos, dragging, onHandleDown };
}

// ── Segmented — compact option group ────────────────────────────────────────
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {label && <span className="text-[10.5px] font-bold text-mute">{label}</span>}
      <span className="inline-flex overflow-hidden rounded-sm border border-line2 bg-paper p-[2px]">
        {options.map((o) => (
          <button key={o.v} onClick={() => onChange(o.v)} className={cx("px-2 py-[3px] text-[10.5px] font-bold transition-colors", value === o.v ? "bg-ink text-white" : "text-mute hover:text-ink")}>{o.l}</button>
        ))}
      </span>
    </div>
  );
}
