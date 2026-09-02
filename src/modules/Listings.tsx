import { useMemo, useRef, useState } from "react";
import { cx, money, moneyRaw, copyText, addDays, today, dayKey, fmtDate, timeAgo } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Empty, Field, Input, Modal, SearchBox, Select, Toggle, Textarea } from "../components/ui";
import { useApp } from "../store";
import { fmtBytes, libraryBytes, QUOTA_BYTES, STORAGE_BACKEND } from "../lib/photoStore";
import { CHANNEL_DEFS, SERVICES, WORKSPACE, channelDef, computeStay, planFor, propertyById } from "../lib/data";
import { ChannelMark } from "../components/ota";
import type { ChannelStatus, Property } from "../lib/types";

const STATUS_META: Record<ChannelStatus, { label: string; tone: "ok" | "warn" | "danger" | "mute" }> = {
  live: { label: "Live", tone: "ok" }, paused: { label: "Paused", tone: "warn" }, error: { label: "Error", tone: "danger" }, off: { label: "Off", tone: "mute" },
};

export default function Listings() {
  const { route, navigate, properties, reorderProperty, toggleArchive, toggleChannel, toast } = useApp();
  const [view, setView] = useState<"grid" | "table">("table");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [serviceTab, setServiceTab] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const addProperty = useApp((s) => s.addProperty);
  const detailId = route.query.get("property");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...properties].sort((a, b) => a.order - b.order).filter((p) => !s || p.name.toLowerCase().includes(s) || p.city.toLowerCase().includes(s));
  }, [properties, q]);

  if (serviceTab) return <ServicesView back={() => setServiceTab(false)} />;
  if (detailId) {
    const p = properties.find((x) => x.id === detailId);
    if (p) return <PropertyDetail p={p} onOpenServices={() => setServiceTab(true)} />;
  }

  const otaCols = CHANNEL_DEFS.filter((c) => ["airbnb", "booking", "vrbo", "agoda", "trip", "traveloka", "ical", "direct"].includes(c.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          <button onClick={() => setView("table")} aria-pressed={view === "table"} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold", view === "table" ? "bg-pine-900 text-white" : "text-mute")}><Ic name="list" size={13} /> Table</button>
          <button onClick={() => setView("grid")} aria-pressed={view === "grid"} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold", view === "grid" ? "bg-pine-900 text-white" : "text-mute")}><Ic name="grid" size={13} /> Grid</button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search listings" className="w-[220px]" />
        <Btn icon="bag" onClick={() => setServiceTab(true)}>Services ({SERVICES.length})</Btn>
        {sel.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-2 py-1">
            <span className="text-[11.5px] font-bold text-mute">{sel.length} selected:</span>
            <Btn size="xs" onClick={() => { sel.forEach((id) => toggleArchive(id)); setSel([]); toast("ok", "Archived", "Listings hidden from booking pages; history kept."); }}>Archive</Btn>
            <Btn size="xs" variant="ghost" onClick={() => setSel([])}>Clear</Btn>
          </div>
        )}
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => setAddOpen(true)}>Add listing</Btn>
      </div>

      {addOpen && <AddListingWizard onClose={() => setAddOpen(false)} onDone={(id) => { setAddOpen(false); navigate(`/listings?property=${id}`); }} />}

      {view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[1060px] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
                <th className="w-8 px-3 py-2.5" aria-label="Select" />
                <th className="w-6 px-1 py-2.5" aria-label="Reorder" />
                <th className="px-2 py-2.5">Listing</th>
                <th className="px-3 py-2.5 text-right">Base / night</th>
                {otaCols.map((c) => (
                  <th key={c.id} className="px-2 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1" title={`${c.name} distribution status`}>
                      <ChannelMark id={c.id} size={13} />{c.short}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const children = properties.filter((x) => x.parentId === p.id);
                return (
                  <tr key={p.id}
                    draggable onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragId && dragId !== p.id) reorderProperty(dragId, p.id); setDragId(null); }}
                    className={cx("cursor-pointer border-b border-line/60 transition-colors hover:bg-paper/70", p.archived && "opacity-55", dragId === p.id && "opacity-40")}
                    onClick={() => navigate(`/listings?property=${p.id}`)}>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.includes(p.id)} onChange={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} className="accent-[#0E6B4E]" />
                    </td>
                    <td className="px-1 py-2.5 text-line2"><Ic name="grip" size={13} className="cursor-grab" /></td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-9 w-12 shrink-0 overflow-hidden rounded-md border border-line"><img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" /></span>
                        <div>
                          <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                            {p.parentId && <span className="text-brand-deep">↳</span>}{p.name}
                            {p.isParent && <Badge tone="ink">Main · {children.length} linked</Badge>}
                            {p.archived && <Badge tone="mute">archived</Badge>}
                          </p>
                          <p className="text-[10.5px] font-semibold text-faint">{p.city} · {p.bedrooms}BR · sleeps {p.maxGuests} · {p.tzShort}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold text-ink">{p.isParent ? "—" : money(p.pricing.plans[0].nightly, p.currency, { compact: true })}</td>
                    {otaCols.map((c) => {
                      const st = p.channels[c.id];
                      return (
                        <td key={c.id} className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {st ? (
                            <button onClick={() => { toggleChannel(p.id, c.id); toast("info", `${c.name} ${st === "live" ? "paused" : "resumed"} for ${p.code}`, "Change queued to the durable push pipeline."); }}
                              className="mx-auto flex items-center gap-1 rounded-full border border-line bg-paper px-1.5 py-0.5 transition-colors hover:border-line2"
                              aria-label={`${c.name} for ${p.name}: ${STATUS_META[st].label}. Click to toggle.`}
                              title={`${c.name}: ${STATUS_META[st].label} — click to toggle`}>
                              <Dot tone={STATUS_META[st].tone} label={STATUS_META[st].label} />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-line2" aria-label={`${c.name}: not connected`}>—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5">{p.publishDirect ? <Dot tone="ok" label="direct on" /> : <Dot tone="mute" label="direct off" />}</td>
                    <td className="px-3 py-2.5"><Ic name="chevR" size={14} className="text-faint" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <button key={p.id} onClick={() => navigate(`/listings?property=${p.id}`)} className={cx("group overflow-hidden rounded-xl border border-line bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg", p.archived && "opacity-55")}>
              <div className="relative h-40 overflow-hidden">
                <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <span className="absolute left-2.5 top-2.5 rounded-md bg-pine-950/70 px-2 py-0.5 font-mono text-[10.5px] font-bold text-white">{p.code}</span>
                {p.isParent && <span className="absolute right-2.5 top-2.5"><Badge tone="ink">Main · {properties.filter((x) => x.parentId === p.id).length} linked</Badge></span>}
              </div>
              <div className="p-3.5">
                <p className="text-[14px] font-bold text-ink">{p.name}</p>
                <p className="text-[11px] font-semibold text-mute">{p.city} · {p.bedrooms}BR · sleeps {p.maxGuests}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[13px] font-bold text-brand-deep">{p.isParent ? "multi-unit" : `${money(p.pricing.plans[0].nightly, p.currency, { compact: true })}/night`}</span>
                  <span className="flex gap-1">
                    {Object.entries(p.channels).filter(([, st]) => st === "live").slice(0, 4).map(([ch]) => (
                      <span key={ch} className="h-2.5 w-2.5 rounded-sm" style={{ background: channelDef(ch as never).color }} title={`${channelDef(ch as never).name}: Live`} />
                    ))}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {list.length === 0 && (
        properties.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-line2 bg-card px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft text-brand"><Ic name="home" size={26} /></span>
            <p className="mt-4 font-display text-[18px] font-bold text-ink">Add your first listing</p>
            <p className="mt-1 max-w-[46ch] text-[12.5px] leading-relaxed text-mute">
              Connect a channel to import what you already have live, or create one from scratch.
              Everything you add is saved to your workspace.
            </p>
            <Btn className="mt-5" variant="solid" icon="plus" onClick={() => setAddOpen(true)}>Add a listing</Btn>
          </div>
        ) : (
          <Empty icon="home" title="No listings match" body="Try a different search, or clear the filter." />
        )
      )}
    </div>
  );
}

// ── Per-property photo library ─────────────────────────────────────────────
function PhotoManager({ p }: { p: Property }) {
  const { ensurePhotoLibrary, uploadPhotos, deletePhoto, renamePhoto, setCoverPhoto, movePhoto, resyncOtaPhotos, markPending } = useApp();
  const propertyPhotos = useApp((s) => s.propertyPhotos);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useMemo(() => ensurePhotoLibrary(p.id), [p.id]);
  const photos = propertyPhotos[p.id] ?? [];
  const used = libraryBytes(p.id);
  const pct = Math.min(100, Math.round((used / QUOTA_BYTES) * 100));

  const doUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    await uploadPhotos(p.id, files);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Photo library · {p.name}</h3>
          <p className="text-[10px] font-semibold text-faint">
            {STORAGE_BACKEND === "local" ? "saved in this browser (compressed, survives reload)" : "saved to Supabase bucket"} · {photos.length} photos
            {photos.reduce((s, x) => s + (x.bytes ?? 0), 0) > QUOTA_BYTES * 0.8 && <span className="ml-1 rounded-sm bg-gold-soft px-1.5 py-0.5 font-bold text-gold">nearly full, connect the Supabase bucket</span>}
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void doUpload(e.target.files)} aria-label="Upload photos" />
        <Btn size="xs" icon="refresh" variant="ghost" onClick={() => resyncOtaPhotos(p.id)}>Re-sync from channels</Btn>
        <Btn size="xs" icon="upload" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? "Compressing…" : "Upload photos"}</Btn>
      </div>

      {/* storage meter */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className={cx("h-full rounded-full transition-all", pct > 85 ? "bg-danger" : "bg-brand")} style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[9.5px] font-bold text-mute">{fmtBytes(used)} / {fmtBytes(QUOTA_BYTES)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((ph, i) => (
          <figure key={ph.id} className="group relative overflow-hidden rounded-lg border border-line bg-paper">
            <img src={ph.url} alt={ph.label} className="h-24 w-full object-cover" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")} />
            {i === 0 && <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-brand px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white"><Ic name="star" size={8} /> Cover</span>}
            <span className={cx("absolute right-1.5 top-1.5 rounded-sm px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide", ph.source === "upload" ? "bg-ink text-white" : "bg-white/85 text-ink")}>
              {ph.source === "upload" ? "upload" : `sync · ${ph.channel}`}
            </span>
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-pine-950/85 to-transparent px-2 pb-1.5 pt-5">
              {editing === ph.id ? (
                <input
                  autoFocus value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={() => { renamePhoto(p.id, ph.id, label.trim() || ph.label); setEditing(null); markPending("Listings"); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                  className="w-full rounded-sm border border-brand bg-card px-1 py-0.5 text-[9.5px] font-bold text-ink outline-none"
                  aria-label={`Rename ${ph.label}`}
                />
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <button onClick={() => { setEditing(ph.id); setLabel(ph.label); }} className="truncate text-left text-[9.5px] font-bold text-white hover:underline" title="Click to rename">{ph.label}</button>
                  <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => { setEditing(ph.id); setLabel(ph.label); }} aria-label={`Rename ${ph.label}`} className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="pencil" size={9} /></button>
                    {i !== 0 && <button onClick={() => setCoverPhoto(p.id, ph.id)} aria-label={`Set ${ph.label} as cover`} className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="star" size={9} /></button>}
                    {i > 0 && <button onClick={() => movePhoto(p.id, ph.id, "up")} aria-label={`Move ${ph.label} up`} className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="chevU" size={9} /></button>}
                    {i < photos.length - 1 && <button onClick={() => movePhoto(p.id, ph.id, "down")} aria-label={`Move ${ph.label} down`} className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="chevD" size={9} /></button>}
                    <button onClick={() => deletePhoto(p.id, ph.id)} aria-label={`Delete ${ph.label}`} className="rounded bg-white/20 p-0.5 text-white hover:bg-danger"><Ic name="trash" size={9} /></button>
                  </span>
                </div>
              )}
            </figcaption>
          </figure>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void doUpload(e.dataTransfer.files); }}
          className="flex h-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line2 text-mute transition-colors hover:border-brand hover:text-brand-deep"
        >
          <Ic name="upload" size={16} />
          <span className="text-[9.5px] font-bold">Drop images or click to upload</span>
        </button>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-mute">
        First photo is the cover everywhere — calendar, site builder, OTAs. Uploads are compressed
        client-side (max 900px, JPEG) before saving; the storage adapter swaps to your Supabase
        bucket once its keys are configured, with zero UI changes.
      </p>
    </div>
  );
}

// ── Property detail ────────────────────────────────────────────────────────
function PropertyDetail({ p, onOpenServices }: { p: Property; onOpenServices: () => void }) {
  const { navigate, toggleArchive, togglePublishDirect, setCheckoutEnabled, addChildUnit, toggleManaged, setOwnerFinancialsVisible, toast } = useApp();
  const properties = useApp((s) => s.properties);
  const ownerFinancials = WORKSPACE.ownerFinancialsVisible;
  const [tab, setTab] = useState("overview");
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitLabel, setUnitLabel] = useState("");
  const [icalOpen, setIcalOpen] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [subs, setSubs] = useState<{ id: string; url: string; name: string; lastPoll: number; events: number }[]>([
    { id: "sub-1", url: "https://airbnb.com/calendar/ical/88213.ics", name: "Airbnb (owner copy)", lastPoll: Date.now() - 9 * 60_000, events: 14 },
  ]);
  const children = properties.filter((x) => x.parentId === p.id);
  // 8 legacy tabs consolidated into 5 grouped sections — nothing removed,
  // related surfaces are stacked together so they read as one workflow.
  const tabs: { id: string; label: string; icon: IconName }[] = [
    { id: "overview", label: "Overview", icon: "home" },
    { id: "rates", label: "Rates & availability", icon: "trendUp" },
    { id: "distribution", label: p.isParent ? `Distribution · ${children.length} units` : "Distribution", icon: "globe" },
    { id: "selling", label: "Selling direct", icon: "bag" },
    { id: "ownership", label: "Ownership", icon: "shield" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/listings")} className="flex items-center gap-1 text-[12px] font-bold text-mute hover:text-ink"><Ic name="chevL" size={13} /> Listings</button>
        <span className="text-line2">/</span>
        <span className="text-[12px] font-bold text-ink">{p.name}</span>
        <div className="ml-auto flex gap-2">
          <Btn size="sm" icon="bag" onClick={onOpenServices}>Services</Btn>
          <Btn size="sm" variant={p.archived ? "solid" : "ghost"} icon="archive" onClick={() => toggleArchive(p.id)}>{p.archived ? "Unarchive" : "Archive"}</Btn>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-black/[0.03] p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold transition-colors", tab === t.id ? "bg-card text-ink shadow-sm border border-line" : "text-mute hover:text-ink")}>
            <Ic name={t.icon} size={13} className={tab === t.id ? "text-brand" : "text-faint"} />{t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PhotoManager p={p} />
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <Field label="Title"><Input defaultValue={p.name} /></Field>
            <Field label="Description"><Textarea defaultValue={`${p.name} — a ${p.bedrooms}-bedroom retreat in ${p.city} with ${p.amenities.slice(0, 3).join(", ").toLowerCase()}.`} className="!min-h-[90px]" /></Field>
            <Field label="Address (geocoded)"><Input defaultValue={`${p.city}, Bali, Indonesia`} /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Capacity"><Input defaultValue={p.maxGuests} type="number" /></Field>
              <Field label="Bedrooms"><Input defaultValue={p.bedrooms} type="number" /></Field>
              <Field label="Baths"><Input defaultValue={p.bathrooms} type="number" /></Field>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-mute">Amenities</p>
              <div className="flex flex-wrap gap-1.5">{p.amenities.map((a) => <Badge key={a} tone="mute">{a}</Badge>)}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "rates" && (
        <div className="space-y-4">
          <PricingTab p={p} />
          <PricingCalendar p={p} />
        </div>
      )}

      {tab === "selling" && (
        <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Stay rules — sync to every live channel</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min nights"><Input type="number" defaultValue={p.minNights} /></Field>
              <Field label="Max nights"><Input type="number" defaultValue={p.maxNights} /></Field>
              <Field label="Max advance (days)"><Input type="number" defaultValue={p.maxAdvanceDays} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in time"><Input defaultValue={p.checkInTime} /></Field>
              <Field label="Check-out time"><Input defaultValue={p.checkOutTime} /></Field>
            </div>
            <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Arrival/departure are always computed in <b className="text-ink">{p.tz} ({p.tzShort})</b> — never the viewer's timezone. Changing the property timezone never shifts an existing reservation's local check-in time.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Direct booking</h3>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-ink">Publish for direct booking</span>
              <Toggle checked={p.publishDirect} onChange={() => togglePublishDirect(p.id)} label="Publish for direct booking" />
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5">
              <code className="flex-1 truncate font-mono text-[11px] text-mute">https://stay.sanggraha.co/stay/{p.code.toLowerCase()}</code>
              <Btn size="xs" icon="copy" onClick={() => { copyText(`https://stay.sanggraha.co/stay/${p.code.toLowerCase()}`); toast("ok", "Booking link copied"); }}>Copy</Btn>
              <Btn size="xs" variant="ghost" icon="external" onClick={() => toast("info", "Opening public page", "Guests see the translated, mobile-first checkout.")}>Open</Btn>
            </div>
            <Field label="Guest contact channel override">
              <Select defaultValue="inherit">
                <option value="inherit">Inherit workspace (WhatsApp + email)</option><option>WhatsApp only</option><option>Email only</option><option>Hide all</option>
              </Select>
            </Field>
          </div>
        </div>
        <CheckoutCard name={p.name} code={p.code} enabled={p.checkoutEnabled} onToggle={(v) => setCheckoutEnabled(p.id, v)} />
        </div>
      )}

      {tab === "ownership" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Managed property</h3>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-ink">Track commission on this property</span>
              <Toggle checked={p.managed} onChange={() => toggleManaged(p.id)} label="Managed property" />
            </label>
            <Field label="Commission %">
              <Input type="number" defaultValue={p.commissionPct} disabled={!p.managed} className="!w-[110px]" />
            </Field>
            <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Owner statements are generated monthly from the same ledger as your financial reports — they always reconcile to the cent.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Owner portal access</h3>
            <p className="text-[12px] text-mute">Elena Widura (property owner) can view this property's bookings, calendar and — if the workspace allows — financials.</p>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-ink">Show financial figures to this owner</span>
              <Toggle checked={ownerFinancials} onChange={(v) => setOwnerFinancialsVisible(v)} label="Owner sees financials" />
            </label>
          </div>
        </div>
      )}

      {tab === "distribution" && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2.5">Channel</th><th className="px-3 py-2.5">State</th><th className="px-3 py-2.5">External listing ID</th><th className="px-3 py-2.5 text-right">Markup %</th><th className="px-3 py-2.5" /></tr></thead>
              <tbody>
                {CHANNEL_DEFS.filter((c) => c.id !== "ical").map((c) => {
                  const st = p.channels[c.id];
                  return (
                    <tr key={c.id} className="border-b border-line/60">
                      <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-[12.5px] font-bold text-ink"><ChannelMark id={c.id} size={18} />{c.name}<Badge tone="mute">{c.structure}</Badge></span></td>
                      <td className="px-3 py-2.5">{st ? <Dot tone={STATUS_META[st].tone} label={STATUS_META[st].label} /> : <Dot tone="mute" label="Not connected" />}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{st ? `${c.short}-${p.code}-${(p.order + 3) * 1117}` : "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold">{c.markupPct}%</td>
                      <td className="px-3 py-2.5 text-right">
                        {st && <Btn size="xs" variant="ghost" icon="external" onClick={() => toast("info", `Opening ${c.name} extranet`, "Deep link uses your scoped, rotatable OAuth token.")}>Open</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-card p-4">
              <h4 className="mb-1.5 font-display text-[13px] font-bold text-ink">iCal export feed</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-paper px-2.5 py-2 font-mono text-[10.5px] text-mute">https://ical.derzen.site/{p.id}/export.ics</code>
                <Btn size="xs" icon="copy" onClick={() => { copyText(`https://ical.derzen.site/${p.id}/export.ics`); toast("ok", "iCal URL copied"); }}>Copy</Btn>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <h4 className="mb-1.5 font-display text-[13px] font-bold text-ink">iCal import subscriptions</h4>
              <p className="text-[11.5px] text-mute">Owner-blocked calendars subscribe here — dates auto-block within minutes, the fast path for new workspaces.</p>
              <div className="mt-2 space-y-1.5">
                {subs.map((s) => (
                  <div key={s.id} className="flex items-center gap-2.5 rounded-md border border-line bg-paper/60 px-3 py-2">
                    <Ic name="calendar" size={14} className="text-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-bold text-ink">{s.name}</p>
                      <p className="truncate font-mono text-[9.5px] text-faint">{s.url}</p>
                    </div>
                    <Badge tone="ok">{s.events} blocked</Badge>
                    <span className="hidden font-mono text-[9px] text-faint sm:inline">polled {timeAgo(s.lastPoll)}</span>
                    <button onClick={() => { setSubs((arr) => arr.filter((x) => x.id !== s.id)); toast("info", "Subscription removed", "Blocked dates from this feed were released."); }} aria-label={`Remove ${s.name}`} className="rounded-sm p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"><Ic name="trash" size={12} /></button>
                  </div>
                ))}
              </div>
              <Btn size="xs" className="mt-2" icon="plus" onClick={() => { setIcalUrl(""); setIcalOpen(true); }}>Subscribe a calendar</Btn>
            </div>
          </div>
        </div>
      )}

      {tab === "distribution" && p.isParent && (
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-[13.5px] font-bold text-ink">Units under {p.name}</h3>
              <p className="text-[11px] text-mute">“One channel, many units” — Booking.com maps room types to these children via the parent connection.</p>
            </div>
            <Btn size="sm" variant="solid" icon="plus" onClick={() => { setUnitLabel(""); setUnitOpen(true); }}>Add unit</Btn>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {children.map((c) => (
              <button key={c.id} onClick={() => navigate(`/listings?property=${c.id}`)} className="overflow-hidden rounded-lg border border-line text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
                <img src={c.image} alt={c.name} className="h-24 w-full object-cover" loading="lazy" />
                <div className="p-3">
                  <p className="text-[13px] font-bold text-ink">{c.name}</p>
                  <p className="text-[10.5px] font-semibold text-mute">{c.bedrooms}BR · {money(c.pricing.plans[0].nightly, c.currency, { compact: true })}/night</p>
                  <p className="mt-1 flex gap-1">{Object.entries(c.channels).map(([ch, st]) => <span key={ch} className="flex items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-[9px] font-bold text-mute"><span className="h-1.5 w-1.5 rounded-full" style={{ background: channelDef(ch as never).color }} />{channelDef(ch as never).short} {st}</span>)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal open={icalOpen} onClose={() => setIcalOpen(false)} title="Subscribe an iCal feed" w={440}
        footer={<><Btn variant="ghost" onClick={() => setIcalOpen(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => {
          const u = icalUrl.trim();
          if (!/^https?:\/\/.+\.ics(\?.*)?$/i.test(u)) { toast("warn", "That doesn't look like an .ics URL", "Paste the full feed link, e.g. https://airbnb.com/calendar/ical/123.ics"); return; }
          setSubs((arr) => [...arr, { id: `sub-${Date.now()}`, url: u, name: new URL(u).hostname.replace(/^www\./, ""), lastPoll: Date.now(), events: 0 }]);
          toast("ok", "Feed subscribed", "First poll runs now — blocked dates appear on the calendar within minutes.");
          setIcalOpen(false);
        }}>Subscribe</Btn></>}>
        <div className="space-y-3">
          <Field label="iCal URL (.ics)"><Input value={icalUrl} onChange={(e) => setIcalUrl(e.target.value)} placeholder="https://airbnb.com/calendar/ical/88213.ics" autoFocus /></Field>
          <p className="rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
            DERZEN polls every 15 minutes. Busy dates in the feed block this listing on all channels — the fastest way to stop double-bookings before full channel connections are approved.
          </p>
        </div>
      </Modal>

      <Modal open={unitOpen} onClose={() => setUnitOpen(false)} title={`Add unit under ${p.name}`} w={400}
        footer={<><Btn variant="ghost" onClick={() => setUnitOpen(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => {
          if (!unitLabel.trim()) { toast("warn", "Name the unit", "e.g. Garden Suite"); return; }
          addChildUnit(p.id, unitLabel.trim()); setUnitOpen(false);
        }}>Add unit</Btn></>}>
        <div className="space-y-3">
          <Field label="Unit name"><Input value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="Garden Suite" autoFocus /></Field>
          <p className="rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
            Inherits the parent's timezone, currency and channel mapping — then shows up on the calendar and in the Booking.com room-type map.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function PricingTab({ p }: { p: Property }) {
  const [nights, setNights] = useState(5);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [scopeMode, setScopeMode] = useState<"all" | "direct">("all");
  const preview = useMemo(() => computeStay(p, addDays(today(), 7), nights, adults, children), [p, nights, adults, children]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Rate plans — authored in {p.currency} (listing currency)</h3>
          <div className="flex items-center rounded-lg border border-line bg-paper p-0.5">
            <button onClick={() => setScopeMode("all")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", scopeMode === "all" ? "bg-pine-900 text-white" : "text-mute")}>Direct + OTA</button>
            <button onClick={() => setScopeMode("direct")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", scopeMode === "direct" ? "bg-pine-900 text-white" : "text-mute")}>Direct-website only</button>
          </div>
        </div>
        <table className="w-full text-left">
          <tbody>
            {p.pricing.plans.map((r) => (
              <tr key={r.id} className="border-b border-line/60">
                <td className="py-2">
                  <p className="text-[12.5px] font-bold text-ink">{r.name}</p>
                  <p className="text-[10px] font-semibold text-faint">{r.kind === "base" ? "fallback plan" : `${r.season} · months ${(r.months ?? []).map((m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m]).join(", ")}`}</p>
                </td>
                <td className="py-2 text-right font-mono text-[13px] font-bold text-ink">{money(r.nightly, p.currency)}</td>
                <td className="py-2 pl-3 text-right font-mono text-[10.5px] text-faint">{r.kind === "base" ? "base" : `${r.nightly > p.pricing.plans[0].nightly ? "+" : "−"}${Math.abs(Math.round((r.nightly / p.pricing.plans[0].nightly - 1) * 100))}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-paper p-3 text-[11.5px]">
          <p><b>Extra guests:</b> {p.pricing.extraGuestAfter} included, then {money(p.pricing.extraGuestFee, p.currency)}/guest/night</p>
          <p><b>Children ≤{p.pricing.childAgeMax}:</b> −{p.pricing.childDiscountPct}% of extra-guest fee · infants free</p>
          <p><b>Discounts:</b> weekly −{p.pricing.weeklyPct}% · monthly −{p.pricing.monthlyPct}%</p>
          <p><b>Fees:</b> cleaning {money(p.pricing.cleaningFee, p.currency)} · service {p.pricing.serviceFeePct}% · VAT {p.pricing.vatPct}%</p>
        </div>
        <p className="mt-2 text-[10.5px] text-mute">Offerings (derived plans) adjust the base by a fixed amount or % — e.g. “non-refundable −8%”. OTAs apply their own markup on top ({scopeMode === "all" ? "channel markups configured per channel" : "this scope only prices the direct website"}).</p>
      </div>
      <div className="rounded-xl border border-sea/40 bg-card p-4">
        <h3 className="mb-2 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="calc" size={15} className="text-sea" /> Live stay-price preview</h3>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Nights"><Input type="number" min={1} value={nights} onChange={(e) => setNights(Math.max(1, Number(e.target.value)))} /></Field>
          <Field label="Adults"><Input type="number" min={1} value={adults} onChange={(e) => setAdults(Math.max(1, Number(e.target.value)))} /></Field>
          <Field label="Children"><Input type="number" min={0} value={children} onChange={(e) => setChildren(Math.max(0, Number(e.target.value)))} /></Field>
        </div>
        <div className="mt-3 max-h-[240px] space-y-1 overflow-y-auto">
          {preview.items.map((it, i) => (
            <p key={i} className="flex justify-between gap-2 text-[11.5px]">
              <span className={cx("truncate", it.kind === "discount" ? "font-bold text-brand-deep" : "text-mute")}>{it.label}</span>
              <span className="shrink-0 font-mono font-semibold text-ink">{money(it.amount, p.currency, { sign: true })}</span>
            </p>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2">
          <span className="text-[12.5px] font-bold">Total</span>
          <span className="font-mono text-[15px] font-bold text-brand-deep">{money(preview.total, p.currency)}</span>
        </div>
        <p className="mt-1 text-[10px] text-faint">= Σ line items, always. Recomputes on every keystroke.</p>
      </div>
    </div>
  );
}

function CheckoutCard({ name, code, enabled, onToggle }: { name: string; code: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  const toast = useApp((s) => s.toast);
  const url = `https://stay.sanggraha.co/stay/${code.toLowerCase()}`;
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-deep"><Ic name="card" size={18} /></span>
        <div className="flex-1">
          <p className="text-[13.5px] font-bold text-ink">Hosted checkout — {name}</p>
          <p className="text-[11px] text-mute">Standalone booking page with deposit schedule, fees & taxes library, and Stripe hosted fields. Pausing this does not touch the listing's channel distribution.</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-bold text-ink">Direct booking <Toggle checked={enabled} onChange={(v) => { onToggle(v); toast(v ? "ok" : "warn", v ? "Checkout enabled" : "Checkout paused", v ? "Link is live again." : "Visitors see a 'book via our channels' notice."); }} label="Enable checkout page" /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className={cx("flex-1 truncate rounded-md border border-line px-3 py-2 font-mono text-[11.5px]", enabled ? "bg-paper text-mute" : "bg-danger-soft/50 text-danger line-through")}>{url}</code>
        <Btn size="sm" icon="copy" onClick={() => { copyText(url); toast("ok", "Link copied"); }}>Copy link</Btn>
        <Btn size="sm" icon="link" onClick={() => { copyText(`https://tr.ee/${code.toLowerCase()}-book`); toast("ok", "Tiny URL generated", `tr.ee/${code.toLowerCase()}-book`); }}>Tiny URL</Btn>
        <Btn size="sm" variant="solid" icon="external" disabled={!enabled} onClick={() => toast("info", "Opening checkout page", "360px-friendly, 3G-tested.")}>Open page</Btn>
      </div>
    </div>
  );
}

// ── Pricing calendar — real per-date overrides, synced with Multi-calendar ──
function PricingCalendar({ p }: { p: Property }) {
  const { manualBlock, toast } = useApp();
  const overrides = useApp((s) => s.calendarOverrides[p.id] ?? {});
  const [editing, setEditing] = useState<{ key: string; date: Date; planNightly: number } | null>(null);
  const [rate, setRate] = useState("");
  const [closed, setClosed] = useState(false);
  const [minStay, setMinStay] = useState(1);

  const open = (key: string, date: Date, planNightly: number, ov?: { rate?: number; closed?: boolean; minStay?: number }) => {
    setEditing({ key, date, planNightly });
    setRate(ov?.rate ? String(ov.rate) : "");
    setClosed(!!ov?.closed);
    setMinStay(ov?.minStay ?? 1);
  };
  const save = () => {
    if (!editing) return;
    manualBlock(p.id, [editing.key], {
      rate: rate ? Math.round(Number(rate)) : undefined,
      closed: closed ? true : undefined,
      minStay: minStay > 1 ? minStay : undefined,
    });
    toast("ok", `${fmtDate(editing.key)} updated`, rate ? `Override ${moneyRaw(Math.round(Number(rate)), p.currency, { compact: true })} · pushed to live channels` : "Override cleared · back to plan rate");
    setEditing(null);
  };
  const clearOv = () => {
    if (!editing) return;
    manualBlock(p.id, [editing.key], { rate: undefined, closed: undefined, minStay: undefined, blockType: undefined, blockLabel: undefined });
    toast("info", "Override removed", `${fmtDate(editing.key)} falls back to ${planFor(p, editing.date).name}.`);
    setEditing(null);
  };

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h3 className="font-display text-[13.5px] font-bold text-ink">Pricing calendar — per-date overrides</h3>
      <p className="mb-3 text-[11.5px] text-mute">Precedence, highest first: <Badge tone="danger">date override</Badge> → <Badge tone="warn">seasonal plan</Badge> → <Badge tone="mute">base rate</Badge>. Edits here land on the Multi-calendar and push to every live channel.</p>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }, (_, i) => {
          const d = addDays(today(), i);
          const key = dayKey(d);
          const plan = planFor(p, d);
          const ov = overrides[key];
          const hasOv = !!(ov?.rate || ov?.closed || (ov?.minStay ?? 0) > 1);
          const shown = ov?.rate ?? plan.nightly;
          return (
            <button key={i} className={cx("rounded-md border p-1.5 text-center transition-all hover:-translate-y-px hover:border-brand hover:shadow-sm", ov?.closed ? "border-danger/50 bg-danger-soft/50" : hasOv ? "border-brand/50 bg-brand-soft/40" : plan.kind === "season" ? "border-gold/50 bg-gold-soft/40" : "border-line bg-paper")}
              onClick={() => open(key, d, plan.nightly, ov)} aria-label={`Edit ${fmtDate(key)}`}>
              <p className="font-mono text-[10px] font-bold text-mute">{d.getDate()}</p>
              <p className={cx("font-mono text-[9.5px] font-bold", ov?.closed ? "text-danger line-through" : "text-ink")}>{(shown / 1e6).toFixed(2)}M</p>
              <p className={cx("text-[8px] font-bold uppercase", ov?.closed ? "text-danger" : hasOv ? "text-brand-deep" : plan.kind === "season" ? "text-[#8a5c07]" : "text-faint")}>{ov?.closed ? "closed" : hasOv ? "override" : plan.kind === "season" ? plan.season : "base"}</p>
            </button>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Override · ${fmtDate(editing.key)}` : ""} w={400}
        footer={<>
          {editing && overrides[editing.key] && (overrides[editing.key].rate || overrides[editing.key].closed) && <Btn variant="ghost" icon="undo" onClick={clearOv}>Clear override</Btn>}
          <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
          <Btn variant="solid" icon="check" onClick={save}>Save & push</Btn>
        </>}>
        {editing && (
          <div className="space-y-3">
            <p className="rounded-sm bg-paper px-3 py-2 text-[11px] text-mute">
              Plan rate for this night: <b className="font-mono text-ink">{moneyRaw(editing.planNightly, p.currency)}</b> ({planFor(p, editing.date).name}). Leave the field empty to keep it.
            </p>
            <Field label={`Nightly rate (${p.currency})`}>
              <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={String(editing.planNightly)} autoFocus />
            </Field>
            <Field label="Minimum stay (nights)">
              <Input type="number" min={1} value={String(minStay)} onChange={(e) => setMinStay(Math.max(1, Number(e.target.value)))} />
            </Field>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-line px-3 py-2.5">
              <Toggle checked={closed} onChange={setClosed} label="Close this night" />
              <span className="text-[12px] font-bold text-ink">Closed to booking this night</span>
            </label>
            <p className="text-[10px] leading-relaxed text-faint">Saving writes a date override and queues pushes to every live channel for {p.name} — identical to the Multi-calendar's bulk editor.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Services view ──────────────────────────────────────────────────────────
function ServicesView({ back }: { back: () => void }) {
  const { setCheckoutEnabled, toast } = useApp();
  const [services, setServices] = useState(SERVICES);
  const [nsOpen, setNsOpen] = useState(false);
  const [ns, setNs] = useState({ name: "", category: "experience", price: "", durationMin: 120, capacity: 4 });
  const catIcons: Record<string, IconName> = { experience: "sparkle", chauffeur: "nav", spa: "heart", activities: "trendUp", equipment: "clock" };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="flex items-center gap-1 text-[12px] font-bold text-mute hover:text-ink"><Ic name="chevL" size={13} /> Listings</button>
        <span className="text-line2">/</span>
        <span className="text-[12px] font-bold text-ink">Sellable services</span>
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => { setNs({ name: "", category: "experience", price: "", durationMin: 120, capacity: 4 }); setNsOpen(true); }}>New service</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="overflow-hidden rounded-xl border border-line bg-card">
            <div className="relative h-32">
              <img src={s.image} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute left-2.5 top-2.5"><Badge tone="plum">{s.category}</Badge></span>
              {!s.active && <span className="absolute right-2.5 top-2.5"><Badge tone="mute">inactive</Badge></span>}
            </div>
            <div className="p-3.5">
              <p className="text-[13.5px] font-bold text-ink">{s.name}</p>
              <p className="mt-0.5 text-[10.5px] font-semibold text-mute">
                {s.durationMin >= 1440 ? "full day" : `${Math.round(s.durationMin / 60)}h`} · max {s.capacity}/slot · {s.location} · lead time {s.leadTimeH}h{s.deposit ? ` · deposit ${money(s.deposit, s.currency)}` : ""}
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-mono text-[15px] font-bold text-brand-deep">{money(s.price, s.currency)}</span>
                <div className="flex items-center gap-2">
                  <Btn size="xs" icon="link" onClick={() => { copyText(`https://stay.sanggraha.co/x/${s.id}`); toast("ok", "Service checkout link copied"); }}>Copy link</Btn>
                  <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-mute">
                    sell <Toggle checked={s.checkoutEnabled} onChange={(v) => { setServices((arr) => arr.map((x) => (x.id === s.id ? { ...x, checkoutEnabled: v } : x))); toast(v ? "ok" : "warn", `${s.name} ${v ? "on sale" : "paused"}`); }} label={`Toggle ${s.name} checkout`} />
                  </label>
                </div>
              </div>
              <p className="mt-2 border-t border-line pt-2 text-[10px] text-faint">Publishes to the public services page + its own checkout · availability windows feed the services calendar.</p>
            </div>
          </div>
        ))}
      </div>

      <Modal open={nsOpen} onClose={() => setNsOpen(false)} title="New service" w={440}
        footer={<><Btn variant="ghost" onClick={() => setNsOpen(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => {
          if (!ns.name.trim() || !Number(ns.price)) { toast("warn", "Name and price required", "e.g. Sunrise Surf Lesson · 650000"); return; }
          setServices((arr) => [{ id: `svc-${Date.now()}`, name: ns.name.trim(), category: ns.category, durationMin: ns.durationMin, capacity: ns.capacity, price: Math.round(Number(ns.price)), currency: "IDR", deposit: 0, location: "On-site", leadTimeH: 24, image: SERVICES[0].image, active: true, checkoutEnabled: false }, ...arr]);
          toast("ok", `${ns.name.trim()} created`, "Enable “sell” to publish its checkout page.");
          setNsOpen(false);
        }}>Create</Btn></>}>
        <div className="space-y-3">
          <Field label="Service name"><Input value={ns.name} onChange={(e) => setNs({ ...ns, name: e.target.value })} placeholder="Sunrise Surf Lesson" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={ns.category} onChange={(e) => setNs({ ...ns, category: e.target.value })}>
                {["experience", "chauffeur", "spa", "activities", "equipment"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Price (IDR)"><Input type="number" value={ns.price} onChange={(e) => setNs({ ...ns, price: e.target.value })} placeholder="650000" /></Field>
            <Field label="Duration (min)"><Input type="number" value={String(ns.durationMin)} onChange={(e) => setNs({ ...ns, durationMin: Math.max(15, Number(e.target.value)) })} /></Field>
            <Field label="Capacity / slot"><Input type="number" value={String(ns.capacity)} onChange={(e) => setNs({ ...ns, capacity: Math.max(1, Number(e.target.value)) })} /></Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Add Listing wizard — manual, import from OTA, or connect a channel ─────
type OtaListing = { id: string; name: string; city: string; nightly: number; guests: number; photos: number; rating: number };
const REMOTE: Record<string, OtaListing[]> = {
  airbnb: [
    { id: "ab-1", name: "Villa Serenity", city: "Canggu", nightly: 4_200_000, guests: 8, photos: 24, rating: 4.9 },
    { id: "ab-2", name: "The Palm House", city: "Ubud", nightly: 3_600_000, guests: 6, photos: 18, rating: 4.8 },
    { id: "ab-3", name: "Oceanfront Escape", city: "Uluwatu", nightly: 6_800_000, guests: 10, photos: 31, rating: 5.0 },
  ],
  booking: [
    { id: "bdc-1", name: "Canggu Garden Villa", city: "Canggu", nightly: 3_900_000, guests: 6, photos: 20, rating: 8.9 },
    { id: "bdc-2", name: "Riverside Retreat", city: "Ubud", nightly: 3_100_000, guests: 4, photos: 15, rating: 9.1 },
  ],
  vrbo: [
    { id: "vr-1", name: "Sunset Cliff Villa", city: "Uluwatu", nightly: 7_200_000, guests: 12, photos: 27, rating: 4.7 },
  ],
  agoda: [
    { id: "ag-1", name: "Seminyak Luxe Stay", city: "Seminyak", nightly: 4_800_000, guests: 6, photos: 22, rating: 8.7 },
  ],
  expedia: [
    { id: "ex-1", name: "Nusa Dua Family Estate", city: "Nusa Dua", nightly: 5_400_000, guests: 10, photos: 26, rating: 4.6 },
    { id: "ex-2", name: "Jimbaran Bay House", city: "Jimbaran", nightly: 3_300_000, guests: 5, photos: 17, rating: 4.5 },
  ],
  trip: [
    { id: "tr-1", name: "Ubud Jungle Hideaway", city: "Ubud", nightly: 2_900_000, guests: 4, photos: 19, rating: 4.8 },
  ],
  mmt: [
    { id: "mm-1", name: "Sanur Beach Cottage", city: "Sanur", nightly: 2_400_000, guests: 4, photos: 14, rating: 4.4 },
  ],
  traveloka: [
    { id: "tl-1", name: "Canggu Surf Villa", city: "Canggu", nightly: 3_800_000, guests: 7, photos: 21, rating: 8.5 },
    { id: "tl-2", name: "Amed Sunrise Bungalow", city: "Amed", nightly: 1_900_000, guests: 3, photos: 12, rating: 8.8 },
  ],
};
const AUTH_LABEL: Record<string, string> = {
  airbnb: "One-click OAuth sign-in", booking: "Extranet + property ID", vrbo: "Login + emailed code",
  expedia: "Extranet + property ID", agoda: "Extranet + property ID", trip: "Extranet + property ID",
  mmt: "API credentials", traveloka: "Extranet + property ID", direct: "Already built-in", ical: "Feed URL",
};

function AddListingWizard({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const { addProperty, importFromOta, toast } = useApp();
  const [step, setStep] = useState<"source" | "manual" | "channel" | "fetch" | "pick" | "spreadsheet">("source");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [channel, setChannel] = useState("airbnb");
  const [authing, setAuthing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [spreadsheetLink, setSpreadsheetLink] = useState("");
  const [remote, setRemote] = useState<OtaListing[]>([]);
  const connected = CHANNEL_DEFS.filter((c) => c.id !== "ical");

  const startFetch = (ch: string) => {
    setChannel(ch);
    setAuthing(true);
    setTimeout(() => {
      setAuthing(false);
      setFetching(true);
      setTimeout(() => {
        setRemote(REMOTE[ch] ?? []);
        setFetching(false);
        setStep("pick");
      }, 900);
    }, 1100);
    setStep("fetch");
  };

  const importOne = (l: OtaListing) => {
    const id = importFromOta({ name: l.name, city: l.city, channel, nightly: l.nightly, guests: l.guests });
    onDone(id);
  };

  return (
    <Modal open onClose={onClose} w={640}
      title={
        <span className="flex items-center gap-3">
          <span>Add a listing</span>
          <span className="flex items-center gap-1">
            {(["source", "manual", "channel", "fetch", "pick", "spreadsheet"] as const).indexOf(step) >= 0 && (
              <>
                {step === "source" ? <span className="font-mono text-[10px] font-bold text-brand-deep">1 · Choose a source</span> :
                  step === "manual" ? <span className="font-mono text-[10px] font-bold text-brand-deep">2 · New listing</span> :
                  step === "channel" ? <span className="font-mono text-[10px] font-bold text-brand-deep">2 · Pick a channel</span> :
                  step === "spreadsheet" ? <span className="font-mono text-[10px] font-bold text-brand-deep">2 · Import spreadsheet</span> :
                  <span className="font-mono text-[10px] font-bold text-brand-deep">{step === "fetch" ? "Connecting…" : "3 · Import"}</span>}
              </>
            )}
          </span>
        </span>
      }
      footer={step === "source" ? <Btn variant="ghost" onClick={onClose}>Cancel</Btn> : undefined}
    >
      {step === "source" && (
        <div className="grid grid-cols-1 gap-2.5">
          {([
            { id: "manual", icon: "plus" as IconName, title: "Create manually", desc: "Start from scratch. We'll sync photos from your connected channels and you can set rates, rooms and calendars.", tag: "Fastest" },
            { id: "channel", icon: "download" as IconName, title: "Import from a connected OTA", desc: "Pull an existing listing off Airbnb, Booking.com, VRBO, Agoda, Expedia, Trip.com, MakeMyTrip or Traveloka — photos, rate and capacity come with it.", tag: "Recommended" },
            { id: "spreadsheet", icon: "table" as IconName, title: "Import from spreadsheet", desc: "Upload a CSV/Excel file or paste a Google Sheets link to import a single listing or a batch of properties.", tag: "File/Link" },
          ] as const).map((o) => (
            <button key={o.id} onClick={() => setStep(o.id as "manual" | "channel" | "spreadsheet")}
              className="flex items-start gap-3 rounded-lg border border-line bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-deep"><Ic name={o.icon} size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[13.5px] font-bold text-ink">{o.title} <Badge tone={o.id === "channel" ? "ok" : "mute"}>{o.tag}</Badge></span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-mute">{o.desc}</span>
              </span>
              <Ic name="chevR" size={15} className="mt-1 text-faint" />
            </button>
          ))}
          <p className="rounded-md bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
            <b className="text-ink">No channel connected yet?</b> Pick “Import from a connected OTA” and choose a channel — the
            wizard authenticates it first ({connected.map((c) => c.name).join(", ")}), then pulls your listings so nothing is re-typed.
          </p>
        </div>
      )}

      {step === "spreadsheet" && (
        <div className="space-y-4">
          <p className="text-[11.5px] text-mute">Paste a Google Sheets link or upload a `.csv` or `.xlsx` file containing your listing details or property portfolio.</p>
          <Field label="Spreadsheet link"><Input value={spreadsheetLink} onChange={(e) => setSpreadsheetLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." autoFocus /></Field>
          
          <div className="relative flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface transition-colors hover:border-brand hover:bg-brand-soft">
            <Ic name="upload" size={24} className="mb-2 text-mute" />
            <span className="text-[12.5px] font-bold text-ink">Click to upload file</span>
            <span className="text-[10px] text-faint">CSV or Excel (max 5MB)</span>
            <input type="file" accept=".csv,.xlsx" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => {
              if (e.target.files?.[0]) {
                toast("ok", "Spreadsheet uploaded", `Processing ${e.target.files[0].name}...`);
                setTimeout(() => {
                  onDone(addProperty("Imported Villa", "Canggu"));
                }, 1000);
              }
            }} />
          </div>

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setStep("source")}>Back</Btn>
            <Btn variant="solid" icon="download" disabled={!spreadsheetLink.trim()} onClick={() => {
              toast("ok", "Spreadsheet linked", "Importing rows...");
              setTimeout(() => {
                onDone(addProperty("Imported Villa", "Canggu"));
              }, 1000);
            }}>Import from Link</Btn>
          </div>
        </div>
      )}

      {step === "manual" && (
        <div className="space-y-3">
          <Field label="Listing name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Villa Serenity" autoFocus /></Field>
          <Field label="City / area"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Canggu" /></Field>
          <p className="rounded-md bg-paper px-3 py-2 text-[11px] leading-relaxed text-mute">
            On creation, DERZEN pulls the media your connected channels already hold for this property and seeds the
            <b className="text-ink"> property photo library</b> — then you can rename, reorder, replace or upload your own.
          </p>
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setStep("source")}>Back</Btn>
            <Btn variant="solid" icon="check" onClick={() => {
              if (!name.trim()) { toast("warn", "Give it a name", "e.g. Villa Serenity"); return; }
              onDone(addProperty(name.trim(), city.trim() || "Canggu"));
            }}>Create & sync photos</Btn>
          </div>
        </div>
      )}

      {step === "channel" && (
        <div className="space-y-2">
          <p className="text-[11.5px] text-mute">Pick the channel your listing lives on. Each uses its own sign-in method — we handle it, then pull your listings.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {connected.filter((c) => c.id !== "direct").map((c) => (
              <button key={c.id} onClick={() => startFetch(c.id)}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-line bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
                <ChannelMark id={c.id} size={26} />
                <span className="text-[12.5px] font-bold text-ink">{c.name}</span>
                <span className="text-[9.5px] leading-snug text-faint">{AUTH_LABEL[c.id] ?? "Extranet"}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-end"><Btn variant="ghost" onClick={() => setStep("source")}>Back</Btn></div>
        </div>
      )}

      {step === "fetch" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-deep">
            <ChannelMark id={channel} size={28} />
          </span>
          <p className="text-[13px] font-bold text-ink">{authing ? `Authenticating with ${channelDef(channel as never).name}…` : `Fetching your listings from ${channelDef(channel as never).name}…`}</p>
          <p className="flex items-center gap-2 font-mono text-[10.5px] text-faint">
            <span className="h-3 w-3 anim-spin rounded-full border-2 border-line2 border-t-brand" /> {authing ? AUTH_LABEL[channel] : "Reading remote inventory"}
          </p>
        </div>
      )}

      {step === "pick" && (
        <div className="space-y-2">
          <p className="text-[11.5px] text-mute">Found <b className="text-ink">{remote.length}</b> listing{remote.length !== 1 ? "s" : ""} on {channelDef(channel as never).name}. Pick one to import — rates, capacity and photos come across.</p>
          {remote.length === 0 && <p className="rounded-md bg-paper px-3 py-3 text-[11.5px] text-mute">No listings found on this channel yet. Create one manually instead.</p>}
          {remote.map((l) => (
            <button key={l.id} onClick={() => importOne(l)}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
              <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-deep"><Ic name="home" size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">{l.name}</span>
                <span className="block text-[10.5px] text-mute">{l.city} · {l.guests} guests · {l.photos} photos · ★ {l.rating}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-[12.5px] font-bold text-brand-deep">{money(l.nightly, "IDR", { compact: true })}</span>
                <span className="block text-[9.5px] text-faint">per night</span>
              </span>
              <Ic name="chevR" size={15} className="text-faint" />
            </button>
          ))}
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setStep("channel")}>Back</Btn><Btn variant="ghost" onClick={() => setStep("manual")}>Create manually instead</Btn></div>
        </div>
      )}
    </Modal>
  );
}
