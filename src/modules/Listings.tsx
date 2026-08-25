import { useMemo, useState } from "react";
import { cx, money, copyText, addDays, today } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Empty, Field, Input, SearchBox, Select, Toggle, Textarea } from "../components/ui";
import { useApp } from "../store";
import { CHANNEL_DEFS, SERVICES, channelDef, computeStay, planFor, propertyById } from "../lib/data";
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
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => toast("info", "Importer", "Guided CSV/XLSX import with dry-run — or the 10-minute iCal fast path.")}>Add listing</Btn>
      </div>

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
                      <span className="h-2 w-2 rounded-sm" style={{ background: c.color }} aria-hidden="true" />{c.short}
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
      {list.length === 0 && <Empty icon="home" title="No listings match" />}
    </div>
  );
}

// ── Property detail ────────────────────────────────────────────────────────
function PropertyDetail({ p, onOpenServices }: { p: Property; onOpenServices: () => void }) {
  const { navigate, toggleArchive, togglePublishDirect, setCheckoutEnabled, toast } = useApp();
  const properties = useApp((s) => s.properties);
  const [tab, setTab] = useState("details");
  const children = properties.filter((x) => x.parentId === p.id);
  const tabs = [
    { id: "details", label: "Details" }, { id: "pricing", label: "Price settings" }, { id: "pcal", label: "Pricing calendar" },
    { id: "settings", label: "Property settings" }, { id: "mgmt", label: "Management" }, { id: "channels", label: "Channels" },
    ...(p.isParent ? [{ id: "children", label: `Child listings · ${children.length}` }] : []),
    { id: "checkout", label: "Checkout page" },
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
          <button key={t.id} onClick={() => setTab(t.id)} className={cx("rounded-md px-3 py-1.5 text-[12px] font-bold", tab === t.id ? "bg-card text-ink shadow-sm border border-line" : "text-mute hover:text-ink")}>{t.label}</button>
        ))}
      </div>

      {tab === "details" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[13.5px] font-bold text-ink">Photo manager</h3>
              <div className="flex gap-1.5"><Btn size="xs" icon="upload">Upload</Btn><Btn size="xs" variant="ghost" icon="image">Categorise rooms</Btn></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <figure key={i} className="group relative overflow-hidden rounded-lg border border-line">
                  <img src={p.image} alt={`${p.name} photo ${i + 1}`} className="h-24 w-full object-cover" loading="lazy" />
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-pine-950/80 to-transparent px-2 pb-1 pt-4">
                    <span className="text-[9px] font-bold text-white">{i === 0 ? "Cover" : ["Pool", "Living", "Bedroom", "Kitchen", "Bath"][i - 1]}</span>
                    <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {i !== 0 && <button aria-label="Set as cover" className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="star" size={10} /></button>}
                      <button aria-label="Reorder photo" className="rounded bg-white/20 p-0.5 text-white hover:bg-white/40"><Ic name="grip" size={10} /></button>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-mute">Drag to reorder · starred photo becomes the cover everywhere (calendar, site, OTAs).</p>
          </div>
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

      {tab === "pricing" && <PricingTab p={p} />}

      {tab === "pcal" && (
        <div className="rounded-xl border border-line bg-card p-4">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Pricing calendar — per-date overrides</h3>
          <p className="mb-3 text-[11.5px] text-mute">Precedence, highest first: <Badge tone="danger">date override</Badge> → <Badge tone="warn">seasonal plan</Badge> → <Badge tone="mute">base rate</Badge>. Bulk overrides from the Multi-calendar land here.</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }, (_, i) => {
              const d = addDays(today(), i);
              const plan = planFor(p, d);
              const isOverride = i === 9 || i === 10;
              return (
                <button key={i} className={cx("rounded-md border p-1.5 text-center transition-colors hover:border-brand", isOverride ? "border-danger/50 bg-danger-soft/50" : plan.kind === "season" ? "border-gold/50 bg-gold-soft/40" : "border-line bg-paper")}
                  onClick={() => toast("info", "Date override editor", `${d.toDateString()} — currently ${isOverride ? "date override" : plan.name}`)}>
                  <p className="font-mono text-[10px] font-bold text-mute">{d.getDate()}</p>
                  <p className="font-mono text-[9.5px] font-bold text-ink">{(plan.nightly / 1e6).toFixed(2)}M</p>
                  <p className={cx("text-[8px] font-bold uppercase", isOverride ? "text-danger" : plan.kind === "season" ? "text-[#8a5c07]" : "text-faint")}>{isOverride ? "override" : plan.kind === "season" ? plan.season : "base"}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "settings" && (
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
      )}

      {tab === "mgmt" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Managed property</h3>
            <label className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-ink">Track commission on this property</span>
              <Toggle checked={p.managed} onChange={() => toast("info", p.managed ? "Commission tracking off" : "Commission tracking on")} label="Managed property" />
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
              <Toggle checked={true} onChange={() => toast("info", "Workspace toggle", "Owner financial visibility is controlled workspace-wide in Settings → General.")} label="Owner sees financials" />
            </label>
          </div>
        </div>
      )}

      {tab === "channels" && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2.5">Channel</th><th className="px-3 py-2.5">State</th><th className="px-3 py-2.5">External listing ID</th><th className="px-3 py-2.5 text-right">Markup %</th><th className="px-3 py-2.5" /></tr></thead>
              <tbody>
                {CHANNEL_DEFS.filter((c) => c.id !== "ical").map((c) => {
                  const st = p.channels[c.id];
                  return (
                    <tr key={c.id} className="border-b border-line/60">
                      <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-[12.5px] font-bold text-ink"><span className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold text-white" style={{ background: c.color }}>{c.short}</span>{c.name}<Badge tone="mute">{c.structure}</Badge></span></td>
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
                <code className="flex-1 truncate rounded-md bg-paper px-2.5 py-2 font-mono text-[10.5px] text-mute">https://ical.trellis.site/{p.id}/export.ics</code>
                <Btn size="xs" icon="copy" onClick={() => { copyText(`https://ical.trellis.site/${p.id}/export.ics`); toast("ok", "iCal URL copied"); }}>Copy</Btn>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <h4 className="mb-1.5 font-display text-[13px] font-bold text-ink">iCal import subscriptions</h4>
              <p className="text-[11.5px] text-mute">Owner-blocked calendars subscribe here — dates auto-block within minutes, the fast path for new workspaces.</p>
              <Btn size="xs" className="mt-2" icon="plus">Subscribe a calendar</Btn>
            </div>
          </div>
        </div>
      )}

      {tab === "children" && (
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-[13.5px] font-bold text-ink">Units under {p.name}</h3>
              <p className="text-[11px] text-mute">“One channel, many units” — Booking.com maps room types to these children via the parent connection.</p>
            </div>
            <Btn size="sm" variant="solid" icon="plus" onClick={() => toast("info", "Add child unit", "Inherits timezone, currency and parent channel mapping.")}>Add unit</Btn>
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

      {tab === "checkout" && <CheckoutCard name={p.name} code={p.code} enabled={p.checkoutEnabled} onToggle={(v) => setCheckoutEnabled(p.id, v)} />}
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

// ── Services view ──────────────────────────────────────────────────────────
function ServicesView({ back }: { back: () => void }) {
  const { setCheckoutEnabled, toast } = useApp();
  const [services, setServices] = useState(SERVICES);
  const catIcons: Record<string, IconName> = { experience: "sparkle", chauffeur: "nav", spa: "heart", activities: "trendUp", equipment: "clock" };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={back} className="flex items-center gap-1 text-[12px] font-bold text-mute hover:text-ink"><Ic name="chevL" size={13} /> Listings</button>
        <span className="text-line2">/</span>
        <span className="text-[12px] font-bold text-ink">Sellable services</span>
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => toast("info", "New service", "Category taxonomy is extensible.")}>New service</Btn>
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
    </div>
  );
}
