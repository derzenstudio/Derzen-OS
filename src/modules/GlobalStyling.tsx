import { useState } from "react";
import { cx, moneyRaw } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Field, Input, Toggle } from "../components/ui";
import { NumStepper, ColorField, Segmented } from "../components/controls";
import { useApp } from "../store";
import { DEFAULT_BRAND } from "../lib/brand";
import { PROPERTIES, SERVICES } from "../lib/data";

const SCOPES = [
  { id: "websites", label: "Websites & page builder", icon: "globe" as const, note: "Default for every new block — overridable per block" },
  { id: "widgets", label: "Embeddable widgets", icon: "code" as const, note: "Search, calendar & chatbot embeds" },
  { id: "quotes", label: "Quotes & invoices", icon: "doc" as const, note: "PDFs guests download" },
  { id: "emails", label: "Transactional emails", icon: "mail" as const, note: "Confirmations, reminders, receipts" },
  { id: "guidebooks", label: "Guidebooks", icon: "book" as const, note: "Guest-facing property guides" },
];

export default function GlobalStyling() {
  const { brand, setBrand, toast } = useApp();
  const [scopes, setScopes] = useState<Record<string, boolean>>({ websites: true, widgets: true, quotes: true, emails: true, guidebooks: true });
  const [headingFile, setHeadingFile] = useState(brand.headingWoff2);
  const [bodyFile, setBodyFile] = useState(brand.bodyWoff2);
  const resetCount = Object.entries(brand).filter(([k, v]) => (DEFAULT_BRAND as never as Record<string, unknown>)[k] !== v).length;

  const fake = { file: (set: (v: string) => void, kind: string) => {
    const name = `${kind}-custom.woff2`;
    set(name);
    toast("ok", "Font uploaded", `${name} → hosted at /fonts/ · served with CORS + font-display: swap`);
  }};

  return (
    <div className="space-y-5">
      {/* Intro strip */}
      <div className="frame flex flex-wrap items-center gap-4 rounded-lg bg-card px-5 py-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-ink text-[#3fb98c]"><Ic name="palette" size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-display text-[17px] font-bold text-ink">
            One brand, every surface
            <Badge tone="ok">live everywhere</Badge>
            {resetCount > 0 && <Badge tone="warn">{resetCount} customised</Badge>}
          </p>
          <p className="mt-0.5 max-w-[70ch] text-[12.5px] leading-relaxed text-mute">
            Fonts, palette, borders and card treatment set here flow into your websites, widgets, quotes, invoices,
            emails and guidebooks. Individual blocks and widgets can still override anything later.
          </p>
        </div>
        <Btn variant="ghost" icon="undo" onClick={() => { setBrand({ ...DEFAULT_BRAND }); toast("info", "Brand reset to defaults"); }}>Reset</Btn>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_1fr]">
        {/* ── Controls ── */}
        <div className="space-y-4">
          {/* Typography */}
          <section className="rounded-lg border border-line bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="doc" size={14} className="text-brand" /> Typography — heading & body are separate</h3>
            {([
              { k: "heading" as const, label: "Heading font", family: brand.headingFamily, url: brand.headingUrl, file: headingFile, setFile: setHeadingFile, sample: "Boutique Bali, run properly." },
              { k: "body" as const, label: "Body font", family: brand.bodyFamily, url: brand.bodyUrl, file: bodyFile, setFile: setBodyFile, sample: "Nine staffed villas with honest pricing and real hosts on call." },
            ]).map((f) => (
              <div key={f.k} className="mb-4 rounded-md border border-line bg-paper/50 p-3 last:mb-0">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">{f.label}</p>
                  <p className="truncate text-[15px] font-bold text-ink" style={{ fontFamily: `'${f.family}', sans-serif` }}>{f.sample}</p>
                </div>
                <Field label="Family name">
                  <Input value={f.family} onChange={(e) => setBrand(f.k === "heading" ? { headingFamily: e.target.value } : { bodyFamily: e.target.value })} className="font-mono !text-[11.5px]" />
                </Field>
                <Field label="Stylesheet link (CSS)" hint="Google Fonts or any hosted CSS">
                  <Input value={f.url} onChange={(e) => setBrand(f.k === "heading" ? { headingUrl: e.target.value } : { bodyUrl: e.target.value })} placeholder="https://fonts.googleapis.com/css2?family=…" className="font-mono !text-[10.5px]" />
                </Field>
                <div className="flex items-center gap-2">
                  <button onClick={() => fake.file(f.setFile, f.k)} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm border border-dashed border-line2 text-[11px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep">
                    <Ic name="download" size={12} /> {f.file || `Upload .woff2`}
                  </button>
                  {f.file && <button onClick={() => { f.setFile(""); setBrand(f.k === "heading" ? { headingWoff2: "" } : { bodyWoff2: "" }); }} aria-label="Remove uploaded font" className="rounded-sm p-1.5 text-mute hover:bg-danger-soft hover:text-danger"><Ic name="x" size={12} /></button>}
                </div>
              </div>
            ))}
          </section>

          {/* Palette */}
          <section className="rounded-lg border border-line bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="droplet" size={14} className="text-brand" /> Colour palette — with opacity & blend</h3>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primary / brand" value={brand.primary} onChange={(v) => setBrand({ primary: v })} blend={undefined} />
              <ColorField label="Accent" value={brand.accent} onChange={(v) => setBrand({ accent: v })} />
              <ColorField label="Ink (text)" value={brand.ink} onChange={(v) => setBrand({ ink: v })} />
              <ColorField label="Paper (cards)" value={brand.paper} onChange={(v) => setBrand({ paper: v })} />
            </div>
            <p className="mt-3 flex items-center gap-2 rounded-sm bg-paper px-3 py-2 text-[10.5px] text-mute"><Ic name="info" size={12} className="shrink-0" /> Alpha is baked into the hex (8 digits). Contrast is clamped automatically on guest surfaces so text stays readable.</p>
          </section>

          {/* Cards & borders */}
          <section className="rounded-lg border border-line bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="kanban" size={14} className="text-brand" /> Cards, borders & buttons</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Card corner radius"><NumStepper value={brand.radius} onChange={(v) => setBrand({ radius: v })} min={0} max={28} suffix="px" w={92} allowNegative={false} /></Field>
              <Field label="Border thickness"><NumStepper value={brand.borderW} onChange={(v) => setBrand({ borderW: v })} min={0} max={4} suffix="px" w={92} allowNegative={false} /></Field>
            </div>
            <div className="mt-3 grid grid-cols-2 items-end gap-3">
              <ColorField label="Border colour" value={brand.borderColor} onChange={(v) => setBrand({ borderColor: v })} />
              <Field label="Card shadow">
                <Segmented options={[{ v: "none" as const, l: "None" }, { v: "soft" as const, l: "Soft" }, { v: "lifted" as const, l: "Lifted" }]} value={brand.shadow} onChange={(v) => setBrand({ shadow: v })} />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-2 items-end gap-3">
              <Field label="Button style">
                <Segmented options={[{ v: "solid" as const, l: "Solid" }, { v: "outline" as const, l: "Outline" }, { v: "soft" as const, l: "Soft" }]} value={brand.btn} onChange={(v) => setBrand({ btn: v })} />
              </Field>
              <Field label="Button radius"><NumStepper value={brand.btnRadius} onChange={(v) => setBrand({ btnRadius: v })} min={0} max={24} suffix="px" w={92} allowNegative={false} /></Field>
            </div>
          </section>

          {/* Sync scopes */}
          <section className="rounded-lg border border-line bg-card p-4">
            <h3 className="mb-1 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="refresh" size={14} className="text-brand" /> Where it applies</h3>
            <p className="mb-3 text-[11px] text-mute">Turn a surface off to keep its current look.</p>
            {SCOPES.map((s) => (
              <label key={s.id} className="mb-1.5 flex items-center gap-3 rounded-md border border-line px-3 py-2.5 transition-colors hover:border-line2">
                <Ic name={s.icon} size={15} className={scopes[s.id] ? "text-brand" : "text-faint"} />
                <span className="min-w-0 flex-1">
                  <span className={cx("block text-[12.5px] font-bold", scopes[s.id] ? "text-ink" : "text-mute")}>{s.label}</span>
                  <span className="block text-[10px] text-faint">{s.note}</span>
                </span>
                <Toggle checked={scopes[s.id]} onChange={(v) => { setScopes((x) => ({ ...x, [s.id]: v })); toast("info", `${s.label} ${v ? "synced with brand" : "kept as-is"}`); }} label={`Apply brand to ${s.label}`} />
              </label>
            ))}
          </section>
        </div>

        {/* ── Live previews ── */}
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-faint"><span className="h-1.5 w-1.5 rounded-full bg-brand dot-pulse" /> Everything below re-renders as you type</p>

          {/* Website */}
          <section className="overflow-hidden rounded-lg border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-4 py-2">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Website & page builder</p>
              <Badge tone={scopes.websites ? "ok" : "mute"}>{scopes.websites ? "synced" : "detached"}</Badge>
            </header>
            <div className={cx("transition-opacity", !scopes.websites && "opacity-40")}>
              <div className="flex items-center justify-between px-5 py-3" style={{ background: brand.ink, borderRadius: 0 }}>
                <p className="font-bold text-[13px]" style={{ fontFamily: `'${brand.headingFamily}', sans-serif`, color: brand.paper }}>Sanggraha Villas</p>
                <div className="flex gap-4 text-[10.5px] font-semibold" style={{ color: brand.paper, opacity: 0.75 }}>
                  <span>Villas</span><span>Services</span><span>Journal</span>
                </div>
              </div>
              <div style={{ background: brand.paper, padding: 20 }}>
                <div style={{ border: `${brand.borderW}px solid ${brand.borderColor}`, borderRadius: brand.radius, overflow: "hidden", boxShadow: brand.shadow === "none" ? "none" : brand.shadow === "soft" ? "0 1px 3px rgba(20,24,17,0.08)" : "0 10px 30px -12px rgba(20,24,17,0.25)" }}>
                  <img src={PROPERTIES[0].image} alt="" className="h-28 w-full object-cover" />
                  <div className="p-4">
                    <p className="text-[16px] font-bold" style={{ fontFamily: `'${brand.headingFamily}', sans-serif`, color: brand.ink }}>{PROPERTIES[0].name}</p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: brand.ink, opacity: 0.65 }}>{PROPERTIES[0].city} · {PROPERTIES[0].maxGuests} guests · from {moneyRaw(PROPERTIES[0].pricing.plans[0].nightly, "IDR", { compact: true })}/night</p>
                    <button className="mt-3 px-4 py-2 text-[11.5px] font-bold" style={{ background: brand.btn === "outline" ? "transparent" : brand.btn === "soft" ? `${brand.primary}22` : brand.primary, color: brand.btn === "solid" ? "#fff" : brand.primary, border: brand.btn === "outline" ? `1.5px solid ${brand.primary}` : "none", borderRadius: brand.btnRadius }}>
                      Check availability
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Widgets */}
          <section className="overflow-hidden rounded-lg border border-line bg-card">
            <header className="flex items-center justify-between border-b border-line px-4 py-2">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Embeddable widgets</p>
              <Badge tone={scopes.widgets ? "ok" : "mute"}>{scopes.widgets ? "synced" : "detached"}</Badge>
            </header>
            <div className={cx("p-4 transition-opacity", !scopes.widgets && "opacity-40")} style={{ background: brand.paper }}>
              <div className="flex flex-wrap items-center gap-2" style={{ border: `${brand.borderW}px solid ${brand.borderColor}`, borderRadius: brand.radius, padding: 10, fontFamily: `'${brand.bodyFamily}', sans-serif` }}>
                {["12 Mar → 17 Mar", "4 guests", "Uluwatu"].map((t) => (
                  <span key={t} className="text-[11px] font-semibold" style={{ background: `${brand.ink}0a`, border: `${Math.min(brand.borderW, 1)}px solid ${brand.borderColor}`, borderRadius: Math.max(2, brand.radius - 2), padding: "6px 10px", color: brand.ink }}>{t}</span>
                ))}
                <button className="ml-auto text-[11px] font-bold" style={{ background: brand.btn === "outline" ? "transparent" : brand.primary, color: brand.btn === "solid" ? "#fff" : brand.primary, border: brand.btn === "outline" ? `1.5px solid ${brand.primary}` : "none", borderRadius: brand.btnRadius, padding: "6px 14px" }}>Search</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Invoice */}
            <section className="overflow-hidden rounded-lg border border-line bg-card">
              <header className="flex items-center justify-between border-b border-line px-4 py-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Quotes & invoices (PDF)</p>
                <Badge tone={scopes.quotes ? "ok" : "mute"}>{scopes.quotes ? "synced" : "detached"}</Badge>
              </header>
              <div className={cx("p-4 transition-opacity", !scopes.quotes && "opacity-40")} style={{ background: brand.paper }}>
                <div style={{ border: `${brand.borderW}px solid ${brand.borderColor}`, borderRadius: brand.radius, padding: 14, fontFamily: `'${brand.bodyFamily}', sans-serif` }}>
                  <div className="flex items-start justify-between border-b pb-2" style={{ borderColor: brand.primary, borderBottomWidth: 2 }}>
                    <p className="text-[14px] font-bold" style={{ fontFamily: `'${brand.headingFamily}', sans-serif`, color: brand.ink }}>Sanggraha Villas</p>
                    <p className="font-mono text-[10px]" style={{ color: brand.ink, opacity: 0.55 }}>INV-2026-041</p>
                  </div>
                  <div className="mt-2 space-y-1 text-[10.5px]" style={{ color: brand.ink }}>
                    <p className="flex justify-between"><span style={{ opacity: 0.6 }}>Villa Anggrek · 5 nights</span><span className="font-mono">{moneyRaw(21_000_000, "IDR", { compact: true })}</span></p>
                    <p className="flex justify-between"><span style={{ opacity: 0.6 }}>Cleaning + service</span><span className="font-mono">{moneyRaw(1_450_000, "IDR", { compact: true })}</span></p>
                    <p className="flex justify-between border-t pt-1 font-bold" style={{ borderColor: brand.borderColor }}><span>Total</span><span className="font-mono" style={{ color: brand.primary }}>{moneyRaw(22_450_000, "IDR", { compact: true })}</span></p>
                  </div>
                </div>
              </div>
            </section>

            {/* Email */}
            <section className="overflow-hidden rounded-lg border border-line bg-card">
              <header className="flex items-center justify-between border-b border-line px-4 py-2">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Transactional email</p>
                <Badge tone={scopes.emails ? "ok" : "mute"}>{scopes.emails ? "synced" : "detached"}</Badge>
              </header>
              <div className={cx("p-4 transition-opacity", !scopes.emails && "opacity-40")} style={{ background: brand.paper }}>
                <div style={{ border: `${brand.borderW}px solid ${brand.borderColor}`, borderRadius: brand.radius, overflow: "hidden", fontFamily: `'${brand.bodyFamily}', sans-serif` }}>
                  <div className="px-4 py-2.5" style={{ background: brand.ink }}>
                    <p className="text-[12px] font-bold" style={{ fontFamily: `'${brand.headingFamily}', sans-serif`, color: brand.paper }}>Your stay is confirmed ✓</p>
                  </div>
                  <div className="space-y-2 p-4 text-[10.5px]" style={{ color: brand.ink }}>
                    <p style={{ opacity: 0.7 }}>Hi Jonas — Villa Anggrek, 12–17 March. Kadek will meet you at the gate at 14:00 WITA.</p>
                    <button className="px-3.5 py-1.5 text-[10.5px] font-bold" style={{ background: brand.primary, color: "#fff", border: "none", borderRadius: brand.btnRadius }}>View guidebook</button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <p className="rounded-lg border border-line bg-card px-4 py-3 text-[11px] leading-relaxed text-mute">
            <b className="text-ink">How overrides work.</b> These values are the defaults. In the page builder, every block's style panel
            starts from them and can deviate per block; the widget studio applies them to all embeds and lets you tune per widget.
            Guest-facing contrast is enforced at render time, so a dark primary on dark paper can never produce unreadable text.
            Services like {SERVICES[0]?.name ?? "spa"} checkout pages inherit the same treatment.
          </p>
        </div>
      </div>
    </div>
  );
}
