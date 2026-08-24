import { useState } from "react";
import { cx, money, copyText, toCSV, download, dayKey, addDays, today } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Field, Input, Modal, Select, Spark, Tabs, Toggle } from "../components/ui";
import { useApp } from "../store";
import { COLLECTIONS, EMBED_IFRAME, EMBED_SNIPPET, PROPERTIES, propertyById } from "../lib/data";
import type { Block } from "../lib/types";

const BLOCK_LIB: { group: string; items: { type: string; label: string; icon: IconName }[] }[] = [
  { group: "Content", items: [
    { type: "hero", label: "Hero", icon: "image" }, { type: "rich_text", label: "Rich text", icon: "doc" },
    { type: "image", label: "Image", icon: "image" }, { type: "gallery", label: "Gallery", icon: "image" },
    { type: "faq", label: "FAQ", icon: "chat" }, { type: "guest_reviews", label: "Guest reviews", icon: "star" },
    { type: "table", label: "Table", icon: "list" },
  ]},
  { group: "Commerce", items: [
    { type: "collection_grid", label: "Collection grid", icon: "grid" }, { type: "collection_list", label: "Collection list", icon: "list" },
    { type: "featured_offering", label: "Featured offering", icon: "star" }, { type: "offerings_grid", label: "Offerings grid", icon: "grid" },
    { type: "search_bar", label: "Search bar", icon: "search" },
  ]},
  { group: "Utility", items: [
    { type: "cta_banner", label: "CTA banner", icon: "bolt" }, { type: "contact_form", label: "Contact form", icon: "mail" },
    { type: "icon_highlights", label: "Icon highlights", icon: "sparkle" },
  ]},
];
const BLOCK_LABEL: Record<string, string> = Object.fromEntries(BLOCK_LIB.flatMap((g) => g.items.map((i) => [i.type, i.label])));

