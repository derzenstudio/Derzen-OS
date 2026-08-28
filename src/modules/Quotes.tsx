import { useState } from "react";
import { cx, money, moneyRaw, fmtDate, timeAgo, hoursLeft, relDay } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Empty, Field, Input, Modal, Select, Textarea, Toggle } from "../components/ui";
import { useApp } from "../store";
import { guestById, propertyById, serviceById } from "../lib/data";
import type { Quote, QuoteStatus } from "../lib/types";
import InvoiceDesigner from "./InvoiceDesigner";

const TONE: Record<QuoteStatus, string> = { draft: "mute", sent: "info", viewed: "plum", accepted: "ok", expired: "danger", converted: "ok", declined: "danger" };

export default function Quotes() {
  const { navigate, quotes, setQuoteStatus, convertQuote, editQuoteItem, addQuoteItem, removeQuoteItem, toast, brand, route } = useApp();
  const [view, setView] = useState<"quotes" | "design">(route.query.get("tab") === "design" ? "design" : "quotes");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [brandSync, setBrandSync] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ label: "", amount: "" });
  const q = quotes.find((x) => x.id === openId) ?? null;
  const list = quotes.filter((x) => filter === "all" || x.status === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          <button onClick={() => setView("quotes")} className={cx("rounded-md px-3.5 py-1.5 text-[12px] font-bold", view === "quotes" ? "bg-brand text-white" : "text-mute")}>Quotes</button>
          <button onClick={() => setView("design")} className={cx("flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[12px] font-bold", view === "design" ? "bg-brand text-white" : "text-mute")}><Ic name="pencil" size={12} /> Invoice & email design</button>
        </div>
        <p className="hidden text-[10.5px] font-semibold text-faint md:block">Canva-style editor — style every PDF & email once</p>
      </div>

      {view === "design" ? (
        <InvoiceDesigner />
      ) : (
      <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {["all", "draft", "sent", "viewed", "accepted", "converted", "expired", "declined"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cx("rounded-md px-2.5 py-1.5 text-[11.5px] font-bold capitalize", filter === s ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}>{s}</button>
          ))}
        </div>
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => toast("info", "Quote builder", "Start from calendar availability — pick nights, party mix, optional services.")}>New quote</Btn>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {list.length === 0 && <div className="lg:col-span-2"><Empty icon="doc" title="No quotes here" body="Quotes convert to reservations with one click, payment link included." /></div>}
        {list.map((x) => {
          const g = guestById(x.guestId);
          const p = propertyById(x.propertyId);
          const h = hoursLeft(x.expiresAt);
          return (
            <article key={x.id} className="rounded-xl border border-line bg-card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sea-soft text-sea"><Ic name="doc" size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-ink">{x.ref} <Badge tone={TONE[x.status]}>{x.status}</Badge>
                    {x.status === "sent" && h > 0 && <span className="flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[9.5px] font-bold text-[#8a5c07]"><Ic name="clock" size={9} /> expires {h > 48 ? relDay(new Date(x.expiresAt)) : `in ${h}h`}</span>}
                  </p>
                  <p className="text-[11.5px] text-mute">{g.name} · {p.name}{x.serviceIds.length > 0 && ` + ${x.serviceIds.map((s) => serviceById(s).name.split(" ")[0]).join(", ")}`} · {fmtDate(x.checkIn)} → {fmtDate(x.checkOut)}</p>
                  <p className="mt-1 font-mono text-[16px] font-bold text-ink">{money(x.total, x.currency)} <span className="text-[10px] font-semibold text-faint">· {x.adults} adults · created {timeAgo(x.createdAt)}</span></p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                <Btn size="xs" icon="eye" onClick={() => { setOpenId(x.id); }}>Open & edit</Btn>
                <Btn size="xs" icon="doc" onClick={() => { setOpenId(x.id); setPdfOpen(true); }}>Branded PDF</Btn>
                {x.status === "draft" && <Btn size="xs" variant="solid" icon="send" onClick={() => { setQuoteStatus(x.id, "sent"); toast("ok", `${x.ref} sent`, "Public quote page + PDF emailed · reminder scheduled 24h before expiry."); }}>Send</Btn>}
                {x.status === "sent" && <Btn size="xs" variant="ghost" icon="bell" onClick={() => toast("ok", "Follow-up reminder queued", "Sends 24h before expiry if still unviewed.")}>Remind</Btn>}
                {(x.status === "accepted" || x.status === "viewed") && <Btn size="xs" variant="solid" icon="ticket" onClick={() => { convertQuote(x.id); }}>Convert → reservation</Btn>}
                {x.status === "converted" && <Btn size="xs" variant="ghost" icon="ticket" onClick={() => navigate("/reservations?focus=new")}>View reservation</Btn>}
              </div>
            </article>
          );
        })}
      </div>

      {/* Editor */}
      <Modal open={!!q && !pdfOpen} onClose={() => setOpenId(null)} title={`${q?.ref ?? ""} · ${q ? guestById(q.guestId).name : ""}`} w={680}
        footer={q && <>
          <Btn variant="ghost" icon="doc" onClick={() => setPdfOpen(true)}>Preview PDF</Btn>
          {q.status !== "converted" && <Btn variant="solid" icon="ticket" onClick={() => { convertQuote(q.id); setOpenId(null); }}>Convert to reservation</Btn>}
          <Btn variant="ghost" onClick={() => setOpenId(null)}>Close</Btn>
        </>}>
        {q && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Check-in"><Input type="date" defaultValue={q.checkIn} /></Field>
              <Field label="Check-out"><Input type="date" defaultValue={q.checkOut} /></Field>
              <Field label="Adults"><Input type="number" defaultValue={q.adults} /></Field>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Line items — editable, total always = Σ items</p>
                <Btn size="xs" icon="plus" onClick={() => setAddOpen(true)}>Add line</Btn>
              </div>
              <table className="w-full text-left">
                <tbody>
                  {q.items.map((it, i) => (
                    <tr key={i} className="border-b border-line/60">
                      <td className="py-1.5 pr-2 text-[12px] text-ink"><Badge tone="mute" className="mr-1.5">{it.kind}</Badge>{it.label}</td>
                      <td className="w-[130px] py-1.5">
                        <Input type="number" defaultValue={it.amount} onBlur={(e) => editQuoteItem(q.id, i, Math.round(Number(e.target.value)))} className="!h-7 !text-right font-mono !text-[11.5px]" aria-label={`Amount for ${it.label}`} />
                      </td>
                      <td className="w-8 py-1.5 text-right"><button aria-label={`Remove ${it.label}`} className="text-faint hover:text-danger" onClick={() => removeQuoteItem(q.id, i)}><Ic name="x" size={13} /></button></td>
                    </tr>
                  ))}
                  <tr><td className="py-2 text-[13px] font-bold">Total</td><td className="py-2 text-right font-mono text-[14px] font-bold text-brand-deep">{money(q.total, q.currency)}</td><td /></tr>
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Deposit terms"><Textarea defaultValue={q.depositTerms} className="!min-h-[64px]" /></Field>
              <Field label="Payment terms (rendered verbatim on PDF)"><Textarea defaultValue={q.paymentTerms} className="!min-h-[64px]" /></Field>
            </div>
          </div>
        )}
      </Modal>

      {/* Add line */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add line item" w={400}
        footer={<><Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn><Btn variant="solid" onClick={() => { if (q && newItem.label && newItem.amount) { addQuoteItem(q.id, newItem.label, Math.round(Number(newItem.amount))); setAddOpen(false); setNewItem({ label: "", amount: "" }); } }}>Add</Btn></>}>
        <div className="space-y-3">
          <Field label="Label"><Input value={newItem.label} onChange={(e) => setNewItem({ ...newItem, label: e.target.value })} placeholder="Welcome basket" /></Field>
          <Field label="Amount (IDR)"><Input type="number" value={newItem.amount} onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })} placeholder="450000" /></Field>
        </div>
      </Modal>

      {/* PDF preview */}
      <Modal open={pdfOpen && !!q} onClose={() => setPdfOpen(false)} title="Branded PDF preview" w={560}
        footer={<>
          <label className="mr-auto flex items-center gap-2 text-[11.5px] font-bold text-mute">
            <Toggle checked={brandSync} onChange={setBrandSync} label="Sync invoice styling with Global Styling" /> Sync with Global Styling
          </label>
          <Btn variant="ghost" onClick={() => setPdfOpen(false)}>Close</Btn>
          <Btn variant="solid" icon="download" onClick={() => toast("ok", "PDF downloaded", `${q?.ref}-quote.pdf · styling ${brandSync ? "from Global Styling" : "classic"}`)}>Download</Btn>
        </>}>
        {q && (
          <div
            className="rounded-lg border border-line bg-white p-6 shadow-inner"
            style={brandSync ? { fontFamily: `'${brand.bodyFamily}', sans-serif`, borderRadius: Math.max(brand.radius, 2) } : undefined}
          >
            <div className="mb-4 flex items-start justify-between border-b-2 pb-3" style={brandSync ? { borderColor: brand.primary } : undefined}>
              <div>
                <p className="text-[18px] font-bold" style={brandSync ? { fontFamily: `'${brand.headingFamily}', sans-serif`, color: brand.ink } : undefined}>
                  <span className={brandSync ? "" : "font-display text-pine-900"}>Sanggraha Villas</span>
                </p>
                <p className="text-[10px] text-mute">Boutique villa collection · Bali · stay.sanggraha.co</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[14px] font-bold" style={brandSync ? { color: brand.ink } : undefined}><span className={brandSync ? "" : "text-pine-900"}>{q.ref}</span></p>
                <p className="text-[10px] text-mute">valid until {fmtDate(new Date(q.expiresAt))}</p>
              </div>
            </div>
            <p className="text-[12px]"><b>Prepared for:</b> {guestById(q.guestId).name} · {q.adults} adults</p>
            <p className="text-[12px]"><b>Stay:</b> {propertyById(q.propertyId).name}, {fmtDate(q.checkIn)} → {fmtDate(q.checkOut)}</p>
            <table className="mt-3 w-full text-left">
              <tbody>
                {q.items.map((it, i) => (
                  <tr key={i} className="border-b border-line/50">
                    <td className="py-1 text-[11px]">{it.label}</td>
                    <td className="py-1 text-right font-mono text-[11px]">{moneyRaw(it.amount, q.currency, { sign: true })}</td>
                  </tr>
                ))}
                <tr>
                  <td className="dbl-rule pt-2.5 text-[12.5px] font-bold">Total</td>
                  <td className="dbl-rule pt-2.5 text-right font-mono text-[13.5px] font-bold" style={brandSync ? { color: brand.primary } : undefined}>{moneyRaw(q.total, q.currency)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-[10.5px] leading-relaxed text-mute"><b>Deposit:</b> {q.depositTerms}</p>
            <p className="mt-1 whitespace-pre-line text-[10.5px] leading-relaxed text-mute"><b>Payment terms:</b> {q.paymentTerms}</p>
            <p className="mt-3 border-t border-line pt-2 text-center text-[9px] text-faint">PT Sanggraha Hospitality · quoted in IDR, your card is charged in your bank's currency at settlement rate.</p>
          </div>
        )}
      </Modal>
      </>
      )}
    </div>
  );
}
