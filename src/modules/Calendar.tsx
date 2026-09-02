import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
let hoverTimer: any = null;
import { cx, addDays, dayKey, parseKey, fmtDate, fmtShort, money, moneyRaw, isWeekend, isToday, toCSV, download, range } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, IconBtn, Input, Kbd, LiveRegion, Modal, Select, Toggle, Field, StatusChip } from "../components/ui";
import { useApp, nightsInRange, type CellOverride } from "../store";
import { BLOCKS, SERVICES, SERVICE_BOOKINGS, channelDef, planFor, propertyById, memberById, guestById } from "../lib/data";
import { ChannelMark } from "../components/ota";
import type { Property, Reservation } from "../lib/types";

const COL_W = 100;
const LABEL_W = 224;
const ROW_H = 64;

function rateShort(minor: number): string {
  if (minor >= 1_000_000) {
    const m = minor / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(m < 10 ? 2 : 1).replace(/0$/, "")}M`;
  }
  return `${Math.round(minor / 1000)}k`;
}

// ── Bars for one row over the window ───────────────────────────────────────
interface Bar {
  left: number;
  width: number;
  color: string;
  label: string;
  sub?: string;
  kind: string;
  resId?: string;
  striped?: boolean;
  hatch?: boolean;
  isBlock: boolean;
  clipPath: string;
  textLeft: number;
  textRight: number;
  dayUse: boolean;
}

const idxOf = (key: string, windowStart: string) =>
  Math.round((+parseKey(key) - +parseKey(windowStart)) / 86_400_000);

function barsForRow(p: Property, windowStart: string, nights: number, reservations: Reservation[], overrides: Record<string, import("../store").CellOverride> = {}): Bar[] {
  const windowEnd = dayKey(addDays(windowStart, nights));
  const out: Bar[] = [];
  
  for (const r of reservations) {
    if (r.propertyId !== p.id || r.kind !== "stay") continue;
    if (r.status === "cancelled" || r.status === "no_show") continue;
    if (!nightsInRange(r, windowStart, windowEnd)) continue;

    const dayUse = r.checkOut === r.checkIn;
    const pending = r.status === "pending" || r.status === "enquiry";
    
    let left, width, clipPath, textLeft, textRight;
    const rawLeft = idxOf(r.checkIn, windowStart) * COL_W;
    const rawRight = idxOf(r.checkOut, windowStart) * COL_W + COL_W;
    
    if (dayUse) {
      left = rawLeft + 4;
      width = COL_W - 8;
      clipPath = "none";
      textLeft = 0;
      textRight = 0;
    } else {
      left = rawLeft;
      width = rawRight - rawLeft;
      clipPath = `polygon(0 0, calc(100% - ${COL_W}px) 0, 100% 100%, ${COL_W}px 100%)`;
      textLeft = Math.max(0, -left) + 60;
      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 60;
    }

    out.push({
      resId: r.id,
      left, width, clipPath, textLeft, textRight, dayUse,
      color: channelDef(r.channel).color,
      label: `${propertyById(r.propertyId).code} · ${dayUse ? "day use" : r.status === "checked_in" ? "in house" : "arrives " + fmtShort(r.checkIn)}`,
      sub: r.ref, kind: pending ? "pending" : "confirmed", striped: pending, isBlock: false,
    });
  }

  // --- Dynamic overrides (manual blocks) ---
  const sortedKeys = Object.keys(overrides).filter(k => k >= windowStart && k <= windowEnd && overrides[k].blockType).sort();
  let currentBlock: any = null;

  const pushCurrentBlock = () => {
    if (!currentBlock) return;
    const dayUse = currentBlock.checkIn === currentBlock.checkOut;
    let left, width, clipPath, textLeft, textRight;
    const rawLeft = idxOf(currentBlock.checkIn, windowStart) * COL_W;
    const rawRight = idxOf(currentBlock.checkOut, windowStart) * COL_W + COL_W;
    
    if (dayUse) {
      left = rawLeft + 4; width = COL_W - 8; clipPath = "none"; textLeft = 0; textRight = 0;
    } else {
      left = rawLeft; width = rawRight - rawLeft;
      clipPath = `polygon(0 0, calc(100% - ${COL_W}px) 0, 100% 100%, ${COL_W}px 100%)`;
      textLeft = Math.max(0, -left) + 60;
      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 60;
    }
    
    out.push({
      left, width, clipPath, textLeft, textRight, dayUse,
      color: currentBlock.type === "manual" ? "#000000" : currentBlock.type === "owner" ? "#8A978A" : currentBlock.type === "maintenance" ? "#B42318" : "#C07F14",
      label: currentBlock.label, sub: currentBlock.sub, kind: currentBlock.type, hatch: currentBlock.type === "owner", striped: currentBlock.type === "hold", isBlock: true,
    });
  };

  for (const key of sortedKeys) {
    const ov = overrides[key];
    if (!currentBlock || currentBlock.type !== ov.blockType || currentBlock.label !== (ov.blockLabel || ov.blockType) || currentBlock.checkOut !== key) {
      pushCurrentBlock();
      currentBlock = {
        checkIn: key,
        checkOut: dayKey(addDays(key, 1)),
        type: ov.blockType,
        label: ov.blockLabel || ov.blockType,
        sub: ov.blockPrice ? rateShort(ov.blockPrice) : undefined,
      };
    } else {
      currentBlock.checkOut = dayKey(addDays(key, 1));
    }
  }
  pushCurrentBlock();

  for (const b of BLOCKS) {
    if (b.propertyId !== p.id || !nightsInRange({ ...({} as Reservation), checkIn: b.checkIn, checkOut: b.checkOut }, windowStart, windowEnd)) continue;
    
    const dayUse = b.checkIn === b.checkOut;
    let left, width, clipPath, textLeft, textRight;
    const rawLeft = idxOf(b.checkIn, windowStart) * COL_W;
    const rawRight = idxOf(b.checkOut, windowStart) * COL_W + COL_W;

    if (dayUse) {
      left = rawLeft + 4;
      width = COL_W - 8;
      clipPath = "none";
      textLeft = 0;
      textRight = 0;
    } else {
      left = rawLeft;
      width = rawRight - rawLeft;
      clipPath = `polygon(0 0, calc(100% - ${COL_W}px) 0, 100% 100%, ${COL_W}px 100%)`;
      textLeft = Math.max(0, -left);
      textRight = Math.max(0, (left + width) - (nights * COL_W));
    }

    out.push({
      left, width, clipPath, textLeft, textRight, dayUse,
      color: b.type === "manual" ? "#000000" : b.type === "owner" ? "#8A978A" : "#C07F14",
      label: b.label, kind: b.type, hatch: b.type === "owner", striped: b.type === "hold", isBlock: true,
    });
  }
  
  return out.sort((a, b) => a.left - b.left || a.width - b.width);
}

export function movementsOn(reservations: Reservation[], propertyId: string, key: string) {
  const live = reservations.filter(
    (r) => r.propertyId === propertyId && r.kind === "stay" && r.status !== "cancelled" && r.status !== "no_show",
  );
  const departing = live.filter((r) => r.checkOut === key && r.checkIn !== key);
  const arriving = live.filter((r) => r.checkIn === key && r.checkOut !== key);
  const dayUse = live.filter((r) => r.checkIn === key && r.checkOut === key);
  const staying = live.filter((r) => r.checkIn < key && r.checkOut > key);
  return { departing, arriving, dayUse, staying, turnover: departing.length > 0 && arriving.length > 0 };
}

type HoverCard = { x: number; y: number; flip?: boolean; node: ReactNode };

export default function CalendarModule() {
  const { navigate, calendarOverrides, bulkApply, pushQueue, bulkSnapshot, rollbackBulk, retryPush, reorderProperty, setCalendarCell, manualBlock, toast } = useApp();
  const properties = useApp((s) => s.properties);
  const reservations = useApp((s) => s.reservations);
  const [hover, setHover] = useState<HoverCard | null>(null);
  const [tab, setTab] = useState<"properties" | "services" | "workforce">("properties");

  const [windowStart, setWindowStart] = useState(dayKey(addDays(new Date(), -4)));
  const [windowN, setWindowN] = useState(45);
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [propFilter, setPropFilter] = useState<string[]>([]);
  const [bulkChecked, setBulkChecked] = useState<string[]>([]);
  const [focus, setFocus] = useState({ r: 0, c: 2 });
  const [selRange, setSelRange] = useState<[number, number] | null>(null);
  const [anchoring, setAnchoring] = useState(false);
  const [editor, setEditor] = useState<{ keys: string[]; label: string; isBlock?: boolean } | null>(null);
  // Where the floating range bar should anchor (the pointer's release point),
  // so it opens next to the cursor instead of far away at the screen bottom.
  const [barAt, setBarAt] = useState<{ x: number; y: number } | null>(null);
  const releaseRef = useRef<{ x: number; y: number } | null>(null);
  const [announce, setAnnounce] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [propFilterOpen, setPropFilterOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const active = properties
      .filter((p) => (showArchived ? true : !p.archived))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
      .filter((p) => propFilter.length === 0 || propFilter.includes(p.id) || (p.parentId && propFilter.includes(p.parentId)))
      .sort((a, b) => a.order - b.order);
    return active;
  }, [properties, search, showArchived, propFilter, bulkMode]);

  const visibleRows = useMemo(() => (tab === "properties" ? rows : []), [tab, rows]);
  const days = useMemo(() => range(windowN).map((i) => addDays(windowStart, i)), [windowStart, windowN]);
  const keys = days.map(dayKey);

  const effectiveChecked = bulkChecked.length ? rows.filter((r) => bulkChecked.includes(r.id) && !r.isParent) : rows.filter((r) => !r.isParent);

  const cellState = (p: Property, key: string, d: Date) => {
    const ov = calendarOverrides[p.id]?.[key];
    const plan = planFor(p, d);
    const rate = ov?.blockPrice ?? ov?.rate ?? plan.nightly;
    const closed = ov?.closed ?? false;
    const minStay = ov?.minStay ?? (d.getDay() === 5 || d.getDay() === 6 ? Math.max(2, p.minNights) : p.minNights);
    const source = ov?.blockPrice || ov?.rate ? "date override" : plan.kind === "season" ? `season · ${plan.name}` : "base rate";
    return { rate, closed, minStay, cta: ov?.cta ?? false, ctd: ov?.ctd ?? false, season: plan.kind === "season" ? plan.name : null, ov, source };
  };

  const announceCell = (r: number, c: number) => {
    const p = rows[r];
    if (!p) return;
    const d = days[c];
    const st = cellState(p, keys[c], d);
    const mv = movementsOn(reservations, p.id, keys[c]);
    const movement = mv.turnover
      ? `turnover, ${mv.departing.length} departing and ${mv.arriving.length} arriving`
      : mv.arriving.length ? `${mv.arriving.length} arriving`
      : mv.departing.length ? `${mv.departing.length} departing`
      : mv.staying.length ? "occupied"
      : st.closed ? "closed" : "available";
    setAnnounce(`${p.name}, ${fmtDate(d)}, ${movement}, ${moneyRaw(st.rate, p.currency)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== gridRef.current) return;
    const move = (dr: number, dc: number, extend: boolean) => {
      e.preventDefault();
      setFocus((f) => {
        const nr = Math.min(rows.length - 1, Math.max(0, f.r + dr));
        const nc = Math.min(windowN - 1, Math.max(0, f.c + dc));
        if (extend) {
          const anchor = selRef.current ? selRef.current[0] : f.c;
          setSel([Math.min(anchor, nc), Math.max(anchor, nc)]);
        } else setSel(null);
        announceCell(nr, nc);
        return { r: nr, c: nc };
      });
    };
    if (e.key === "ArrowRight") move(0, 1, e.shiftKey);
    else if (e.key === "ArrowLeft") move(0, -1, e.shiftKey);
    else if (e.key === "ArrowDown") move(1, 0, e.shiftKey);
    else if (e.key === "ArrowUp") move(-1, 0, e.shiftKey);
    else if (e.key === "Enter") {
      e.preventDefault();
      if (bulkMode) {
        const ks = selRange ? keys.slice(selRange[0], selRange[1] + 1) : [keys[focus.c]];
        setEditor({ keys: ks, label: selRange ? `${effectiveChecked.length} listings × ${ks.length} nights` : `${rows[focus.r]?.name} · ${fmtDate(days[focus.c])}` });
      } else {
        const ranged = selRange && selRange[1] > selRange[0];
        const ks = ranged ? keys.slice(selRange![0], selRange![1] + 1) : [keys[focus.c]];
        setEditor({ keys: ks, label: ranged ? `${rows[focus.r]?.name} · ${ks.length} nights` : `${rows[focus.r]?.name} · ${fmtDate(days[focus.c])}`, isBlock: ranged || undefined });
      }
    } else if (e.key === "Escape") {
      setSel(null);
      setBulkMode(false);
    }
  };

  const applyEditor = (patch: CellOverride) => {
    if (!editor) return;
    if (bulkMode && editor.keys.length > 1) {
      const ids = effectiveChecked.map((r) => r.id);
      if (!ids.length) { toast("warn", "No listings selected", "Tick at least one listing on the left."); return; }
      bulkApply(ids, editor.keys, patch);
    } else {
      const p = rows[focus.r];
      if (!p) { setEditor(null); return; }
      // manualBlock writes the override AND queues channel pushes — every
      // edit made here (price, block, restrictions) syncs with everything.
      manualBlock(p.id, editor.keys, patch);
      toast("ok", patch.blockType ? `Block applied · ${editor.keys.length} night${editor.keys.length > 1 ? "s" : ""}` : "Night updated", `${p.name} · pushed to every live channel`);
    }
    setEditor(null);
    setSel(null);
  };

  const exportCSV = () => {
    const head = ["Listing", ...keys];
    const body = rows.filter((r) => !r.isParent).map((p) => [
      p.name,
      ...keys.map((k, i) => {
        const st = cellState(p, k, days[i]);
        const mv = movementsOn(reservations, p.id, k);
        // A turnover sells the night to the arriving booking while the
        // departing one still occupies the morning. Reporting only the first
        // match hid one of the two on exactly the dates that need attention.
        const parts = [
          ...mv.departing.map((r) => `OUT ${r.ref}`),
          ...mv.staying.map((r) => `${r.ref} (${r.status})`),
          ...mv.dayUse.map((r) => `DAYUSE ${r.ref}`),
          ...mv.arriving.map((r) => `IN ${r.ref} (${r.status})`),
        ];
        if (parts.length) return parts.join(" + ");
        if (st.closed) return "CLOSED";
        return String(st.rate);
      }),
    ]);
    download(`derzen-calendar-${windowStart}.csv`, toCSV([head, ...body]));
    toast("ok", "CSV exported", `${rows.length} listings × ${keys.length} nights`);
  };

  // ── drag-select: pointer-based, tracked at the window level ─────────────
  // Using window pointermove/pointerup (not per-cell mouseenter + grid
  // mouseup/mouseleave) makes the drag deterministic: fast drags can't skip
  // cells, the commit fires exactly once wherever the pointer is released,
  // and an incidental mouse-leave can never wipe a committed selection.
  const anchorRef = useRef<{ r: number; c: number } | null>(null);
  const movedRef = useRef(false);
  const selRef = useRef<[number, number] | null>(null);
  const setSel = (v: [number, number] | null) => { selRef.current = v; setSelRange(v); if (!v) setBarAt(null); };
  const dragTeardownRef = useRef<(() => void) | null>(null);
  const teardownDrag = () => { if (dragTeardownRef.current) { dragTeardownRef.current(); dragTeardownRef.current = null; } };
  useEffect(() => teardownDrag, []);

  const onCellPointerDown = (r: number, c: number, isParent: boolean, openSingle: () => void) => {
    if (isParent) return;
    teardownDrag();
    setHover(null);
    anchorRef.current = { r, c };
    movedRef.current = false;
    setAnchoring(true);
    setSel([c, c]);
    setFocus({ r, c });
    announceCell(r, c);

    const onMove = (e: PointerEvent) => {
      releaseRef.current = { x: e.clientX, y: e.clientY };
      const a = anchorRef.current;
      if (!a) return;
      let cc: number | null = null;
      const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-c]");
      if (el && el.dataset.c !== undefined) cc = Number(el.dataset.c);
      else if (gridRef.current) {
        // Fallback: derive the column from the pointer's X coordinate — keeps
        // the drag alive over reservation bars and other overlays on the cells.
        const rect = gridRef.current.getBoundingClientRect();
        const xInGrid = e.clientX - rect.left + gridRef.current.scrollLeft - LABEL_W;
        const col = Math.floor(xInGrid / COL_W);
        if (col >= 0 && col < windowN) cc = col;
      }
      if (cc === null) return;
      if (cc !== a.c) movedRef.current = true;
      setSel([Math.min(a.c, cc), Math.max(a.c, cc)]);
    };
    const onUp = (e: PointerEvent) => {
      releaseRef.current = { x: e.clientX, y: e.clientY };
      const a = anchorRef.current;
      const sel = selRef.current;
      anchorRef.current = null;
      setAnchoring(false);
      teardownDrag();
      if (!a) return;
      const isRange = !!sel && sel[1] > sel[0];
      if (bulkMode) {
        if (movedRef.current && sel) setBarAt(releaseRef.current); // bulk bar follows the pointer
        return;
      }
      // Normal mode: a drag across ≥2 nights keeps the selection — the floating
      // range bar takes over, anchored where the pointer let go.
      if (movedRef.current && isRange) {
        const p = rows[a.r];
        if (p && !p.isParent) { setFocus({ r: a.r, c: sel![1] }); setBarAt(releaseRef.current); return; }
      }
      // Plain click → open the single-night editor for the anchor cell.
      setSel(null);
      openSingle();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    dragTeardownRef.current = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  };

  const monthLabels = useMemo(() => {
    const out: { label: string; span: number }[] = [];
    for (const d of days) {
      const lbl = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (out.length && out[out.length - 1].label === lbl) out[out.length - 1].span += 1;
      else out.push({ label: lbl, span: 1 });
    }
    return out;
  }, [days]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {([["properties", "Property timeline"], ["services", "By service"], ["workforce", "By workforce"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cx("rounded-md px-3 py-1.5 text-[12px] font-bold transition-all", tab === id ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}>{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-card p-0.5">
          <IconBtn label="Previous week" name="chevL" onClick={() => setWindowStart(dayKey(addDays(windowStart, -7)))} />
          <Btn size="xs" variant="ghost" onClick={() => setWindowStart(dayKey(addDays(new Date(), -2)))}>Today</Btn>
          <IconBtn label="Next week" name="chevR" onClick={() => setWindowStart(dayKey(addDays(windowStart, 7)))} />
        </div>
        <Select value={windowN} onChange={(e) => setWindowN(Number(e.target.value))} className="!w-[110px]" aria-label="Window size">
          {[14, 25, 45, 60].map((n) => <option key={n} value={n}>{n} nights</option>)}
        </Select>
        <div className="relative">
          <Ic name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search property or city" className="!w-[190px] !pl-7" />
        </div>
        <div className="relative">
          <Btn icon="filter" onClick={() => setPropFilterOpen(!propFilterOpen)}>Listings {propFilter.length ? `· ${propFilter.length}` : ""}</Btn>
          {propFilterOpen && (
            <div className="anim-pop absolute left-0 top-9 z-40 w-[230px] rounded-lg border border-line bg-card p-2 shadow-xl">
              <div className="mb-1 flex justify-between px-1 text-[10.5px] font-bold text-mute">
                <button onClick={() => setPropFilter(properties.filter((p) => !p.archived).map((p) => p.id))}>Select all</button>
                <button onClick={() => setPropFilter([])}>Clear</button>
                <button onClick={() => setPropFilter((c) => properties.filter((p) => !p.archived).map((p) => p.id).filter((id) => !c.includes(id)))}>Invert</button>
              </div>
              {properties.filter((p) => !p.archived).map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] font-semibold hover:bg-paper">
                  <input type="checkbox" checked={propFilter.includes(p.id)} onChange={() => setPropFilter((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />
                  {p.name}
                </label>
              ))}
              <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-line px-1.5 pt-1.5 text-[11px] font-semibold text-mute">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-[#0E6B4E]" /> Show archived
              </label>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tab === "properties" && (
            <button
              onClick={() => { setBulkMode(!bulkMode); setSel(null); }}
              className={cx("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-bold transition-all", bulkMode ? "border-gold bg-gold-soft text-[#8a5c07]" : "border-line bg-card text-mute hover:text-ink")}
              aria-pressed={bulkMode}
            >
              <Ic name="sliders" size={13} /> Bulk edit
            </button>
          )}
          <Btn icon="download" onClick={exportCSV}>CSV</Btn>
        </div>
      </div>

      {bulkMode && !selRange && (
        <div className="anim-rise flex flex-wrap items-center gap-2 rounded-lg border border-gold/50 bg-gold-soft/60 px-3 py-2 text-[12px] font-semibold text-[#8a5c07]">
          <Ic name="info" size={14} />
          Drag across nights to size a range. <Kbd>Shift</Kbd>+<Kbd>←→</Kbd> fine-tunes · <Kbd>Esc</Kbd> exits bulk mode.
        </div>
      )}

      {/* Floating range action bar — appears when a range is selected.
          In normal mode it shows for a genuine multi-night drag (a single click
          already opens the night editor); in bulk mode any selection is actionable.
          Scope-aware: single listing in normal mode, all checked listings in bulk. */}
      {tab === "properties" && selRange && (bulkMode || selRange[1] > selRange[0]) && (() => {
        const ks = keys.slice(selRange[0], selRange[1] + 1);
        const n = ks.length;
        const focusedProp = rows[focus.r];
        const isBulk = bulkMode;
        const canAct = isBulk ? effectiveChecked.length > 0 : !!focusedProp && !focusedProp.isParent;
        const scope = isBulk ? `${effectiveChecked.length} listing${effectiveChecked.length > 1 ? "s" : ""}` : focusedProp?.name ?? "—";
        const apply = (patch: Parameters<typeof manualBlock>[2], doneMsg: string) => {
          if (!canAct) { toast("warn", "Nothing selected", isBulk ? "Tick at least one listing on the left." : "Pick a single listing row."); return; }
          if (isBulk) {
            bulkApply(effectiveChecked.map((r) => r.id), ks, patch); // bulkApply announces itself
          } else {
            manualBlock(focusedProp!.id, ks, patch);
            toast("ok", doneMsg, `${scope} · ${n} night${n > 1 ? "s" : ""} · pushed to live channels`);
          }
          setSel(null);
        };
        // Anchor the bar at the pointer's release point (clamped to the
        // viewport); fall back to bottom-center for keyboard-made selections.
        const BAR_W = 520, BAR_H = 56;
        const bx = barAt
          ? Math.min(Math.max(10, barAt.x + 16), Math.max(10, window.innerWidth - BAR_W - 10))
          : Math.max(10, window.innerWidth / 2 - BAR_W / 2);
        const by = barAt
          ? Math.min(Math.max(10, barAt.y + 14), Math.max(10, window.innerHeight - BAR_H - 10))
          : Math.max(10, window.innerHeight - BAR_H - 24);
        return (
          <div className="anim-pop fixed z-[80] flex flex-wrap items-center gap-1.5 rounded-lg border border-brand/40 bg-card px-2.5 py-2 shadow-[0_12px_32px_-12px_rgba(20,24,17,0.45)]" style={{ left: bx, top: by, maxWidth: Math.min(BAR_W, window.innerWidth - 20) }}>
            <span className="flex items-center gap-1.5 rounded-md bg-brand-soft px-2.5 py-1.5 text-[12px] font-bold text-brand-deep">
              <Ic name="calendar" size={14} />
              {n > 1 ? <>{fmtShort(keys[selRange![0]])} → {fmtShort(keys[selRange![1]])} · {n} nights</> : <>{fmtShort(keys[selRange![0]])} · 1 night</>}
              <span className="text-brand-deep/50">|</span>
              <span className="max-w-[130px] truncate">{scope}</span>
            </span>
            <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            <Btn size="xs" icon="pencil" onClick={() => setEditor({ keys: ks, label: `${scope} · ${n} night${n > 1 ? "s" : ""}`, isBlock: n > 1 || undefined })}>Rate & rules</Btn>
            <Btn size="xs" icon="lock" onClick={() => apply({ closed: true, blockType: "manual", blockLabel: "Manual block" }, "Range blocked")}>Block</Btn>
            <Btn size="xs" icon="check" onClick={() => apply({ closed: false, blockType: undefined, blockLabel: undefined }, "Range opened")}>Open</Btn>
            <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            <Btn size="xs" variant="ghost" icon="x" onClick={() => setSel(null)}>Clear</Btn>
          </div>
        );
      })()}

      {tab === "properties" ? (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-mute">
            <Dot tone="ok" label="Confirmed (channel colour)" />
            <span className="flex items-center gap-1.5"><span className="pat-stripes h-2.5 w-5 rounded-sm bg-gold" /> Pending</span>
            <span className="flex items-center gap-1.5"><span className="pat-hatch h-2.5 w-5 rounded-sm bg-[#8A978A]" /> Owner stay</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-[#3D4A42]" /> Manual block</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-[#B42318]" /> Maintenance</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-1 rounded-full bg-brand" /> price override</span>
            <span className="hidden items-center gap-1 text-faint md:flex"><Ic name="info" size={12} /> hover a night for details · click-drag across nights to block or reprice a range</span>
            <span className="ml-auto hidden items-center gap-1 text-faint xl:flex">Keyboard: <Kbd>←→↑↓</Kbd> focus · <Kbd>Shift</Kbd>+arrows select · <Kbd>Enter</Kbd> edit · <Kbd>Esc</Kbd> cancel</span>
          </div>

          <LiveRegion text={announce} />

          <div
            ref={gridRef} tabIndex={0} role="grid" aria-label="Availability calendar. Use arrow keys to move."
            onKeyDown={onKeyDown}
            className="relative select-none overflow-x-auto overflow-y-hidden rounded-xl border border-line bg-card outline-none focus-visible:border-brand [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}
          >
            <div style={{ width: LABEL_W + windowN * COL_W, minWidth: "100%" }} className="flex flex-col">
              {/* Header */}
              <div className="sticky top-0 z-30 border-b border-line bg-card shrink-0">
                <div className="flex" style={{ height: 24 }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-card px-3 text-[10.5px] font-bold uppercase tracking-wider text-mute" style={{ width: LABEL_W }}>
                    Listings · drag to reorder
                  </div>
                  <div className="flex">
                    {monthLabels.map((m, i) => (
                      <div key={i} className="border-r border-line" style={{ width: m.span * COL_W }}><div className="sticky left-[224px] inline-flex h-full items-center px-2 font-display text-[11px] font-bold text-ink">{m.label}</div></div>
                    ))}
                  </div>
                </div>
                <div className="flex" style={{ height: 28 }}>
                  <div className="sticky left-0 z-10 shrink-0 border-r border-t border-line/60 bg-card" style={{ width: LABEL_W }} />
                  {days.map((d, i) => (
                    <div key={i} className={cx("flex flex-col items-center justify-end border-r border-line/60 pb-0.5", isToday(d) && "bg-brand-soft")} style={{ width: COL_W }}>
                      <span className="text-[8.5px] font-bold uppercase text-faint">{fmtDate(d).slice(0, 3)}</span>
                      <span className={cx("font-mono text-[11px] font-bold leading-none", isToday(d) ? "text-brand-deep" : isWeekend(d) ? "text-ink" : "text-mute")}>{d.getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
              {rows.map((p, r) => {
                const bars = barsForRow(p, windowStart, windowN, reservations, calendarOverrides[p.id]);
                const isChild = !!p.parentId;
                return (
                  <div key={p.id} role="row" className="flex border-b border-line/70 hover:bg-paper/60" style={{ minHeight: ROW_H }}>
                    <div
                      role="rowheader" draggable={!bulkMode}
                      onDragStart={() => setDragId(p.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragId && dragId !== p.id) reorderProperty(dragId, p.id); setDragId(null); }}
                      className={cx("sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-line bg-card px-2.5", isChild && "pl-7")}
                      style={{ width: LABEL_W }}
                    >
                      <Ic name="grip" size={12} className="cursor-grab text-line2" />
                      {bulkMode && !p.isParent && (
                        <input type="checkbox" aria-label={`Select ${p.name}`} checked={bulkChecked.includes(p.id)} onChange={() => setBulkChecked((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />
                      )}
                      <button
                        onClick={() => navigate(`/listings?property=${p.id}`)}
                        className="group/listing min-w-0 flex-1 text-left"
                        title={`Open ${p.name} in Listings`}
                        aria-label={`Open ${p.name} in Listings`}
                      >
                        <p className="truncate text-[12px] font-bold leading-tight text-ink transition-colors group-hover/listing:text-brand group-hover/listing:underline group-hover/listing:underline-offset-2">{p.name}</p>
                        <p className="flex items-center gap-1 text-[9.5px] font-semibold text-faint">
                          {p.code} · {p.city}
                          {p.isParent && <Badge tone="ink" className="!px-1 !py-0 !text-[8.5px]">Main · {properties.filter((x) => x.parentId === p.id).length} linked</Badge>}
                          {isChild && <span className="text-brand-deep">↳ linked</span>}
                          {p.archived && <Badge tone="mute" className="!px-1 !py-0 !text-[8.5px]">Archived</Badge>}
                        </p>
                      </button>
                    </div>
                    <div className="relative" style={{ width: windowN * COL_W }} role="presentation">
                      {/* Cells */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, c) => {
                          const st = p.isParent ? null : cellState(p, keys[c], d);
                          const inSel = selRange && c >= selRange[0] && c <= selRange[1] && (bulkMode || r === focus.r);
                          // The range reads as one bracket: gold wash inside,
                          // brand bookends on the edges of the selection.
                          const selEdge = inSel && selRange
                            ? c === selRange[0] && c === selRange[1]
                              ? "shadow-[inset_0_0_0_2px_var(--color-brand)]"
                              : c === selRange[0]
                                ? "shadow-[inset_2px_0_0_var(--color-brand),inset_0_2px_0_var(--color-brand),inset_0_-2px_0_var(--color-brand)]"
                                : c === selRange[1]
                                  ? "shadow-[inset_-2px_0_0_var(--color-brand),inset_0_2px_0_var(--color-brand),inset_0_-2px_0_var(--color-brand)]"
                                  : "shadow-[inset_0_2px_0_var(--color-brand),inset_0_-2px_0_var(--color-brand)]"
                            : "";
                          const focused = focus.r === r && focus.c === c;
                          const isBlock = !!st?.ov?.blockType;
                          const mv = p.isParent ? null : movementsOn(reservations, p.id, keys[c]);
                          const blockColor = st?.ov?.blockType === "owner" ? "#5C6357" : st?.ov?.blockType === "maintenance" ? "#B42318" : st?.ov?.blockType === "hold" ? "#9A6A0B" : "#3D4A42";
                          const showHover = (e: React.MouseEvent) => {
                            clearTimeout(hoverTimer);
                            if (bulkMode || p.isParent || !st) return;
                            if (selRange && selRange[1] > selRange[0]) return; // a range is selected — the range bar owns the interaction
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const x = Math.min(rect.left, window.innerWidth - 300);
                            const y = rect.bottom + 6 > window.innerHeight - 260 ? rect.top - 8 : rect.bottom + 6;
                            const flip = rect.bottom + 6 > window.innerHeight - 260;
                            if (isBlock) {
                              setHover({ x, y, flip, node: <BlockHoverCard st={st} p={p} d={d} onLift={() => { manualBlock(p.id, [keys[c]], { blockType: undefined, blockLabel: undefined, blockNote: undefined, blockPrice: undefined, extraCharges: undefined, closed: undefined }); toast("ok", "Block lifted", `${p.name} · ${fmtDate(d)} is bookable again.`); setHover(null); }} onEdit={() => { setFocus({ r, c }); setEditor({ keys: [keys[c]], label: `${p.name} · ${fmtDate(d)}`, isBlock: true }); setHover(null); }} /> });
                            } else {
                              const selKeys = inSel && selRange ? keys.slice(selRange[0], selRange[1] + 1) : [keys[c]];
                              setHover({ x, y, flip, node: <NightHoverCard st={st} p={p} d={d} rangeCount={selKeys.length} onEdit={() => { setFocus({ r, c }); setEditor({ keys: selKeys, label: selKeys.length > 1 ? `${p.name} · ${selKeys.length} nights selected` : `${p.name} · ${fmtDate(d)}` }); setHover(null); }} onQuickRate={(rate: number) => { manualBlock(p.id, selKeys, { rate }); toast("ok", `Rate set on ${selKeys.length} night${selKeys.length > 1 ? "s" : ""}`, `${moneyRaw(rate, p.currency)} · pushed to every live channel`); setHover(null); }} onBlock={() => { setFocus({ r, c }); setEditor({ keys: selKeys, label: `${p.name} · ${selKeys.length > 1 ? selKeys.length + " nights" : fmtDate(d)}`, isBlock: true }); setHover(null); }} /> });
                            }
                          };
                          return (
                            <div
                              key={c} role="gridcell"
                              aria-label={st ? `${p.name}, ${fmtDate(d)}, ${mv?.turnover ? "same-day turnover, one departure and one arrival" : isBlock ? `blocked (${st.ov!.blockType})` : st.closed ? "closed" : "available"}, ${moneyRaw(st.rate, p.currency)}${st.minStay > 1 ? `, min ${st.minStay} nights` : ""}` : `${p.name} group row`}
                              data-r={r} data-c={c}
                              onMouseDown={(e) => { if (e.button !== 0) return; onCellPointerDown(r, c, !!p.isParent, () => { if (!bulkMode) setEditor({ keys: [keys[c]], label: `${p.name} · ${fmtDate(d)}`, isBlock }); }); }}
                              onMouseEnter={(e) => { if (!anchoring && !bulkMode) showHover(e); }}
                              onMouseLeave={() => !bulkMode && !anchoring && (hoverTimer = setTimeout(() => setHover(null), 150))}
                              className={cx(
                                "group/cell relative flex shrink-0 cursor-pointer flex-col items-center justify-end border-r border-line/50 pb-1 transition-colors",
                                isWeekend(d) && !inSel && "bg-black/[0.025]",
                                isToday(d) && !inSel && "bg-brand-soft/70",
                                inSel && "bg-gold-soft",
                                selEdge,
                                focused && !inSel && "ring-2 ring-inset ring-brand",
                                st?.closed && !isBlock && !inSel && "pat-hatch bg-[#E7EAE0]",
                              )}
                              style={{ width: COL_W }}
                            >
                              {isBlock ? null : st && !st.closed ? (
                                <>
                                  <span className={cx("font-mono text-[10px] font-bold leading-none", st.ov?.rate ? "text-brand-deep" : st.season ? "text-gold" : "text-mute")}>{rateShort(st.rate)}</span>
                                  <span className="mt-0.5 flex items-center gap-0.5">
                                    {st.ov?.rate && <span className="h-1 w-1 rounded-full bg-brand" title="date override" />}
                                    {st.minStay > 1 && <span className="rounded-sm bg-black/6 px-0.5 font-mono text-[8px] font-bold text-mute">{st.minStay}n</span>}
                                    {st.cta && <span className="font-mono text-[7.5px] font-bold text-sea">CTA</span>}
                                    {st.ctd && <span className="font-mono text-[7.5px] font-bold text-plum">CTD</span>}
                                    {st.season && !st.ov?.rate && <span className="h-1 w-1 rounded-full bg-gold" title={st.season} />}
                                  </span>
                                </>
                              ) : null}
                              {st?.closed && !isBlock && <span className="font-mono text-[8.5px] font-bold text-faint">CLOSED</span>}
                              {mv?.turnover && (
                                <span
                                  className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-danger/70"
                                  title={`Same-day turnover: ${mv.departing.map((x) => x.ref).join(", ")} out, ${mv.arriving.map((x) => x.ref).join(", ")} in`}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Reservation bars */}
                      {!bulkMode && bars.map((b, i) => {
                        const res = b.resId ? reservations.find((x) => x.id === b.resId) : undefined;
                        return (
                          <button
                            key={i} onClick={() => b.resId && navigate(`/reservations/${b.resId}`)}
                            onMouseEnter={(e) => {
                              clearTimeout(hoverTimer);
                              if (!res) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const flip = rect.bottom + 230 > window.innerHeight;
                              setHover({
                                x: Math.min(rect.left, window.innerWidth - 300),
                                y: flip ? rect.top - 8 : rect.bottom + 6,
                                flip,
                                node: <ReservationHoverCard r={res} onOpen={() => { setHover(null); navigate(`/reservations/${res.id}`); }} />,
                              });
                            }}
                            onMouseLeave={() => { hoverTimer = setTimeout(() => setHover(null), 150); }}
                            className={cx("absolute bottom-0 top-0 overflow-hidden text-left transition-all hover:z-10 hover:brightness-110", b.striped && "pat-stripes", b.hatch && "pat-hatch", b.isBlock && "pointer-events-none")}
                            style={{
                              left: b.left,
                              width: b.width,
                              background: b.color,
                              clipPath: b.clipPath,
                              opacity: 0.95
                            }}
                            aria-label={`${b.label}${b.sub ? `, ${b.sub}` : ""}`}
                          >
                            <div
                              className="absolute inset-y-0 flex flex-col justify-center overflow-hidden whitespace-nowrap text-white drop-shadow-sm"
                              style={{
                                left: b.textLeft,
                                right: b.textRight,
                                paddingLeft: b.dayUse ? 4 : (b.textLeft === 0 ? 34 : 8),
                                paddingRight: b.dayUse ? 4 : (b.textRight === 0 ? 34 : 8),
                              }}
                            >
                              <span className="text-[10.5px] font-bold leading-tight truncate">{b.label}</span>
                              {b.sub && <span className="text-[9px] opacity-90 truncate">{b.sub}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
          {/* Push queue */}
          {(pushQueue.length > 0 || bulkSnapshot) && (
            <div className="anim-rise fixed bottom-6 right-6 z-[100] w-[400px] rounded-xl border border-line bg-card p-4 shadow-[0_12px_32px_-12px_rgba(20,24,17,0.45)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-display text-[13px] font-bold text-ink">Channel push queue <span className="ml-1 text-[11px] font-semibold text-mute">durable · idempotent · retried</span></p>
                {bulkSnapshot && <Btn size="xs" variant="danger" icon="undo" onClick={rollbackBulk}>Rollback local edit</Btn>}
              </div>
              <div className="flex flex-wrap gap-2">
                {pushQueue.map((q) => (
                  <div key={q.id} className={cx("flex min-w-[210px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-2", q.status === "error" ? "border-danger/50 bg-danger-soft" : "border-line bg-paper")}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: q.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold capitalize text-ink">{channelDef(q.channel as never).name}</p>
                      <p className={cx("truncate text-[10px] font-semibold", q.status === "error" ? "text-danger" : q.status === "ok" ? "text-brand-deep" : "text-mute")}>
                        {q.status === "queued" && "queued…"}
                        {q.status === "pushing" && "pushing rates + restrictions…"}
                        {q.status === "ok" && "pushed · ack received"}
                        {q.status === "error" && (q.note ?? "failed")}
                      </p>
                    </div>
                    {q.status === "pushing" && <Ic name="refresh" size={13} className="anim-spin text-mute" />}
                    {q.status === "ok" && <Ic name="checkCircle" size={14} className="text-brand" />}
                    {q.status === "error" && <Btn size="xs" variant="danger" icon="refresh" onClick={() => retryPush(q.id)}>Retry</Btn>}
                  </div>
                ))}
                {pushQueue.length === 0 && bulkSnapshot && <p className="text-[11.5px] text-mute">All pushes settled. Snapshot retained for rollback.</p>}
              </div>
            </div>
          )}
        </>
      ) : (
        <ServicesTimeline mode={tab} />
      )}

      {/* Editor modal */}
      <EditorModal editor={editor} bulkMode={bulkMode || (editor?.keys.length ?? 0) > 1} onClose={() => setEditor(null)} onApply={applyEditor} />

      {/* Floating hover card — lives outside the scroll container so it never clips */}
      {hover && (
        <div
          className="anim-pop fixed z-[90] w-[290px]"
          style={hover.flip ? { left: hover.x, bottom: window.innerHeight - hover.y } : { left: hover.x, top: hover.y }}
          onMouseEnter={() => clearTimeout(hoverTimer)}
          onMouseLeave={() => { hoverTimer = setTimeout(() => setHover(null), 150); }}
        >
          {hover.node}
        </div>
      )}
    </div>
  );
}

// ── Hover cards ────────────────────────────────────────────────────────────
interface CellSt {
  rate: number; closed: boolean; minStay: number; cta: boolean; ctd: boolean;
  season: string | null; ov?: CellOverride; source: string;
}

function ReservationHoverCard({ r, onOpen }: { r: Reservation; onOpen: () => void }) {
  const g = guestById(r.guestId);
  const p = propertyById(r.propertyId);
  const nights = Math.max(1, Math.round((+parseKey(r.checkOut) - +parseKey(r.checkIn)) / 86_400_000));
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <ChannelMark id={r.channel} size={22} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-ink">{g.name}</p>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-mute">
            <span className="font-mono">{r.ref}</span> · {channelDef(r.channel).name}
          </p>
        </div>
        <StatusChip status={r.status} />
      </div>
      <div className="space-y-1 px-3 py-2.5 text-[11px]">
        <p className="flex justify-between"><span className="text-mute">Property</span><span className="font-bold text-ink">{p.name}</span></p>
        <p className="flex justify-between"><span className="text-mute">Stay</span><span className="font-mono font-bold text-ink">{r.checkIn === r.checkOut ? fmtDate(r.checkIn) : `${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)}`}</span></p>
        <p className="flex justify-between"><span className="text-mute">Nights</span><span className="font-mono font-bold text-ink">{r.checkIn === r.checkOut ? "day use" : nights}</span></p>
        <p className="flex justify-between"><span className="text-mute">Guests</span><span className="font-mono font-bold text-ink">{r.adults + r.children}{r.infants ? ` + ${r.infants} infant${r.infants > 1 ? "s" : ""}` : ""}</span></p>
        <p className="flex justify-between"><span className="text-mute">Check-in</span><span className="font-bold text-ink">{r.checkInTime === "FLEXIBLE" ? "Flexible" : `${r.checkInTime} ${p.tzShort}`}</span></p>
        <p className="flex justify-between border-t border-line pt-1"><span className="text-mute">Total</span><span className="font-mono text-[12px] font-bold text-brand-deep">{moneyRaw(r.total, r.currency)}</span></p>
      </div>
      <div className="border-t border-line bg-paper/60 px-3 py-2">
        <Btn size="xs" variant="solid" icon="arrowR" onClick={onOpen}>Open reservation</Btn>
      </div>
    </div>
  );
}

function NightHoverCard({ st, p, d, rangeCount, onEdit, onQuickRate, onBlock, flip }: {
  st: CellSt; p: Property; d: Date; rangeCount: number; flip?: boolean;
  onEdit: () => void; onQuickRate: (rate: number) => void; onBlock: () => void;
}) {
  const [rate, setRate] = useState(String(st.rate));
  return (
    <div className={cx("overflow-hidden rounded-lg border border-line bg-card shadow-2xl", flip && "")}>
      <div className="border-b border-line bg-paper px-3 py-2">
        <p className="text-[12px] font-bold text-ink">{p.name} · {fmtDate(d)}</p>
        <p className="text-[10px] font-semibold text-mute">{rangeCount > 1 ? `${rangeCount} nights selected · edit applies to the whole range` : "available · not blocked"}</p>
      </div>
      <div className="space-y-1 px-3 py-2.5 text-[11px]">
        <p className="flex justify-between"><span className="text-mute">Nightly rate</span><span className="font-mono font-bold text-ink">{moneyRaw(st.rate, p.currency)}</span></p>
        <p className="flex justify-between"><span className="text-mute">Source</span><span className={cx("font-bold", st.ov?.rate ? "text-brand-deep" : "text-mute")}>{st.source}</span></p>
        <p className="flex justify-between"><span className="text-mute">Min stay</span><span className="font-mono font-bold text-ink">{st.minStay} night{st.minStay > 1 ? "s" : ""}</span></p>
        {(st.cta || st.ctd) && <p className="flex gap-2"><span className="text-mute">Restrictions</span>{st.cta && <Badge tone="info">no arrival</Badge>}{st.ctd && <Badge tone="warn">no departure</Badge>}</p>}
      </div>
      <div className="border-t border-line bg-paper/60 px-3 py-2.5">
        <p className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-faint">Set price {rangeCount > 1 ? `on ${rangeCount} nights` : "for this night"} · syncs everywhere</p>
        <div className="flex gap-1.5">
          <input
            type="number" value={rate} min={0} step={10000}
            onChange={(e) => setRate(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && Number(rate) > 0) onQuickRate(Math.round(Number(rate))); }}
            className="h-8 w-full min-w-0 rounded-sm border border-line2 bg-card px-2 font-mono text-[12px] font-bold text-ink outline-none focus:border-brand"
            aria-label="Nightly rate in minor units"
          />
          <Btn size="sm" icon="check" onClick={() => { if (Number(rate) > 0) onQuickRate(Math.round(Number(rate))); }}>Set</Btn>
        </div>
        <div className="mt-2 flex gap-1.5">
          <Btn size="xs" variant="ghost" icon="sliders" onClick={onEdit}>Full editor</Btn>
          <Btn size="xs" variant="ghost" icon="lock" onClick={onBlock}>Block {rangeCount > 1 ? "range" : "night"}</Btn>
        </div>
      </div>
    </div>
  );
}

function BlockHoverCard({ st, p, d, onLift, onEdit, flip }: {
  st: CellSt; p: Property; d: Date; flip?: boolean; onLift: () => void; onEdit: () => void;
}) {
  const ov = st.ov!;
  const toneFor = { manual: "mute", owner: "warn", hold: "warn", maintenance: "danger" } as const;
  return (
    <div className={cx("overflow-hidden rounded-lg border border-line bg-card shadow-2xl", flip && "")}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2" style={{ background: "color-mix(in srgb, var(--color-paper) 60%, transparent)" }}>
        <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink"><Ic name="lock" size={12} className="text-mute" /> {p.name} · {fmtDate(d)}</p>
        <Badge tone={toneFor[ov.blockType ?? "manual"]}>{ov.blockType}</Badge>
      </div>
      <div className="space-y-1 px-3 py-2.5 text-[11px]">
        <p className="flex justify-between"><span className="text-mute">Label</span><span className="font-bold text-ink">{ov.blockLabel || "—"}</span></p>
        {ov.blockNote && <p className="rounded-sm bg-paper px-2 py-1.5 text-[10.5px] italic leading-snug text-mute">“{ov.blockNote}”</p>}
        <p className="flex justify-between"><span className="text-mute">Custom rate</span><span className="font-mono font-bold text-ink">{ov.blockPrice ? moneyRaw(ov.blockPrice, p.currency) : "not for sale"}</span></p>
        {ov.extraCharges && ov.extraCharges.length > 0 && (
          <div className="rounded-sm border border-line px-2 py-1.5">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-faint">Additional charges</p>
            {ov.extraCharges.map((ch, i) => (
              <p key={i} className="flex justify-between text-[10.5px]"><span className="text-mute">{ch.label}</span><span className="font-mono font-bold text-ink">{moneyRaw(ch.amount, p.currency)}</span></p>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1.5 border-t border-line bg-paper/60 px-3 py-2">
        <Btn size="xs" variant="ghost" icon="pencil" onClick={onEdit}>Edit block</Btn>
        <Btn size="xs" variant="danger" icon="trash" onClick={onLift}>Lift block</Btn>
      </div>
    </div>
  );
}

function EditorModal({ editor, bulkMode, onClose, onApply }: { editor: { keys: string[]; label: string; isBlock?: boolean } | null; bulkMode: boolean; onClose: () => void; onApply: (p: CellOverride) => void }) {
  const [rate, setRate] = useState("");
  const [closed, setClosed] = useState(false);
  const [minStay, setMinStay] = useState("");
  const [cta, setCta] = useState(false);
  const [ctd, setCtd] = useState(false);
  const [asBlock, setAsBlock] = useState(!!editor?.isBlock);
  const [blockType, setBlockType] = useState<"manual" | "owner" | "hold" | "maintenance">("manual");
  const [blockLabel, setBlockLabel] = useState("");
  const [blockNote, setBlockNote] = useState("");
  const [blockPrice, setBlockPrice] = useState("");
  const [charges, setCharges] = useState<{ label: string; amount: string }[]>([]);
  const isBlockEditor = asBlock || !!editor?.isBlock;
  return (
    <Modal open={!!editor} onClose={onClose} title={`${isBlockEditor ? "Block" : "Edit"} · ${editor?.label ?? ""}`} w={480}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="solid" icon="check" onClick={() => onApply(
          isBlockEditor
            ? {
                blockType, blockLabel: blockLabel || undefined, blockNote: blockNote || undefined,
                blockPrice: blockPrice ? Math.round(Number(blockPrice)) : undefined,
                extraCharges: charges.filter((c) => c.label.trim() && Number(c.amount) > 0).map((c) => ({ label: c.label.trim(), amount: Math.round(Number(c.amount)) })),
                closed: true,
              }
            : { rate: rate ? Math.round(Number(rate)) : undefined, closed: closed || undefined, minStay: minStay ? Number(minStay) : undefined, cta: cta || undefined, ctd: ctd || undefined },
        )}>
          {isBlockEditor ? "Apply block" : `Apply${bulkMode ? " to selection" : ""}`}
        </Btn>
      </>}>
      {!editor?.isBlock && (
        <label className="mb-3 flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2 text-[12.5px] font-semibold">
          <Toggle checked={asBlock} onChange={setAsBlock} label="Apply as manual block" /> Turn into a manual block instead
        </label>
      )}
      {isBlockEditor ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Block type">
              <Select value={blockType} onChange={(e) => setBlockType(e.target.value as never)}>
                <option value="manual">Manual block</option>
                <option value="owner">Owner stay</option>
                <option value="hold">Pending / hold</option>
                <option value="maintenance">Maintenance</option>
              </Select>
            </Field>
            <Field label="Label"><Input value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} placeholder="Renovation · pool deck" /></Field>
          </div>
          <Field label="Note / information" hint="Shown to staff on hover · never to guests">
            <Input value={blockNote} onChange={(e) => setBlockNote(e.target.value)} placeholder="Contractor on site 09:00–17:00" />
          </Field>
          <Field label="Custom price (minor units) — optional" hint="Sell this night at a special rate instead of hiding it">
            <Input type="number" value={blockPrice} onChange={(e) => setBlockPrice(e.target.value)} placeholder="2900000" />
          </Field>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Additional charges</p>
              <Btn size="xs" icon="plus" onClick={() => setCharges((c) => [...c, { label: "", amount: "" }])}>Add charge</Btn>
            </div>
            {charges.length === 0 && <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-faint">None — e.g. late check-in fee, extra cleaning, equipment hire.</p>}
            {charges.map((c, i) => (
              <div key={i} className="mb-1.5 flex gap-1.5">
                <Input value={c.label} onChange={(e) => setCharges((cs) => cs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Surfboard rack" className="flex-1" />
                <Input type="number" value={c.amount} onChange={(e) => setCharges((cs) => cs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder="150000" className="!w-[120px] font-mono" />
                <button aria-label="Remove charge" onClick={() => setCharges((cs) => cs.filter((_, j) => j !== i))} className="rounded-sm px-1.5 text-mute hover:bg-danger-soft hover:text-danger"><Ic name="x" size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nightly rate (minor units)"><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4200000" /></Field>
            <Field label="Minimum stay"><Input type="number" value={minStay} onChange={(e) => setMinStay(e.target.value)} placeholder="2" /></Field>
          </div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={closed} onChange={setClosed} label="Close to booking" /> Close to booking (block sales)</label>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={cta} onChange={setCta} label="Closed to arrival" /> Closed-to-arrival</label>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={ctd} onChange={setCtd} label="Closed to departure" /> Closed-to-departure</label>
          </div>
        </>
      )}
      <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[11px] leading-relaxed text-mute">
        Precedence: <b>date override → seasonal plan → base rate</b>. Parent closures cascade to linked child units. Every change here is queued to all live channels instantly.
      </p>
    </Modal>
  );
}

// ── Services / workforce timeline ─────────────────────────────────────────
function ServicesTimeline({ mode }: { mode: "services" | "workforce" }) {
  const [from, setFrom] = useState(dayKey(addDays(new Date(), -1)));
  const [to, setTo] = useState(dayKey(addDays(new Date(), 13)));
  const daysArr = useMemo(() => {
    const n = Math.min(31, Math.max(1, Math.round((+parseKey(to) - +parseKey(from)) / 86_400_000) + 1));
    return range(n).map((i) => addDays(from, i));
  }, [from, to]);
  const keys = daysArr.map(dayKey);
  const colW = 96;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-[150px]" /></Field>
        <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-[150px]" /></Field>
        <Field label="Month jump">
          <Select className="!w-[150px]" aria-label="Jump to month" onChange={(e) => { const d = parseKey(e.target.value); setFrom(dayKey(d)); setTo(dayKey(addDays(d, 13))); }}>
            {[0, 1, 2].map((m) => { const d = addDays(new Date(), m * 30); return <option key={m} value={dayKey(d)}>{fmtDate(d).slice(4)} onwards</option>; })}
          </Select>
        </Field>
        <p className="ml-auto text-[11.5px] font-semibold text-mute">{mode === "services" ? "Booked slots vs capacity per day" : "Assigned jobs per staff member"}</p>
      </div>

      <div className="overflow-auto rounded-xl border border-line bg-card" style={{ maxHeight: "calc(100dvh - 320px)" }}>
        <div style={{ width: LABEL_W + keys.length * colW }}>
          <div className="sticky top-0 z-20 flex border-b border-line bg-card">
            <div className="sticky left-0 z-10 border-r border-line px-3 py-2 text-[10.5px] font-bold uppercase tracking-wider text-mute" style={{ width: LABEL_W }}>
              {mode === "services" ? "Services" : "Workforce"}
            </div>
            {daysArr.map((d, i) => (
              <div key={i} className={cx("border-r border-line/60 px-2 py-1.5 text-center", isToday(d) && "bg-brand-soft")} style={{ width: colW }}>
                <p className="text-[9px] font-bold uppercase text-faint">{fmtDate(d).slice(0, 3)}</p>
                <p className="font-mono text-[11.5px] font-bold text-ink">{fmtShort(d)}</p>
              </div>
            ))}
          </div>

          {mode === "services"
            ? SERVICES.map((s) => (
                <div key={s.id} className="flex border-b border-line/70">
                  <div className="sticky left-0 z-10 border-r border-line bg-card px-3 py-2" style={{ width: LABEL_W }}>
                    <p className="text-[12px] font-bold text-ink">{s.name}</p>
                    <p className="text-[10px] font-semibold text-faint">{s.category} · {s.durationMin >= 1440 ? "full day" : `${Math.round(s.durationMin / 60)}h`} · cap {s.capacity}/slot</p>
                  </div>
                  {keys.map((k, i) => {
                    const booked = SERVICE_BOOKINGS.filter((b) => b.serviceId === s.id && b.date === k && b.status !== "cancelled").reduce((n, b) => n + 1, 0);
                    const full = booked >= s.capacity;
                    return (
                      <div key={i} className={cx("flex items-center justify-center border-r border-line/50 py-2", isToday(daysArr[i]) && "bg-brand-soft/50")} style={{ width: colW }}>
                        {booked > 0 ? (
                          <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10.5px] font-bold", full ? "bg-danger-soft text-danger" : booked / s.capacity > 0.6 ? "bg-gold-soft text-[#8a5c07]" : "bg-brand-soft text-brand-deep")}>
                            {booked}/{s.capacity}
                          </span>
                        ) : (
                          <span className="text-[10px] text-line2">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            : ["m-kadek", "m-nyoman", "m-ari", "m-komang", "m-jana"].map((mid) => {
                const m = memberById(mid)!;
                return (
                  <div key={mid} className="flex border-b border-line/70">
                    <div className="sticky left-0 z-10 flex items-center gap-2 border-r border-line bg-card px-3 py-2" style={{ width: LABEL_W }}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: m.color }}>{m.name.split(" ").map((x) => x[0]).join("")}</span>
                      <div>
                        <p className="text-[12px] font-bold text-ink">{m.name}</p>
                        <p className="text-[10px] font-semibold text-faint">{m.duty === "service" ? "Service staff" : m.duty === "task_service" ? "Task + service" : "Task staff"}</p>
                      </div>
                    </div>
                    {keys.map((k, i) => {
                      const jobs = SERVICE_BOOKINGS.filter((b) => b.staffId === mid && b.date === k && b.status !== "cancelled");
                      return (
                        <div key={i} className={cx("space-y-1 border-r border-line/50 p-1", isToday(daysArr[i]) && "bg-brand-soft/50")} style={{ width: colW }}>
                          {jobs.length === 0 && <span className="block text-center text-[10px] text-line2">—</span>}
                          {jobs.map((j) => (
                            <span key={j.id} className="block truncate rounded bg-sea-soft px-1.5 py-0.5 text-[9.5px] font-bold text-sea" title={`${j.start} · ${SERVICES.find((s) => s.id === j.serviceId)?.name}`}>
                              {j.start} {SERVICES.find((s) => s.id === j.serviceId)?.name.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
