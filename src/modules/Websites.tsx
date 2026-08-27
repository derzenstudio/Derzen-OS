import { useState } from "react";
import { cx, money, copyText, toCSV, download, dayKey, addDays, today } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Field, Input, Modal, Select, Spark, Tabs, Toggle } from "../components/ui";
import { useApp, DEFAULT_BLOCK_STYLE } from "../store";
import { COLLECTIONS, PROPERTIES, propertyById, SERVICES } from "../lib/data";
import { embedJsSnippet, embedIframeSnippet, widgetCssVars } from "../lib/widgetTheme";
import type { Block, BlockStyle } from "../lib/types";

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

const WIDTH_CLASS: Record<BlockStyle["width"], string> = {
  full: "w-full", wide: "w-full max-w-[980px] mx-auto", mid: "w-full max-w-[760px] mx-auto", half: "w-full max-w-[520px] mx-auto",
};

export default function Websites() {
  const { website, moveBlock, moveBlockTo, addBlock, duplicateBlock, updateBlock, removeBlock, setSiteTheme, setSiteActivePage, siteChrome, setSiteChrome, toast } = useApp();
  const [tab, setTab] = useState("builder");
  const [libOpen, setLibOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageSettings, setPageSettings] = useState(false);
  const [metric, setMetric] = useState<"traffic" | "bookings">("traffic");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const page = website.pages.find((p) => p.id === website.activePageId)!;
  const sel = page.blocks.find((b) => b.id === selected) ?? null;

  const onDrop = () => {
    if (!dragId || dropAt === null) { setDragId(null); setDropAt(null); return; }
    const from = page.blocks.findIndex((b) => b.id === dragId);
    let to = dropAt;
    if (from >= 0 && from < to) to -= 1;
    moveBlockTo(page.id, dragId, to);
    setDragId(null); setDropAt(null);
    toast("ok", "Block moved", "Placement saved — publish to push it live.");
  };

  return (
    <div className="space-y-5">
      {/* Site card */}
      <div className="frame flex flex-wrap items-center gap-3 rounded-lg bg-card px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-pine-900 text-[#3fb98c]"><Ic name="globe" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">{website.subdomain}
            {website.published ? <Dot tone="ok" label="published" /> : <Dot tone="mute" label="unpublished" />}
          </p>
          <p className="text-[11px] text-mute">
            Custom domain: <code className="font-mono">{website.customDomain}</code> · {website.domainStatus === "verified" ? <Dot tone="ok" label="DNS verified · TLS auto" /> : <Dot tone="warn" label="DNS pending — add CNAME to derzen.site" />}
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-bold text-ink">Publish <Toggle checked={website.published} onChange={(v) => toast(v ? "ok" : "warn", v ? "Site published" : "Site unpublished", v ? "TLS issued automatically." : "Embeds and links show a maintenance notice.")} label="Publish site" /></label>
        <Btn size="sm" icon="copy" onClick={() => toast("ok", "Site duplicated", "sanggraha-copy.derzen.site")}>Duplicate</Btn>
        <Btn size="sm" variant="ghost" icon="trash" onClick={() => toast("warn", "Delete requires typing the site name", "Protection against accidental loss.")}>Delete</Btn>
      </div>

      <Tabs tabs={[{ id: "builder", label: "Page builder" }, { id: "collections", label: "Collections" }, { id: "analytics", label: "Analytics" }, { id: "embed", label: "Embeddable widgets" }, { id: "settings", label: "Website settings" }]} active={tab} onChange={setTab} />

      {tab === "builder" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_1fr_280px]">
          {/* Pages + chrome */}
          <div className="space-y-2.5">
            {website.pages.map((p) => (
              <button key={p.id} onClick={() => { setSiteActivePage(p.id); setSelected(null); }} className={cx("flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left text-[12px] font-bold", p.id === page.id ? "border-brand bg-brand-soft/60 text-brand-deep" : "border-line bg-card text-mute hover:text-ink")}>
                <Ic name={p.home ? "home" : "doc"} size={13} />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-mono text-[9.5px] text-faint">{p.slug}</span>
                {p.home && <Ic name="lock" size={10} aria-label="Protected home page" />}
              </button>
            ))}
            <button className="flex w-full items-center gap-2 rounded-sm border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => toast("info", "New page or folder", "Per-page slug, SEO title/description, social image, visibility.")}><Ic name="plus" size={13} /> Page / folder</button>
            <button className="flex w-full items-center gap-2 rounded-sm border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => setPageSettings(true)}><Ic name="gear" size={13} /> Page settings</button>
            <div className="rounded-sm border border-line bg-card p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Global header & footer</p>
              <Field label="Header">
                <Input value={siteChrome.header} onChange={(e) => setSiteChrome({ header: e.target.value })} className="!text-[11px]" />
              </Field>
              <Field label="Footer">
                <Input value={siteChrome.footer} onChange={(e) => setSiteChrome({ footer: e.target.value })} className="!text-[11px]" />
              </Field>
              <p className="mt-1 text-[10px] text-faint">Rendered on every page. Edit once, appears everywhere.</p>
            </div>
          </div>

          {/* Canvas */}
          <div className="rounded-lg border border-line bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-[14px] font-bold text-ink">Page: {page.name} <span className="font-mono text-[10px] font-semibold text-faint">{page.slug}</span></p>
              <div className="flex gap-1.5">
                <Btn size="xs" icon="plus" onClick={() => setLibOpen(true)}>Add block</Btn>
                <Btn size="xs" variant="solid" icon="eye" onClick={() => setPreviewOpen(true)}>Preview</Btn>
              </div>
            </div>

            {/* Header strip */}
            <div className="mb-2 rounded-sm bg-pine-900 px-4 py-2.5">
              <p className="text-[11px] font-bold tracking-wide text-white/85">{siteChrome.header}</p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="space-y-0"
            >
              {page.blocks.map((b, idx) => (
                <div key={b.id} onDragOver={(e) => { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropAt(e.clientY < r.top + r.height / 2 ? idx : idx + 1); }}>
                  <div className={cx("h-1 rounded-full transition-all", dropAt === idx && dragId ? "my-1 bg-brand" : "bg-transparent")} aria-hidden="true" />
                  <BlockCard
                    b={b} idx={idx} total={page.blocks.length}
                    selected={selected === b.id}
                    dragging={dragId === b.id}
                    onSelect={() => setSelected(selected === b.id ? null : b.id)}
                    onDragStart={() => setDragId(b.id)}
                    onDragEnd={() => { setDragId(null); setDropAt(null); }}
                    onMove={(dir) => moveBlock(page.id, b.id, dir)}
                    onDuplicate={() => { duplicateBlock(page.id, b.id); toast("ok", "Block duplicated", BLOCK_LABEL[b.type]); }}
                    onRemove={() => { if (page.home && b.type === "hero") { toast("warn", "Home hero is protected", "Every page needs a first impression."); return; } removeBlock(page.id, b.id); if (selected === b.id) setSelected(null); }}
                  />
                </div>
              ))}
              <div className={cx("h-1 rounded-full transition-all", dropAt === page.blocks.length && dragId ? "my-1 bg-brand" : "bg-transparent")} aria-hidden="true" />
              {/* Trailing drop zone */}
              <button
                onDragOver={(e) => { e.preventDefault(); setDropAt(page.blocks.length); }}
                onClick={() => setLibOpen(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line2 py-4 text-[12px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep"
              >
                <Ic name="plus" size={14} /> Drop a block here, or click to browse the library
              </button>
            </div>
            <p className="mt-3 rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
              <b className="text-ink">Drag the handle</b> to reorder — or use the keyboard arrows in the block toolbar. Click a block to open its
              <b className="text-ink"> style panel</b>: width, padding, margins (zero or negative for flush stacking), background, text colour, type scale, alignment and corner radius.
            </p>
          </div>

          {/* Style panel */}
          <div className="space-y-3">
            {sel ? (
              <BlockStylePanel key={sel.id} b={sel} onChange={(patch) => updateBlock(page.id, sel.id, { style: { ...DEFAULT_BLOCK_STYLE, ...sel.style, ...patch } })} />
            ) : (
              <div className="rounded-lg border border-line bg-card p-4">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Site theme</p>
                <Field label="Palette">
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Palm & Sand", "Ocean Light", "Volcanic"].map((p) => (
                      <button key={p} onClick={() => setSiteTheme({ palette: p })} className={cx("rounded-sm border px-2 py-1.5 text-[10px] font-bold", website.theme.palette === p ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{p}</button>
                    ))}
                  </div>
                </Field>
                <Field label="Typography">
                  <Select value={website.theme.font} onChange={(e) => setSiteTheme({ font: e.target.value })}>
                    {["Big Shoulders / Schibsted", "Fraunces / Public Sans", "Space Grotesk / Source Sans"].map((f) => <option key={f}>{f}</option>)}
                  </Select>
                </Field>
                <Field label={`Corner radius · ${website.theme.radius}px`}>
                  <input type="range" min={0} max={20} value={website.theme.radius} onChange={(e) => setSiteTheme({ radius: Number(e.target.value) })} className="w-full" aria-label="Corner radius" />
                </Field>
                <p className="mt-2 rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">Select any block on the canvas to edit its individual layout, spacing and styling.</p>
              </div>
            )}
            <div className="rounded-lg border border-line bg-card p-4">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Starter templates</p>
              {[["Boutique Collection", "editorial"], ["Beach House", "breezy"], ["Estate & Events", "formal"]].map(([name, vibe]) => (
                <button key={name} onClick={() => toast("ok", "Template applied", `${name} — your content is preserved, layout resets.`)} className="mb-1.5 flex w-full items-center gap-2 rounded-sm border border-line px-2.5 py-2 text-left text-[11.5px] font-bold text-ink transition-colors hover:border-brand">
                  <span className="h-8 w-12 rounded-sm bg-gradient-to-br from-brand-soft to-sea-soft" /> {name} <span className="ml-auto text-[9px] font-semibold uppercase text-faint">{vibe}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "collections" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-bold text-ink">{c.name}</p>
                {c.featured && <Badge tone="warn">featured</Badge>}
              </div>
              <p className="mt-0.5 font-mono text-[10.5px] text-mute">/{c.slug} · {c.rule}</p>
              <div className="mt-2.5 flex gap-1.5">
                {c.itemIds.map((id) => (
                  <span key={id} className="h-10 w-14 overflow-hidden rounded-sm border border-line"><img src={propertyById(id).image} alt={propertyById(id).name} className="h-full w-full object-cover" loading="lazy" /></span>
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-sm border border-line bg-card p-0.5">
              <button onClick={() => setMetric("traffic")} className={cx("rounded-sm px-3 py-1.5 text-[12px] font-bold", metric === "traffic" ? "bg-pine-900 text-white" : "text-mute")}>Traffic</button>
              <button onClick={() => setMetric("bookings")} className={cx("rounded-sm px-3 py-1.5 text-[12px] font-bold", metric === "bookings" ? "bg-pine-900 text-white" : "text-mute")}>Bookings</button>
            </div>
            <Select defaultValue="30" className="!w-[130px]" aria-label="Analytics window"><option value="30">Last 30 days</option><option value="90">Last 90 days</option></Select>
            <Btn className="ml-auto" icon="download" onClick={() => { download("website-analytics.csv", toCSV([["Day", "Views", "Visitors", "Bookings", "Revenue EUR"], ...website.analytics.map((a) => [a.day, a.views, a.visitors, a.bookings, a.revenue / 100])])); toast("ok", "Exported"); }}>CSV</Btn>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metric === "traffic" ? (
              <>
                <MetricCard label="Page views" value={String(website.analytics.reduce((s, a) => s + a.views, 0))} series={website.analytics.map((a) => a.views)} />
                <MetricCard label="Unique visitors" value={String(website.analytics.reduce((s, a) => s + a.visitors, 0))} series={website.analytics.map((a) => a.visitors)} color="#38708A" />
                <MetricCard label="Avg. time on site" value="2m 41s" series={website.analytics.map((a) => a.views / 40)} color="#38708A" />
                <MetricCard label="Top page" value="/villas" series={website.analytics.map((a) => a.visitors / 2)} color="#9A6A0B" />
              </>
            ) : (
              <>
                <MetricCard label="Bookings" value={String(website.analytics.reduce((s, a) => s + a.bookings, 0))} series={website.analytics.map((a) => a.bookings)} />
                <MetricCard label="Revenue" value={money(website.analytics.reduce((s, a) => s + a.revenue, 0), "EUR")} series={website.analytics.map((a) => a.revenue)} color="#9A6A0B" />
                <MetricCard label="Conversion" value="2.4%" series={website.analytics.map((a) => a.bookings * 3 + 1)} color="#38708A" />
                <MetricCard label="Avg. booking value" value={money(524_00, "EUR")} series={website.analytics.map((a) => a.revenue / 40 + 20)} color="#38708A" />
              </>
            )}
          </div>
        </div>
      )}

      {tab === "embed" && <Embeds />}

      {tab === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Business details</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business name"><Input defaultValue="Sanggraha Villas" /></Field>
              <Field label="Tagline"><Input defaultValue="Boutique Bali, run properly." /></Field>
            </div>
            <Field label="Description"><Input defaultValue="A collection of nine staffed villas across Bali's best coastlines." /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo"><div className="flex h-9 items-center rounded-sm border border-dashed border-line2 px-3 text-[11px] font-bold text-mute"><Ic name="image" size={13} className="mr-2" /> sanggraha-logo.svg</div></Field>
              <Field label="Favicon"><div className="flex h-9 items-center rounded-sm border border-dashed border-line2 px-3 text-[11px] font-bold text-mute"><Ic name="image" size={13} className="mr-2" /> favicon.ico</div></Field>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-line bg-card p-4">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Contact & SEO</h3>
            <Field label="Contact email"><Input defaultValue="stay@sanggraha.co" /></Field>
            <Field label="Default SEO title"><Input defaultValue="Sanggraha Villas — Staffed boutique villas in Bali" /></Field>
            <Field label="Domain">
              <div className="flex gap-2">
                <Input defaultValue={website.customDomain ?? ""} className="font-mono !text-[12px]" />
                <Btn size="sm" onClick={() => toast("info", "DNS check queued", "Looking for CNAME → sites.derzen.site …")}>Verify DNS</Btn>
              </div>
            </Field>
            <p className="rounded-sm bg-paper px-3 py-2 text-[11px] text-mute">TLS certificates issue automatically once DNS verifies — usually under 10 minutes.</p>
          </div>
          <div className="rounded-lg border border-line bg-card p-4 lg:col-span-2">
            <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Listings & services on this site</h3>
            <div className="flex flex-wrap gap-2">
              {PROPERTIES.filter((p) => !p.archived).map((p) => (
                <span key={p.id} className="flex items-center gap-1.5 rounded-full border border-line bg-paper py-1 pl-1 pr-2.5 text-[11px] font-bold text-ink">
                  <span className="h-5 w-7 overflow-hidden rounded-full"><img src={p.image} alt="" className="h-full w-full object-cover" /></span>
                  {p.name} <span className="rounded-sm bg-brand-soft px-1 text-[8.5px] font-bold text-brand-deep">oceanfront</span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-mute">Per-item tags drive the rule-based collections and the search widget's location filter.</p>
          </div>
        </div>
      )}

      {/* Block library */}
      <Modal open={libOpen} onClose={() => setLibOpen(false)} title="Block library" w={580}
        footer={<Btn variant="ghost" onClick={() => setLibOpen(false)}>Close</Btn>}>
        <div className="space-y-4">
          {sel && <p className="rounded-sm bg-brand-soft/60 px-3 py-2 text-[11px] font-bold text-brand-deep">Inserting after “{BLOCK_LABEL[sel.type]}” — the new block lands right below your selection.</p>}
          {BLOCK_LIB.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">{g.group}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {g.items.map((it) => (
                  <button key={it.type} onClick={() => { addBlock(page.id, it.type, sel?.id ?? null); setLibOpen(false); toast("ok", `${it.label} block added`, sel ? "Inserted after your selection." : "Added — drag it into place."); }}
                    className="flex flex-col items-center gap-1.5 rounded-sm border border-line p-3 transition-all hover:border-brand hover:bg-brand-soft/40">
                    <Ic name={it.icon} size={18} className="text-mute" />
                    <span className="text-[11px] font-bold text-ink">{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Real preview */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title={`Live preview — ${website.subdomain}/${page.slug}`} w={980}
        footer={<><Btn variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Btn><Btn variant="solid" icon="external" onClick={() => toast("ok", "Opening published site", `https://${website.subdomain}/${page.slug}`)}>Open guest view</Btn></>}>
        <div className="max-h-[70vh] overflow-y-auto rounded-sm border border-line bg-[#f4f5f0]">
          <div className="sticky top-0 z-10 bg-pine-900 px-6 py-3">
            <p className="text-[12px] font-bold tracking-wide text-white/85">{siteChrome.header}</p>
          </div>
          <div className="min-h-[300px] py-2">
            {page.blocks.map((b) => <BlockView key={b.id} b={b} />)}
            {page.blocks.length === 0 && <p className="p-10 text-center text-[12px] font-bold text-mute">Empty page — add blocks to see them here.</p>}
          </div>
          <div className="bg-pine-950 px-6 py-4">
            <p className="text-[10.5px] text-white/55">{siteChrome.footer}</p>
          </div>
        </div>
      </Modal>

      {/* Page settings */}
      <Modal open={pageSettings} onClose={() => setPageSettings(false)} title={`Page settings — ${page.name}`} w={460}
        footer={<><Btn variant="ghost" onClick={() => setPageSettings(false)}>Cancel</Btn><Btn variant="solid" onClick={() => { setPageSettings(false); toast("ok", "Page settings saved"); }}>Save</Btn></>}>
        <div className="space-y-3">
          <Field label="Slug"><Input defaultValue={page.slug} className="font-mono" /></Field>
          <Field label="SEO title"><Input defaultValue={`${page.name} — Sanggraha Villas`} /></Field>
          <Field label="SEO description"><Input defaultValue="Hand-run boutique villas across Bali with butlers, chefs and honest pricing." /></Field>
          <Field label="Social image"><div className="h-20 rounded-sm border border-dashed border-line2 bg-paper" /></Field>
          <label className="flex items-center gap-2 text-[12px] font-bold"><Toggle checked label="Visible in navigation" onChange={() => undefined} /> Visible in navigation</label>
        </div>
      </Modal>
    </div>
  );
}

// ── Block card (canvas chrome + drag) ─────────────────────────────────────
function BlockCard({ b, idx, total, selected, dragging, onSelect, onDragStart, onDragEnd, onMove, onDuplicate, onRemove }: {
  b: Block; idx: number; total: number; selected: boolean; dragging: boolean;
  onSelect: () => void; onDragStart: () => void; onDragEnd: () => void;
  onMove: (d: "up" | "down") => void; onDuplicate: () => void; onRemove: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cx(
        "group relative cursor-pointer rounded-sm border transition-all",
        selected ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-line hover:border-line2",
        dragging && "opacity-40",
      )}
      aria-label={`Block: ${BLOCK_LABEL[b.type] ?? b.type}${selected ? " (selected)" : ""}`}
    >
      <BlockView b={b} />
      <div className="flex items-center gap-1.5 border-t border-line bg-paper/80 px-2.5 py-1.5">
        <button
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
          onDragEnd={onDragEnd}
          aria-label={`Drag to move ${BLOCK_LABEL[b.type] ?? b.type}`}
          className="cursor-grab rounded-sm p-0.5 text-line2 transition-colors hover:text-brand active:cursor-grabbing"
        >
          <Ic name="grip" size={13} />
        </button>
        <span className="text-[11.5px] font-bold text-ink">{BLOCK_LABEL[b.type] ?? b.type}</span>
        {b.style && (b.style.mt !== 0 || b.style.mb !== 0 || b.style.bg) && <Badge tone="info">styled</Badge>}
        <span className="ml-auto flex items-center gap-0.5">
          <button aria-label="Move block up" title="Move up" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); onMove("up"); }} className="rounded-sm p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"><Ic name="chevU" size={13} /></button>
          <button aria-label="Move block down" title="Move down" disabled={idx === total - 1} onClick={(e) => { e.stopPropagation(); onMove("down"); }} className="rounded-sm p-1 text-mute hover:bg-black/5 hover:text-ink disabled:opacity-30"><Ic name="chevD" size={13} /></button>
          <button aria-label="Duplicate block" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="rounded-sm p-1 text-mute hover:bg-black/5 hover:text-ink"><Ic name="copy" size={13} /></button>
          <button aria-label="Edit block style" title="Style" onClick={(e) => { e.stopPropagation(); onSelect(); }} className={cx("rounded-sm p-1 hover:bg-black/5", selected ? "text-brand" : "text-mute hover:text-ink")}><Ic name="pencil" size={13} /></button>
          <button aria-label="Remove block" title="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="rounded-sm p-1 text-mute hover:bg-danger-soft hover:text-danger"><Ic name="trash" size={13} /></button>
        </span>
      </div>
    </div>
  );
}

// ── Styled block renderer (canvas + preview share this) ───────────────────
function BlockView({ b }: { b: Block }) {
  const s: BlockStyle = { ...DEFAULT_BLOCK_STYLE, ...b.style };
  const inner = (() => {
    const img = PROPERTIES[0].image;
    switch (b.type) {
      case "hero": return <div className="relative overflow-hidden" style={{ borderRadius: s.radius }}><img src={img} alt="" className="h-44 w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-pine-950/75 to-transparent" /><p className="absolute bottom-3 left-4 font-display text-[22px] font-bold text-white">Boutique Bali, run properly.</p><p className="absolute bottom-3 right-4 hidden rounded-sm bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink sm:block">From Rp 3.6M / night</p></div>;
      case "search_bar": return <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-line2 bg-white p-1.5" style={{ borderRadius: s.radius }}><span className="flex-1 rounded-sm bg-paper px-2 py-1.5 text-[10px] font-bold text-faint">Dates</span><span className="flex-1 rounded-sm bg-paper px-2 py-1.5 text-[10px] font-bold text-faint">Guests</span><span className="rounded-sm bg-brand px-3 py-1.5 text-[10px] font-bold text-white" style={{ borderRadius: s.radius }}>Search</span></div>;
      case "collection_grid": case "offerings_grid": return <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{[0, 1, 2].map((i) => <img key={i} src={PROPERTIES[i].image} alt={PROPERTIES[i].name} className="h-20 w-full rounded-sm object-cover" style={{ borderRadius: s.radius }} />)}</div>;
      case "collection_list": return <div className="space-y-1.5">{[0, 1].map((i) => <div key={i} className="flex items-center gap-2.5"><img src={PROPERTIES[i].image} alt={PROPERTIES[i].name} className="h-12 w-20 rounded-sm object-cover" style={{ borderRadius: s.radius }} /><div className="flex-1"><p className="text-[12px] font-bold text-ink">{PROPERTIES[i].name}</p><p className="text-[10px] text-mute">{PROPERTIES[i].city} · {PROPERTIES[i].maxGuests} guests</p></div><span className="font-mono text-[11px] font-bold text-brand-deep">{money(PROPERTIES[i].pricing.plans[0].nightly, "IDR", { compact: true })}</span></div>)}</div>;
      case "guest_reviews": return <div><p className="text-[12px] font-bold text-gold">★★★★★</p><p className="mt-0.5 text-[12px] italic text-ink/80">“Absolutely flawless — Kadek thought of everything.”</p><p className="mt-0.5 text-[10px] font-bold text-faint">Yuki · Villa Anggrek</p></div>;
      case "faq": return <div className="space-y-1">{["Check-in times?", "Is the pool heated?", "Airport transfers?"].map((q) => <div key={q} className="flex items-center justify-between rounded-sm bg-paper px-2.5 py-2 text-[11px] font-bold text-ink" style={{ borderRadius: s.radius }}>{q}<Ic name="chevD" size={10} /></div>)}</div>;
      case "cta_banner": return <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-pine-900 px-4 py-3" style={{ borderRadius: s.radius }}><p className="text-[12.5px] font-bold text-white">Direct bookings save ~15% — always.</p><span className="rounded-sm bg-brand px-3 py-1.5 text-[10.5px] font-bold text-white" style={{ borderRadius: s.radius }}>Book direct</span></div>;
      case "contact_form": return <div className="space-y-1.5"><div className="h-7 rounded-sm border border-line2 bg-white" style={{ borderRadius: s.radius }} /><div className="h-14 rounded-sm border border-line2 bg-white" style={{ borderRadius: s.radius }} /><div className="h-7 w-28 rounded-sm bg-brand" style={{ borderRadius: s.radius }} /></div>;
      case "icon_highlights": return <div className="flex flex-wrap justify-around gap-2">{["Butlers", "Chefs", "Drivers", "Daily spa"].map((x) => <div key={x} className="text-center"><span className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand-deep"><Ic name="sparkle" size={13} /></span><p className="text-[10px] font-bold text-ink">{x}</p></div>)}</div>;
      case "featured_offering": return <div className="flex gap-3"><img src={SERVICES[0].image} alt="" className="h-20 w-28 rounded-sm object-cover" style={{ borderRadius: s.radius }} /><div><p className="text-[12.5px] font-bold text-ink">{SERVICES[0].name}</p><p className="text-[10px] text-mute">Up to {SERVICES[0].capacity} guests · {SERVICES[0].durationMin} min</p><p className="mt-1 font-mono text-[12px] font-bold text-brand-deep">{money(SERVICES[0].price, SERVICES[0].currency)}</p></div></div>;
      case "gallery": return <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <img key={i} src={PROPERTIES[i % 4].image} alt="" className="h-16 w-full rounded-sm object-cover" style={{ borderRadius: s.radius }} />)}</div>;
      case "table": return <div className="rounded-sm border border-line2 text-[10.5px] font-bold" style={{ borderRadius: s.radius }}><div className="flex border-b border-line2 bg-paper px-2.5 py-1.5"><span className="flex-1">Villa</span><span>From / night</span></div>{[["Anggrek", "Rp 4.2M"], ["Cemara", "Rp 3.6M"], ["Senja", "Rp 1.9M"]].map(([a, c]) => <div key={a} className="flex px-2.5 py-1.5"><span className="flex-1">{a}</span><span className="font-mono">{c}</span></div>)}</div>;
      case "image": return <img src={img} alt="" className="h-32 w-full rounded-sm object-cover" style={{ borderRadius: s.radius }} />;
      default: return <div className="space-y-1.5"><div className="h-3 w-1/2 rounded-sm bg-line" /><div className="h-2.5 w-full rounded-sm bg-line" /><div className="h-2.5 w-5/6 rounded-sm bg-line" /></div>;
    }
  })();

  return (
    <div
      className={cx(WIDTH_CLASS[s.width], "transition-all duration-200")}
      style={{
        paddingTop: s.py, paddingBottom: s.py, paddingLeft: s.px, paddingRight: s.px,
        marginTop: s.mt, marginBottom: s.mb,
        background: s.bg || undefined, color: s.color || undefined,
        fontSize: `${s.scale}em`, textAlign: s.align,
      }}
    >
      <div className={cx(!s.bg && "px-1")}>{inner}</div>
    </div>
  );
}

// ── Per-block style panel ─────────────────────────────────────────────────
function BlockStylePanel({ b, onChange }: { b: Block; onChange: (patch: Partial<BlockStyle>) => void }) {
  const s: BlockStyle = { ...DEFAULT_BLOCK_STYLE, ...b.style };
  const Slider = ({ label, k, min, max, unit }: { label: string; k: keyof BlockStyle; min: number; max: number; unit: string }) => (
    <Field label={`${label} · ${s[k]}${unit}`}>
      <input type="range" min={min} max={max} value={Number(s[k])} onChange={(e) => onChange({ [k]: Number(e.target.value) } as Partial<BlockStyle>)} className="w-full" aria-label={label} />
    </Field>
  );
  return (
    <div className="anim-pop rounded-lg border border-brand/50 bg-card p-4">
      <p className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider text-brand-deep">
        <Ic name="pencil" size={12} /> Styling — {BLOCK_LABEL[b.type] ?? b.type}
      </p>
      <Field label="Width">
        <div className="grid grid-cols-4 gap-1">
          {(["full", "wide", "mid", "half"] as const).map((w) => (
            <button key={w} onClick={() => onChange({ width: w })} className={cx("rounded-sm border px-1 py-1.5 text-[10px] font-bold capitalize", s.width === w ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{w}</button>
          ))}
        </div>
      </Field>
      <Slider label="Vertical padding" k="py" min={0} max={96} unit="px" />
      <Slider label="Horizontal padding" k="px" min={0} max={96} unit="px" />
      <Slider label="Margin top (negative pulls up)" k="mt" min={-64} max={64} unit="px" />
      <Slider label="Margin bottom" k="mb" min={-64} max={64} unit="px" />
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Background">
          <div className="flex items-center gap-1.5">
            <input type="color" value={s.bg || "#ffffff"} onChange={(e) => onChange({ bg: e.target.value })} className="h-8 w-10 cursor-pointer rounded-sm border border-line bg-card" aria-label="Block background colour" />
            <button onClick={() => onChange({ bg: "" })} className={cx("rounded-sm border px-1.5 py-1 text-[9.5px] font-bold", !s.bg ? "border-brand text-brand-deep" : "border-line text-mute")}>none</button>
          </div>
        </Field>
        <Field label="Text colour">
          <div className="flex items-center gap-1.5">
            <input type="color" value={s.color || "#141811"} onChange={(e) => onChange({ color: e.target.value })} className="h-8 w-10 cursor-pointer rounded-sm border border-line bg-card" aria-label="Block text colour" />
            <button onClick={() => onChange({ color: "" })} className={cx("rounded-sm border px-1.5 py-1 text-[9.5px] font-bold", !s.color ? "border-brand text-brand-deep" : "border-line text-mute")}>inherit</button>
          </div>
        </Field>
      </div>
      <Slider label="Type scale" k="scale" min={8} max={14} unit="/10" />
      <Slider label="Corner radius" k="radius" min={0} max={24} unit="px" />
      <Field label="Alignment">
        <div className="grid grid-cols-3 gap-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button key={a} onClick={() => onChange({ align: a })} className={cx("rounded-sm border px-1 py-1.5 text-[10px] font-bold capitalize", s.align === a ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{a}</button>
          ))}
        </div>
      </Field>
      <div className="mt-2 flex gap-2">
        <Btn size="xs" variant="ghost" icon="undo" onClick={() => onChange({ ...DEFAULT_BLOCK_STYLE })}>Reset</Btn>
        <span className="ml-auto self-center font-mono text-[9.5px] text-faint">zero margins = flush stacking</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, series, color = "#0E6B4E" }: { label: string; value: string; series: number[]; color?: string }) {
  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-[20px] font-bold text-ink">{value}</p>
      <Spark points={series} color={color} w={170} h={38} />
    </div>
  );
}

// ── Embeddable widgets ────────────────────────────────────────────────────
function Embeds() {
  const { widgetStyle: st, setWidgetStyle, toast } = useApp();
  const [copied, setCopied] = useState("");
  const [widget, setWidget] = useState<"search" | "calendar">("search");
  const [propId, setPropId] = useState(PROPERTIES[0].id);
  const copy = (key: string, text: string) => { copyText(text); setCopied(key); toast("ok", "Embed code copied", "Auto-resizing — the widget grows with its content, never clipped."); setTimeout(() => setCopied(""), 1500); };

  const ColorRow = ({ label, k }: { label: string; k: "bg" | "card" | "text" | "sub" | "accent" | "borderColor" }) => (
    <label className="flex items-center justify-between gap-2 text-[11.5px] font-bold text-ink">
      {label}
      <input type="color" value={st[k]} onChange={(e) => setWidgetStyle({ [k]: e.target.value })} className="h-7 w-12 cursor-pointer rounded-sm border border-line bg-card" aria-label={`${label} colour`} />
    </label>
  );
  const S = ({ label, k, min, max, unit }: { label: string; k: "borderW" | "radius" | "gap" | "pad" | "fontSize" | "btnRadius"; min: number; max: number; unit: string }) => (
    <Field label={`${label} · ${st[k]}${unit}`}>
      <input type="range" min={min} max={max} value={st[k]} onChange={(e) => setWidgetStyle({ [k]: Number(e.target.value) })} className="w-full" aria-label={label} />
    </Field>
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
      {/* Style editor */}
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-card p-4">
          <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-mute">Your widget's look</p>
          <div className="space-y-2">
            <ColorRow label="Background" k="bg" /><ColorRow label="Field background" k="card" />
            <ColorRow label="Text" k="text" /><ColorRow label="Secondary text" k="sub" />
            <ColorRow label="Accent / button" k="accent" /><ColorRow label="Border colour" k="borderColor" />
          </div>
          <div className="mt-3 space-y-2.5">
            <S label="Border thickness" k="borderW" min={0} max={4} unit="px" />
            <S label="Corner radius" k="radius" min={0} max={16} unit="px" />
            <S label="Gap" k="gap" min={2} max={20} unit="px" />
            <S label="Padding" k="pad" min={4} max={32} unit="px" />
            <S label="Font size" k="fontSize" min={10} max={18} unit="px" />
            <S label="Button radius" k="btnRadius" min={0} max={16} unit="px" />
          </div>
          <Field label="Button style">
            <div className="grid grid-cols-3 gap-1">
              {(["solid", "outline", "soft"] as const).map((b) => (
                <button key={b} onClick={() => setWidgetStyle({ btn: b })} className={cx("rounded-sm border px-1 py-1.5 text-[10px] font-bold capitalize", st.btn === b ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{b}</button>
              ))}
            </div>
          </Field>
          <Field label="Font CSS URL (optional)" hint="Google Fonts or any stylesheet — loaded inside the widget">
            <Input value={st.fontUrl} onChange={(e) => setWidgetStyle({ fontUrl: e.target.value })} placeholder="https://fonts.googleapis.com/css2?family=…" className="font-mono !text-[10.5px]" />
          </Field>
          <Field label="Font family (optional)">
            <Input value={st.fontFamily} onChange={(e) => setWidgetStyle({ fontFamily: e.target.value })} placeholder="Fraunces" />
          </Field>
        </div>
        <p className="rounded-lg border border-line bg-card p-3.5 text-[10.5px] leading-relaxed text-mute">
          <b className="text-ink">No clipping, ever.</b> The widget reports its own height to the host page via postMessage —
          when a date picker or calendar opens, the frame grows with it. No fixed sizes anywhere in the snippet.
        </p>
      </div>

      {/* Preview + snippets */}
      <div className="space-y-4">
        <div className="rounded-lg border border-line bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="font-display text-[13.5px] font-bold text-ink">Live preview — styled exactly as embedded</p>
            <div className="ml-auto flex items-center rounded-sm border border-line bg-paper p-0.5">
              <button onClick={() => setWidget("search")} className={cx("rounded-sm px-2.5 py-1 text-[11px] font-bold", widget === "search" ? "bg-pine-900 text-white" : "text-mute")}>Search</button>
              <button onClick={() => setWidget("calendar")} className={cx("rounded-sm px-2.5 py-1 text-[11px] font-bold", widget === "calendar" ? "bg-pine-900 text-white" : "text-mute")}>Calendar</button>
            </div>
            <Select value={propId} onChange={(e) => setPropId(e.target.value)} className="!w-[160px]" aria-label="Widget property">
              {PROPERTIES.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          {/* Host page mock — grows with content */}
          <div className="rounded-sm border-2 border-dashed border-line2 bg-[#eef0ea] p-4">
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-faint">yourwebsite.com · hostile CSS framework loaded · widget below</p>
            <div style={{ fontSize: st.fontSize, fontFamily: st.fontFamily || undefined, color: st.text, background: st.bg, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: st.pad, transition: "all .2s" }}>
              {widget === "search" ? <SearchWidgetPreview st={st} /> : <CalendarWidgetPreview st={st} propId={propId} />}
            </div>
            <p className="mt-2 text-center font-mono text-[9px] text-faint">↑ open the date picker — the frame height grew with it, nothing was cut off</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-mute"><Ic name="code" size={12} /> JavaScript embed <Badge tone="ok">recommended</Badge></p>
            <pre className="overflow-x-auto rounded-sm bg-pine-950 p-3 font-mono text-[10px] leading-relaxed text-pine-100">{embedJsSnippet(st, widget, widget === "calendar" ? propId : undefined)}</pre>
            <Btn size="sm" className="mt-2" icon={copied === "js" ? "check" : "copy"} onClick={() => copy("js", embedJsSnippet(st, widget, widget === "calendar" ? propId : undefined))}>{copied === "js" ? "Copied" : "Copy JS snippet"}</Btn>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-mute"><Ic name="kanban" size={12} /> iframe fallback <Badge tone="mute">restrictive builders</Badge></p>
            <pre className="overflow-x-auto rounded-sm bg-pine-950 p-3 font-mono text-[10px] leading-relaxed text-pine-100">{embedIframeSnippet(st, widget, widget === "calendar" ? propId : undefined)}</pre>
            <Btn size="sm" className="mt-2" icon={copied === "if" ? "check" : "copy"} onClick={() => copy("if", embedIframeSnippet(st, widget, widget === "calendar" ? propId : undefined))}>{copied === "if" ? "Copied" : "Copy iframe snippet"}</Btn>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mute">Per-property widgets — one click, your styling baked in</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {PROPERTIES.filter((p) => !p.archived && p.publishDirect).slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-sm border border-line px-3 py-2">
                <img src={p.image} alt="" className="h-8 w-11 rounded-sm object-cover" />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-bold text-ink">{p.name}</span>
                <Btn size="xs" icon="copy" onClick={() => copy(p.id, embedJsSnippet(st, "calendar", p.id))}>JS</Btn>
                <Btn size="xs" variant="ghost" icon="copy" onClick={() => copy(p.id + "i", embedIframeSnippet(st, "calendar", p.id))}>iframe</Btn>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[9.5px] text-faint">CSS variables in every snippet: {widgetCssVars(st).split(";").length} tokens · checkout handoff is cross-origin safe under strict CSP</p>
        </div>
      </div>
    </div>
  );
}

// ── Widget previews (grow with content — the whole point) ─────────────────
function SearchWidgetPreview({ st }: { st: ReturnType<typeof useApp.getState>["widgetStyle"] }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(0);
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const btnCls = st.btn === "solid" ? { background: st.accent, color: "#fff", border: "none" } : st.btn === "outline" ? { background: "transparent", color: st.accent, border: `1.5px solid ${st.accent}` } : { background: `${st.accent}1f`, color: st.accent, border: "none" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: st.gap }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: st.gap, alignItems: "center" }}>
        <button onClick={() => setOpen(!open)} style={{ flex: 1, minWidth: 130, display: "flex", justifyContent: "space-between", alignItems: "center", background: st.card, color: st.text, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: "8px 12px", fontWeight: 700, fontSize: "0.95em", cursor: "pointer" }}>
          {open ? "Pick dates…" : `${dayKey(addDays(today(), 14))} → ${dayKey(addDays(today(), 19))}`} <Ic name={open ? "chevU" : "chevD"} size={12} />
        </button>
        <span style={{ background: st.card, color: st.text, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: "8px 12px", fontWeight: 700, fontSize: "0.95em" }}>4 guests</span>
        <span style={{ background: st.card, color: st.text, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: "8px 12px", fontWeight: 700, fontSize: "0.95em" }}>Uluwatu</span>
        <button style={{ ...btnCls, borderRadius: st.btnRadius, padding: "8px 18px", fontWeight: 700, fontSize: "0.95em", cursor: "pointer" }}>Search villas</button>
      </div>
      {open && (
        <div className="anim-pop" style={{ background: st.card, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: st.pad }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: st.gap }}>
            <button onClick={() => setMonth((m) => m - 1)} aria-label="Previous month" style={{ color: st.sub, cursor: "pointer", background: "none", border: "none", fontSize: "1em" }}><Ic name="chevL" size={14} /></button>
            <b style={{ color: st.text }}>{["March", "April", "May", "June", "July", "August"][(month % 6 + 6) % 6]} 2026</b>
            <button onClick={() => setMonth((m) => m + 1)} aria-label="Next month" style={{ color: st.sub, cursor: "pointer", background: "none", border: "none", fontSize: "1em" }}><Ic name="chevR" size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, textAlign: "center" }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`h${i}`} style={{ color: st.sub, fontSize: "0.75em", fontWeight: 700 }}>{d}</span>)}
            {days.map((d) => {
              const selDay = d >= 14 && d <= 19;
              return <button key={d} style={{ padding: "5px 0", borderRadius: st.radius, border: "none", cursor: "pointer", fontSize: "0.85em", fontWeight: 600, background: selDay ? st.accent : "transparent", color: selDay ? "#fff" : st.text }}>{d}</button>;
            })}
          </div>
          <p style={{ marginTop: st.gap, color: st.sub, fontSize: "0.8em" }}>5 nights · this panel grew the embed frame — nothing clipped</p>
        </div>
      )}
    </div>
  );
}

