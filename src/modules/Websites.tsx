import { useEffect, useRef, useState } from "react";
import { cx, money, copyText, toCSV, download, dayKey, addDays, today } from "../lib/format";
import { Ic, ICON_NAMES, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Field, Input, Modal, Select, Spark, Tabs, Toggle } from "../components/ui";
import { EditableText, EditableImage, FloatingToolbar, ToolBtn, InspectorPanel, Ifield, TextInput, SegBtns, toHtml, IconPicker, FloatPanel } from "../components/editor";
import { NumStepper, ColorField, UnitField } from "../components/controls";
import { useApp, DEFAULT_BLOCK_STYLE } from "../store";
import { PROPERTIES, propertyById } from "../lib/data";
import { embedJsSnippet, embedIframeSnippet, widgetCssVars } from "../lib/widgetTheme";
import { ChatbotPreview } from "./ChatWidget";
import { defaultBlockContent, parseQA, parseCSV, parseLines, parseIconItems, CONTENT_SCHEMA, ELEMENTS, type ContentField } from "../lib/blockContent";
import { DeviceCtx, useDevice, resolveCss, DEVICE_PRESETS } from "../lib/unit";
import type { Block, BlockStyle, ElAdjust, SiteLink } from "../lib/types";

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

const TEMPLATES: { name: string; vibe: string; swatchBg: string; swatchA: string; swatchB: string; palette: string; radius: number; heroVh: number; desc: string }[] = [
  { name: "Boutique Collection", vibe: "editorial", swatchBg: "#f2f4f1", swatchA: "#0e6b4e", swatchB: "#141811", palette: "Palm & Sand", radius: 3, heroVh: 55, desc: "Full-bleed hero, generous type, quiet paper backgrounds. Built for photography-first portfolios." },
  { name: "Beach House", vibe: "breezy", swatchBg: "#eef4f6", swatchA: "#38708a", swatchB: "#9a6a0b", palette: "Ocean Light", radius: 10, heroVh: 45, desc: "Softer radius, sea-glass accents, relaxed spacing. Suits casual coast properties." },
  { name: "Estate & Events", vibe: "formal", swatchBg: "#141811", swatchA: "#d8c39a", swatchB: "#f2f4f1", palette: "Volcanic", radius: 0, heroVh: 65, desc: "Dark, squared-off, tall hero. For estates that host weddings and buyouts." },
];

