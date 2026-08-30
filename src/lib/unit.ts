import { createContext, useContext } from "react";

// ── Device simulation ──────────────────────────────────────────────────────
// In the builder, vh/vw/dvh/dvw resolve against the SIMULATED device frame,
// not the browser window — so 100vh in the canvas means "full height of the
// device being designed for". The full-screen preview swaps in real window
// dimensions, where vh legitimately means the visitor's viewport.

export interface Device { w: number; h: number; }

export const DeviceCtx = createContext<Device>({ w: 1280, h: 832 });
export const useDevice = (): Device => useContext(DeviceCtx);

export const DEVICE_PRESETS: { id: string; label: string; icon: "phone" | "tablet" | "monitor"; w: number; h: number }[] = [
  { id: "phone", label: "Phone", icon: "phone", w: 390, h: 844 },
  { id: "tablet", label: "Tablet", icon: "tablet", w: 768, h: 1024 },
  { id: "desktop", label: "Desktop", icon: "monitor", w: 1280, h: 832 },
  { id: "wide", label: "Wide", icon: "monitor", w: 1440, h: 900 },
];

// ── Unit parsing & resolution ──────────────────────────────────────────────
export type LenUnit = "px" | "%" | "em" | "rem" | "vh" | "vw" | "dvh" | "dvw";
export const LEN_UNITS: LenUnit[] = ["px", "%", "em", "rem", "vh", "vw", "dvh", "dvw"];

export function parseUnitValue(v?: string | number): { n: string; u: LenUnit } {
  if (v === undefined || v === null || v === "") return { n: "", u: "px" };
  if (typeof v === "number") return { n: String(v), u: "px" };
  const m = /^(-?[\d.]+)\s*(px|%|em|rem|vh|vw|dvh|dvw)?$/i.exec(v.trim());
  return m ? { n: m[1], u: ((m[2] ?? "px").toLowerCase() as LenUnit) } : { n: "", u: "px" };
}

/** Resolve any length to a concrete CSS string for the given device.
 *  vh/dvh → px against device height; vw/dvw → px against device width;
 *  everything else passes through untouched. */
export function resolveCss(v: string | number | undefined, dev: Device, fallback = ""): string {
  if (v === undefined || v === null || v === "") return fallback;
  const { n, u } = parseUnitValue(v);
  if (n === "") return typeof v === "string" ? v : fallback;
  const num = parseFloat(n);
  if (u === "vh" || u === "dvh") return `${Math.round((num / 100) * dev.h)}px`;
  if (u === "vw" || u === "dvw") return `${Math.round((num / 100) * dev.w)}px`;
  return typeof v === "string" ? v : `${v}px`;
}