function CalendarWidgetPreview({ st, propId }: { st: ReturnType<typeof useApp.getState>["widgetStyle"]; propId: string }) {
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const p = propertyById(propId);
  const rate = p.pricing.plans[0].nightly;
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const blocked = [4, 5, 6, 17, 18];
  const btnCls = st.btn === "solid" ? { background: st.accent, color: "#fff", border: "none" } : st.btn === "outline" ? { background: "transparent", color: st.accent, border: `1.5px solid ${st.accent}` } : { background: `${st.accent}1f`, color: st.accent, border: "none" };
  const pick = (d: number) => {
    if (blocked.includes(d)) return;
    if (from === null || to !== null) { setFrom(d); setTo(null); }
    else if (d > from) setTo(d);
    else { setFrom(d); setTo(null); }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: st.gap }}>
      <p style={{ fontWeight: 800, color: st.text, margin: 0 }}>{p.name} — availability</p>
      <p style={{ margin: 0, color: st.sub, fontSize: "0.85em" }}>{money(rate, "IDR", { compact: true })} / night · min {p.minNights} nights</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, textAlign: "center" }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={`h${i}`} style={{ color: st.sub, fontSize: "0.75em", fontWeight: 700 }}>{d}</span>)}
        {days.map((d) => {
          const isBlocked = blocked.includes(d);
          const inRange = from !== null && to !== null && d >= from && d <= to;
          return (
            <button key={d} onClick={() => pick(d)} disabled={isBlocked}
              style={{
                padding: "5px 0", borderRadius: st.radius, cursor: isBlocked ? "not-allowed" : "pointer", fontSize: "0.85em", fontWeight: 600,
                border: `${Math.min(st.borderW, 1)}px solid ${inRange || d === from ? st.accent : "transparent"}`,
                background: inRange ? `${st.accent}22` : "transparent",
                color: isBlocked ? st.borderColor : st.text,
                textDecoration: isBlocked ? "line-through" : "none",
              }}>{d}</button>
          );
        })}
      </div>
      {from !== null && to !== null && (
        <div className="anim-pop" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: st.gap, background: st.card, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: st.pad }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <b style={{ color: st.text }}>{to - from} nights selected</b>
            <p style={{ margin: "2px 0 0", color: st.sub, fontSize: "0.85em" }}>≈ {money(rate * (to - from), "IDR", { compact: true })} + fees</p>
          </div>
          <button style={{ ...btnCls, borderRadius: st.btnRadius, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>Book now →</button>
        </div>
      )}
      <p style={{ color: st.sub, fontSize: "0.8em", margin: 0 }}>Select a range — the quote panel appears and the embed grows to fit it.</p>
    </div>
  );
}
