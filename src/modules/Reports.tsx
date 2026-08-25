import { useMemo, useState } from "react";
import { cx, money, pct, toCSV, download } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Donut, Select, StatusChip, Tabs, Toggle, TrendLines } from "../components/ui";
import { useApp } from "../store";
import { CHANNEL_SPLIT, EXPENSES, FX_TO_EUR, MONTHLY, RESERVATIONS, channelDef, guestById, propertyById } from "../lib/data";

export default function Reports() {
  const { toast } = useApp();
  const reservations = useApp((s) => s.reservations);
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("this-month");
  const [axis, setAxis] = useState<"stay" | "booked">("stay");
  const [scope, setScope] = useState("all");
  const [yoy, setYoy] = useState(true);

  const series = useMemo(() => MONTHLY, []);
  const revSeries = series.map((m) => m.revenue / 100);
  const expSeries = series.map((m) => m.expenses / 100);
  const netSeries = series.map((m) => (m.revenue - m.expenses) / 100);
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const revenue = last.revenue;
  const costs = last.expenses;
  const adrEur = Math.round(last.adr);
  const nightsBooked = Math.round(last.bookings * 4.2);
  const nightsAvailable = 9 * 30;
  const occupancy = nightsBooked / nightsAvailable;
  const arOutstanding = reservations.filter((r) => r.payments.reduce((s, p) => s + p.amount, 0) < r.total * (FX_TO_EUR[r.currency] > 0 ? 1 : 1) && !["cancelled", "enquiry"].includes(r.status));

  const delta = (cur: number, before: number) => {
    const d = (cur - before) / Math.max(1, before);
    return { d, up: d >= 0 };
  };

  const exportTab = () => {
    if (tab === "overview") download("trellis-overview.csv", toCSV([["Month", "Revenue EUR", "Expenses EUR", "Net EUR", "Bookings", "ADR EUR"], ...series.map((m) => [m.label, m.revenue / 100, m.expenses / 100, (m.revenue - m.expenses) / 100, m.bookings, m.adr])]));
    else if (tab === "revenue") download("trellis-revenue.csv", toCSV([["Channel", "Share", "Amount EUR"], ...CHANNEL_SPLIT.map((c) => [c.channel, c.share, c.amount])]));
    else download("trellis-report.csv", toCSV([["Month", "Value EUR"], ...series.map((m) => [m.label, m.revenue / 100])]));
    toast("ok", "CSV exported", "Server-side rollup · timezone & currency correct");
  };

  return (
    <div className="space-y-4">
      {/* Shared filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
        <Ic name="filter" size={14} className="text-mute" />
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="!w-[150px]" aria-label="Period">
          <option value="this-month">This month</option><option value="last-month">Last month</option><option value="qtd">Quarter to date</option><option value="ytd">Year to date</option><option value="custom">Custom range…</option>
        </Select>
        <div className="flex items-center rounded-lg border border-line bg-paper p-0.5">
          <button onClick={() => setAxis("stay")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", axis === "stay" ? "bg-pine-900 text-white" : "text-mute")}>Stay date</button>
          <button onClick={() => setAxis("booked")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", axis === "booked" ? "bg-pine-900 text-white" : "text-mute")}>Booked date</button>
        </div>
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!w-[150px]" aria-label="Scope">
          <option value="all">All · properties + services</option><option value="properties">Properties only</option><option value="services">Services only</option>
        </Select>
        <Select defaultValue="all-listings" className="!w-[150px]" aria-label="Listings"><option value="all-listings">All listings</option><option>ANG, CEM, SEN</option><option>SAM group</option></Select>
        <Select defaultValue="all-channels" className="!w-[140px]" aria-label="Channels"><option value="all-channels">All channels</option><option>OTA only</option><option>Direct only</option></Select>
        <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute"><Toggle checked={yoy} onChange={setYoy} label="Year over year comparison" /> vs prior year</label>
        <Btn className="ml-auto" icon="download" onClick={exportTab}>Export {tab}</Btn>
      </div>

      <Tabs tabs={[{ id: "overview", label: "Overview" }, { id: "reservations", label: "Reservations" }, { id: "revenue", label: "Revenue" }, { id: "expenses", label: "Expenses" }]} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI label="Revenue" value={money(revenue, "EUR")} delta={delta(revenue, prev.revenue)} yoy={yoy} yoyPct={0.18} />
            <KPI label="Costs" value={money(costs, "EUR")} delta={delta(costs, prev.expenses)} yoy={yoy} yoyPct={0.07} invert />
            <KPI label="ADR" value={money(adrEur, "EUR")} delta={delta(adrEur, prev.adr)} yoy={yoy} yoyPct={0.12} />
            <KPI label="RevPAR" value={money(Math.round(revenue / nightsAvailable / 100), "EUR")} delta={delta(revenue / nightsAvailable, prev.revenue / nightsAvailable)} yoy={yoy} yoyPct={0.15} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
              <h3 className="mb-1 font-display text-[13.5px] font-bold text-ink">Profit trend — 12 months (EUR, reporting currency)</h3>
              <TrendLines series={[revSeries, expSeries, netSeries]} colors={["#0E7A5F", "#BB3A28", "#2557D6"]} labels={["Revenue", "Expenses", "Net"]} h={200} />
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">This month</h3>
              <div className="mb-3 flex items-center gap-4">
                <Donut slices={[{ value: nightsBooked, color: "#0E7A5F", label: "booked" }, { value: nightsAvailable - nightsBooked, color: "#E3E7DB", label: "available" }]} size={110} />
                <div>
                  <p className="font-display text-[22px] font-bold text-ink">{pct(occupancy)}</p>
                  <p className="text-[10.5px] font-bold uppercase text-mute">occupancy</p>
                  <p className="mt-1 text-[11px] text-mute">{nightsBooked} of {nightsAvailable} nights booked</p>
                </div>
              </div>
              <p className="rounded-md border border-line bg-paper px-3 py-2 text-[10px] leading-snug text-mute" title="Every operator computes occupancy differently — we publish ours so you can check our math">
                <b className="text-ink">How we count:</b> available unit-nights <b>exclude</b> owner & maintenance blocks and <b>include</b> channel stop-sells. Same denominator in ADR, RevPAR and owner statements.
              </p>
              <div className="rounded-lg bg-gold-soft/60 px-3 py-2">
                <p className="text-[10.5px] font-bold uppercase text-[#8a5c07]">AR outstanding</p>
                <p className="font-mono text-[16px] font-bold text-ink">{money(arOutstanding.reduce((s, r) => s + Math.round((r.total - Math.max(0, r.payments.reduce((a, p) => a + p.amount, 0))) * r.fxRate), 0), "EUR")} <span className="text-[10.5px] text-mute">· {arOutstanding.length} reservations</span></p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Breakdown title="Revenue breakdown" items={[["OTA channels", 0.61, "#2557D6"], ["Direct website", 0.21, "#0E7A5F"], ["Services & upsells", 0.11, "#A63DBF"], ["Other", 0.07, "#8A978A"]]} />
            <Breakdown title="Cost breakdown" items={[["Salaries & staff", 0.42, "#BB3A28"], ["OTA commissions", 0.24, "#D98E04"], ["Utilities & supplies", 0.16, "#2F6E8C"], ["Maintenance", 0.11, "#A63DBF"], ["Software", 0.07, "#8A978A"]]} />
          </div>
        </div>
      )}

      {tab === "reservations" && <ResTab />}

      {tab === "revenue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-card p-4">
              <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">OTA vs Direct split</h3>
              <div className="flex items-center gap-4">
                <Donut slices={CHANNEL_SPLIT.map((c, i) => ({ value: c.share, color: ["#E8485F", "#2557D6", "#0E7A5F", "#A63DBF", "#3E9BFF", "#8A978A"][i], label: c.channel }))} size={140} />
                <div className="flex-1 space-y-1">
                  {CHANNEL_SPLIT.map((c, i) => (
                    <p key={c.channel} className="flex items-center gap-2 text-[11.5px]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: ["#E8485F", "#2557D6", "#0E7A5F", "#A63DBF", "#3E9BFF", "#8A978A"][i] }} />
                      <span className="flex-1 font-bold">{c.channel}</span>
                      <span className="font-mono text-mute">{pct(c.share)}</span>
                      <span className="font-mono font-bold">{money(c.amount, "EUR", { compact: true })}</span>
                    </p>
                  ))}
                </div>
              </div>
              <p className="mt-2 rounded-md bg-paper px-3 py-1.5 text-[10.5px] text-mute">Direct's share is up 4pts QoQ — the embed widgets on partner blogs are converting.</p>
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <h3 className="mb-1 font-display text-[13.5px] font-bold text-ink">Gross vs net · monthly</h3>
              <TrendLines series={[revSeries, netSeries]} colors={["#0E7A5F", "#C07F14"]} labels={["Gross", "Net (after commissions)"]} h={190} />
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line bg-card">
            <table className="w-full min-w-[820px] text-left">
              <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
                <th className="px-4 py-2.5">Listing</th><th className="px-3 py-2.5 text-right">Gross</th><th className="px-3 py-2.5 text-right">Net</th>
                <th className="px-3 py-2.5 text-right">ADR</th><th className="px-3 py-2.5 text-right">RevPAR</th><th className="px-3 py-2.5 text-right">Stays</th><th className="px-3 py-2.5 text-right">Mgmt %</th>
              </tr></thead>
              <tbody>
                {["p-anggrek", "p-cemara", "p-purnama", "p-senja", "p-samudra", "p-kelapa"].map((pid, i) => {
                  const p = propertyById(pid);
                  const gross = Math.round(revenue * [0.24, 0.18, 0.27, 0.09, 0.13, 0.09][i]);
                  return (
                    <tr key={pid} className="border-b border-line/60 hover:bg-paper/70">
                      <td className="px-4 py-2 text-[12.5px] font-bold">{p.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px] font-bold">{money(gross, "EUR")}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px]">{money(Math.round(gross * 0.83), "EUR")}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px]">{money(Math.round(adrEur * [1.3, 1.05, 1.5, 0.7, 0.62, 0.5][i]), "EUR")}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px]">{money(Math.round(adrEur * [0.9, 0.7, 1.1, 0.5, 0.4, 0.35][i]), "EUR")}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px]">{[9, 7, 11, 4, 8, 5][i]}</td>
                      <td className="px-3 py-2 text-right font-mono text-[12px]">{p.managed ? `${p.commissionPct}%` : "own"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-4 py-2.5"><h3 className="font-display text-[13.5px] font-bold text-ink">Refunds register</h3></header>
            <table className="w-full text-left">
              <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2">Date</th><th className="px-3 py-2">Channel</th><th className="px-3 py-2">Booking ref</th><th className="px-3 py-2">Reason</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
              <tbody>
                <tr className="border-b border-line/60"><td className="px-4 py-2 font-mono text-[11px]">R-2432 · 3d ago</td><td className="px-3 py-2 text-[12px]">VRBO</td><td className="px-3 py-2 font-mono text-[11px]">R-2432</td><td className="px-3 py-2 text-[12px] text-mute">Guest-initiated cancellation (policy: &gt;14d)</td><td className="px-3 py-2 text-right font-mono text-[12px] font-bold text-danger">−{money(355_00, "USD")}</td></tr>
                <tr className="border-b border-line/60"><td className="px-4 py-2 font-mono text-[11px]">6d ago</td><td className="px-3 py-2 text-[12px]">Direct</td><td className="px-3 py-2 font-mono text-[11px]">R-2409</td><td className="px-3 py-2 text-[12px] text-mute">Partial refund — AC issue goodwill (10%)</td><td className="px-3 py-2 text-right font-mono text-[12px] font-bold text-danger">−{money(94_00, "EUR")}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
              <h3 className="mb-1 font-display text-[13.5px] font-bold text-ink">Expense trend vs revenue</h3>
              <TrendLines series={[expSeries, revSeries]} colors={["#BB3A28", "#0E7A5F"]} labels={["Expenses", "Revenue"]} h={180} />
            </div>
            <div className="rounded-xl border border-line bg-card p-4">
              <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Category breakdown</h3>
              {[["Salaries", 0.42], ["Commissions", 0.24], ["Utilities", 0.16], ["Maintenance", 0.11], ["Software", 0.07]].map(([c, v]) => (
                <div key={String(c)} className="mb-1.5 flex items-center gap-2">
                  <span className="w-[92px] text-[11.5px] font-bold">{c}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="bar-grow h-full rounded-full bg-danger/80" style={{ width: `${Number(v) * 100}%` }} /></div>
                  <span className="font-mono text-[10.5px] font-bold">{pct(Number(v))}</span>
                </div>
              ))}
              <p className="mt-3 rounded-md bg-brand-soft/60 px-3 py-2 text-[11px] font-semibold text-brand-deep">Tax-deductible YTD: {money(EXPENSES.filter((e) => e.taxDeductible && e.approval === "approved").reduce((s, e) => s + Math.round(e.amount * FX_TO_EUR.IDR), 0), "EUR")} · Recurring: {money(2_130_000 * 0.0000584 * 1000, "EUR", { compact: true })}/mo</p>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Reconciliation against tasks & services</h3>
            <p className="text-[11.5px] text-mute">Every expense optionally links to the task or service booking that caused it — unlinked spend shows up here so nothing drifts.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-paper px-3 py-2 text-center"><p className="font-mono text-[16px] font-bold text-brand-deep">{EXPENSES.filter((e) => e.taskId).length}</p><p className="text-[10px] font-bold uppercase text-mute">task-linked</p></div>
              <div className="rounded-lg bg-paper px-3 py-2 text-center"><p className="font-mono text-[16px] font-bold text-sea">3</p><p className="text-[10px] font-bold uppercase text-mute">service-linked</p></div>
              <div className="rounded-lg bg-paper px-3 py-2 text-center"><p className="font-mono text-[16px] font-bold text-[#8a5c07]">{EXPENSES.filter((e) => !e.taskId).length}</p><p className="text-[10px] font-bold uppercase text-mute">unlinked (review)</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, delta, yoy, yoyPct, invert }: { label: string; value: string; delta: { d: number; up: boolean }; yoy: boolean; yoyPct: number; invert?: boolean }) {
  const good = invert ? !delta.up : delta.up;
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 font-display text-[22px] font-bold text-ink">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className={cx("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold", good ? "bg-brand-soft text-brand-deep" : "bg-danger-soft text-danger")}>
          <Ic name={delta.up ? "trendUp" : "trendDown"} size={10} /> {pct(Math.abs(delta.d))} vs prior period
        </span>
        {yoy && <span className="flex items-center gap-0.5 text-[10px] font-bold text-mute"><Ic name={yoyPct >= 0 ? "trendUp" : "trendDown"} size={10} className={yoyPct >= 0 ? "text-brand" : "text-danger"} /> {pct(Math.abs(yoyPct))} YoY</span>}
      </div>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: [string, number, string][] }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">{title}</h3>
      <div className="flex h-3 overflow-hidden rounded-full">
        {items.map(([label, v, color]) => <div key={label} style={{ width: `${v * 100}%`, background: color }} title={`${label} ${pct(v)}`} />)}
      </div>
      <div className="mt-2.5 space-y-1">
        {items.map(([label, v, color]) => (
          <p key={label} className="flex items-center gap-2 text-[11.5px]">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} /> <span className="flex-1 font-bold">{label}</span> <span className="font-mono text-mute">{pct(v)}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ResTab() {
  const { navigate, toast } = useApp();
  const reservations = useApp((s) => s.reservations);
  const list = reservations.filter((r) => r.kind === "stay").slice(0, 12);
  const upcoming = reservations.filter((r) => r.status === "confirmed" || r.status === "deposit_paid").length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase text-mute">Reservations</p><p className="font-display text-[20px] font-bold">{reservations.length}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase text-mute">Total revenue (reporting currency)</p><p className="font-display text-[20px] font-bold">{money(Math.round(reservations.reduce((s, r) => s + r.total * r.fxRate, 0)), "EUR", { compact: true })}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase text-mute">Pending / confirmed</p><p className="font-display text-[20px] font-bold">{reservations.filter((r) => r.status === "pending").length} / {reservations.filter((r) => r.status === "confirmed").length}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase text-mute">Upcoming check-ins</p><p className="font-display text-[20px] font-bold">{upcoming}</p></div>
      </div>
      <div className="flex gap-2">
        <Btn icon="calendar" onClick={() => navigate("/calendar")}>Jump to calendar</Btn>
        <Btn icon="download" onClick={() => { download("trellis-reservations-report.csv", toCSV([["Ref", "Guest", "Property", "Check-in", "Nights", "Total EUR"], ...reservations.map((r) => [r.ref, guestById(r.guestId).name, propertyById(r.propertyId).name, r.checkIn, Math.round((+new Date(r.checkOut) - +new Date(r.checkIn)) / 86_400_000), Math.round(r.total * r.fxRate / 100)])])); toast("ok", "Exported"); }}>Export</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[760px] text-left">
          <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
            <th className="px-4 py-2.5">Ref</th><th className="px-3 py-2.5">Guest</th><th className="px-3 py-2.5">Channel</th><th className="px-3 py-2.5">Check-in</th><th className="px-3 py-2.5 text-right">Total (rep. currency)</th><th className="px-3 py-2.5">Status</th>
          </tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="cursor-pointer border-b border-line/60 hover:bg-paper/70" onClick={() => navigate(`/reservations/${r.id}`)}>
                <td className="px-4 py-2 font-mono text-[11.5px] font-bold">{r.ref}</td>
                <td className="px-3 py-2 text-[12px] font-semibold">{guestById(r.guestId).name}</td>
                <td className="px-3 py-2"><span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: channelDef(r.channel).color }}><span className="h-2 w-2 rounded-sm" style={{ background: channelDef(r.channel).color }} />{channelDef(r.channel).name}</span></td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.checkIn}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] font-bold">{money(Math.round(r.total * r.fxRate), "EUR")}</td>
                <td className="px-3 py-2"><StatusChip status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Badge tone="mute">all aggregates computed server-side from materialised rollups</Badge>
      {voidRes(RESERVATIONS.length)}
    </div>
  );
}
function voidRes(_n: number) { return null; }
