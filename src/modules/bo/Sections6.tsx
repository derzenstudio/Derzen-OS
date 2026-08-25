import { useMemo, useState } from "react";
import { cx, money, moneyRaw, dayKey, addDays, today, parseKey } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Input, Select } from "../../components/ui";
import { useApp, type CellOverride } from "../../store";
import {
  APPS, BOUNDARY_RULES, CONCURRENCY_RULES, DB_INVARIANTS, PACKAGES, RESOLUTION_STEPS,
  RESOLVER_CHANNELS, SCHEMA_CONVENTIONS, SCHEMA_GROUPS, STATE_MACHINES,
} from "../../lib/backoffice";
import { channelDef } from "../../lib/data";
import type { Property, Reservation } from "../../lib/types";

const ok = "text-[#4CC38A]";
const warn = "text-[#e2a33c]";
const bad = "text-[#f08c8c]";

// ── Topology ──────────────────────────────────────────────────────────────
export function ArchitectureView() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
        <header className="border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-[14px] font-bold text-white">/apps — independently deployable services</h2>
          <p className="text-[10px] text-white/40">monorepo · boundaries chosen for genuinely different scaling & failure profiles</p>
        </header>
        <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {APPS.map((a) => (
            <div key={a.path} className="group rounded-lg border border-white/10 bg-pine-950 px-3.5 py-3 transition-colors hover:border-white/25">
              <p className="flex items-center gap-2 font-mono text-[11.5px] font-bold text-white/90"><Ic name="terminal" size={12} className="text-brand-bright" />{a.path}</p>
              <p className="mt-1 text-[11px] leading-snug text-white/60">{a.role}</p>
              <p className="mt-2 flex items-center gap-2 font-mono text-[9px] text-white/35">
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/55">{a.origin}</span>{a.profile}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
          <header className="border-b border-white/10 px-5 py-3.5">
            <h2 className="font-display text-[14px] font-bold text-white">/packages — the pure cores</h2>
            <p className="text-[10px] text-white/40">dependency arrows only ever point downward</p>
          </header>
          <ul className="divide-y divide-white/5">
            {PACKAGES.map((p) => (
              <li key={p.path} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="w-[190px] font-mono text-[11.5px] font-bold text-white/85">{p.path.replace("packages/", "")}</span>
                <span className="min-w-0 flex-1 text-[11px] text-white/55">{p.rule}</span>
                <span className="flex gap-1">
                  {p.deps.length === 0 && <span className="font-mono text-[9px] text-white/25">no deps</span>}
                  {p.deps.map((d) => <span key={d} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/55">← {d}</span>)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-brand/35 bg-[#140a0a]">
          <header className="border-b border-white/10 px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-white"><Ic name="lock" size={14} className="text-brand-bright" /> Boundary rules — enforced in CI</h2>
          </header>
          <ul className="space-y-2.5 p-4">
            {BOUNDARY_RULES.map((r) => (
              <li key={r.rule} className="rounded-lg border border-white/10 bg-pine-950 px-3.5 py-3">
                <p className="text-[12px] font-bold leading-snug text-white/85">{r.rule}</p>
                <p className="mt-1 text-[10.5px] text-white/45">{r.why}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ── Schema & invariants ───────────────────────────────────────────────────
export function SchemaView() {
  const tableCount = SCHEMA_GROUPS.reduce((s, g) => s + g.tables.length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="ok">{tableCount} tables</Badge>
        {SCHEMA_CONVENTIONS.map((c) => <span key={c} className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[9.5px] text-white/55">{c}</span>)}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {SCHEMA_GROUPS.map((g) => (
          <section key={g.group} className="rounded-xl border border-white/10 bg-[#0d0d0b]">
            <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <h3 className="font-display text-[12.5px] font-bold text-white">{g.group}</h3>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-[#4CC38A]/10 px-2 py-0.5 font-mono text-[8.5px] font-bold text-[#4CC38A]"><Ic name="shield" size={9} /> tenant_id + RLS</span>
            </header>
            <ul className="p-3">
              {g.tables.map(([name, cols]) => (
                <li key={name} className="mb-1.5 rounded-md bg-pine-950 px-2.5 py-1.5 last:mb-0">
                  <p className="font-mono text-[10.5px] font-bold text-white/80">{name}</p>
                  <p className="font-mono text-[8.5px] leading-snug text-white/35">{cols}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="rounded-xl border border-brand/40 bg-[#140a0a]">
        <header className="border-b border-white/10 px-5 py-3.5">
          <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-white"><Ic name="lock" size={14} className="text-brand-bright" /> Invariants enforced in the database — not only in code</h2>
        </header>
        <ul className="divide-y divide-white/5">
          {DB_INVARIANTS.map((i, n) => (
            <li key={i.invariant} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="font-mono text-[11px] font-bold text-brand-bright">{String(n + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-white/90">{i.invariant}</p>
                <p className="font-mono text-[9.5px] text-white/40">{i.mechanism}</p>
              </div>
              <p className="w-full text-[10.5px] text-white/50 sm:w-auto sm:max-w-[280px]">{i.protects}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── State machines ────────────────────────────────────────────────────────
const kindCls: Record<string, string> = {
  initial: "border-brand-bright/60 text-white bg-brand/15",
  normal: "border-white/20 text-white/80",
  terminal: "border-white/10 text-white/40",
  alert: "border-[#e2a33c]/50 text-[#e2a33c] bg-[#e2a33c]/10",
};

export function StateMachinesView() {
  const [mid, setMid] = useState("reservation");
  const [sel, setSel] = useState<string | null>("confirmed");
  const m = STATE_MACHINES.find((x) => x.id === mid)!;
  const outgoing = m.transitions.filter((t) => t.from === sel);
  const incoming = m.transitions.filter((t) => t.to === sel);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr]">
      <nav className="flex flex-row flex-wrap gap-1.5 xl:flex-col" aria-label="State machines">
        {STATE_MACHINES.map((s) => (
          <button key={s.id} onClick={() => { setMid(s.id); setSel(s.states.find((x) => x.kind === "normal")?.name ?? s.states[0].name); }}
            className={cx("rounded-md px-3 py-2 text-left text-[12px] font-bold transition-colors", mid === s.id ? "bg-brand text-white" : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white")}>
            {s.name}
            <span className={cx("ml-1.5 font-mono text-[9px]", mid === s.id ? "text-white/70" : "text-white/30")}>{s.states.length}</span>
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
          <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3.5">
            <h2 className="font-display text-[15px] font-bold text-white">{m.name} — transition table</h2>
            <span className="ml-auto font-mono text-[9.5px] text-white/35">click a state to inspect its edges</span>
          </header>
          <div className="flex flex-wrap gap-2 p-4">
            {m.states.map((s) => {
              const active = sel === s.name;
              return (
                <button key={s.name} onClick={() => setSel(active ? null : s.name)}
                  aria-pressed={active}
                  className={cx("rounded-md border px-3 py-1.5 font-mono text-[11px] font-bold transition-all", kindCls[s.kind], active && "ring-2 ring-brand-bright ring-offset-2 ring-offset-[#0d0d0b]", "hover:-translate-y-px")}>
                  {s.kind === "initial" && <span className="mr-1 text-brand-bright">●</span>}{s.name}
                </button>
              );
            })}
          </div>
          <div className="border-t border-white/10 px-5 py-3">
            <p className="flex items-start gap-2 text-[11.5px] text-white/60"><Ic name="info" size={13} className="mt-0.5 shrink-0 text-[#e2a33c]" /> {m.note}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
            <header className="border-b border-white/10 px-4 py-2.5"><h3 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/45">out of <span className="text-white/85">{sel ?? "—"}</span></h3></header>
            {outgoing.length === 0 && <p className="px-4 py-6 text-center text-[11px] text-white/35">{sel ? "terminal or leaf — no defined transitions out" : "select a state"}</p>}
            <ul className="divide-y divide-white/5">
              {outgoing.map((t, i) => (
                <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="font-mono text-[10.5px] text-white/40">{t.from}</span>
                  <Ic name="chevR" size={11} className="text-brand-bright" />
                  <span className="font-mono text-[10.5px] font-bold text-white/85">{t.to}</span>
                  <span className="ml-auto text-right text-[10px] text-white/45">{t.actor}{t.effect && <> · <span className="text-white/30">{t.effect}</span></>}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
            <header className="border-b border-white/10 px-4 py-2.5"><h3 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/45">into <span className="text-white/85">{sel ?? "—"}</span></h3></header>
            {incoming.length === 0 && <p className="px-4 py-6 text-center text-[11px] text-white/35">{sel ? "initial state — nothing transitions in" : "select a state"}</p>}
            <ul className="divide-y divide-white/5">
              {incoming.map((t, i) => (
                <li key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="font-mono text-[10.5px] text-white/40">{t.from}</span>
                  <Ic name="chevR" size={11} className="text-brand-bright" />
                  <span className="font-mono text-[10.5px] font-bold text-white/85">{t.to}</span>
                  <span className="ml-auto text-right text-[10px] text-white/45">{t.actor}{t.effect && <> · <span className="text-white/30">{t.effect}</span></>}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="rounded-lg border border-white/10 bg-pine-950 px-4 py-2.5 font-mono text-[10.5px] text-white/45">
          <span className="font-bold text-[#f08c8c]">undefined transitions are rejected loudly</span> — every machine is an explicit table with allowed actors and side effects; there is no implicit fallback path.
        </p>
      </div>
    </div>
  );
}

// ── resolve() playground ──────────────────────────────────────────────────
interface StepResult { n: number; name: string; status: "pass" | "fail" | "adjusted"; detail: string; }

function runResolve(prop: Property, startStr: string, los: number, adults: number, channel: string, reservations: Reservation[], overrides: Record<string, Record<string, CellOverride>>) {
  const steps: StepResult[] = [];
  const reasons: string[] = [];
  const p = prop.pricing;
  const start = new Date(startStr + "T12:00:00");
  const keys = Array.from({ length: los }, (_, i) => dayKey(addDays(start, i)));
  const endKey = dayKey(addDays(start, los));
  const ovr = overrides[prop.id] ?? {};

  // 1 · inventory
  if (prop.isParent) {
    steps.push({ n: 1, name: "Inventory", status: "fail", detail: `${prop.name} is a multi-unit parent — parents are not bookable; book a child unit (inventory is shared).` });
    reasons.push("group parent is not a bookable unit");
  } else {
    const conflicts = reservations.filter((r) => r.propertyId === prop.id && r.kind === "stay" && !["cancelled", "enquiry"].includes(r.status) && r.checkIn < endKey && r.checkOut > keys[0]);
    if (conflicts.length) {
      steps.push({ n: 1, name: "Inventory", status: "fail", detail: `${conflicts.length} night-conflict(s) with ${conflicts.map((c) => c.ref).join(", ")} — unique index on confirmed nights would reject this booking.` });
      reasons.push(`nights already sold to ${conflicts.map((c) => c.ref).join(", ")}`);
    } else {
      steps.push({ n: 1, name: "Inventory", status: "pass", detail: `1 unit available across ${keys[0]} → ${keys[keys.length - 1]} (confirmed + blocks = 0 in range).` });
    }
  }

  // 2 · base rate
  const nightly = keys.map((k) => {
    const o = ovr[k];
    if (o?.rate) return o.rate;
    const month = parseKey(k).getMonth();
    const season = p.plans.find((pl) => pl.kind === "season" && pl.months?.includes(month));
    return season ? season.nightly : p.plans.find((pl) => pl.kind === "base")?.nightly ?? 0;
  });
  const overridesUsed = keys.filter((k) => ovr[k]?.rate).length;
  steps.push({ n: 2, name: "Base rate", status: "pass", detail: `${overridesUsed ? `${overridesUsed} date-override(s) applied · precedence: override > season > base` : "no date overrides — season rule else plan default"} · ${moneyRaw(nightly[0], prop.currency)}/night opening.` });

  // 3 · LOS & occupancy
  const extra = Math.max(0, adults - p.extraGuestAfter);
  const extraTotal = extra * p.extraGuestFee * los;
  steps.push({ n: 3, name: "LOS & occupancy", status: extra > 0 ? "adjusted" : "pass", detail: extra > 0 ? `${extra} guest(s) above the ${p.extraGuestAfter}-included threshold → +${moneyRaw(p.extraGuestFee, prop.currency)}/guest/night × ${los} nights = ${moneyRaw(extraTotal, prop.currency)}.` : `${adults} guests within the ${p.extraGuestAfter}-included threshold — no extra-guest fees.` });

  // 4 · restrictions
  const minStay = Math.max(prop.minNights, ...keys.map((k) => ovr[k]?.minStay ?? 0));
  const closed = keys.filter((k) => ovr[k]?.closed);
  const cta = !!ovr[keys[0]]?.cta;
  const ctd = !!ovr[keys[keys.length - 1]]?.ctd;
  const fails: string[] = [];
  if (los < minStay) fails.push(`min stay is ${minStay} nights (requested ${los})`);
  if (los > prop.maxNights) fails.push(`max stay is ${prop.maxNights} nights`);
  if (closed.length) fails.push(`stop_sell on ${closed.length} night(s): ${closed.slice(0, 3).join(", ")}${closed.length > 3 ? "…" : ""}`);
  if (cta) fails.push("closed-to-arrival on the first night");
  if (ctd) fails.push("closed-to-departure on the last night");
  steps.push({ n: 4, name: "Restrictions", status: fails.length ? "fail" : "pass", detail: fails.length ? fails.join(" · ") + " — restrictions never silently soften." : `min ${minStay} / max ${prop.maxNights} ok · no CTA/CTD/stop_sell in range.` });
  fails.forEach((f) => reasons.push(f));

  // 5 · channel constraints
  const ch = RESOLVER_CHANNELS[channel];
  const adjustments: string[] = [];
  if (ctd && !ch.caps.ctd) adjustments.push(`${channel} cannot express CTD — conservative equivalent: treat prior night as stop_sell on that channel only`);
  if (minStay > 1 && !ch.caps.minStay) adjustments.push(`${channel} has no min-stay field — enforced via rate-plan closure instead`);
  const markup = channelDef(channel as never).markupPct;
  steps.push({ n: 5, name: "Channel constraints", status: adjustments.length ? "adjusted" : "pass", detail: (adjustments.length ? adjustments.join(" · ") + " · " : `${ch.note} · `) + `markup ${markup}% applied to channel-facing price; parity watch armed.` });

  // 6 · fees & taxes
  const nightsSub = nightly.reduce((s, n) => s + n, 0);
  const cleaning = p.cleaningFee;
  const service = Math.round(((nightsSub + extraTotal) * p.serviceFeePct) / 100);
  const collectedBy = channel === "direct" ? "host" : "channel";
  const vat = Math.round(((nightsSub + extraTotal + cleaning + service) * p.vatPct) / 100);
  steps.push({ n: 6, name: "Fees & taxes", status: "pass", detail: `cleaning ${moneyRaw(cleaning, prop.currency)}/stay (host) · service ${p.serviceFeePct}% = ${moneyRaw(service, prop.currency)} (platform) · VAT ${p.vatPct}% = ${moneyRaw(vat, prop.currency)} (${collectedBy}-collected on ${channel}).` });

  // 7 · discounts
  const discPct = los >= 28 ? p.monthlyPct : los >= 7 ? p.weeklyPct : 0;
  const discount = Math.round((nightsSub * discPct) / 100);
  steps.push({ n: 7, name: "Discounts & promos", status: discount ? "adjusted" : "pass", detail: discount ? `length-of-stay ${discPct}% (≥${los >= 28 ? 28 : 7} nights) → −${moneyRaw(discount, prop.currency)}; stacking explicit, applied last.` : "no LOS discount applies (< 7 nights)." });

  const total = nightsSub + extraTotal + cleaning + service + vat - discount;
  return {
    steps, reasons,
    bookable: reasons.length === 0,
    nightly, keys,
    amounts: { nightsSub, extraTotal, cleaning, service, vat, discount, total, channelTotal: Math.round(total * (1 + markup / 100)) },
    currency: prop.currency,
  };
}

export function ResolverView() {
  const properties = useApp((s) => s.properties);
  const reservations = useApp((s) => s.reservations);
  const overrides = useApp((s) => s.calendarOverrides);
  const [propId, setPropId] = useState("p-anggrek");
  const [start, setStart] = useState(dayKey(addDays(today(), 7)));
  const [los, setLos] = useState(5);
  const [adults, setAdults] = useState(4);
  const [channel, setChannel] = useState("direct");

  const prop = properties.find((p) => p.id === propId)!;
  const res = useMemo(() => runResolve(prop, start, los, adults, channel, reservations, overrides), [prop, start, los, adults, channel, reservations, overrides]);
  const a = res.amounts;

  const statusIcon = (s: StepResult["status"]) =>
    s === "pass" ? <Ic name="checkCircle" size={15} className={ok} /> : s === "fail" ? <Ic name="alertTri" size={15} className={bad} /> : <Ic name="info" size={15} className={warn} />;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="font-mono text-[13px] font-bold text-white">resolve(unitTypeId, dateRange, los, occupancy, channelId?)</h2>
            <p className="text-[10px] text-white/40">one pure function, deterministic, side-effect free — running live against this tenant's seed data</p>
          </div>
          <Badge tone={res.bookable ? "ok" : "danger"}>{res.bookable ? "bookable" : `not bookable · ${res.reasons.length} reason(s)`}</Badge>
        </header>
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-white/40">unit type</span>
            <Select value={propId} onChange={(e) => setPropId(e.target.value)} className="!bg-[#171714] !text-white">
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isParent ? " (parent)" : ""}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-white/40">check-in</span>
            <Input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} className="!bg-[#171714] !text-white" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-white/40">nights · {los}</span>
            <input type="range" min={1} max={14} value={los} onChange={(e) => setLos(Number(e.target.value))} className="mt-2.5 w-full accent-[#B22222]" aria-label="Length of stay" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-white/40">adults</span>
            <div className="flex items-center gap-1.5">
              <Btn size="xs" variant="ghost" className="!text-white/70" icon="minus" onClick={() => setAdults(Math.max(1, adults - 1))} />
              <span className="flex-1 text-center font-mono text-[15px] font-bold text-white">{adults}</span>
              <Btn size="xs" variant="ghost" className="!text-white/70" icon="plus" onClick={() => setAdults(Math.min(12, adults + 1))} />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-white/40">channel</span>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="!bg-[#171714] !text-white">
              {Object.keys(RESOLVER_CHANNELS).map((c) => <option key={c} value={c}>{channelDef(c as never).name}</option>)}
            </Select>
          </label>
          <div className="flex items-end">
            <p className="w-full rounded-md bg-pine-950 px-2.5 py-2 font-mono text-[9px] leading-snug text-white/40">{RESOLVER_CHANNELS[channel].note} · markup {channelDef(channel as never).markupPct}%</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
          <header className="border-b border-white/10 px-5 py-3"><h3 className="font-display text-[13px] font-bold text-white">Resolution order — per night, then validated across the stay</h3></header>
          <ol className="p-4">
            {res.steps.map((s, i) => (
              <li key={s.n} className="relative pb-3.5 pl-9 last:pb-0">
                {i < res.steps.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-white/10" />}
                <span className="absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center rounded-full border border-white/15 bg-pine-950 font-mono text-[10.5px] font-bold text-white/70">{s.n}</span>
                <div className={cx("rounded-lg border px-3.5 py-2.5 transition-colors", s.status === "fail" ? "border-[#f08c8c]/40 bg-[#f08c8c]/5" : s.status === "adjusted" ? "border-[#e2a33c]/30" : "border-white/10")}>
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-white/90">{statusIcon(s.status)} {s.name}
                    <span className={cx("ml-auto font-mono text-[9px] font-bold uppercase", s.status === "fail" ? bad : s.status === "adjusted" ? warn : ok)}>{s.status}</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-white/55">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-4">
          <section className={cx("rounded-xl border p-4", res.bookable ? "border-[#4CC38A]/40 bg-[#4CC38A]/5" : "border-[#f08c8c]/40 bg-[#f08c8c]/5")}>
            <p className={cx("font-display text-[15px] font-bold", res.bookable ? ok : bad)}>{res.bookable ? "✓ bookable — serialisable insert would succeed" : "✗ not bookable — clean rejection, never a 500"}</p>
            {res.reasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {res.reasons.map((r) => <li key={r} className="flex gap-2 text-[11px] text-white/70"><Ic name="x" size={11} className="mt-0.5 shrink-0 text-[#f08c8c]" sw={2.6} /> {r}</li>)}
              </ul>
            )}
            {res.bookable && (
              <div className="mt-3 space-y-1 rounded-lg bg-pine-950 px-3.5 py-3 font-mono text-[11px]">
                <p className="flex justify-between text-white/60"><span>{los} nights × base + extra guests</span><span>{moneyRaw(a.nightsSub + a.extraTotal, res.currency)}</span></p>
                <p className="flex justify-between text-white/60"><span>cleaning (per stay)</span><span>{moneyRaw(a.cleaning, res.currency)}</span></p>
                <p className="flex justify-between text-white/60"><span>service fee</span><span>{moneyRaw(a.service, res.currency)}</span></p>
                <p className="flex justify-between text-white/60"><span>VAT</span><span>{moneyRaw(a.vat, res.currency)}</span></p>
                {a.discount > 0 && <p className="flex justify-between text-[#4CC38A]"><span>LOS discount</span><span>−{moneyRaw(a.discount, res.currency)}</span></p>}
                <p className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 text-[13px] font-bold text-white"><span>total · {res.currency}</span><span>{moneyRaw(a.total, res.currency)}</span></p>
                <p className="flex justify-between text-white/50"><span>reporting currency</span><span>{money(a.total, res.currency)}</span></p>
                <p className="flex justify-between text-white/50"><span>{channel}-facing price (+{channelDef(channel as never).markupPct}%)</span><span>{moneyRaw(a.channelTotal, res.currency)}</span></p>
              </div>
            )}
          </section>
          {res.bookable && (
            <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
              <header className="border-b border-white/10 px-4 py-2.5"><h3 className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/45">nightly[] — first 7 of {los}</h3></header>
              <div className="flex flex-wrap gap-1.5 p-3.5">
                {res.nightly.slice(0, 7).map((n, i) => (
                  <span key={i} className="rounded-md bg-pine-950 px-2 py-1.5 text-center">
                    <span className="block font-mono text-[8.5px] text-white/35">{res.keys[i].slice(5)}</span>
                    <span className="block font-mono text-[10.5px] font-bold text-white/85">{moneyRaw(n, res.currency, { compact: true })}</span>
                  </span>
                ))}
                {los > 7 && <span className="self-center font-mono text-[10px] text-white/35">+{los - 7} more</span>}
              </div>
            </section>
          )}
          <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
            <header className="border-b border-white/10 px-4 py-2.5"><h3 className="font-display text-[12.5px] font-bold text-white">Concurrency — how the double-sell is impossible</h3></header>
            <ul className="space-y-2.5 p-4">
              {CONCURRENCY_RULES.map((c) => (
                <li key={c.rule} className="rounded-lg border border-white/10 px-3.5 py-2.5">
                  <p className="text-[12px] font-bold text-white/85">{c.rule}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