export default function Websites() {
  const { website, moveBlock, addBlock, removeBlock, setSiteTheme, setSiteActivePage, toast } = useApp();
  const [tab, setTab] = useState("builder");
  const [libOpen, setLibOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState(false);
  const [metric, setMetric] = useState<"traffic" | "bookings">("traffic");
  const page = website.pages.find((p) => p.id === website.activePageId)!;

  return (
    <div className="space-y-4">
      {/* Site card */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine-900 text-[#5BCBA9]"><Ic name="globe" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">{website.subdomain}
            {website.published ? <Dot tone="ok" label="published" /> : <Dot tone="mute" label="unpublished" />}
          </p>
          <p className="text-[11px] text-mute">
            Custom domain: <code className="font-mono">{website.customDomain}</code> · {website.domainStatus === "verified" ? <Dot tone="ok" label="DNS verified · TLS auto" /> : <Dot tone="warn" label="DNS pending — add CNAME to trellis.site" />}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-bold text-ink">Publish <Toggle checked={website.published} onChange={(v) => toast(v ? "ok" : "warn", v ? "Site published" : "Site unpublished", v ? "TLS issued automatically." : "Embeds and links show a maintenance notice.")} label="Publish site" /></label>
        <Btn size="sm" icon="copy" onClick={() => toast("ok", "Site duplicated", "sanggraha-copy.trellis.site")}>Duplicate</Btn>
        <Btn size="sm" variant="ghost" icon="trash" onClick={() => toast("warn", "Delete requires typing the site name", "Protection against accidental loss.")}>Delete</Btn>
      </div>

      <Tabs tabs={[{ id: "builder", label: "Page builder" }, { id: "collections", label: "Collections" }, { id: "analytics", label: "Analytics" }, { id: "embed", label: "Embeddable widgets" }, { id: "settings", label: "Website settings" }]} active={tab} onChange={setTab} />

      {tab === "builder" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr_260px]">
          {/* Pages */}
          <div className="space-y-1.5">
            {website.pages.map((p) => (
              <button key={p.id} onClick={() => { setSiteActivePage(p.id); setMenuFor(null); }} className={cx("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[12px] font-bold", p.id === page.id ? "border-brand bg-brand-soft/60 text-brand-deep" : "border-line bg-card text-mute hover:text-ink")}>
                <Ic name={p.home ? "home" : "doc"} size={13} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-mono text-[9.5px] text-faint">{p.slug}</span>
                {p.home && <Ic name="lock" size={10} aria-label="Protected home page" />}
              </button>
            ))}
            <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => toast("info", "New page or folder", "Per-page slug, SEO title/description, social image, visibility.")}><Ic name="plus" size={13} /> Page / folder</button>
            <button className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => setPageSettings(true)}><Ic name="gear" size={13} /> Page settings</button>
            <div className="rounded-lg border border-line bg-card p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">Global chrome</p>
              <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Ic name="menu" size={11} /> Header <span className="ml-auto text-[9px] text-faint">editable</span></p>
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Ic name="minus" size={11} /> Footer <span className="ml-auto text-[9px] text-faint">editable</span></p>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[13.5px] font-bold text-ink">Page: {page.name} <span className="font-mono text-[10px] font-semibold text-faint">{page.slug}</span></p>
              <div className="flex gap-1.5">
                <Btn size="xs" icon="plus" onClick={() => setLibOpen(true)}>Add block</Btn>
                <Btn size="xs" variant="ghost" icon="eye" onClick={() => toast("info", "Live preview", "Opens the published URL in a new tab.")}>Preview</Btn>
              </div>
            </div>
            <div className="space-y-2">
              {page.blocks.map((b, idx) => (
                <BlockRow key={b.id} b={b} idx={idx} total={page.blocks.length}
                  menuOpen={menuFor === b.id}
                  onMenu={() => setMenuFor(menuFor === b.id ? null : b.id)}
                  onMove={(dir) => moveBlock(page.id, b.id, dir)}
                  onRemove={() => { if (page.home && b.type === "hero") { toast("warn", "Home hero is protected", "Every page needs a first impression."); return; } removeBlock(page.id, b.id); }}
                  onDuplicate={() => toast("ok", "Block duplicated", BLOCK_LABEL[b.type])}
                />
              ))}
            </div>
            <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
              Drag & drop is optional — every block has a <b className="text-ink">Move up / Move down / Into column / Duplicate / Remove</b> menu, keyboard reachable. Drop targets show a visible focus ring.
            </p>
          </div>

          {/* Design panel */}
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-card p-4">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Theme</p>
              <Field label="Palette">
                <div className="grid grid-cols-3 gap-1.5">
                  {["Palm & Sand", "Ocean Light", "Volcanic"].map((p) => (
                    <button key={p} onClick={() => setSiteTheme({ palette: p })} className={cx("rounded-md border px-2 py-1.5 text-[10px] font-bold", website.theme.palette === p ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{p}</button>
                  ))}
                </div>
              </Field>
              <Field label="Typography">
                <Select value={website.theme.font} onChange={(e) => setSiteTheme({ font: e.target.value })}>
                  {["Fraunces / Instrument Sans", "Bricolage / Public Sans", "Sora / Inter"].map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label={`Corner radius · ${website.theme.radius}px`}>
                <input type="range" min={0} max={20} value={website.theme.radius} onChange={(e) => setSiteTheme({ radius: Number(e.target.value) })} className="w-full accent-[#0E7A5F]" aria-label="Corner radius" />
              </Field>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Starter templates</p>
              {[["Boutique Collection", "editorial"], ["Beach House", "breezy"], ["Estate & Events", "formal"]].map(([name, vibe]) => (
                <button key={name} onClick={() => toast("ok", "Template applied", `${name} — your content is preserved, layout resets.`)} className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-left text-[11.5px] font-bold text-ink transition-colors hover:border-brand">
                  <span className="h-8 w-12 rounded bg-gradient-to-br from-brand-soft to-sea-soft" /> {name} <span className="ml-auto text-[9px] font-semibold uppercase text-faint">{vibe}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "collections" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-bold text-ink">{c.name}</p>
                {c.featured && <Badge tone="warn">featured</Badge>}
              </div>
              <p className="mt-0.5 font-mono text-[10.5px] text-mute">/{c.slug} · {c.rule}</p>
              <div className="mt-2.5 flex gap-1.5">
                {c.itemIds.map((id) => (
                  <span key={id} className="h-10 w-14 overflow-hidden rounded-md border border-line"><img src={propertyById(id).image} alt={propertyById(id).name} className="h-full w-full object-cover" loading="lazy" /></span>
                ))}
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <Btn size="xs" icon="external" onClick={() => toast("info", "Opening landing page", `/${c.slug}`)}>Open page</Btn>
                <Btn size="xs" variant="ghost" icon="pencil" onClick={() => toast("info", "Edit collection", c.rule.startsWith("Rule") ? "Rule-based — edits change the query, not the list." : "Manual — drag listings in or out.")}>Edit</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "analytics" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
              <button onClick={() => setMetric("traffic")} className={cx("rounded-md px-3 py-1.5 text-[12px] font-bold", metric === "traffic" ? "bg-pine-900 text-white" : "text-mute")}>Traffic</button>
              <button onClick={() => setMetric("bookings")} className={cx("rounded-md px-3 py-1.5 text-[12px] font-bold", metric === "bookings" ? "bg-pine-900 text-white" : "text-mute")}>Bookings</button>
            </div>
            <Select defaultValue="30" className="!w-[130px]" aria-label="Analytics window"><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select>
            <Btn className="ml-auto" icon="download" onClick={() => { download("website-analytics.csv", toCSV([["Day", "Views", "Visitors", "Bookings", "Revenue EUR"], ...website.analytics.map((a) => [a.day, a.views, a.visitors, a.bookings, a.revenue / 100])])); toast("ok", "Exported"); }}>CSV</Btn>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metric === "traffic" ? (
              <>
                <MetricCard label="Page views" value={String(website.analytics.reduce((s, a) => s + a.views, 0))} series={website.analytics.map((a) => a.views)} />
                <MetricCard label="Unique visitors" value={String(website.analytics.reduce((s, a) => s + a.visitors, 0))} series={website.analytics.map((a) => a.visitors)} color="#2F6E8C" />
                <MetricCard label="Avg. time on site" value="2m 41s" series={website.analytics.map((a) => a.views / 40)} color="#A63DBF" />
                <MetricCard label="Top page" value="/villas" series={website.analytics.map((a) => a.visitors / 2)} color="#C07F14" />
              </>
            ) : (
              <>
                <MetricCard label="Bookings" value={String(website.analytics.reduce((s, a) => s + a.bookings, 0))} series={website.analytics.map((a) => a.bookings)} />
                <MetricCard label="Revenue" value={money(website.analytics.reduce((s, a) => s + a.revenue, 0), "EUR")} series={website.analytics.map((a) => a.revenue)} color="#C07F14" />
                <MetricCard label="Conversion" value="2.4%" series={website.analytics.map((a) => a.bookings * 3 + 1)} color="#A63DBF" />
                <MetricCard label="Avg. booking value" value={money(524_00, "EUR")} series={website.analytics.map((a) => a.revenue / 40 + 20)} color="#2F6E8C" />
              </>
            )}
          </div>
        </div>
      )}

      {tab === "embed" && <Embeds />}

      {tab === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Business details</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business name"><Input defaultValue="Sanggraha Villas" /></Field>
              <Field label="Tagline"><Input defaultValue="Boutique Bali, run properly." /></Field>
            </div>
            <Field label="Description"><Input defaultValue="A collection of nine staffed villas across Bali's best coastlines." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo"><div className="flex h-9 items-center rounded-md border border-dashed border-line2 px-3 text-[11px] font-bold text-mute"><Ic name="image" size={13} className="mr-2" /> sanggraha-logo.svg</div></Field>
              <Field label="Favicon"><div className="flex h-9 items-center rounded-md border border-dashed border-line2 px-3 text-[11px] font-bold text-mute"><Ic name="image" size={13} className="mr-2" /> favicon.ico</div></Field>
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Contact & SEO</h3>
            <Field label="Contact email"><Input defaultValue="stay@sanggraha.co" /></Field>
            <Field label="Default SEO title"><Input defaultValue="Sanggraha Villas — Staffed boutique villas in Bali" /></Field>
            <Field label="Domain">
              <div className="flex gap-2">
                <Input defaultValue={website.customDomain ?? ""} className="font-mono !text-[12px]" />
                <Btn size="sm" onClick={() => toast("info", "DNS check queued", "Looking for CNAME → sites.trellis.site …")}>Verify DNS</Btn>
              </div>
            </Field>
            <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">TLS certificates issue automatically once DNS verifies — usually under 10 minutes.</p>
          </div>
          <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
            <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Listings & services on this site</h3>
            <div className="flex flex-wrap gap-2">
              {PROPERTIES.filter((p) => !p.archived).map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-1 pr-2.5 text-[11px] font-bold text-ink">
                  <span className="h-5 w-7 overflow-hidden rounded-full"><img src={p.image} alt="" className="h-full w-full object-cover" /></span>
                  {p.name} <span className="rounded bg-brand-soft px-1 text-[8.5px] font-bold text-brand-deep">oceanfront</span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-mute">Per-item tags drive the rule-based collections and the search widget's location filter.</p>
          </div>
        </div>
      )}

      {/* Block library */}
      <Modal open={libOpen} onClose={() => setLibOpen(false)} title="Block library" w={560}>
        <div className="space-y-4">
          {BLOCK_LIB.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">{g.group}</p>
              <div className="grid grid-cols-3 gap-2">
                {g.items.map((it) => (
                  <button key={it.type} onClick={() => { addBlock(page.id, it.type); setLibOpen(false); toast("ok", `${it.label} block added`, "Appears at the bottom — use the block menu to move it."); }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-line p-3 transition-all hover:border-brand hover:bg-brand-soft/40">
                    <Ic name={it.icon} size={18} className="text-mute" />
                    <span className="text-[11px] font-bold text-ink">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Page settings */}
      <Modal open={pageSettings} onClose={() => setPageSettings(false)} title={`Page settings — ${page.name}`} w={460}
        footer={<><Btn variant="ghost" onClick={() => setPageSettings(false)}>Cancel</Btn><Btn variant="solid" onClick={() => { setPageSettings(false); toast("ok", "Page settings saved"); }}>Save</Btn></>}>
        <div className="space-y-3">
          <Field label="Slug"><Input defaultValue={page.slug} className="font-mono" /></Field>
          <Field label="SEO title"><Input defaultValue={`${page.name} — Sanggraha Villas`} /></Field>
          <Field label="SEO description"><Input defaultValue="Hand-run boutique villas across Bali with butlers, chefs and honest pricing." /></Field>
          <Field label="Social image"><div className="h-20 rounded-md border border-dashed border-line2 bg-paper" /></Field>
          <label className="flex items-center gap-2 text-[12px] font-bold"><Toggle checked label="Visible in navigation" onChange={() => undefined} /> Visible in navigation</label>
        </div>
      </Modal>
    </div>
  );
}

function BlockRow({ b, idx, total, menuOpen, onMenu, onMove, onRemove, onDuplicate }: {
  b: Block; idx: number; total: number; menuOpen: boolean;
  onMenu: () => void; onMove: (d: "up" | "down") => void; onRemove: () => void; onDuplicate: () => void;
}) {
  return (
    <div className={cx("group relative rounded-lg border transition-all", menuOpen ? "drag-over-block border-brand" : "border-line hover:border-line2")}>
      {/* Mini preview */}
      <BlockPreview type={b.type} />
      <div className="flex items-center gap-1.5 border-t border-line bg-paper/70 px-2.5 py-1.5">
        <Ic name="grip" size={12} className="cursor-grab text-line2" />
        <span className="text-[11.5px] font-bold text-ink">{BLOCK_LABEL[b.type] ?? b.type}</span>
        {b.cols && <Badge tone="info">{b.cols.length} columns</Badge>}
        <span className="ml-auto flex items-center gap-0.5">
          <button aria-label="Move block up" title="Move up" disabled={idx === 0} onClick={() => onMove("up")} className="rounded p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"><Ic name="chevU" size={13} /></button>
          <button aria-label="Move block down" title="Move down" disabled={idx === total - 1} onClick={() => onMove("down")} className="rounded p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"><Ic name="chevD" size={13} /></button>
          <button aria-label="Block options" title="Options" onClick={onMenu} className="rounded p-1 text-mute hover:bg-black/5 hover:text-ink"><Ic name="more" size={13} /></button>
        </span>
      </div>
      {menuOpen && (
        <div className="anim-pop absolute right-2 top-9 z-30 w-[180px] rounded-lg border border-line bg-card p-1 shadow-xl">
          {[
            { label: "Move up", icon: "chevU" as IconName, fn: () => onMove("up"), dis: idx === 0 },
            { label: "Move down", icon: "chevD" as IconName, fn: () => onMove("down"), dis: idx === total - 1 },
            { label: "Move into column", icon: "kanban" as IconName, fn: onDuplicate, dis: false },
            { label: "Duplicate", icon: "copy" as IconName, fn: onDuplicate, dis: false },
            { label: "Remove", icon: "trash" as IconName, fn: onRemove, dis: false, danger: true },
          ].map((m) => (
            <button key={m.label} disabled={m.dis} onClick={() => { m.fn(); onMenu(); }} className={cx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] font-bold disabled:opacity-30", m.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-paper")}>
              <Ic name={m.icon} size={12} /> {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockPreview({ type }: { type: string }) {
  const img = PROPERTIES[0].image;
  switch (type) {
    case "hero": return <div className="relative h-24 overflow-hidden rounded-t-lg"><img src={img} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-pine-950/70 to-transparent" /><p className="absolute bottom-2 left-3 font-display text-[15px] font-bold text-white">Boutique Bali, run properly.</p></div>;
    case "search_bar": return <div className="p-3"><div className="flex gap-1.5 rounded-lg border border-line2 bg-white p-1.5"><span className="flex-1 rounded bg-paper px-2 py-1.5 text-[10px] font-bold text-faint">Dates</span><span className="flex-1 rounded bg-paper px-2 py-1.5 text-[10px] font-bold text-faint">Guests</span><span className="rounded bg-brand px-3 py-1.5 text-[10px] font-bold text-white">Search</span></div></div>;
    case "collection_grid": case "offerings_grid": return <div className="grid grid-cols-3 gap-1.5 p-3">{[0, 1, 2].map((i) => <img key={i} src={PROPERTIES[i].image} alt="" className="h-14 w-full rounded object-cover" />)}</div>;
    case "collection_list": return <div className="space-y-1.5 p-3">{[0, 1].map((i) => <div key={i} className="flex items-center gap-2"><img src={PROPERTIES[i].image} alt="" className="h-10 w-16 rounded object-cover" /><div className="flex-1"><div className="h-2 w-2/3 rounded bg-line" /><div className="mt-1 h-2 w-1/3 rounded bg-line" /></div></div>)}</div>;
    case "guest_reviews": return <div className="p-3"><p className="text-[10px] font-bold text-gold">★★★★★</p><p className="mt-0.5 text-[10.5px] italic text-mute">"Absolutely flawless — Kadek thought of everything."</p><p className="mt-0.5 text-[9px] font-bold text-faint">Yuki · Villa Anggrek</p></div>;
    case "faq": return <div className="space-y-1 p-3">{["Check-in times?", "Is the pool heated?", "Airport transfers?"].map((q) => <div key={q} className="flex items-center justify-between rounded bg-paper px-2 py-1.5 text-[10px] font-bold text-ink">{q}<Ic name="chevD" size={10} /></div>)}</div>;
    case "cta_banner": return <div className="m-3 flex items-center justify-between rounded-lg bg-pine-900 px-3 py-2.5"><p className="text-[11px] font-bold text-white">Direct bookings save ~15% — always.</p><span className="rounded bg-brand px-2 py-1 text-[9px] font-bold text-white">Book direct</span></div>;
    case "contact_form": return <div className="space-y-1.5 p-3"><div className="h-6 rounded border border-line2 bg-white" /><div className="h-10 rounded border border-line2 bg-white" /><div className="h-6 w-24 rounded bg-brand" /></div>;
    case "icon_highlights": return <div className="flex justify-around p-3">{["Butlers", "Chefs", "Drivers", "Daily spa"].map((x) => <div key={x} className="text-center"><span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-brand-deep"><Ic name="sparkle" size={12} /></span><p className="text-[9px] font-bold text-ink">{x}</p></div>)}</div>;
    case "featured_offering": return <div className="flex gap-2 p-3"><img src={PROPERTIES[3].image} alt="" className="h-16 w-24 rounded object-cover" /><div><p className="text-[11px] font-bold">Sunset Catamaran · 4h</p><p className="text-[9px] text-mute">Up to 12 guests · crew + snacks</p><p className="mt-1 font-mono text-[11px] font-bold text-brand-deep">Rp 2.8M</p></div></div>;
    case "gallery": return <div className="grid grid-cols-4 gap-1 p-3">{[0, 1, 2, 3].map((i) => <img key={i} src={PROPERTIES[i % 4].image} alt="" className="h-12 w-full rounded object-cover" />)}</div>;
    case "table": return <div className="p-3"><div className="rounded border border-line2 text-[9px] font-bold"><div className="flex border-b border-line2 bg-paper px-2 py-1"><span className="flex-1">Villa</span><span>From / night</span></div>{[["Anggrek", "Rp 4.2M"], ["Cemara", "Rp 3.6M"]].map(([a, b]) => <div key={a} className="flex px-2 py-1"><span className="flex-1">{a}</span><span className="font-mono">{b}</span></div>)}</div></div>;
    case "image": return <div className="p-3"><img src={img} alt="" className="h-20 w-full rounded object-cover" /></div>;
    default: return <div className="space-y-1.5 p-3"><div className="h-2.5 w-1/2 rounded bg-line" /><div className="h-2 w-full rounded bg-line" /><div className="h-2 w-5/6 rounded bg-line" /></div>;
  }
}

function MetricCard({ label, value, series, color = "#0E7A5F" }: { label: string; value: string; series: number[]; color?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-[20px] font-bold text-ink">{value}</p>
      <Spark points={series} color={color} w={170} h={38} />
    </div>
  );
}

function Embeds() {
  const { toast } = useApp();
  const [copied, setCopied] = useState("");
  const copy = (key: string, text: string) => { copyText(text); setCopied(key); toast("ok", "Embed code copied", "Auto-resizing iframe + safe cross-origin checkout handoff."); setTimeout(() => setCopied(""), 1500); };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Global search widget</h3>
        <p className="mb-3 text-[11.5px] text-mute">Dates + party size + location on your own site → full results page on yours. Works under strict CSP and alongside hostile CSS frameworks.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 overflow-hidden rounded-lg border border-line bg-white p-3 shadow-inner">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-faint">Live preview · yourwebsite.com</p>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line2 bg-paper p-1.5">
                <span className="rounded-md bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-ink shadow-sm">{dayKey(addDays(today(), 14))} → {dayKey(addDays(today(), 19))}</span>
                <span className="rounded-md bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-ink shadow-sm">4 guests</span>
                <span className="rounded-md bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-ink shadow-sm">Uluwatu</span>
                <span className="ml-auto rounded-md bg-brand px-3 py-1.5 text-[10.5px] font-bold text-white">Search villas</span>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-pine-950 p-3 font-mono text-[10px] leading-relaxed text-pine-100">{EMBED_SNIPPET}</pre>
            <Btn size="sm" className="mt-2" icon={copied === "s" ? "check" : "copy"} onClick={() => copy("s", EMBED_SNIPPET)}>{copied === "s" ? "Copied" : "Copy search snippet"}</Btn>
          </div>
          <div>
            <div className="mb-2 overflow-hidden rounded-lg border border-line bg-white p-3 shadow-inner">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-faint">Plain iframe fallback (restrictive builders)</p>
              <div className="rounded-lg border-2 border-dashed border-line2 p-3 text-center">
                <p className="text-[10.5px] font-bold text-mute">Villa Anggrek — availability calendar</p>
                <p className="font-mono text-[9.5px] text-faint">12 Oct → 17 Oct · 4 guests · from Rp 4.2M / night</p>
                <span className="mt-1.5 inline-block rounded bg-brand px-3 py-1 text-[10px] font-bold text-white">Book now →</span>
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-pine-950 p-3 font-mono text-[10px] leading-relaxed text-pine-100">{EMBED_IFRAME}</pre>
            <Btn size="sm" className="mt-2" icon={copied === "i" ? "check" : "copy"} onClick={() => copy("i", EMBED_IFRAME)}>{copied === "i" ? "Copied" : "Copy iframe fallback"}</Btn>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Per-property availability widgets</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {PROPERTIES.filter((p) => !p.archived && p.publishDirect).slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              <img src={p.image} alt="" className="h-8 w-11 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-ink">{p.name}</span>
              <Btn size="xs" icon="copy" onClick={() => copy(p.id, EMBED_IFRAME.replace("search", `calendar/${p.id}`))}>Embed</Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
