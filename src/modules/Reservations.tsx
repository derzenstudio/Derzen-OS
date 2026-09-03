import { useMemo, useState } from "react";
import { cx, money, moneyRaw, displayCode, fmtDate, relDay, timeAgo, download, toCSV, copyText } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, Empty, Field, Input, Modal, SearchBox, Select, StatusChip, Toggle, Avatar, Textarea } from "../components/ui";
import { useApp } from "../store";
import { channelDef, guestById, propertyById, serviceById, SERVICES } from "../lib/data";
import { ChannelMark } from "../components/ota";
import { Reveal } from "../components/animations";
import type { Reservation } from "../lib/types";

const STATUS_FILTERS = ["all", "enquiry", "pending", "confirmed", "deposit_paid", "checked_in", "checked_out", "cancelled"] as const;

export default function Reservations() {
  const { route, navigate, toast } = useApp();
  const reservations = useApp((s) => s.reservations);
  const detailId = route.path[1];
  const [tab, setTab] = useState<"all" | "properties" | "services">("all");
  const [status, setStatus] = useState(route.query.get("status") ?? "all");
  const [channel, setChannel] = useState("all");
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState<{ k: "checkIn" | "total" | "status"; dir: 1 | -1 }>({ k: "checkIn", dir: 1 });

  const focus = route.query.get("focus");
  const list = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    void todayKey;
    let out = reservations.filter((r) => r.archived === archived);
    if (tab === "properties") out = out.filter((r) => r.kind === "stay");
    if (tab === "services") out = out.filter((r) => r.kind === "service");
    if (focus === "arrivals-today") out = out.filter((r) => r.checkIn === new Date().toDateString() || relDay(r.checkIn) === "today");
    if (focus === "departures-today") out = out.filter((r) => relDay(r.checkOut) === "today");
    if (focus === "new") out = out.filter((r) => Date.now() - r.createdAt < 7 * 86_400_000);
    if (status !== "all") out = out.filter((r) => r.status === status);
    if (channel !== "all") out = out.filter((r) => r.channel === channel);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => guestById(r.guestId).name.toLowerCase().includes(s) || r.ref.toLowerCase().includes(s) || propertyById(r.propertyId).name.toLowerCase().includes(s));
    }
    return [...out].sort((a, b) => {
      const va = sort.k === "total" ? a.total * a.fxRate : sort.k === "status" ? a.status.length : +new Date(a.checkIn);
      const vb = sort.k === "total" ? b.total * b.fxRate : sort.k === "status" ? b.status.length : +new Date(b.checkIn);
      return (va - vb) * sort.dir;
    });
  }, [reservations, tab, status, channel, q, archived, sort, focus]);

  if (detailId) {
    const r = reservations.find((x) => x.id === detailId);
    if (r) return <Detail r={r} />;
  }

  const sortBtn = (k: typeof sort.k, label: string) => (
    <button className={cx("flex items-center gap-1 font-bold uppercase tracking-wider", sort.k === k ? "text-brand-deep" : "text-mute hover:text-ink")} onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((s.dir * -1) as 1 | -1) : 1 }))}>
      {label} {sort.k === k && <Ic name={sort.dir === 1 ? "chevU" : "chevD"} size={10} />}
    </button>
  );

  return (
    <div className="space-y-3">
      <Reveal direction="down" distance={10}><div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {([["all", "All"], ["properties", "Properties"], ["services", "Services"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={cx("rounded-md px-3 py-1.5 text-[12px] font-bold", tab === id ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}>{label}</button>
          ))}
        </div>
        {focus && <Badge tone="info" className="!normal-case">filter: {focus.replace(/-/g, " ")} <button onClick={() => navigate("/reservations")} className="ml-1 font-black">×</button></Badge>}
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[130px]" aria-label="Status filter">
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>)}
        </Select>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="!w-[130px]" aria-label="Channel filter">
          <option value="all">All channels</option>
          {["airbnb", "booking", "vrbo", "agoda", "trip", "traveloka", "direct"].map((c) => <option key={c} value={c}>{channelDef(c as never).name}</option>)}
        </Select>
        <SearchBox value={q} onChange={setQ} placeholder="Guest, ref, property" className="w-[200px]" />
        <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute"><Toggle checked={archived} onChange={setArchived} label="Show archived" /> Archived</label>
        <Btn className="ml-auto" icon="download" onClick={() => { download("derzen-reservations.csv", toCSV([["Ref", "Guest", "Property", "Channel", "Check-in", "Check-out", "Status", "Total", "Currency"], ...list.map((r) => [r.ref, guestById(r.guestId).name, propertyById(r.propertyId).name, r.channel, r.checkIn, r.checkOut, r.status, r.total, r.currency])])); toast("ok", "Exported CSV", `${list.length} rows`); }}>Export</Btn>
      </div></Reveal>

      <Reveal direction="up" distance={20} delay={100}><div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px]">
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-mute">Ref / guest</th>
              <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-mute">Property</th>
              <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-mute">Channel</th>
              <th className="px-3 py-2.5">{sortBtn("checkIn", "Check-in → out")}</th>
              <th className="px-3 py-2.5 font-bold uppercase tracking-wider text-mute">Pax</th>
              <th className="px-3 py-2.5 text-right">{sortBtn("total", "Total")}</th>
              <th className="px-3 py-2.5">{sortBtn("status", "Status")}</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={8}><Empty icon="ticket" title="No reservations match" body="Adjust the filters or create one from a quote." /></td></tr>
            )}
            {list.map((r) => {
              const g = guestById(r.guestId);
              const p = propertyById(r.propertyId);
              return (
                <tr key={r.id} className="cursor-pointer border-b border-line/60 transition-colors hover:bg-paper/70" onClick={() => navigate(`/reservations/${r.id}`)}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={g.name} size={28} color={channelDef(r.channel).color} />
                      <div>
                        <p className="text-[12.5px] font-bold text-ink">{g.name}</p>
                        <p className="font-mono text-[10.5px] text-faint">{r.ref}{r.kind === "service" && ` · ${serviceById(r.serviceId!)?.name}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold text-ink">{p.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
                      <ChannelMark id={r.channel} size={16} />{channelDef(r.channel).name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-[12px] font-semibold text-ink">{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</p>
                    <p className={cx("font-mono text-[10px] font-bold", relDay(r.checkIn) === "today" ? "text-brand-deep" : "text-faint")}>{relDay(r.checkIn)}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-mute">{r.adults + r.children}{r.infants ? `+${r.infants}` : ""}</td>
                  <td className="px-3 py-2.5 text-right">
                    <p className="font-mono text-[12.5px] font-bold text-ink">{money(r.total, r.currency)}</p>
                    {r.currency !== "EUR" && <p className="font-mono text-[9.5px] text-faint">≈ {money(Math.round(r.total * r.fxRate), "EUR")}</p>}
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                  <td className="px-3 py-2.5"><Ic name="chevR" size={14} className="text-faint" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div></Reveal>
    </div>
  );
}

function Detail({ r }: { r: Reservation }) {
  const { navigate, addAdhocCharge, recordPayment, toast, audit } = useApp();
  const tasks = useApp((s) => s.tasks);
  const conversations = useApp((s) => s.conversations);
  const g = guestById(r.guestId);
  const p = propertyById(r.propertyId);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [notes, setNotes] = useState(r.notes);
  const paid = r.payments.filter((x) => x.kind === "payment").reduce((s, x) => s + x.amount, 0);
  const refunded = r.payments.filter((x) => x.kind === "refund").reduce((s, x) => s + Math.abs(x.amount), 0);
  const outstanding = r.total - paid + refunded;
  const conv = conversations.find((c) => c.reservationId === r.id);
  const linked = tasks.filter((t) => t.linkedReservationId === r.id || (t.propertyId === r.propertyId && (t.status === "open" || t.status === "in_progress")));
  const srcIcon: Record<string, "grid" | "plug" | "wrench" | "sparkle" | "refresh"> = { ui: "grid", api: "plug", automation: "wrench", ai: "sparkle", channel_sync: "refresh" };

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/reservations")} className="flex items-center gap-1 text-[12px] font-bold text-mute hover:text-ink"><Ic name="chevL" size={13} /> All reservations</button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-card p-5">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-[0.16]" style={{ backgroundImage: `url(${p.image})`, backgroundSize: "cover", backgroundPosition: "center", maskImage: "linear-gradient(90deg, transparent, black)" }} />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[22px] font-bold text-ink">{r.ref}</h2>
              <StatusChip status={r.status} />
              <Badge tone="mute">{channelDef(r.channel).name}</Badge>
              {r.externalRef && <Badge tone="info">ext: {r.externalRef}</Badge>}
            </div>
            <p className="mt-1 text-[13px] text-mute">
              <b className="text-ink">{g.name}</b> · {p.name} · {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} ({Math.round((+new Date(r.checkOut) - +new Date(r.checkIn)) / 86_400_000)} nights) · {r.adults} adults{r.children ? `, ${r.children} children` : ""}
            </p>
            <p className="mt-0.5 text-[11.5px] text-faint">
              Check-in {r.checkInTime === "FLEXIBLE" ? "flexible" : `${r.checkInTime} ${p.tzShort}`} · {p.tz} — {p.tz !== "Europe/Amsterdam" && <span className="font-semibold text-mute">shown in property time (workspace: CET)</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <p className="font-mono text-[20px] font-bold text-ink">{money(r.total, r.currency)}</p>
            {r.currency !== displayCode() && <p className="font-mono text-[10.5px] text-faint">booked in {moneyRaw(r.total, r.currency)} · FX {r.fxRate.toFixed(r.currency === "IDR" ? 6 : 3)} {r.currency}/EUR stored {timeAgo(r.fxTs)}</p>}
            <div className="flex gap-2">
              <Btn size="sm" variant="solid" icon="chat" onClick={() => navigate(conv ? `/inbox?conv=${conv.id}` : "/inbox")}>Message guest</Btn>
              <Btn size="sm" icon="link" onClick={() => { copyText(`https://stay.sanggraha.co/guide/${r.guidebookCode}`); toast("ok", "Guidebook link copied", r.guidebookCode); }}>Guidebook link</Btn>
              <Btn size="sm" icon="doc" onClick={() => toast("ok", "Invoice PDF generated", `${r.ref}-invoice.pdf · terms rendered verbatim`)}>Invoice</Btn>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Price breakdown */}
        <div className="rounded-xl border border-line bg-card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="font-display text-[13.5px] font-bold text-ink">Price breakdown — line items always sum to the total</h3>
            <Btn size="xs" icon="plus" onClick={() => setChargeOpen(true)}>Ad-hoc charge</Btn>
          </header>
          <table className="w-full text-left">
            <tbody>
              {r.items.map((it, i) => (
                <tr key={i} className="border-b border-line/50">
                  <td className="px-4 py-1.5 text-[12px] text-ink">
                    <span className="mr-2 inline-block w-[86px] rounded bg-paper px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-mute">{it.kind.replace("_", " ")}</span>
                    {it.label}
                  </td>
                  <td className={cx("px-4 py-1.5 text-right font-mono text-[12px] font-semibold", it.amount < 0 ? "text-brand-deep" : "text-ink")}>{moneyRaw(it.amount, r.currency, { sign: true })}</td>
                </tr>
              ))}
              <tr className="bg-paper/70">
                <td className="px-4 py-2 text-[12.5px] font-bold text-ink">Total · always = Σ line items</td>
                <td className="px-4 py-2 text-right font-mono text-[14px] font-bold text-ink">{moneyRaw(r.items.reduce((s, i) => s + i.amount, 0), r.currency)}</td>
              </tr>
            </tbody>
          </table>

          {/* Payments */}
          <div className="border-t border-line p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-display text-[13px] font-bold text-ink">Payments & deposits</h4>
              <div className="flex gap-1.5">
                <Btn size="xs" icon="card" onClick={() => setPayOpen(true)}>Record payment</Btn>
                <Btn size="xs" variant="ghost" icon="undo" onClick={() => { recordPayment(r.id, Math.round(paid * 0.3), "Stripe refund", "refund"); audit(`Refund 30% on ${r.ref}`, "ui", `Paid ${money(paid, r.currency)}`, `Refunded ${money(Math.round(paid * 0.3), r.currency)} · ledger + owner statement updated atomically`); toast("warn", "Refund recorded", "Balance, reports and owner statement updated in one transaction."); }}>Refund 30%</Btn>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-brand-soft/70 px-3 py-2"><p className="text-[10px] font-bold uppercase text-brand-deep">Paid</p><p className="font-mono text-[15px] font-bold text-ink">{moneyRaw(paid, r.currency)}</p></div>
              <div className={cx("rounded-lg px-3 py-2", outstanding > 0 ? "bg-gold-soft" : "bg-paper")}><p className="text-[10px] font-bold uppercase text-[#8a5c07]">Outstanding</p><p className="font-mono text-[15px] font-bold text-ink">{moneyRaw(Math.max(0, outstanding), r.currency)}</p></div>
              <div className="rounded-lg bg-sea-soft px-3 py-2"><p className="text-[10px] font-bold uppercase text-sea">Security deposit</p><p className="font-mono text-[15px] font-bold text-ink">{r.depositHeld ? `${moneyRaw(r.depositHeld * 10000, r.currency)} held` : "none"}</p></div>
            </div>
            <ul className="mt-2.5 divide-y divide-line/60">
              {r.payments.length === 0 && <li className="py-2 text-[11.5px] text-faint">No payments recorded yet.</li>}
              {r.payments.map((pay) => (
                <li key={pay.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                  <Ic name={pay.kind === "refund" ? "undo" : "card"} size={13} className={pay.kind === "refund" ? "text-danger" : "text-brand"} />
                  <span className="font-semibold text-ink">{pay.method}</span>
                  <span className="text-faint">· {timeAgo(pay.ts)}</span>
                  <span className={cx("ml-auto font-mono font-bold", pay.kind === "refund" ? "text-danger" : "text-brand-deep")}>{pay.kind === "refund" ? "−" : "+"}{moneyRaw(Math.abs(pay.amount), r.currency)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notes & tasks */}
          <div className="grid grid-cols-1 gap-4 border-t border-line p-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1.5 font-display text-[12.5px] font-bold text-ink">Internal booking notes</h4>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => toast("ok", "Notes saved", "Visible to staff only — never to the guest.")} className="!min-h-[84px]" placeholder="Allergies, arrival quirks, owner requests…" />
            </div>
            <div>
              <h4 className="mb-1.5 font-display text-[12.5px] font-bold text-ink">Associated tasks</h4>
              {linked.length === 0 && <p className="text-[11.5px] text-faint">No tasks linked.</p>}
              {linked.slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => navigate(`/ops?tab=board&task=${t.id}`)} className="mb-1 flex w-full items-center gap-2 rounded-md border border-line px-2 py-1.5 text-left text-[11.5px] font-semibold text-ink transition-colors hover:bg-paper">
                  <Ic name="wrench" size={12} className="text-mute" /> {t.title}
                  <Badge tone={t.status === "done" ? "ok" : "warn"} className="ml-auto">{t.status}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-xl border border-line bg-card">
          <header className="border-b border-line px-4 py-2.5"><h3 className="font-display text-[13.5px] font-bold text-ink">Timeline — immutable audit chain</h3></header>
          <ol className="p-4">
            {[...r.timeline].reverse().map((ev, i) => (
              <li key={i} className="relative pb-4 pl-6 last:pb-0">
                {i < r.timeline.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-line" aria-hidden="true" />}
                <span className={cx("absolute left-0 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-card", ev.source === "channel_sync" ? "bg-sea" : ev.source === "ai" ? "bg-plum" : ev.source === "automation" ? "bg-gold" : "bg-brand")}>
                  <Ic name={srcIcon[ev.source]} size={8} className="text-white" sw={2.6} />
                </span>
                <p className="text-[12px] font-bold text-ink">{ev.label}</p>
                <p className="text-[10px] font-semibold text-faint">{timeAgo(ev.ts)} · source: {ev.source.replace("_", " ")}{ev.detail && ` · ${ev.detail}`}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <Modal open={chargeOpen} onClose={() => setChargeOpen(false)} title={`Ad-hoc charge · ${r.ref}`} w={420}
        footer={<><Btn variant="ghost" onClick={() => setChargeOpen(false)}>Cancel</Btn><Btn variant="solid" icon="plus" onClick={() => { const amt = Math.round(Number(amount) || 0); if (amt > 0 && label) { addAdhocCharge(r.id, label, amt); toast("ok", "Charge added", `${label} · ${money(amt, r.currency)}`); setChargeOpen(false); } }}>Add charge</Btn></>}>
        <div className="space-y-3">
          <Field label="Label"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Late checkout fee" /></Field>
          <Field label={`Amount (${r.currency} minor units)`}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="350000" /></Field>
        </div>
      </Modal>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={`Record manual payment · ${r.ref}`} w={420}
        footer={<><Btn variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => { const amt = Math.round(Number(payAmount) || 0); if (amt > 0) { recordPayment(r.id, amt, method, "payment"); toast("ok", "Payment recorded", `${money(amt, r.currency)} · ${method}`); setPayOpen(false); } }}>Record</Btn></>}>
        <div className="space-y-3">
          <Field label={`Amount (${r.currency} minor units)`}><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(outstanding > 0 ? outstanding : 500000)} /></Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {["Bank transfer", "Cash at villa", "Stripe payment link", "OTA-collected"].map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
          <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Offline payments never touch card data — PCI scope stays with the gateway.</p>
        </div>
      </Modal>
      {voidServices()}
    </div>
  );
}
function voidServices() {
  void SERVICES;
  return null;
}
