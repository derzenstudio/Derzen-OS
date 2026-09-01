import { useState } from "react";
import { cx, moneyRaw } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Toggle } from "../components/ui";
import { EditableText } from "../components/editor";
import { NumStepper, ColorField } from "../components/controls";
import { useApp } from "../store";
import { brandVars } from "../lib/brand";
import type { InvoiceTemplate } from "../lib/types";

// One reorderable, inline-editable invoice section.
const SECTION_META: Record<string, { label: string; icon: IconName }> = {
  brand: { label: "Brand header", icon: "home" },
  billto: { label: "Billed to", icon: "user" },
  items: { label: "Line items", icon: "list" },
  totals: { label: "Totals", icon: "calc" },
  terms: { label: "Terms & note", icon: "doc" },
  footer: { label: "Footer", icon: "info" },
};

export default function InvoiceDesigner() {
  const { invoiceTemplate: t, setInvoiceTemplate: setT, emailTemplate: e, setEmailTemplate: setE, brand, toast } = useApp();
  const [mode, setMode] = useState<"invoice" | "email">("invoice");
  const [sel, setSel] = useState<string | null>(null);

  // brand-synced palette: when on, the invoice inherits the global brand
  const accent = t.brandSync ? brand.primary : t.accent;
  const ink = t.brandSync ? brand.ink : t.ink;
  const paper = t.brandSync ? brand.paper : t.paper;
  const radius = t.brandSync ? brand.radius : t.radius;
  const heading = t.brandSync ? brand.headingFamily : t.headingFamily;
  const body = t.brandSync ? brand.bodyFamily : t.bodyFamily;

  const move = (id: string, dir: -1 | 1) => {
    const arr = [...t.sections];
    const i = arr.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setT({ sections: arr });
  };

  const sampleItems: [string, number][] = [
    ["Villa Anggrek · 5 nights", 21_000_000],
    ["Cleaning fee", 400_000],
    ["Service (5%)", 1_050_000],
  ];
  const total = sampleItems.reduce((s, [, v]) => s + v, 0);

  // function-call helper (stable EditableText identity — no remount mid-typing)
  const et = (p: { k: keyof InvoiceTemplate; className?: string; style?: React.CSSProperties; multiline?: boolean; placeholder?: string; as?: "span" | "p" | "h1" | "h2" | "h3" | "div" }) => (
    <EditableText as={p.as ?? "span"} value={String(t[p.k] ?? "")} onCommit={(v) => setT({ [p.k]: v } as Partial<InvoiceTemplate>)} className={p.className} style={p.style} multiline={p.multiline} placeholder={p.placeholder} />
  );

  const sectionBody = (id: string) => {
    switch (id) {
      case "brand":
        return (
          <div className="flex items-start justify-between gap-3 border-b-2 pb-3" style={{ borderColor: accent }}>
            <div>
              {t.showLogo && (
                <span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-sm font-display text-[15px] font-bold text-white" style={{ background: accent, borderRadius: radius }}>{(t.businessName || "S")[0]}</span>
              )}
              {et({ k: "businessName", as: "h2", className: "block font-display text-[19px] font-bold leading-tight", style: { fontFamily: `'${heading}', sans-serif`, color: ink }, placeholder: "Business name" })}
              {et({ k: "businessAddr", as: "p", className: "mt-0.5 block text-[10px] leading-relaxed", style: { fontFamily: `'${body}', sans-serif`, color: ink, opacity: 0.65 }, multiline: true, placeholder: "Address" })}
              {et({ k: "businessMeta", as: "p", className: "mt-0.5 block font-mono text-[8.5px]", style: { color: ink, opacity: 0.5 }, placeholder: "Tax / contact line" })}
            </div>
            <div className="text-right">
              {et({ k: "invoiceWord", as: "p", className: "block font-display text-[24px] font-bold uppercase tracking-wide", style: { fontFamily: `'${heading}', sans-serif`, color: accent }, placeholder: "INVOICE" })}
              <p className="font-mono text-[9px]" style={{ color: ink, opacity: 0.5 }}>INV-2026-041 · {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        );
      case "billto":
        return (
          <div>
            <p className="text-[8.5px] font-bold uppercase tracking-widest" style={{ color: accent }}>Billed to</p>
            <p className="mt-0.5 text-[12px] font-bold" style={{ fontFamily: `'${body}', sans-serif`, color: ink }}>Jonas Weber</p>
            <p className="text-[10px]" style={{ color: ink, opacity: 0.6 }}>jonas@example.com · R-2418</p>
          </div>
        );
      case "items":
        return (
          <div className="overflow-hidden rounded-sm" style={{ border: `1px solid ${accent}33`, borderRadius: radius }}>
            <div className="flex px-3 py-1.5 text-[8.5px] font-bold uppercase tracking-widest text-white" style={{ background: accent }}>
              <span className="flex-1">Description</span><span className="w-24 text-right">Amount</span>
            </div>
            {sampleItems.map(([label, v]) => (
              <div key={label} className="flex items-center px-3 py-1.5 text-[10.5px]" style={{ color: ink, borderTop: `1px solid ${accent}1a` }}>
                <span className="flex-1" style={{ fontFamily: `'${body}', sans-serif` }}>{label}</span>
                <span className="w-24 text-right font-mono font-semibold">{moneyRaw(v, "IDR", { compact: true })}</span>
              </div>
            ))}
          </div>
        );
      case "totals":
        return (
          <div className="ml-auto w-56 space-y-1">
            <div className="flex justify-between text-[10.5px]" style={{ color: ink, opacity: 0.7 }}><span>Subtotal</span><span className="font-mono">{moneyRaw(total, "IDR", { compact: true })}</span></div>
            <div className="flex justify-between text-[10.5px]" style={{ color: ink, opacity: 0.7 }}><span>Tax (incl.)</span><span className="font-mono">—</span></div>
            <div className="flex justify-between border-t-2 pt-1.5 text-[13px] font-bold" style={{ borderColor: accent, color: ink }}>
              <span style={{ fontFamily: `'${heading}', sans-serif` }}>Total</span><span className="font-mono" style={{ color: accent }}>{moneyRaw(total, "IDR", { compact: true })}</span>
            </div>
          </div>
        );
      case "terms":
        return (
          <div className="rounded-sm px-3 py-2" style={{ background: `${accent}0d`, borderRadius: radius }}>
            {et({ k: "termsText", as: "p", className: "block text-[9.5px] leading-relaxed", style: { color: ink, opacity: 0.75, fontFamily: `'${body}', sans-serif` }, multiline: true, placeholder: "Payment terms" })}
            {et({ k: "note", as: "p", className: "mt-1 block text-[10px] font-semibold italic", style: { color: accent }, placeholder: "Thank-you note" })}
          </div>
        );
      case "footer":
        return et({ k: "footerText", as: "p", className: "block border-t pt-2 text-center text-[8.5px]", style: { borderColor: `${accent}33`, color: ink, opacity: 0.5 }, placeholder: "Footer line" });
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {(["invoice", "email"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setSel(null); }} className={cx("rounded-md px-3.5 py-1.5 text-[12px] font-bold capitalize", mode === m ? "bg-pine-900 text-white" : "text-mute")}>{m === "invoice" ? "Invoice / PDF" : "Email"}</button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[11.5px] font-bold text-mute">
          <Toggle checked={t.brandSync} onChange={(v) => setT({ brandSync: v })} label="Sync with Global Styling" />
          Sync with <button onClick={() => setT({ brandSync: true })} className="font-bold text-brand-deep underline underline-offset-2">Global Styling</button>
        </label>
        <Btn size="sm" icon="check" onClick={() => toast("ok", `${mode === "invoice" ? "Invoice" : "Email"} design saved`, "Applied to every new PDF and outgoing email.")}>Save design</Btn>
      </div>

      {mode === "invoice" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          {/* Section list — reorder + select */}
          <div className="space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Sections — drag to reorder the document</p>
            {t.sections.map((id, i) => {
              const m = SECTION_META[id];
              return (
                <div key={id} className={cx("flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 transition-all", sel === id ? "border-brand shadow-sm" : "border-line hover:border-line2")}>
                  <span className="cursor-grab text-line2 active:cursor-grabbing" aria-label={`Drag ${m.label}`}><Ic name="grip" size={13} /></span>
                  <Ic name={m.icon} size={13} className="text-mute" />
                  <button onClick={() => setSel(sel === id ? null : id)} className="flex-1 truncate text-left text-[11.5px] font-bold text-ink">{m.label}</button>
                  <button onClick={() => move(id, -1)} disabled={i === 0} aria-label={`Move ${m.label} up`} className="rounded-sm p-0.5 text-mute hover:text-ink disabled:opacity-30"><Ic name="chevU" size={12} /></button>
                  <button onClick={() => move(id, 1)} disabled={i === t.sections.length - 1} aria-label={`Move ${m.label} down`} className="rounded-sm p-0.5 text-mute hover:text-ink disabled:opacity-30"><Ic name="chevD" size={12} /></button>
                </div>
              );
            })}
            <div className="rounded-md border border-line bg-card p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Document style</p>
              <div className="space-y-2">
                {!t.brandSync && (
                  <>
                    <ColorField label="Accent" value={t.accent} onChange={(v) => setT({ accent: v })} />
                    <ColorField label="Ink (text)" value={t.ink} onChange={(v) => setT({ ink: v })} />
                    <ColorField label="Paper" value={t.paper} onChange={(v) => setT({ paper: v })} />
                  </>
                )}
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-mute">Corner radius</span><NumStepper value={t.brandSync ? brand.radius : t.radius} onChange={(v) => setT({ radius: v })} min={0} max={20} suffix="px" w={90} label="radius" /></div>
                <label className="flex items-center justify-between text-[10.5px] font-bold text-mute"><span>Show logo mark</span><Toggle checked={t.showLogo} onChange={(v) => setT({ showLogo: v })} label="Show logo" /></label>
                {t.brandSync && <p className="rounded-sm bg-brand-soft/50 px-2 py-1.5 text-[9.5px] font-semibold leading-relaxed text-brand-deep">Colours & fonts follow Global Styling. Turn sync off to override them here.</p>}
              </div>
            </div>
          </div>

          {/* The invoice canvas — click any text to edit in place */}
          <div className="rounded-lg border border-line bg-[#e9ebe3] p-6">
            <div className="mx-auto max-w-[640px] rounded-sm p-7 shadow-xl transition-all" style={{ background: paper, borderRadius: Math.max(radius, 2), border: sel ? `1px solid ${accent}55` : "1px solid #00000012" }}>
              <div className="space-y-4">
                {t.sections.map((id) => (
                  <div key={id} onClick={() => setSel(id)} className={cx("group/rel relative cursor-pointer rounded-sm transition-all", sel === id && "ring-2 ring-offset-2")} style={{ ...(sel === id ? ({ ["--tw-ring-color" as string]: accent } as React.CSSProperties) : {}) }}>
                    {sel === id && <span className="absolute -top-2 left-2 z-10 rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-white" style={{ background: accent }}>{SECTION_META[id].label}</span>}
                    {sectionBody(id)}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] font-semibold text-mute">Click any text on the sheet to edit it live · reorder sections on the left · this exact layout renders on every PDF and quote.</p>
          </div>
        </div>
      ) : (
        <EmailDesigner />
      )}
    </div>
  );
}

function EmailDesigner() {
  const { emailTemplate: e, setEmailTemplate: setE, brand, invoiceTemplate: t, toast } = useApp();
  const accent = e.brandSync ? brand.primary : e.accent;
  const bandInk = e.brandSync ? brand.ink : e.bandInk;
  const heading = e.brandSync ? brand.headingFamily : e.headingFamily;
  const body = e.brandSync ? brand.bodyFamily : e.bodyFamily;
  const radius = e.brandSync ? brand.radius : e.radius;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="rounded-md border border-line bg-card p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Email style</p>
        <div className="space-y-2.5">
          <label className="flex items-center justify-between text-[10.5px] font-bold text-mute"><span>Sync with Global Styling</span><Toggle checked={e.brandSync} onChange={(v) => setE({ brandSync: v })} label="Email brand sync" /></label>
          {!e.brandSync && (
            <>
              <ColorField label="Accent / buttons" value={e.accent} onChange={(v) => setE({ accent: v })} />
              <ColorField label="Header band" value={e.bandInk} onChange={(v) => setE({ bandInk: v })} />
            </>
          )}
          <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-mute">Corner radius</span><NumStepper value={e.brandSync ? brand.radius : e.radius} onChange={(v) => setE({ radius: v })} min={0} max={20} suffix="px" w={90} label="radius" /></div>
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-faint">Footer note</span>
            <textarea value={e.footerNote} onChange={(ev) => setE({ footerNote: ev.target.value })} rows={3} className="w-full rounded-sm border border-line bg-paper px-2 py-1.5 text-[10.5px] outline-none focus:border-brand" />
          </label>
          <p className="rounded-sm bg-brand-soft/50 px-2 py-1.5 text-[9.5px] leading-relaxed text-brand-deep">Used on confirmations, reminders and receipts — the same colours guests see on your invoices{t.brandSync && e.brandSync ? " (both synced to Global Styling)" : ""}.</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-[#e9ebe3] p-6">
        <div className="mx-auto max-w-[480px] overflow-hidden rounded-sm shadow-xl" style={{ background: "#fff", borderRadius: Math.max(radius, 2) }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ background: bandInk }}>
            <span className="font-display text-[15px] font-bold uppercase tracking-wide text-white" style={{ fontFamily: `'${heading}', sans-serif` }}>Sanggraha Villas</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">Confirmation</span>
          </div>
          <div className="px-5 py-5" style={{ fontFamily: `'${body}', sans-serif` }}>
            <h3 className="font-display text-[19px] font-bold" style={{ color: bandInk, fontFamily: `'${heading}', sans-serif` }}>Your stay is confirmed ✓</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: bandInk, opacity: 0.75 }}>Hi Jonas — Villa Anggrek, 12–17 March. Kadek will meet you at the gate at 14:00 WITA. Your guidebook and access code arrive 24h before check-in.</p>
            <button className="mt-4 px-5 py-2.5 text-[12px] font-bold text-white" style={{ background: accent, borderRadius: Math.max(radius, 2), border: "none" }}>View your guidebook</button>
          </div>
          <div className="border-t px-5 py-3 text-[9px] leading-relaxed" style={{ borderColor: `${accent}33`, color: bandInk, opacity: 0.5 }}>{e.footerNote}</div>
        </div>
        <p className="mt-3 text-center text-[10px] font-semibold text-mute">Transactional emails render with this header band, fonts and button style.</p>
      </div>
    </div>
  );
}
