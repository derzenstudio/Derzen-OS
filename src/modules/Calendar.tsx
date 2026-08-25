import { useMemo, useRef, useState } from "react";
import { cx, addDays, dayKey, parseKey, fmtDate, fmtShort, money, moneyRaw, isWeekend, isToday, toCSV, download, range } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, IconBtn, Input, Kbd, LiveRegion, Modal, Select, Toggle, Field } from "../components/ui";
import { useApp, nightsInRange } from "../store";
import { BLOCKS, SERVICES, SERVICE_BOOKINGS, channelDef, planFor, propertyById, memberById } from "../lib/data";
import type { Property, Reservation } from "../lib/types";

const COL_W = 62;
const LABEL_W = 224;
const ROW_H = 48;

function rateShort(minor: number): string {
  if (minor >= 1_000_000) {
    const m = minor / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(m < 10 ? 2 : 1).replace(/0$/, "")}M`;
  }
  return `${Math.round(minor / 1000)}k`;
}

// ── Bars for one row over the window ───────────────────────────────────────
interface Bar { left: number; width: number; color: string; label: string; sub?: string; kind: string; resId?: string; striped?: boolean; hatch?: boolean; }

function barsForRow(p: Property, windowStart: string, nights: number, reservations: Reservation[]): Bar[] {
  const windowEnd = dayKey(addDays(windowStart, nights));
  const out: Bar[] = [];
  for (const r of reservations) {
    if (r.propertyId !== p.id || r.kind !== "stay") continue;
    if (r.status === "cancelled" || r.status === "no_show") continue;
    if (!nightsInRange(r, windowStart, windowEnd)) continue;
    const startIdx = Math.max(0, Math.round((+parseKey(r.checkIn) - +parseKey(windowStart)) / 86_400_000));
    const endIdx = Math.min(nights, Math.round((+parseKey(r.checkOut) - +parseKey(windowStart)) / 86_400_000));
    const pending = r.status === "pending" || r.status === "enquiry";
    out.push({
      left: startIdx * COL_W + 2, width: (endIdx - startIdx) * COL_W - 4,
      color: channelDef(r.channel).color,
      label: `${propertyById(r.propertyId).code} · ${r.status === "checked_in" ? "in house" : "arrives " + fmtShort(r.checkIn)}`,
      sub: r.ref, resId: r.id, kind: pending ? "pending" : "confirmed", striped: pending,
    });
  }
  for (const b of BLOCKS) {
    if (b.propertyId !== p.id || !nightsInRange({ ...({} as Reservation), checkIn: b.checkIn, checkOut: b.checkOut }, windowStart, windowEnd)) continue;
    const startIdx = Math.max(0, Math.round((+parseKey(b.checkIn) - +parseKey(windowStart)) / 86_400_000));
    const endIdx = Math.min(nights, Math.round((+parseKey(b.checkOut) - +parseKey(windowStart)) / 86_400_000));
    out.push({
      left: startIdx * COL_W + 2, width: (endIdx - startIdx) * COL_W - 4,
      color: b.type === "owner" ? "#8A978A" : b.type === "manual" ? "#3D4A42" : "#C07F14",
      label: b.label, kind: b.type, hatch: b.type === "owner", striped: b.type === "hold",
    });
  }
  return out;
}

export default function CalendarModule() {
  const { navigate, calendarOverrides, bulkApply, pushQueue, bulkSnapshot, rollbackBulk, retryPush, reorderProperty, setCalendarCell, toast } = useApp();
  const properties = useApp((s) => s.properties);
  const reservations = useApp((s) => s.reservations);
  const [tab, setTab] = useState<"properties" | "services" | "workforce">("properties");

  const [windowStart, setWindowStart] = useState(dayKey(addDays(new Date(), -2)));
  const [windowN, setWindowN] = useState(25);
  const [search, setSearch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [focus, setFocus] = useState({ r: 0, c: 2 });
  const [selRange, setSelRange] = useState<[number, number] | null>(null);
  const [anchoring, setAnchoring] = useState(false);
  const [editor, setEditor] = useState<{ keys: string[]; label: string } | null>(null);
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
      .filter((p) => checked.length === 0 || !bulkMode || checked.includes(p.id) || p.parentId)
      .sort((a, b) => a.order - b.order);
    return active;
  }, [properties, search, showArchived, checked, bulkMode]);

  const visibleRows = useMemo(() => (tab === "properties" ? rows : []), [tab, rows]);
  const days = useMemo(() => range(windowN).map((i) => addDays(windowStart, i)), [windowStart, windowN]);
  const keys = days.map(dayKey);

  const effectiveChecked = checked.length ? rows.filter((r) => checked.includes(r.id) && !r.isParent) : rows.filter((r) => !r.isParent);

  const cellState = (p: Property, key: string, d: Date) => {
    const ov = calendarOverrides[p.id]?.[key];
    const plan = planFor(p, d);
    const rate = ov?.rate ?? plan.nightly;
    const closed = ov?.closed ?? false;
    const minStay = ov?.minStay ?? (d.getDay() === 5 || d.getDay() === 6 ? Math.max(2, p.minNights) : p.minNights);
    return { rate, closed, minStay, cta: ov?.cta ?? false, ctd: ov?.ctd ?? false, season: plan.kind === "season" ? plan.name : null };
  };

  const announceCell = (r: number, c: number) => {
    const p = rows[r];
    if (!p) return;
    const d = days[c];
    const st = cellState(p, keys[c], d);
    setAnnounce(`${p.name}, ${fmtDate(d)}, ${st.closed ? "closed" : "available"}, ${moneyRaw(st.rate, p.currency)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== gridRef.current) return;
    const move = (dr: number, dc: number, extend: boolean) => {
      e.preventDefault();
      setFocus((f) => {
        const nr = Math.min(rows.length - 1, Math.max(0, f.r + dr));
        const nc = Math.min(windowN - 1, Math.max(0, f.c + dc));
        if (extend) {
          setSelRange((sel) => {
            const anchor = sel && !anchoring ? (anchoring ? sel[0] : sel[0]) : f.c;
            return [Math.min(anchor, nc), Math.max(anchor, nc)];
          });
        } else setSelRange(null);
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
      const ks = selRange ? keys.slice(selRange[0], selRange[1] + 1) : [keys[focus.c]];
      setEditor({ keys: ks, label: selRange ? `${effectiveChecked.length} listings × ${ks.length} nights` : `${rows[focus.r]?.name} · ${fmtDate(days[focus.c])}` });
    } else if (e.key === "Escape") {
      setSelRange(null);
      setBulkMode(false);
    }
  };

  const applyEditor = (patch: { rate?: number; closed?: boolean; minStay?: number; cta?: boolean; ctd?: boolean }) => {
    if (!editor) return;
    if (bulkMode || editor.keys.length > 1) {
      const ids = effectiveChecked.map((r) => r.id);
      if (!ids.length) { toast("warn", "No listings selected", "Tick at least one listing on the left."); return; }
      bulkApply(ids, editor.keys, patch);
    } else {
      const p = rows[focus.r];
      if (!p) { setEditor(null); return; }
      setCalendarCell(p.id, editor.keys[0], patch);
      toast("ok", "Night updated", `${p.name} · ${editor.keys[0]}`);
    }
    setEditor(null);
    setSelRange(null);
  };

  const exportCSV = () => {
    const head = ["Listing", ...keys];
    const body = rows.filter((r) => !r.isParent).map((p) => [
      p.name,
      ...keys.map((k, i) => {
        const st = cellState(p, k, days[i]);
        const res = reservations.find((r) => r.propertyId === p.id && r.checkIn <= k && r.checkOut > k && r.status !== "cancelled");
        if (res) return `${res.ref} (${res.status})`;
        if (st.closed) return "CLOSED";
        return String(st.rate);
      }),
    ]);
    download(`derzen-calendar-${windowStart}.csv`, toCSV([head, ...body]));
    toast("ok", "CSV exported", `${rows.length} listings × ${keys.length} nights`);
  };

  // drag-select handlers
  const onMouseDownCell = (c: number) => {
    if (!bulkMode) return;
    setAnchoring(true);
    setSelRange([c, c]);
  };
  const onMouseEnterCell = (c: number) => {
    if (!bulkMode || !anchoring) return;
    setSelRange((sel) => (sel ? [Math.min(sel[0], c), Math.max(sel[0], c)] : [c, c]));
  };
  const stopDrag = () => setAnchoring(false);

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
          <Btn icon="filter" onClick={() => setPropFilterOpen(!propFilterOpen)}>Listings {checked.length ? `· ${checked.length}` : ""}</Btn>
          {propFilterOpen && (
            <div className="anim-pop absolute left-0 top-9 z-40 w-[230px] rounded-lg border border-line bg-card p-2 shadow-xl">
              <div className="mb-1 flex justify-between px-1 text-[10.5px] font-bold text-mute">
                <button onClick={() => setChecked([])}>All</button>
                <button onClick={() => setChecked(properties.filter((p) => !p.archived).map((p) => p.id))}>None… invert</button>
              </div>
              {properties.filter((p) => !p.archived).map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12px] font-semibold hover:bg-paper">
                  <input type="checkbox" checked={checked.includes(p.id)} onChange={() => setChecked((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />
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
              onClick={() => { setBulkMode(!bulkMode); setSelRange(null); }}
              className={cx("flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-bold transition-all", bulkMode ? "border-gold bg-gold-soft text-[#8a5c07]" : "border-line bg-card text-mute hover:text-ink")}
              aria-pressed={bulkMode}
            >
              <Ic name="sliders" size={13} /> Bulk edit
            </button>
          )}
          <Btn icon="download" onClick={exportCSV}>CSV</Btn>
        </div>
      </div>

      {bulkMode && (
        <div className="anim-rise flex flex-wrap items-center gap-2 rounded-lg border border-gold/50 bg-gold-soft/60 px-3 py-2 text-[12px] font-semibold text-[#8a5c07]">
          <Ic name="info" size={14} />
          Drag across nights to size the range, then press <Kbd>Enter</Kbd> (or click Apply) to push rate & restrictions to {effectiveChecked.length} listings. <Kbd>Esc</Kbd> cancels · <Kbd>Shift</Kbd>+<Kbd>←→</Kbd> extends.
        </div>
      )}

      {tab === "properties" ? (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-mute">
            <Dot tone="ok" label="Confirmed (channel colour)" />
            <span className="flex items-center gap-1.5"><span className="pat-stripes h-2.5 w-5 rounded-sm bg-gold" /> Pending / hold</span>
            <span className="flex items-center gap-1.5"><span className="pat-hatch h-2.5 w-5 rounded-sm bg-[#8A978A]" /> Owner stay</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-[#3D4A42]" /> Manual block</span>
            <span className="ml-auto hidden items-center gap-1 text-faint lg:flex">Keyboard: <Kbd>←→↑↓</Kbd> focus · <Kbd>Shift</Kbd>+arrows select · <Kbd>Enter</Kbd> edit · <Kbd>Esc</Kbd> cancel</span>
          </div>

          <LiveRegion text={announce} />

          <div
            ref={gridRef} tabIndex={0} role="grid" aria-label="Availability calendar. Use arrow keys to move."
            onKeyDown={onKeyDown} onMouseUp={stopDrag} onMouseLeave={stopDrag}
            className="relative overflow-auto rounded-xl border border-line bg-card outline-none focus-visible:border-brand"
            style={{ maxHeight: "calc(100vh - 292px)" }}
          >
            <div style={{ width: LABEL_W + windowN * COL_W, minWidth: "100%" }}>
              {/* Header */}
              <div className="sticky top-0 z-30 border-b border-line bg-card">
                <div className="flex" style={{ height: 24 }}>
                  <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-line bg-card px-3 text-[10.5px] font-bold uppercase tracking-wider text-mute" style={{ width: LABEL_W }}>
                    Listings · drag to reorder
                  </div>
                  <div className="flex">
                    {monthLabels.map((m, i) => (
                      <div key={i} className="flex items-center border-r border-line px-2 font-display text-[11px] font-bold text-ink" style={{ width: m.span * COL_W }}>{m.label}</div>
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
              {rows.map((p, r) => {
                const bars = barsForRow(p, windowStart, windowN, reservations);
                const isChild = !!p.parentId;
                return (
                  <div key={p.id} role="row" className="flex border-b border-line/70 hover:bg-paper/60" style={{ height: ROW_H }}>
                    <div
                      role="rowheader" draggable={!bulkMode}
                      onDragStart={() => setDragId(p.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragId && dragId !== p.id) reorderProperty(dragId, p.id); setDragId(null); }}
                      className={cx("sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-line bg-card px-2.5", isChild && "pl-7")}
                      style={{ width: LABEL_W }}
                    >
                      <Ic name="grip" size={12} className="cursor-grab text-line2" />
                      {bulkMode && !p.isParent ? (
                        <input type="checkbox" aria-label={`Select ${p.name}`} checked={checked.includes(p.id)} onChange={() => setChecked((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />
                      ) : (
                        <span className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-line">
                          <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold leading-tight text-ink">{p.name}</p>
                        <p className="flex items-center gap-1 text-[9.5px] font-semibold text-faint">
                          {p.code} · {p.city}
                          {p.isParent && <Badge tone="ink" className="!px-1 !py-0 !text-[8.5px]">Main · {properties.filter((x) => x.parentId === p.id).length} linked</Badge>}
                          {isChild && <span className="text-brand-deep">↳ linked</span>}
                          {p.archived && <Badge tone="mute" className="!px-1 !py-0 !text-[8.5px]">Archived</Badge>}
                        </p>
                      </div>
                    </div>
                    <div className="relative" style={{ width: windowN * COL_W }} role="presentation">
                      {/* Cells */}
                      <div className="absolute inset-0 flex">
                        {days.map((d, c) => {
                          const st = p.isParent ? null : cellState(p, keys[c], d);
                          const inSel = selRange && c >= selRange[0] && c <= selRange[1];
                          const focused = focus.r === r && focus.c === c;
                          return (
                            <div
                              key={c} role="gridcell"
                              aria-label={st ? `${p.name}, ${fmtDate(d)}, ${st.closed ? "closed" : "available"}, ${moneyRaw(st.rate, p.currency)}${st.minStay > 1 ? `, min ${st.minStay} nights` : ""}` : `${p.name} group row`}
                              onMouseDown={() => { if (bulkMode && !p.isParent) { onMouseDownCell(c); setFocus({ r, c }); announceCell(r, c); } }}
                              onMouseEnter={() => bulkMode && onMouseEnterCell(c)}
                              onClick={() => { if (!bulkMode && !p.isParent) { setFocus({ r, c }); setEditor({ keys: [keys[c]], label: `${p.name} · ${fmtDate(d)}` }); } }}
                              className={cx(
                                "group/cell flex shrink-0 cursor-pointer flex-col items-center justify-end border-r border-line/50 pb-1 transition-colors",
                                isWeekend(d) && "bg-black/[0.025]",
                                isToday(d) && "bg-brand-soft/70",
                                inSel && "bg-gold-soft",
                                focused && "ring-2 ring-inset ring-brand",
                                st?.closed && "pat-hatch bg-[#E7EAE0]",
                              )}
                              style={{ width: COL_W }}
                            >
                              {st && !st.closed && (
                                <>
                                  <span className={cx("font-mono text-[10px] font-bold leading-none", st.season ? "text-gold" : "text-mute")}>{rateShort(st.rate)}</span>
                                  <span className="mt-0.5 flex items-center gap-0.5">
                                    {st.minStay > 1 && <span className="rounded-sm bg-black/6 px-0.5 font-mono text-[8px] font-bold text-mute">{st.minStay}n</span>}
                                    {st.cta && <span className="font-mono text-[7.5px] font-bold text-sea">CTA</span>}
                                    {st.ctd && <span className="font-mono text-[7.5px] font-bold text-plum">CTD</span>}
                                    {st.season && <span className="h-1 w-1 rounded-full bg-gold" title={st.season} />}
                                  </span>
                                </>
                              )}
                              {st?.closed && <span className="font-mono text-[8.5px] font-bold text-faint">CLOSED</span>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Reservation bars */}
                      {!bulkMode && bars.map((b, i) => (
                        <button
                          key={i} onClick={() => b.resId && navigate(`/reservations/${b.resId}`)}
                          className={cx("absolute z-10 flex items-center gap-1 overflow-hidden rounded-md px-1.5 text-left shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md", b.striped && "pat-stripes", b.hatch && "pat-hatch")}
                          style={{ left: b.left, width: Math.max(b.width, COL_W - 6), top: 4, height: 19, background: b.color, color: "#fff" }}
                          title={`${b.label}${b.sub ? ` · ${b.sub}` : ""}`}
                        >
                          <span className="truncate text-[9px] font-bold leading-none">{b.label}</span>
                          {b.sub && <span className="shrink-0 font-mono text-[8px] opacity-80">{b.sub}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Push queue */}
          {(pushQueue.length > 0 || bulkSnapshot) && (
            <div className="anim-rise rounded-xl border border-line bg-card p-3">
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
    </div>
  );
}

function EditorModal({ editor, bulkMode, onClose, onApply }: { editor: { keys: string[]; label: string } | null; bulkMode: boolean; onClose: () => void; onApply: (p: { rate?: number; closed?: boolean; minStay?: number; cta?: boolean; ctd?: boolean }) => void }) {
  const [rate, setRate] = useState("");
  const [closed, setClosed] = useState(false);
  const [minStay, setMinStay] = useState("");
  const [cta, setCta] = useState(false);
  const [ctd, setCtd] = useState(false);
  return (
    <Modal open={!!editor} onClose={onClose} title={`Edit · ${editor?.label ?? ""}`} w={440}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="solid" icon="check" onClick={() => onApply({ rate: rate ? Math.round(Number(rate)) : undefined, closed: closed || undefined, minStay: minStay ? Number(minStay) : undefined, cta: cta || undefined, ctd: ctd || undefined })}>
          Apply {bulkMode ? "to selection" : ""}
        </Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nightly rate (minor units)"><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="4200000" /></Field>
        <Field label="Minimum stay"><Input type="number" value={minStay} onChange={(e) => setMinStay(e.target.value)} placeholder="2" /></Field>
      </div>
      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={closed} onChange={setClosed} label="Close to booking" /> Close to booking (block sales)</label>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={cta} onChange={setCta} label="Closed to arrival" /> Closed-to-arrival</label>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold"><Toggle checked={ctd} onChange={setCtd} label="Closed to departure" /> Closed-to-departure</label>
      </div>
      <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[11px] leading-relaxed text-mute">
        Precedence: <b>date override → seasonal plan → base rate</b>. Parent closures cascade to linked child units automatically.
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

      <div className="overflow-auto rounded-xl border border-line bg-card" style={{ maxHeight: "calc(100vh - 320px)" }}>
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