export default function Websites() {
  const { website, moveBlock, moveBlockTo, addBlock, duplicateBlock, updateBlock, removeBlock, setSiteTheme, setSiteActivePage, siteChrome, setSiteChrome, duplicateSite, resetSite, addPage, deletePage, updatePage, collections, updateCollection, addCollection, removeCollection, toast } = useApp();
  const [tab, setTab] = useState("builder");
  const [libOpen, setLibOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delName, setDelName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pageSettings, setPageSettings] = useState(false);
  const [metric, setMetric] = useState<"traffic" | "bookings">("traffic");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [tplPreview, setTplPreview] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);

  // ── Device simulation: vh/vw resolve against THIS frame, not the browser ──
  const [devPreset, setDevPreset] = useState("desktop");
  const [devW, setDevW] = useState(1280);
  const [devH, setDevH] = useState(832);
  const [fitZoom, setFitZoom] = useState(1);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const measure = () => setFitZoom(Math.min(1, Math.max(0.2, (el.clientWidth - 2) / devW)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [devW, tab]);
  useEffect(() => {
    const onR = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

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
        <Btn size="sm" icon="copy" onClick={() => duplicateSite()}>Duplicate</Btn>
        <Btn size="sm" variant="ghost" icon="trash" onClick={() => { setDelName(""); setDelOpen(true); }}>Delete</Btn>
      </div>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete this site" w={460}
        footer={<>
          <Btn variant="ghost" onClick={() => setDelOpen(false)}>Keep site</Btn>
          <Btn variant="danger" icon="trash" disabled={delName.trim() !== website.subdomain} onClick={() => { resetSite(); setDelOpen(false); }}>Delete permanently</Btn>
        </>}>
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed text-mute">
            This unpublishes <code className="rounded-sm bg-paper px-1.5 py-0.5 font-mono text-[11.5px] text-ink">{website.subdomain}.derzen.site</code> and
            removes <b className="text-ink">all {website.pages.length} pages</b>, including the builder content, header and footer.
            Listings, pricing, reservations and settings are <b className="text-ink">not</b> touched.
          </p>
          <Field label={`Type “${website.subdomain}” to confirm`}>
            <Input value={delName} onChange={(e) => setDelName(e.target.value)} placeholder={website.subdomain} autoFocus />
          </Field>
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-faint"><Ic name="shield" size={11} /> This action is audited and cannot be undone from the UI.</p>
        </div>
      </Modal>

      {/* Template preview — changes nothing until Apply */}
      <Modal open={!!tplPreview} onClose={() => setTplPreview(null)} title={`Template preview — ${tplPreview ?? ""}`} w={520}
        footer={<>
          <Btn variant="ghost" onClick={() => setTplPreview(null)}>Close — keep my site</Btn>
          <Btn variant="solid" icon="check" onClick={() => {
            const tp = TEMPLATES.find((x) => x.name === tplPreview);
            if (tp) {
              setSiteTheme({ palette: tp.palette, radius: tp.radius });
              page.blocks.forEach((b) => { if (b.type === "hero") updateBlock(page.id, b.id, { style: { ...DEFAULT_BLOCK_STYLE, ...b.style, heightVh: tp.heroVh, radius: tp.radius } }); });
              toast("ok", `${tp.name} applied`, `Palette, radius and hero height updated — your text and images are untouched.`);
            }
            setTplPreview(null);
          }}>Apply template</Btn>
        </>}>
        {(() => {
          const tp = TEMPLATES.find((x) => x.name === tplPreview);
          if (!tp) return null;
          return (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-sm border border-line">
                <div className="flex h-28 items-end" style={{ background: `linear-gradient(120deg, ${tp.swatchB}22, ${tp.swatchA}44), ${tp.swatchBg}` }}>
                  <div className="w-full p-3">
                    <div className="h-2.5 w-2/3" style={{ background: tp.swatchB, borderRadius: tp.radius }} />
                    <div className="mt-1.5 h-2 w-1/3" style={{ background: tp.swatchA, borderRadius: tp.radius }} />
                  </div>
                </div>
                <div className="space-y-1.5 p-3" style={{ background: tp.swatchBg }}>
                  <div className="h-2 w-full" style={{ background: `${tp.swatchB}33`, borderRadius: tp.radius }} />
                  <div className="h-2 w-5/6" style={{ background: `${tp.swatchB}22`, borderRadius: tp.radius }} />
                  <div className="flex gap-1.5 pt-1">
                    <div className="h-8 w-16" style={{ background: tp.swatchA, borderRadius: tp.radius }} />
                    <div className="h-8 w-16" style={{ background: `${tp.swatchA}44`, borderRadius: tp.radius }} />
                    <div className="h-8 w-16" style={{ background: `${tp.swatchB}1f`, borderRadius: tp.radius }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                <div className="rounded-sm border border-line p-2"><p className="text-faint">palette</p><p className="font-bold text-ink">{tp.palette}</p></div>
                <div className="rounded-sm border border-line p-2"><p className="text-faint">radius</p><p className="font-bold text-ink">{tp.radius}px</p></div>
                <div className="rounded-sm border border-line p-2"><p className="text-faint">hero</p><p className="font-bold text-ink">{tp.heroVh}vh</p></div>
              </div>
              <p className="text-[11.5px] leading-relaxed text-mute">{tp.desc}</p>
              <p className="rounded-sm bg-paper px-3 py-2 text-[10px] font-semibold text-faint">Applying changes palette, corner radius and hero height on this page. Your headlines, copy and images stay exactly as they are.</p>
            </div>
          );
        })()}
      </Modal>

      {/* New page */}
      <Modal open={newPageOpen} onClose={() => setNewPageOpen(false)} title="Create a page" w={420}
        footer={<>
          <Btn variant="ghost" onClick={() => setNewPageOpen(false)}>Cancel</Btn>
          <Btn variant="solid" icon="plus" onClick={() => {
            if (!newPageName.trim()) { toast("warn", "Name the page first", "e.g. Experiences, Journal, Weddings."); return; }
            addPage(newPageName.trim());
            setNewPageOpen(false);
          }}>Create page</Btn>
        </>}>
        <div className="space-y-3">
          <Field label="Page name" hint="The slug is generated from the name — you can change it in Page settings.">
            <Input value={newPageName} onChange={(e) => setNewPageName(e.target.value)} placeholder="Experiences" autoFocus onKeyDown={(e) => { if (e.key === "Enter" && newPageName.trim()) { addPage(newPageName.trim()); setNewPageOpen(false); } }} />
          </Field>
          <p className="rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">Starts with a hero, rich text and CTA banner — all editable. The page appears in navigation immediately.</p>
        </div>
      </Modal>

      <Tabs tabs={[{ id: "builder", label: "Page builder" }, { id: "collections", label: "Collections" }, { id: "analytics", label: "Analytics" }, { id: "embed", label: "Embeddable widgets" }, { id: "settings", label: "Website settings" }]} active={tab} onChange={setTab} />

      {tab === "builder" && (<>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_1fr]">
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
            <button className="flex w-full items-center gap-2 rounded-sm border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => { setNewPageName(""); setNewPageOpen(true); }}><Ic name="plus" size={13} /> New page</button>
            <button className="flex w-full items-center gap-2 rounded-sm border border-dashed border-line2 px-3 py-2 text-[12px] font-bold text-mute hover:text-ink" onClick={() => setPageSettings(true)}><Ic name="gear" size={13} /> Page settings</button>
            <div className="rounded-sm border border-line bg-card p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-mute"><Ic name="globe" size={11} /> Global header & footer</p>
              <p className="text-[10px] leading-relaxed text-faint">Click the logo, menu links, CTA or footer text on the canvas to edit. Hover the logo or tagline and press × to remove them — bring them back here. Applies to every page.</p>
              <div className="mt-2 space-y-1.5">
                <label className="flex items-center justify-between text-[10.5px] font-bold text-mute">
                  <span>Show logo</span>
                  <Toggle checked={siteChrome.logoMode !== "none"} onChange={(v) => setSiteChrome({ logoMode: v ? (siteChrome.logoUrl ? "image" : "text") : "none" })} label="Show logo" />
                </label>
                {siteChrome.logoMode !== "none" && (
                  <div className="rounded-sm bg-paper p-2">
                    <div className="flex items-center gap-2">
                      <EditableImage src={siteChrome.logoUrl || PROPERTIES[0].image} onCommit={(v) => setSiteChrome({ logoUrl: v, logoMode: "image" })} className="h-9 w-9 shrink-0 rounded-sm border border-line bg-card" alt="Logo mark" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <TextInput value={siteChrome.logoText} onChange={(v) => setSiteChrome({ logoText: v, logoMode: "text" })} placeholder="Wordmark text" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-faint">Size</span>
                          <NumStepper value={siteChrome.logoSize} onChange={(v) => setSiteChrome({ logoSize: v })} min={16} max={64} suffix="px" w={86} label="Logo size" allowNegative={false} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-1 text-[8.5px] leading-snug text-faint">Pick an image to use a mark, or type to use a wordmark — the last one you touch wins.</p>
                  </div>
                )}
                <label className="flex items-center justify-between text-[10.5px] font-bold text-mute">
                  <span>Show tagline</span>
                  <Toggle checked={siteChrome.taglineVisible} onChange={(v) => setSiteChrome({ taglineVisible: v })} label="Show tagline" />
                </label>
                <label className="flex items-center justify-between text-[10.5px] font-bold text-mute">
                  <span>Show CTA button</span>
                  <Toggle checked={siteChrome.showCta} onChange={(v) => setSiteChrome({ showCta: v })} label="Show header CTA" />
                </label>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Field label="Header bg"><input type="color" value={siteChrome.headerBg} onChange={(e) => setSiteChrome({ headerBg: e.target.value })} className="h-7 w-full cursor-pointer rounded-sm border border-line bg-card" aria-label="Header background" /></Field>
                <Field label="Footer bg"><input type="color" value={siteChrome.footerBg} onChange={(e) => setSiteChrome({ footerBg: e.target.value })} className="h-7 w-full cursor-pointer rounded-sm border border-line bg-card" aria-label="Footer background" /></Field>
              </div>
            </div>
          </div>

          {/* Canvas — WYSIWYG, edge-to-edge like the live page */}
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <p className="font-display text-[14px] font-bold text-ink">Page: {page.name} <span className="font-mono text-[10px] font-semibold text-faint">/{page.slug}</span></p>
              <div className="flex gap-1.5">
                <Btn size="xs" icon="plus" onClick={() => setLibOpen(true)}>Add block</Btn>
                <Btn size="xs" variant={designOpen && !sel ? "solid" : "ghost"} icon="palette" onClick={() => { setDesignOpen(!designOpen); setSelected(null); }}>Design</Btn>
                <Btn size="xs" variant="solid" icon="eye" onClick={() => setPreviewOpen(true)}>Preview</Btn>
              </div>
            </div>

            {/* Device frame — canvas width IS the device; vh/vw scale with it */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
              <div className="flex items-center gap-0.5">
                {DEVICE_PRESETS.map((dp) => (
                  <button key={dp.id} onClick={() => { setDevPreset(dp.id); setDevW(dp.w); setDevH(dp.h); }}
                    className={cx("flex items-center gap-1.5 rounded-sm px-2 py-1 text-[10.5px] font-bold transition-colors", devPreset === dp.id ? "bg-ink text-white" : "text-mute hover:text-ink")}
                    aria-label={`${dp.label} frame · ${dp.w} by ${dp.h}`} title={`${dp.w}×${dp.h}`}>
                    <Ic name={dp.icon} size={12} /> {dp.label}
                  </button>
                ))}
              </div>
              <span className="mx-0.5 h-4 w-px bg-line2" aria-hidden="true" />
              <NumStepper value={devW} onChange={(v) => { setDevW(v); setDevPreset("custom"); }} min={320} max={1920} step={10} suffix="w" w={92} label="" allowNegative={false} />
              <NumStepper value={devH} onChange={(v) => { setDevH(v); setDevPreset("custom"); }} min={480} max={1600} step={10} suffix="h" w={92} label="" allowNegative={false} />
              <span className="ml-auto hidden font-mono text-[9.5px] font-semibold text-faint md:inline">vh · vw resolve against this frame · zoom {Math.round(fitZoom * 100)}%</span>
            </div>

            <div ref={canvasWrapRef} className="overflow-x-auto bg-[repeating-linear-gradient(45deg,transparent_0_10px,rgba(20,24,17,0.018)_10px_20px)] p-3">
              <div style={{ zoom: fitZoom, width: devW * fitZoom }}>
                <DeviceCtx.Provider value={{ w: devW, h: devH }}>
                  <div className="overflow-hidden bg-card shadow-[0_0_0_1px_var(--color-line),0_18px_40px_-24px_rgba(20,24,17,0.35)]" style={{ width: devW }}>

            {/* Editable header — logo, menu links, CTA */}
            <ChromeStrip target="header" selected={selected} onSelect={setSelected} />

            <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => setSelected(null)} className="space-y-0">
              {page.blocks.map((b, idx) => (
                <div key={b.id} onDragOver={(e) => { e.preventDefault(); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropAt(e.clientY < r.top + r.height / 2 ? idx : idx + 1); }}>
                  <div className={cx("h-1 rounded-full transition-all", dropAt === idx && dragId ? "my-1 bg-brand" : "bg-transparent")} aria-hidden="true" />
                  <InlineBlock
                    b={b} idx={idx} total={page.blocks.length}
                    selected={selected === b.id}
                    dragging={dragId === b.id}
                    onSelect={() => setSelected(selected === b.id ? null : b.id)}
                    onDragStart={() => setDragId(b.id)}
                    onDragEnd={() => { setDragId(null); setDropAt(null); }}
                    onMove={(dir) => moveBlock(page.id, b.id, dir)}
                    onDuplicate={() => { duplicateBlock(page.id, b.id); toast("ok", "Block duplicated", BLOCK_LABEL[b.type]); }}
                    onRemove={() => { if (page.home && b.type === "hero") { toast("warn", "Home hero is protected", "Every page needs a first impression."); return; } removeBlock(page.id, b.id); if (selected === b.id) setSelected(null); }}
                    onContent={(patch) => updateBlock(page.id, b.id, { content: { ...b.content, ...patch } })}
                  />
                </div>
              ))}
              <div className={cx("h-1 rounded-full transition-all", dropAt === page.blocks.length && dragId ? "my-1 bg-brand" : "bg-transparent")} aria-hidden="true" />
              <button
                onDragOver={(e) => { e.preventDefault(); setDropAt(page.blocks.length); }}
                onClick={() => setLibOpen(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line2 py-4 text-[12px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep"
              >
                <Ic name="plus" size={14} /> Drop a block here, or click to browse the library
              </button>
            </div>

            {/* Editable footer */}
            <ChromeStrip target="footer" selected={selected} onSelect={setSelected} />

                  </div>
                </DeviceCtx.Provider>
              </div>
            </div>

            <p className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] leading-relaxed text-mute">
              <b className="text-ink">Click any text to type directly.</b> Click an image (or its corner badge) to swap it from your library or upload.
              Select a block for its <b className="text-ink">content &amp; style inspector</b>. Drag the handle to reorder — edits save live.
            </p>
          </div>

        </div>

        {/* Floating block inspector — draggable, anchored beside the selected block */}
        {sel && (
          <FloatPanel anchor={sel.id} title={BLOCK_LABEL[sel.type] ?? sel.type} onClose={() => setSelected(null)}>
            <InspectorTabs
              b={sel}
              onContent={(patch) => updateBlock(page.id, sel.id, { content: { ...sel.content, ...patch } })}
              onStyle={(patch) => updateBlock(page.id, sel.id, { style: { ...DEFAULT_BLOCK_STYLE, ...sel.style, ...patch } })}
            />
          </FloatPanel>
        )}

        {/* Floating design panel — theme + starter templates, draggable anywhere */}
        {designOpen && !sel && (
          <FloatPanel anchor="" title="Site design" onClose={() => setDesignOpen(false)}>
            <Ifield label="Palette">
              <div className="grid grid-cols-3 gap-1.5">
                {["Palm & Sand", "Ocean Light", "Volcanic"].map((p) => (
                  <button key={p} onClick={() => setSiteTheme({ palette: p })} className={cx("rounded-sm border px-2 py-1.5 text-[10px] font-bold", website.theme.palette === p ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{p}</button>
                ))}
              </div>
            </Ifield>
            <Ifield label="Corner radius">
              <NumStepper value={website.theme.radius} onChange={(v) => setSiteTheme({ radius: v })} min={0} max={20} suffix="px" label="radius" w={110} />
            </Ifield>
            <p className="rounded-sm bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">Select any block on the canvas to edit it. This panel is draggable — drag the header to park it anywhere.</p>
            <p className="mb-1 mt-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Starter templates</p>
            {TEMPLATES.map((tp) => (
              <button key={tp.name} onClick={() => setTplPreview(tp.name)} className="mb-1.5 flex w-full items-center gap-2 rounded-sm border border-line px-2.5 py-2 text-left text-[11.5px] font-bold text-ink transition-colors hover:border-brand">
                <span className="flex h-8 w-12 shrink-0 items-end gap-0.5 rounded-sm border border-line p-1" style={{ background: tp.swatchBg }} aria-hidden="true">
                  <span className="h-3 w-2" style={{ background: tp.swatchA }} /><span className="h-4 w-2" style={{ background: tp.swatchB }} /><span className="h-2 w-2" style={{ background: tp.swatchA }} />
                </span>
                {tp.name} <span className="ml-auto text-[9px] font-semibold uppercase text-faint">{tp.vibe}</span>
              </button>
            ))}
            <p className="text-[9px] leading-snug text-faint">Click to preview — nothing changes until you press Apply.</p>
          </FloatPanel>
        )}
      </>)}

      {tab === "collections" && <CollectionsTab />}

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

      {/* Real preview — full screen, units resolve against the actual window */}
      {previewOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f5f0]" role="dialog" aria-modal="true" aria-label={`Full-screen preview of ${page.name}`}
          onKeyDown={(e) => { if (e.key === "Escape") setPreviewOpen(false); }}>
          <DeviceCtx.Provider value={{ w: winSize.w, h: winSize.h }}>
            <div className="pointer-events-none fixed left-1/2 top-3 z-20 -translate-x-1/2">
              <div className="pointer-events-auto flex items-center gap-2 rounded-sm border border-line bg-card px-3 py-1.5 shadow-lg">
                <span className="font-mono text-[10px] font-bold text-mute">{website.subdomain}.derzen.site/{page.slug} · {winSize.w}×{winSize.h} · real viewport</span>
                <Btn size="xs" icon="external" onClick={() => toast("ok", "Opening published site", `https://${website.subdomain}.derzen.site/${page.slug}`)}>Guest view</Btn>
                <button onClick={() => setPreviewOpen(false)} className="rounded-sm bg-ink px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-brand" aria-label="Close preview (Esc)">Close · Esc</button>
              </div>
            </div>
            <div className="px-0" style={{ background: siteChrome.headerBg, color: siteChrome.headerColor }}>
              <div className="px-6 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {siteChrome.logoMode !== "none" && (
                <span className="flex items-baseline gap-2">
                  {siteChrome.logoMode === "image"
                    ? <img src={siteChrome.logoUrl || PROPERTIES[0].image} alt="Logo" className="rounded-sm object-cover" style={{ height: siteChrome.logoSize, width: siteChrome.logoSize }} />
                    : <span className="font-display font-bold uppercase tracking-wide" style={{ fontSize: Math.max(13, siteChrome.logoSize * 0.62) }}>{siteChrome.logoText}</span>}
                  {siteChrome.taglineVisible && <span className="hidden text-[9.5px] opacity-70 sm:inline">{siteChrome.tagline}</span>}
                </span>
              )}
              <span className="flex flex-wrap items-center gap-2.5">
                {siteChrome.headerLinks.map((l) => <span key={l.id} className="text-[10.5px] font-bold opacity-85">{l.label}</span>)}
              </span>
              {siteChrome.showCta && <span className="ml-auto rounded-sm bg-brand px-3 py-1 text-[10px] font-bold text-white">{siteChrome.ctaLabel}</span>}
            </div>
              </div>
            </div>
          <div className="min-h-[300px] py-2 bg-[#f4f5f0]">
            {siteChrome.headerBlocks.map((b) => <BlockView key={b.id} b={b} />)}
            {page.blocks.map((b) => <BlockView key={b.id} b={b} />)}
            {page.blocks.length === 0 && <p className="p-10 text-center text-[12px] font-bold text-mute">Empty page — add blocks to see them here.</p>}
          </div>
          <div className="px-6 py-4" style={{ background: siteChrome.footerBg, color: siteChrome.footerColor }}>
            {siteChrome.footerBlocks.map((b) => <BlockView key={b.id} b={b} />)}
            <p className="text-[10.5px] opacity-70">{siteChrome.footer}</p>
          </div>
          </DeviceCtx.Provider>
        </div>
      )}

      {/* Page settings — every field writes through updatePage on Save */}
      <PageSettingsModal key={page.id} open={pageSettings} onClose={() => setPageSettings(false)} page={page}
        onSave={(patch) => { updatePage(page.id, patch); setPageSettings(false); toast("ok", "Page settings saved", "Slug, SEO and visibility are live."); }}
        onDelete={() => { deletePage(page.id); setPageSettings(false); }} />
    </div>
  );
}

function PageSettingsModal({ open, onClose, page, onSave, onDelete }: {
  open: boolean; onClose: () => void; page: import("../lib/types").SitePage;
  onSave: (patch: { slug?: string; seo?: { title?: string; description?: string; image?: string }; visible?: boolean }) => void;
  onDelete: () => void;
}) {
  const [slug, setSlug] = useState(page.slug);
  const [title, setTitle] = useState(page.seo?.title ?? `${page.name} · Sanggraha Villas`);
  const [desc, setDesc] = useState(page.seo?.description ?? "");
  const [img, setImg] = useState(page.seo?.image ?? "");
  const [visible, setVisible] = useState(page.visible !== false);
  return (
    <Modal open={open} onClose={onClose} title={`Page settings — ${page.name}`} w={460}
      footer={<>
        {!page.home && <Btn variant="ghost" icon="trash" onClick={onDelete}>Delete page</Btn>}
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="solid" onClick={() => onSave({ slug: slug.trim() || page.slug, seo: { title, description: desc, image: img }, visible })}>Save</Btn>
      </>}>
      <div className="space-y-3">
        <Field label="Slug" hint={`Live at /${slug.trim() || page.slug}`}>
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="font-mono" />
        </Field>
        <Field label="SEO title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="SEO description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Shown in search results and link previews." /></Field>
        <Field label="Social image" hint="Click to browse your library or upload — used for link previews">
          <EditableImage src={img} onCommit={setImg} className="h-20 w-full rounded-sm border border-dashed border-line2 bg-paper" alt="Social share image" />
        </Field>
        <label className="flex items-center gap-2 text-[12px] font-bold text-ink"><Toggle checked={visible} onChange={setVisible} label="Visible in navigation" /> Visible in navigation</label>
        {page.home && <p className="rounded-sm bg-paper px-3 py-2 text-[10.5px] font-semibold text-faint"><Ic name="lock" size={10} className="mr-1 inline" /> The home page is protected — it can't be deleted or hidden.</p>}
      </div>
    </Modal>
  );
}

// ── Inline block: renders editable content + a floating toolbar on select ──
function InlineBlock({ b, idx, total, selected, dragging, onSelect, onDragStart, onDragEnd, onMove, onDuplicate, onRemove, onContent }: {
  b: Block; idx: number; total: number; selected: boolean; dragging: boolean;
  onSelect: () => void; onDragStart: () => void; onDragEnd: () => void;
  onMove: (d: "up" | "down") => void; onDuplicate: () => void; onRemove: () => void;
  onContent: (patch: Record<string, string>) => void;
}) {
  return (
    <div
      id={`blk-${b.id}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onFocusCapture={() => { if (!selected) onSelect(); }}
      className={cx(
        "group relative rounded-sm border transition-all",
        selected ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-transparent hover:border-line2",
        dragging && "opacity-40",
      )}
      aria-label={`Block: ${BLOCK_LABEL[b.type] ?? b.type}${selected ? " (selected)" : ""}`}
    >
      {selected && (
        <FloatingToolbar>
          <span className="cursor-grab px-0.5 text-line2 active:cursor-grabbing" draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd} aria-label={`Drag to move ${BLOCK_LABEL[b.type] ?? b.type}`}><Ic name="grip" size={13} /></span>
          <span className="max-w-[110px] truncate px-1 text-[10px] font-bold uppercase tracking-wide text-mute">{BLOCK_LABEL[b.type] ?? b.type}</span>
          <ToolBtn icon="chevU" label="Move up" onClick={() => onMove("up")} />
          <ToolBtn icon="chevD" label="Move down" onClick={() => onMove("down")} />
          <ToolBtn icon="copy" label="Duplicate" onClick={onDuplicate} />
          <ToolBtn icon="trash" label="Delete block" onClick={onRemove} danger />
        </FloatingToolbar>
      )}
      <BlockView b={b} edit onContent={onContent} />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden text-[9px] font-bold uppercase tracking-widest text-faint group-hover:block">{idx + 1} / {total}</span>
    </div>
  );
}

// ── Editable header / footer strip ─────────────────────────────────────────
function ChromeStrip({ target, selected, onSelect }: { target: "header" | "footer"; selected: string | null; onSelect: (id: string | null) => void }) {
  const { siteChrome, setSiteChrome, addChromeBlock, updateChromeBlock, removeChromeBlock, moveChromeBlock, duplicateChromeBlock } = useApp();
  const isHeader = target === "header";
  const links = isHeader ? siteChrome.headerLinks : siteChrome.footerLinks;
  const blocks = isHeader ? siteChrome.headerBlocks : siteChrome.footerBlocks;
  const bg = isHeader ? siteChrome.headerBg : siteChrome.footerBg;
  const fg = isHeader ? siteChrome.headerColor : siteChrome.footerColor;
  const setLinks = (next: SiteLink[]) => setSiteChrome(isHeader ? { headerLinks: next } : { footerLinks: next });

  const [editingLink, setEditingLink] = useState<string | null>(null);

  return (
    <div className="rounded-sm px-4 py-3" style={{ background: bg, color: fg, textAlign: siteChrome.align }}>
      <div className={cx("flex flex-wrap items-center gap-x-4 gap-y-2", siteChrome.align === "center" && "justify-center", siteChrome.align === "right" && "justify-end")}>
        {isHeader && siteChrome.logoMode !== "none" && (
          <span className="group/logo relative flex items-center gap-1.5">
            {siteChrome.logoMode === "image"
              ? <EditableImage src={siteChrome.logoUrl} onCommit={(v) => setSiteChrome({ logoUrl: v, logoMode: "image" })} className="rounded-sm" style={{ height: siteChrome.logoSize, width: siteChrome.logoSize }} alt="Logo" />
              : <EditableText as="span" value={siteChrome.logoText} onCommit={(v) => setSiteChrome({ logoText: v })} style={{ fontSize: Math.max(13, siteChrome.logoSize * 0.62) }} className="font-display font-bold uppercase tracking-wide" placeholder="Logo" />}
            <button
              onClick={(e) => { e.stopPropagation(); setSiteChrome({ logoMode: "none" }); }}
              className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white/95 text-pine-950 shadow ring-1 ring-black/20 transition-transform hover:scale-110"
              style={{ height: 18, width: 18 }}
              aria-label="Remove logo" title="Remove logo — restore it from the Header & footer panel"
            ><Ic name="x" size={10} sw={3} /></button>
          </span>
        )}
        {isHeader && siteChrome.taglineVisible && (
          <span className="group/tag inline-flex items-center gap-1.5">
            <EditableText as="span" value={siteChrome.tagline} onCommit={(v) => setSiteChrome({ tagline: v })} className="text-[10.5px] opacity-70" placeholder="Tagline" />
            <button
              onClick={(e) => { e.stopPropagation(); setSiteChrome({ taglineVisible: false }); }}
              className="flex shrink-0 items-center justify-center rounded-full bg-white/95 text-pine-950 shadow ring-1 ring-black/20 transition-transform hover:scale-110"
              style={{ height: 18, width: 18 }}
              aria-label="Remove tagline" title="Remove tagline — restore it from the Header & footer panel"
            ><Ic name="x" size={10} sw={3} /></button>
          </span>
        )}
        <nav className="flex flex-wrap items-center gap-1" aria-label={`${target} menu`}>
          {links.map((l) => (
            <span key={l.id} className="group/link relative inline-flex items-center gap-0.5 rounded-sm px-1.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/10">
              {editingLink === l.id ? (
                <input
                  autoFocus defaultValue={l.url}
                  onBlur={(e) => { setLinks(links.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x))); setEditingLink(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur(); e.stopPropagation(); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-36 rounded-sm border border-brand bg-card px-1 py-0.5 font-mono text-[9.5px] text-ink outline-none"
                  placeholder="https://…"
                  aria-label={`Link URL for ${l.label}`}
                />
              ) : (
                <>
                  <EditableText as="span" value={l.label} onCommit={(v) => setLinks(links.map((x) => (x.id === l.id ? { ...x, label: v } : x)))} placeholder="Link" />
                  <button onClick={(e) => { e.stopPropagation(); setEditingLink(l.id); }} aria-label={`Edit URL for ${l.label}`} className="opacity-0 transition-opacity group-hover/link:opacity-70 hover:!opacity-100"><Ic name="link" size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setLinks(links.filter((x) => x.id !== l.id)); }} aria-label={`Remove ${l.label}`} className="opacity-0 transition-opacity group-hover/link:opacity-70 hover:!opacity-100"><Ic name="x" size={10} /></button>
                </>
              )}
            </span>
          ))}
          <button onClick={(e) => { e.stopPropagation(); setLinks([...links, { id: `lnk${Date.now()}`, label: "New link", url: "/" }]); }} className="rounded-sm border border-dashed border-current/40 px-1.5 py-1 text-[10px] font-bold opacity-60 transition-opacity hover:opacity-100">+ link</button>
        </nav>
        {isHeader && siteChrome.showCta && (
          <EditableText as="span" value={siteChrome.ctaLabel} onCommit={(v) => setSiteChrome({ ctaLabel: v })} placeholder="CTA"
            className="ml-auto rounded-sm bg-brand px-3 py-1.5 text-[11px] font-bold text-white" />
        )}
      </div>
      {blocks.map((b, i) => (
        <div key={b.id} className={cx("relative mt-2 rounded-sm border transition-colors", selected === b.id ? "border-brand" : "border-transparent hover:border-current/30")} onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}>
          {selected === b.id && (
            <FloatingToolbar>
              <ToolBtn icon="chevU" label="Move up" onClick={() => moveChromeBlock(target, b.id, "up")} />
              <ToolBtn icon="chevD" label="Move down" onClick={() => moveChromeBlock(target, b.id, "down")} />
              <ToolBtn icon="copy" label="Duplicate" onClick={() => duplicateChromeBlock(target, b.id)} />
              <ToolBtn icon="trash" label="Remove" onClick={() => removeChromeBlock(target, b.id)} danger />
            </FloatingToolbar>
          )}
          <BlockView b={b} edit onContent={(patch) => updateChromeBlock(target, b.id, { content: patch })} />
          <span className="pointer-events-none absolute right-1 top-1 text-[8px] font-bold uppercase tracking-widest opacity-40">{i + 1}</span>
        </div>
      ))}
      <button onClick={(e) => { e.stopPropagation(); addChromeBlock(target, "rich_text"); }} className="mt-2 w-full rounded-sm border border-dashed border-current/30 py-1.5 text-[10px] font-bold opacity-50 transition-opacity hover:opacity-100">+ add block to {target}</button>
    </div>
  );
}

// ── Highlight chip — an icon + label whose icon is swappable via picker ─────
function HighlightChip({
  icon, label, edit, chipStyle, onIcon, onLabel, onRemove,
}: {
  icon: IconName; label: string; edit: boolean; chipStyle?: React.CSSProperties;
  onIcon: (n: IconName) => void; onLabel: (v: string) => void; onRemove: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 270)), y: r.bottom + 8 });
    setPicker(true);
  };
  return (
    <div className="group/chip relative text-center">
      {edit && (
        <button onClick={openPicker} aria-label="Change icon" title="Change icon"
          className="mx-auto mb-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-soft text-brand-deep transition-all hover:scale-110 hover:ring-2 hover:ring-brand"
          style={chipStyle}>
          <Ic name={icon} size={14} />
        </button>
      )}
      {!edit && (
        <span className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand-deep" style={chipStyle}>
          <Ic name={icon} size={14} />
        </span>
      )}
      {edit ? (
        <EditableText as="p" value={label} onCommit={onLabel} className="text-[10px] font-bold text-ink" placeholder="Highlight" />
      ) : (
        <p className="text-[10px] font-bold text-ink">{label}</p>
      )}
      {edit && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remove highlight"
          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-danger text-white group-hover/chip:flex">
          <Ic name="x" size={9} sw={3} />
        </button>
      )}
      <IconPicker open={picker} pos={pos} value={icon} onPick={onIcon} onClose={() => setPicker(false)} />
    </div>
  );
}

// ── Content-driven, inline-editable block renderer (canvas + preview) ──────
function BlockView({ b, edit = false, onContent }: { b: Block; edit?: boolean; onContent?: (patch: Record<string, string>) => void }) {
  const dev = useDevice();
  const s: BlockStyle = { ...DEFAULT_BLOCK_STYLE, ...b.style };
  const c: Record<string, string> = { ...defaultBlockContent(b.type), ...b.content };
  const set = (k: string) => (v: string) => onContent?.({ [k]: v });
  // Unit-aware lengths: vh/vw/dvh/dvw resolve against the simulated device.
  const len = (v: string | number | undefined): string | number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    const r = resolveCss(v, dev);
    return r === "" ? undefined : r;
  };
  // Per-element adjustments — position / scale / rotate / opacity / size / colour.
  const es = (k: string): React.CSSProperties | undefined => {
    const a: ElAdjust | undefined = s.els?.[k];
    if (!a || Object.keys(a).length === 0) return undefined;
    const tr: string[] = [];
    if (a.x) tr.push(`translateX(${resolveCss(a.x, dev, "0px")})`);
    if (a.y) tr.push(`translateY(${resolveCss(a.y, dev, "0px")})`);
    if (a.scale !== undefined && a.scale !== 1) tr.push(`scale(${a.scale})`);
    if (a.rot) tr.push(`rotate(${a.rot}deg)`);
    return {
      position: "relative", zIndex: 2,
      opacity: a.opacity !== undefined ? a.opacity / 100 : undefined,
      transform: tr.length ? tr.join(" ") : undefined,
      fontSize: a.fs ? resolveCss(a.fs, dev) : undefined,
      color: a.color || undefined,
      background: a.bg || undefined,
      borderRadius: a.radius ? resolveCss(a.radius, dev) : undefined,
      padding: a.padX || a.padY ? `${resolveCss(a.padY ?? "0", dev)} ${resolveCss(a.padX ?? "0", dev)}` : undefined,
      textAlign: a.align,
    };
  };
  // Function-call helpers (not JSX components) so the underlying EditableText /
  // EditableImage keep a stable component identity and never remount mid-typing.
  const t = (p: { k: string; as?: "span" | "p" | "h1" | "h2" | "h3" | "div"; className?: string; style?: React.CSSProperties; multiline?: boolean; placeholder?: string }) =>
    edit
      ? <EditableText as={p.as} value={c[p.k] ?? ""} onCommit={set(p.k)} className={p.className} style={p.style} multiline={p.multiline} placeholder={p.placeholder ?? p.k} />
      : <Tag as={p.as} className={p.className} style={p.style} html={toHtml(c[p.k] ?? "")} />;
  const im = (p: { k: string; className?: string; style?: React.CSSProperties }) =>
    edit
      ? <EditableImage src={c[p.k] ?? ""} onCommit={set(p.k)} className={p.className} style={p.style} />
      : <img src={c[p.k] || PROPERTIES[0].image} alt="" className={cx("object-cover", p.className)} style={p.style} onError={(e) => ((e.target as HTMLImageElement).src = PROPERTIES[0].image)} />;

  const inner = (() => {
    switch (b.type) {
      case "hero": return (
        <div className="relative flex items-end overflow-hidden" style={{ borderRadius: s.radius, minHeight: `${s.heightVh || 45}vh` }}>
          <div className="absolute inset-0" style={es("image")}>{im({ k: "image", className: "h-full w-full" })}</div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine-950/80 via-pine-950/25 to-transparent" />
          {/* Text layer is click-transparent so the image underneath stays
              clickable edge-to-edge; only the editable texts re-enable hits. */}
          <div className="pointer-events-none relative flex w-full items-end justify-between gap-3 p-5">
            {t({ k: "headline", as: "h2", className: "pointer-events-auto font-display text-[26px] font-bold leading-tight text-white", style: es("headline"), placeholder: "Headline" })}
            {t({ k: "badge", className: "pointer-events-auto hidden shrink-0 rounded-sm bg-white/95 px-3 py-1.5 text-[11px] font-bold text-ink sm:block", style: es("badge"), placeholder: "Price" })}
          </div>
        </div>
      );
      case "rich_text": return (
        <div>
          {t({ k: "title", as: "h3", className: "font-display text-[16px] font-bold text-ink", style: es("title"), placeholder: "Title" })}
          {t({ k: "text", as: "p", className: "mt-1 text-[12px] leading-relaxed text-mute", style: es("text"), multiline: true, placeholder: "Body text" })}
        </div>
      );
      case "image": return (
        <figure>
          <div style={es("photo")}>{im({ k: "src", className: "h-32 w-full rounded-sm", style: { borderRadius: s.radius } })}</div>
          {t({ k: "caption", as: "p", className: "mt-1 text-[10px] italic text-faint", style: es("caption"), placeholder: "Caption" })}
        </figure>
      );
      case "gallery": {
        const imgs = (c.images ?? "").split(",").map((x) => x.trim()).filter(Boolean);
        const list = imgs.length ? imgs : PROPERTIES.slice(0, 4).map((p) => p.image);
        return (
          <div>
            {t({ k: "title", as: "h3", className: "mb-1.5 font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Gallery title" })}
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4" style={es("grid")}>
              {list.map((src, i) => edit
                ? <EditableImage key={i} src={src} onCommit={(v) => { const arr = [...list]; arr[i] = v; set("images")(arr.join(", ")); }} className="h-16 w-full rounded-sm" style={{ borderRadius: s.radius }} />
                : <img key={i} src={src} alt="" className="h-16 w-full rounded-sm object-cover" style={{ borderRadius: s.radius }} />)}
            </div>
          </div>
        );
      }
      case "faq": {
        const items = parseQA(c.items ?? "");
        const write = (arr: { q: string; a: string }[]) => set("items")(arr.map((x) => `${x.q} | ${x.a}`).join("\n"));
        return (
          <div>
            {t({ k: "title", as: "h3", className: "mb-1.5 font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "FAQ title" })}
            <div className="space-y-1" style={es("list")}>
              {items.map((it, i) => (
                <details key={i} className="group rounded-sm bg-paper px-2.5 py-2" style={{ borderRadius: s.radius }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-bold text-ink">
                    {edit ? <EditableText as="span" value={it.q} onCommit={(v) => { const arr = [...items]; arr[i] = { ...arr[i], q: v }; write(arr); }} placeholder="Question" /> : <span>{it.q}</span>}
                    <span className="flex shrink-0 items-center gap-1">
                      {edit && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); const arr = items.filter((_, j) => j !== i); write(arr); }} aria-label={`Delete question ${i + 1}`} className="rounded-sm p-0.5 text-faint hover:bg-danger-soft hover:text-danger"><Ic name="trash" size={10} /></button>
                      )}
                      <Ic name="chevD" size={10} className="transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  {edit ? <EditableText as="p" value={it.a} onCommit={(v) => { const arr = [...items]; arr[i] = { ...arr[i], a: v }; write(arr); }} className="mt-1 text-[10.5px] leading-relaxed text-mute" multiline placeholder="Answer" /> : <p className="mt-1 text-[10.5px] leading-relaxed text-mute">{it.a}</p>}
                </details>
              ))}
              {edit && (
                <button onClick={(e) => { e.stopPropagation(); write([...items, { q: "New question", a: "Write the answer here — guests see this expanded." }]); }} className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line2 py-1.5 text-[10px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep">
                  <Ic name="plus" size={11} /> Add question
                </button>
              )}
            </div>
          </div>
        );
      }
      case "guest_reviews": return (
        <div>
          {t({ k: "rating", as: "p", className: "text-[12px] font-bold text-gold", style: es("rating"), placeholder: "★★★★★" })}
          {t({ k: "quote", as: "p", className: "mt-0.5 text-[12px] italic text-ink/80", style: es("quote"), multiline: true, placeholder: "Review quote" })}
          {t({ k: "author", as: "p", className: "mt-0.5 text-[10px] font-bold text-faint", style: es("author"), placeholder: "Guest · stay" })}
        </div>
      );
      case "table": {
        const rows = parseCSV(c.rows ?? "");
        return (
          <div>
            {t({ k: "title", as: "h3", className: "mb-1.5 font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Table title" })}
            <div className="rounded-sm border border-line2 text-[10.5px] font-bold" style={{ borderRadius: s.radius, ...es("grid") }}>
              {rows.map((r, i) => (
                <div key={i} className={cx("flex px-2.5 py-1.5", i === 0 && "border-b border-line2 bg-paper")}>
                  {r.map((cell, j) => (
                    <span key={j} className={cx(j === 0 ? "flex-1" : "font-mono", "px-1")}>
                      {edit ? <EditableText as="span" value={cell} onCommit={(v) => { const arr = rows.map((x) => [...x]); arr[i][j] = v; set("rows")(arr.map((x) => x.join(",")).join("\n")); }} placeholder="cell" /> : cell}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "search_bar": return (
        <div className="flex flex-wrap items-center gap-1.5 rounded-sm border border-line2 bg-white p-1.5" style={{ borderRadius: s.radius, ...es("field") }}>
          <span className="flex-1 rounded-sm bg-paper px-2 py-1.5 text-[10px] font-bold text-faint">{c.placeholder || "Dates · guests · area"}</span>
          {t({ k: "button", className: "rounded-sm bg-brand px-3 py-1.5 text-[10px] font-bold text-white", style: { borderRadius: s.radius, ...es("button") }, placeholder: "Search" })}
        </div>
      );
      case "collection_grid": case "offerings_grid": return (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            {t({ k: "title", as: "h3", className: "font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Heading" })}
            {b.type === "collection_grid" && t({ k: "cta", className: "text-[10px] font-bold text-brand-deep", style: es("cta"), placeholder: "View all" })}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <img key={i} src={PROPERTIES[i].image} alt={PROPERTIES[i].name} className="h-20 w-full rounded-sm object-cover" style={{ borderRadius: s.radius }} />)}
          </div>
        </div>
      );
      case "collection_list": return (
        <div>
          {t({ k: "title", as: "h3", className: "mb-1.5 font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Heading" })}
          <div className="space-y-1.5">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <img src={PROPERTIES[i].image} alt={PROPERTIES[i].name} className="h-12 w-20 rounded-sm object-cover" style={{ borderRadius: s.radius }} />
                <div className="flex-1"><p className="text-[12px] font-bold text-ink">{PROPERTIES[i].name}</p><p className="text-[10px] text-mute">{PROPERTIES[i].city} · {PROPERTIES[i].maxGuests} guests</p></div>
                <span className="font-mono text-[11px] font-bold text-brand-deep">{money(PROPERTIES[i].pricing.plans[0].nightly, "IDR", { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>
      );
      case "cta_banner": return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-pine-900 px-4 py-3" style={{ borderRadius: s.radius, ...es("banner") }}>
          {t({ k: "headline", as: "p", className: "text-[12.5px] font-bold text-white", style: es("headline"), placeholder: "Headline" })}
          {t({ k: "button", className: "rounded-sm bg-brand px-3 py-1.5 text-[10.5px] font-bold text-white", style: { borderRadius: s.radius, ...es("button") }, placeholder: "Button" })}
        </div>
      );
      case "contact_form": return (
        <div>
          {t({ k: "title", as: "h3", className: "mb-1.5 font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Form title" })}
          <div className="space-y-1.5">
            <div className="h-7 rounded-sm border border-line2 bg-white" style={{ borderRadius: s.radius }} />
            <div className="h-14 rounded-sm border border-line2 bg-white" style={{ borderRadius: s.radius }} />
            {t({ k: "button", className: "inline-block rounded-sm bg-brand px-4 py-1.5 text-[10.5px] font-bold text-white", style: { borderRadius: s.radius, ...es("button") }, placeholder: "Submit" })}
          </div>
        </div>
      );
      case "icon_highlights": {
        const items = parseIconItems(c.items ?? "");
        const write = (arr: { icon: string; label: string }[]) => set("items")(arr.map((x) => `${x.icon} | ${x.label}`).join("\n"));
        const chipStyle = es("chip");
        return (
          <div>
            {t({ k: "title", as: "h3", className: "mb-2 text-center font-display text-[15px] font-bold text-ink", style: es("title"), placeholder: "Heading" })}
            <div className="flex flex-wrap items-start justify-around gap-3" style={es("list")}>
              {items.map((x, i) => (
                <HighlightChip
                  key={i}
                  icon={(ICON_NAMES.includes(x.icon as IconName) ? x.icon : "sparkle") as IconName}
                  label={x.label}
                  edit={edit}
                  chipStyle={chipStyle}
                  onIcon={(n) => { const arr = [...items]; arr[i] = { ...arr[i], icon: n }; write(arr); }}
                  onLabel={(v) => { const arr = [...items]; arr[i] = { ...arr[i], label: v }; write(arr); }}
                  onRemove={() => write(items.filter((_, j) => j !== i))}
                />
              ))}
              {edit && (
                <button onClick={(e) => { e.stopPropagation(); write([...items, { icon: "sparkle", label: "New highlight" }]); }}
                  className="mt-1 flex h-8 items-center gap-1 rounded-full border border-dashed border-line2 px-3 text-[10px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep">
                  <Ic name="plus" size={11} /> Add highlight
                </button>
              )}
            </div>
          </div>
        );
      }
      case "featured_offering": return (
        <div className="flex gap-3">
          <div style={es("image")}>{im({ k: "image", className: "h-20 w-28 shrink-0 rounded-sm", style: { borderRadius: s.radius } })}</div>
          <div className="min-w-0">
            {t({ k: "title", as: "p", className: "text-[12.5px] font-bold text-ink", style: es("title"), placeholder: "Offering name" })}
            {t({ k: "text", as: "p", className: "text-[10px] text-mute", style: es("text"), multiline: true, placeholder: "Description" })}
            {t({ k: "price", as: "p", className: "mt-1 font-mono text-[12px] font-bold text-brand-deep", style: es("price"), placeholder: "from Rp …" })}
          </div>
        </div>
      );
      default: return t({ k: "text", as: "p", className: "text-[12px] text-mute", multiline: true, placeholder: "New block — click to edit" });
    }
  })();

  return (
    <div
      className={cx(WIDTH_CLASS[s.width], "transition-all duration-200")}
      style={{
        paddingTop: len(s.padYU) ?? s.py, paddingBottom: len(s.padYU) ?? s.py,
        paddingLeft: len(s.padXU) ?? s.px, paddingRight: len(s.padXU) ?? s.px,
        marginTop: len(s.mtU) ?? s.mt, marginBottom: len(s.mbU) ?? s.mb,
        background: s.bg || undefined, color: s.color || undefined,
        fontSize: `${s.scale}em`, textAlign: s.align,
        minHeight: len(s.hU ?? (s.heightVh ? `${s.heightVh}vh` : undefined)),
        mixBlendMode: (s.blend as React.CSSProperties["mixBlendMode"]) || undefined,
      }}
    >
      {/* Content fills the block edge-to-edge — no gap between content and the
          block boundary. Spacing is a per-block style choice (Vertical /
          Horizontal padding in the inspector), not a forced wrapper inset. */}
      <div>{inner}</div>
    </div>
  );
}

// static tag helper for non-edit mode
function Tag({ as: A = "span", className, style, children, html }: { as?: "span" | "p" | "h1" | "h2" | "h3" | "div"; className?: string; style?: React.CSSProperties; children?: React.ReactNode; html?: string }) {
  return <A className={className} style={style} {...(html !== undefined ? { dangerouslySetInnerHTML: { __html: html } } : { children })} />;
}

// ── Structured Q&A list editor (FAQ blocks) ───────────────────────────────
function QaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = parseQA(value);
  const write = (arr: { q: string; a: string }[]) => onChange(arr.map((x) => `${x.q} | ${x.a}`).join("\n"));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-sm border border-line bg-paper/60 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[8.5px] font-bold uppercase tracking-wider text-faint">Q{i + 1}</span>
            <button onClick={() => write(items.filter((_, j) => j !== i))} aria-label={`Delete question ${i + 1}`} className="rounded-sm p-0.5 text-faint hover:bg-danger-soft hover:text-danger"><Ic name="trash" size={11} /></button>
          </div>
          <TextInput value={it.q} onChange={(v: string) => { const arr = [...items]; arr[i] = { ...arr[i], q: v }; write(arr); }} placeholder="Question" />
          <div className="mt-1.5">
            <TextInput value={it.a} onChange={(v: string) => { const arr = [...items]; arr[i] = { ...arr[i], a: v }; write(arr); }} multiline placeholder="Answer" />
          </div>
        </div>
      ))}
      <button onClick={() => write([...items, { q: "New question", a: "" }])} className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line2 py-1.5 text-[10px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep">
        <Ic name="plus" size={11} /> Add question
      </button>
    </div>
  );
}

// ── Structured icon-list editor (Icon Highlights blocks) ──────────────────
// Every row gets its own tappable icon chip + picker, so icons are changeable
// from the inspector as well as from the canvas.
function IconRowsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const items = parseIconItems(value);
  const write = (arr: { icon: string; label: string }[]) => onChange(arr.map((x) => `${x.icon} | ${x.label}`).join("\n"));
  const [openFor, setOpenFor] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 rounded-sm border border-line bg-paper/60 p-1.5">
          <button
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 270)), y: r.bottom + 6 });
              setOpenFor(openFor === i ? null : i);
            }}
            aria-label={`Change icon for ${it.label}`} title="Change icon"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-deep transition-all hover:scale-110 hover:ring-2 hover:ring-brand"
          >
            <Ic name={(ICON_NAMES.includes(it.icon as IconName) ? it.icon : "sparkle") as IconName} size={14} />
          </button>
          <TextInput value={it.label} onChange={(v: string) => { const arr = [...items]; arr[i] = { ...arr[i], label: v }; write(arr); }} placeholder="Highlight label" />
          <button onClick={() => write(items.filter((_, j) => j !== i))} aria-label={`Remove ${it.label}`} className="rounded-sm p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"><Ic name="trash" size={11} /></button>
        </div>
      ))}
      <button onClick={() => write([...items, { icon: "sparkle", label: "New highlight" }])} className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line2 py-1.5 text-[10px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep">
        <Ic name="plus" size={11} /> Add highlight
      </button>
      <IconPicker open={openFor !== null} pos={pos} value={openFor !== null ? items[openFor]?.icon ?? "sparkle" : "sparkle"}
        onPick={(n) => { if (openFor !== null) { const arr = [...items]; arr[openFor] = { ...arr[openFor], icon: n }; write(arr); } setOpenFor(null); }}
        onClose={() => setOpenFor(null)} />
    </div>
  );
}

// ── Inspector: Content + Style tabs for the selected block ────────────────
function InspectorTabs({ b, onContent, onStyle }: { b: Block; onContent: (patch: Record<string, string>) => void; onStyle: (patch: Partial<BlockStyle>) => void }) {
  const [tab, setTab] = useState<"content" | "style" | "elements">("content");
  const s: BlockStyle = { ...DEFAULT_BLOCK_STYLE, ...b.style };
  const c: Record<string, string> = { ...defaultBlockContent(b.type), ...b.content };
  const schema: ContentField[] = CONTENT_SCHEMA[b.type] ?? [{ key: "text", label: "Text", multiline: true }];
  const els: Record<string, ElAdjust> = s.els ?? {};
  const setEls = (next: Record<string, ElAdjust>) => onStyle({ els: next });

  const Stepper = ({ label, k, min, max, suffix, allowNegative }: { label: string; k: "py" | "px" | "mt" | "mb" | "scale" | "radius" | "heightVh"; min: number; max: number; suffix: string; allowNegative?: boolean }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold text-mute">{label}</span>
      <NumStepper value={Number(s[k] ?? 0)} onChange={(v) => onStyle({ [k]: v } as Partial<BlockStyle>)} min={min} max={max} suffix={suffix} w={92} allowNegative={allowNegative} label={label} />
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex rounded-sm border border-line bg-paper p-0.5">
        {(["content", "style", "elements"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("flex-1 rounded-sm px-2 py-1.5 text-[10.5px] font-bold capitalize transition-colors", tab === t ? "bg-ink text-white" : "text-mute hover:text-ink")}>{t}</button>
        ))}
      </div>

      {tab === "content" ? (
        <div className="space-y-2.5">
          <p className="rounded-sm bg-brand-soft/50 px-2 py-1.5 text-[9.5px] font-semibold leading-relaxed text-brand-deep">
            <Ic name="pencil" size={10} className="mr-1 inline" />You can also click any text or image directly on the canvas to edit it in place.
          </p>
          {schema.map((f) =>
            f.kind === "image" ? (
              <Ifield key={f.key} label={f.label} hint="Click the thumbnail to browse your library or upload">
                <div className="flex items-center gap-2">
                  <EditableImage src={c[f.key] ?? ""} onCommit={(v) => onContent({ [f.key]: v })} className="h-12 w-20 shrink-0 rounded-sm border border-line" alt={f.label} />
                  <TextInput value={c[f.key] ?? ""} onChange={(v) => onContent({ [f.key]: v })} placeholder="https://… or pick from library" />
                </div>
              </Ifield>
            ) : f.kind === "qa" ? (
              <Ifield key={f.key} label={f.label}>
                <QaEditor value={c[f.key] ?? ""} onChange={(v) => onContent({ [f.key]: v })} />
              </Ifield>
            ) : f.kind === "icons" ? (
              <Ifield key={f.key} label={f.label} hint="Tap the circle to swap an icon · labels edit in place">
                <IconRowsEditor value={c[f.key] ?? ""} onChange={(v) => onContent({ [f.key]: v })} />
              </Ifield>
            ) : (
              <Ifield key={f.key} label={f.label} hint={f.hint}>
                <TextInput value={c[f.key] ?? ""} onChange={(v) => onContent({ [f.key]: v })} multiline={f.multiline} placeholder={f.label} />
              </Ifield>
            ),
          )}
        </div>
      ) : tab === "style" ? (
        <div className="space-y-2.5">
          <Ifield label="Width">
            <SegBtns options={[{ v: "full" as const, l: "Full" }, { v: "wide" as const, l: "Wide" }, { v: "mid" as const, l: "Mid" }, { v: "half" as const, l: "Half" }]} value={s.width} onChange={(v) => onStyle({ width: v })} />
          </Ifield>
          <Ifield label="Alignment">
            <SegBtns options={[{ v: "left" as const, l: "L" }, { v: "center" as const, l: "C" }, { v: "right" as const, l: "R" }]} value={s.align} onChange={(v) => onStyle({ align: v })} />
          </Ifield>
          <div className="space-y-2 rounded-sm border border-line bg-paper/60 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-faint">Spacing & size — any unit: px · % · em · rem · vh · vw</p>
            <div className="grid grid-cols-2 gap-1.5">
              <UnitField label="Height" value={s.hU ?? (s.heightVh ? `${s.heightVh}vh` : "")} onChange={(v) => onStyle({ hU: v, heightVh: undefined })} />
              <UnitField label="Radius" value={s.radius ? `${s.radius}px` : ""} onChange={(v) => onStyle({ radius: Number(v.replace(/[^\d.]/g, "")) || 0 })} units={["px", "rem", "%"]} />
              <UnitField label="Padding V" value={s.padYU ?? (s.py ? `${s.py}px` : "")} onChange={(v) => onStyle({ padYU: v })} />
              <UnitField label="Padding H" value={s.padXU ?? (s.px ? `${s.px}px` : "")} onChange={(v) => onStyle({ padXU: v })} />
              <UnitField label="Margin top" value={s.mtU ?? (s.mt ? `${s.mt}px` : "")} onChange={(v) => onStyle({ mtU: v })} />
              <UnitField label="Margin bottom" value={s.mbU ?? (s.mb ? `${s.mb}px` : "")} onChange={(v) => onStyle({ mbU: v })} />
            </div>
            <Stepper label="Type scale" k="scale" min={0.7} max={1.6} suffix="×" />
            <p className="rounded-sm bg-brand-soft/50 px-2 py-1.5 text-[9px] font-semibold leading-relaxed text-brand-deep">
              <Ic name="monitor" size={10} className="mr-1 inline" />vh / vw resolve against the simulated device frame in the canvas — set 100vh and it fills exactly one screen-height of that device.
            </p>
          </div>
          <div className="space-y-2 rounded-sm border border-line bg-paper/60 p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-faint">Colour & blend</p>
            <ColorField label="Background" value={s.bg} onChange={(v) => onStyle({ bg: v })} allowNone />
            <ColorField label="Text colour" value={s.color} onChange={(v) => onStyle({ color: v })} allowNone />
          </div>
          <Btn size="xs" variant="ghost" icon="undo" onClick={() => onStyle({ ...DEFAULT_BLOCK_STYLE })}>Reset styling</Btn>
        </div>
      ) : (
        <ElementsTab b={b} els={els} setEls={setEls} />
      )}
    </div>
  );
}

// ── Elements tab: adjust every text / image / button / container in a block ─
function ElementsTab({ b, els, setEls }: { b: Block; els: Record<string, ElAdjust>; setEls: (e: Record<string, ElAdjust>) => void }) {
  const defs = ELEMENTS[b.type] ?? [];
  const [selEl, setSelEl] = useState(defs[0]?.id ?? "");
  const a: ElAdjust = els[selEl] ?? {};
  const set = (patch: Partial<ElAdjust>) => setEls({ ...els, [selEl]: { ...a, ...patch } });
  const kindIcon: Record<string, IconName> = { text: "doc", image: "image", button: "bolt", container: "grid" };

  if (!defs.length) return <p className="text-[11px] text-mute">This block has no individually adjustable elements.</p>;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1">
        {defs.map((d) => (
          <button key={d.id} onClick={() => setSelEl(d.id)}
            className={cx("flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-bold transition-colors",
              selEl === d.id ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-card text-mute hover:text-ink")}
            aria-pressed={selEl === d.id}>
            <Ic name={kindIcon[d.kind]} size={10} /> {d.label}
            {els[d.id] && Object.keys(els[d.id]).length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="adjusted" />}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-sm border border-line bg-paper/60 p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-faint">Position & transform — {defs.find((d) => d.id === selEl)?.label}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <UnitField label="Offset X" value={a.x ?? ""} onChange={(v) => set({ x: v || undefined })} units={["px", "%", "em", "rem"]} />
          <UnitField label="Offset Y" value={a.y ?? ""} onChange={(v) => set({ y: v || undefined })} units={["px", "%", "em", "rem"]} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-mute">Scale</span>
          <NumStepper value={a.scale ?? 1} onChange={(v) => set({ scale: v })} min={0.1} max={3} step={0.05} suffix="×" w={92} allowNegative={false} label="Scale" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-mute">Rotate</span>
          <NumStepper value={a.rot ?? 0} onChange={(v) => set({ rot: v })} min={-180} max={180} step={5} suffix="°" w={92} label="Rotate" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-mute">Opacity</span>
          <NumStepper value={a.opacity ?? 100} onChange={(v) => set({ opacity: v })} min={0} max={100} step={5} suffix="%" w={92} allowNegative={false} label="Opacity" />
        </div>
      </div>

      <div className="space-y-2 rounded-sm border border-line bg-paper/60 p-2.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-faint">Appearance</p>
        <UnitField label="Font size" value={a.fs ?? ""} onChange={(v) => set({ fs: v || undefined })} />
        <div className="grid grid-cols-2 gap-1.5">
          <UnitField label="Pad X" value={a.padX ?? ""} onChange={(v) => set({ padX: v || undefined })} units={["px", "em", "rem", "%"]} />
          <UnitField label="Pad Y" value={a.padY ?? ""} onChange={(v) => set({ padY: v || undefined })} units={["px", "em", "rem", "%"]} />
        </div>
        <UnitField label="Corner radius" value={a.radius ?? ""} onChange={(v) => set({ radius: v || undefined })} units={["px", "rem", "%"]} />
        <div className="grid grid-cols-2 gap-1.5">
          <ColorField label="Text colour" value={a.color ?? ""} onChange={(v) => set({ color: v || undefined })} allowNone />
          <ColorField label="Background" value={a.bg ?? ""} onChange={(v) => set({ bg: v || undefined })} allowNone />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-mute">Alignment</span>
          <SegBtns options={[{ v: "left" as const, l: "L" }, { v: "center" as const, l: "C" }, { v: "right" as const, l: "R" }]} value={a.align ?? "left"} onChange={(v) => set({ align: v })} />
        </div>
      </div>

      <Btn size="xs" variant="ghost" icon="undo" onClick={() => { const next = { ...els }; delete next[selEl]; setEls(next); }}>Reset this element</Btn>
    </div>
  );
}

// ── Collections: store-driven, with create / edit / preview / delete ──────
function CollectionsTab() {
  const { collections, updateCollection, addCollection, removeCollection, toast } = useApp();
  const [editId, setEditId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const editing = collections.find((c) => c.id === editId) ?? null;
  const previewing = collections.find((c) => c.id === prevId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-mute">Manual or rule-based groupings — each gets its own landing page on your site.</p>
        <Btn size="sm" icon="plus" onClick={() => addCollection()}>New collection</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {collections.map((c) => (
          <div key={c.id} className="rounded-lg border border-line bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[13.5px] font-bold text-ink">{c.name}</p>
              {c.featured && <Badge tone="warn">featured</Badge>}
            </div>
            <p className="mt-0.5 font-mono text-[10.5px] text-mute">/{c.slug} · {c.rule} · {c.itemIds.length} listings</p>
            <div className="mt-2.5 flex gap-1.5">
              {c.itemIds.slice(0, 4).map((id) => propertyById(id) && (
                <span key={id} className="h-10 w-14 overflow-hidden rounded-sm border border-line"><img src={propertyById(id).image} alt={propertyById(id).name} className="h-full w-full object-cover" loading="lazy" /></span>
              ))}
            </div>
            <div className="mt-2.5 flex gap-1.5">
              <Btn size="xs" icon="external" onClick={() => setPrevId(c.id)}>Open page</Btn>
              <Btn size="xs" variant="ghost" icon="pencil" onClick={() => setEditId(c.id)}>Edit</Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Edit */}
      <Modal open={!!editing} onClose={() => setEditId(null)} title={`Edit collection — ${editing?.name ?? ""}`} w={480}
        footer={<>
          <Btn variant="ghost" icon="trash" onClick={() => { if (editing) { removeCollection(editing.id); setEditId(null); } }}>Delete</Btn>
          <Btn variant="solid" onClick={() => { setEditId(null); toast("ok", "Collection saved", "Landing page republished."); }}>Done</Btn>
        </>}>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><Input value={editing.name} onChange={(e) => updateCollection(editing.id, { name: e.target.value })} /></Field>
              <Field label="Slug"><Input value={editing.slug} onChange={(e) => updateCollection(editing.id, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="font-mono" /></Field>
            </div>
            <label className="flex items-center gap-2 text-[12px] font-bold text-ink"><Toggle checked={editing.featured} onChange={(v) => updateCollection(editing.id, { featured: v })} label="Featured on home page" /> Featured on the home page</label>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">Listings in this collection</p>
              {PROPERTIES.filter((p) => !p.archived).map((p) => {
                const on = editing.itemIds.includes(p.id);
                return (
                  <label key={p.id} className="mb-1 flex cursor-pointer items-center gap-2.5 rounded-sm border border-line px-2.5 py-1.5">
                    <input type="checkbox" checked={on} onChange={() => updateCollection(editing.id, { itemIds: on ? editing.itemIds.filter((x) => x !== p.id) : [...editing.itemIds, p.id] })} className="accent-brand" aria-label={`Include ${p.name}`} />
                    <img src={p.image} alt="" className="h-7 w-10 rounded-sm object-cover" />
                    <span className="text-[11.5px] font-bold text-ink">{p.name}</span>
                    <span className="ml-auto font-mono text-[9.5px] text-faint">{p.city}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Landing-page preview */}
      <Modal open={!!previewing} onClose={() => setPrevId(null)} title={`/${previewing?.slug ?? ""} — guest view`} w={680}
        footer={<><Btn variant="ghost" onClick={() => setPrevId(null)}>Close</Btn><Btn variant="solid" icon="copy" onClick={() => { if (previewing) { copyText(`https://stay.sanggraha.co/${previewing.slug}`); toast("ok", "Landing page URL copied"); } }}>Copy URL</Btn></>}>
        {previewing && (
          <div className="overflow-hidden rounded-sm border border-line">
            <div className="bg-pine-900 px-5 py-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#3fb98c]">Sanggraha collection</p>
              <p className="mt-1 font-display text-[26px] font-bold uppercase tracking-tight text-white">{previewing.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-paper p-4 sm:grid-cols-3">
              {previewing.itemIds.map((id) => propertyById(id) && (
                <div key={id} className="overflow-hidden rounded-sm border border-line bg-card">
                  <img src={propertyById(id).image} alt={propertyById(id).name} className="h-24 w-full object-cover" />
                  <div className="p-2">
                    <p className="text-[11.5px] font-bold text-ink">{propertyById(id).name}</p>
                    <p className="font-mono text-[10px] text-mute">{propertyById(id).city} · {money(propertyById(id).pricing.plans[0].nightly, "IDR", { compact: true })}/nt</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
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
  const { widgetStyle: st, setWidgetStyle, toast, navigate } = useApp();
  const [copied, setCopied] = useState("");
  const [widget, setWidget] = useState<"search" | "calendar" | "chatbot">("search");
  const [propId, setPropId] = useState(PROPERTIES[0].id);
  const copy = (key: string, text: string) => { copyText(text); setCopied(key); toast("ok", "Embed code copied", "Auto-resizing — the widget grows with its content, never clipped."); setTimeout(() => setCopied(""), 1500); };

  const ColorRow = ({ label, k }: { label: string; k: "bg" | "card" | "text" | "sub" | "accent" | "borderColor" }) => (
    <label className="flex items-center justify-between gap-2 text-[11.5px] font-bold text-ink">
      {label}
      <input type="color" value={st[k]} onChange={(e) => setWidgetStyle({ [k]: e.target.value })} className="h-7 w-12 cursor-pointer rounded-sm border border-line bg-card" aria-label={`${label} colour`} />
    </label>
  );
  const S = ({ label, k, min, max, unit }: { label: string; k: "borderW" | "radius" | "gap" | "pad" | "fontSize" | "btnRadius"; min: number; max: number; unit: string }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-bold text-ink">{label}</span>
      <NumStepper value={st[k]} onChange={(v) => setWidgetStyle({ [k]: v })} min={min} max={max} suffix={unit} w={104} label={label} allowNegative={false} />
    </div>
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
              <button onClick={() => setWidget("chatbot")} className={cx("flex items-center gap-1 rounded-sm px-2.5 py-1 text-[11px] font-bold", widget === "chatbot" ? "bg-pine-900 text-white" : "text-mute")}><Ic name="chat" size={11} /> Concierge chatbot</button>
            </div>
            <Select value={propId} onChange={(e) => setPropId(e.target.value)} className="!w-[160px]" aria-label="Widget property">
              {PROPERTIES.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          {/* Host page mock — grows with content */}
          <div className="rounded-sm border-2 border-dashed border-line2 bg-[#eef0ea] p-4">
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-faint">yourwebsite.com · hostile CSS framework loaded · widget below</p>
            <div style={{ fontSize: st.fontSize, fontFamily: st.fontFamily || undefined, color: st.text, background: st.bg, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, padding: st.pad, transition: "all .2s" }}>
              {widget === "search" ? <SearchWidgetPreview st={st} /> : widget === "calendar" ? <CalendarWidgetPreview st={st} propId={propId} /> : <ChatbotPreview st={st} onBooked={(ref) => navigate(`/pay/${ref}`)} />}
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
