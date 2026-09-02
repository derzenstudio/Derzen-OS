import { useEffect, useMemo, useState } from "react";
import { cx, money, moneyRaw, dayKey, addDays, today, timeAgo } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Select, Toggle } from "../../components/ui";
import { NumStepper } from "../../components/controls";
import { Card, Pill, useAudit } from "../../components/Backoffice";
import { useApp } from "../../store";
import { BLOCKS, SERVICES } from "../../lib/data";
import {
  ADAPTER_METHOD_GROUPS, AI_RULES, AI_TASKS, ALL_EVENT_NAMES, API_CONVENTIONS, API_ENDPOINTS,
  CALC_DEFS, CAPABILITY_FLAGS, CAPABILITY_MATRIX, CONFIG_ENVS, ERROR_TAXONOMY, EVENT_CATALOGUE,
  EVENT_ENVELOPE, EVENT_RULES, GUEST_SURFACE, JOB_INVENTORY, JOB_RULES, PERMISSION_ROWS, PERM_LEGEND,
  PERM_NOTES, READINESS, SECRET_CLASSES, SECRET_NEVER, TENANT_ROLES,
} from "../../lib/reference";

const okTone = (s: string) => (s === "in repo" ? "ok" : s === "partial" ? "warn" : "info");

// ── §5 Adapter contract ────────────────────────────────────────────────────
export function AdapterView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card title="interface ChannelAdapter" sub="the single contract every OTA sits behind — implement it without reading the core codebase">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {ADAPTER_METHOD_GROUPS.map((g) => (
              <div key={g.group} className={cx("rounded-lg border px-3.5 py-3", g.optional ? "border-dashed border-white/15" : "border-white/10")}>
                <p className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-brand-bright">{g.group}{g.optional && <span className="rounded bg-white/5 px-1.5 text-[8.5px] text-white/40">optional capability</span>}</p>
                {g.methods.map((m) => (
                  <p key={m.sig} className="mb-1.5 last:mb-0">
                    <code className="block font-mono text-[10.5px] leading-snug text-white/85">{m.sig}</code>
                    <span className="text-[9.5px] text-white/40">{m.note}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Capability flags — declared, never inferred" sub="the UI degrades from this matrix instead of hardcoding conditionals">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="text-[9px] font-bold uppercase tracking-widest text-white/35">
                <th className="py-1.5 pr-2">provider</th>
                {CAPABILITY_FLAGS.map((f) => <th key={f} className="px-1 py-1.5 text-center font-mono text-[8.5px] normal-case tracking-normal text-white/40" title={f}>{f.slice(0, 4)}</th>)}
              </tr></thead>
              <tbody>
                {Object.entries(CAPABILITY_MATRIX).map(([prov, flags]) => (
                  <tr key={prov} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 text-[11px] font-bold text-white/80">{prov}</td>
                    {flags.map((f, i) => (
                      <td key={i} className="px-1 py-1.5 text-center">
                        <span className={cx("mx-auto block h-2 w-2 rounded-full", f ? "bg-[#4CC38A]" : "bg-white/10")} title={`${prov} · ${CAPABILITY_FLAGS[i]}: ${f ? "supported" : "not supported"}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-mono text-[9px] text-white/30">a channel that can't express a restriction receives a conservative equivalent — never a silent drop</p>
        </Card>
      </div>
      <Card title="Error taxonomy — exactly one class per error, because retry policy and UI copy depend on it" sub="Unknown must be rare; a rising Unknown rate is a defect">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {ERROR_TAXONOMY.map((e) => (
            <div key={e.cls} className="rounded-lg border border-white/10 px-3 py-2.5">
              <p className="font-mono text-[11px] font-bold text-white/90">{e.cls}</p>
              <p className="mt-0.5 text-[10px] text-white/50">{e.retry}</p>
              <p className="text-[9.5px] text-white/35">{e.ui}</p>
            </div>
          ))}
          <div className="rounded-lg border border-white/10 bg-pine-950 px-3 py-2.5">
            <p className="flex justify-between font-mono text-[10px] font-bold text-white/60"><span>Unknown rate · 24h</span><span className="text-[#4CC38A]">0.3%</span></p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-[#4CC38A]" style={{ width: "3%" }} />
            </div>
            <p className="mt-1 text-[9px] text-white/35">defect threshold 1% · alert wired</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── §6 Events ──────────────────────────────────────────────────────────────
export function EventsView() {
  const [tail, setTail] = useState<string[]>([]);
  useEffect(() => {
    const i = setInterval(() => {
      const name = ALL_EVENT_NAMES[Math.floor(Math.random() * ALL_EVENT_NAMES.length)];
      setTail((t) => [`${new Date().toISOString().slice(11, 23)}Z ${name.padEnd(34)} v1  tenant=t-${Math.random() > 0.5 ? "sanggraha" : "ambara"}  corr=${Math.random().toString(16).slice(2, 8)}`, ...t].slice(0, 8));
    }, 1500);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.3fr]">
      <div className="space-y-4">
        <Card title="Envelope — transactional outbox" sub="analytics can never disagree with the database">
          <pre className="overflow-x-auto rounded-lg bg-pine-950 p-3.5 font-mono text-[10.5px] leading-relaxed text-white/75">{EVENT_ENVELOPE}</pre>
          <ul className="mt-3 space-y-1">
            {EVENT_RULES.map((r) => <li key={r} className="flex gap-2 text-[10.5px] text-white/55"><Ic name="check" size={11} className="mt-0.5 shrink-0 text-[#4CC38A]" sw={2.6} />{r}</li>)}
          </ul>
        </Card>
        <Card title="Live outbox tail" sub="every business action, one envelope">
          <div className="min-h-[120px] font-mono text-[10px] leading-[1.8]">
            {tail.map((l, i) => <p key={`${l}${i}`} className="anim-rise whitespace-pre-wrap text-white/50" style={{ opacity: 1 - i * 0.11 }}>{l}</p>)}
          </div>
        </Card>
      </div>
      <Card title="Catalogue — resource.past_tense" sub={`${ALL_EVENT_NAMES.length} events wired first · versions are additive-only`}>
        <div className="space-y-2.5">
          {EVENT_CATALOGUE.map((g) => (
            <div key={g.resource} className="rounded-lg border border-white/10 px-3.5 py-2.5">
              <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-brand-bright">{g.resource}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.events.map((e) => (
                  <span key={e.name} className="rounded border border-white/10 bg-pine-950 px-2 py-1 font-mono text-[9.5px] text-white/70">
                    {e.name}<span className="ml-1 text-[#4CC38A]">v{e.v}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── §7 Public API ──────────────────────────────────────────────────────────
export function ApiReferenceView() {
  return (
    <div className="space-y-4">
      <Card title="Conventions — uniform across /v1" sub="the boring parts, enforced by lint on every route">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {API_CONVENTIONS.map((c) => (
            <div key={c.rule} className="rounded-lg border border-white/10 px-3 py-2.5">
              <p className="font-mono text-[10.5px] font-bold text-white/85">{c.rule}</p>
              <p className="text-[10px] text-white/45">{c.detail}</p>
            </div>
          ))}
          <div className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2.5">
            <p className="font-mono text-[10.5px] font-bold text-[#f0a0a0]">guest surface — separate origin</p>
            <p className="text-[10px] text-white/55">{GUEST_SURFACE.endpoints}</p>
            <p className="font-mono text-[9px] text-white/35">{GUEST_SURFACE.origin} · unauthenticated · {GUEST_SURFACE.rateLimited}</p>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {API_ENDPOINTS.map((g) => (
          <Card key={g.group} title={g.group} sub={`${g.endpoints.length} routes`}>
            <ul className="space-y-1">
              {g.endpoints.map((e) => (
                <li key={e.path} className="flex flex-wrap items-baseline gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <span className={cx("w-[72px] shrink-0 font-mono text-[9.5px] font-bold", e.method.includes("POST") || e.method.includes("PUT") || e.method.includes("PATCH") ? "text-brand-bright" : "text-[#4CC38A]")}>{e.method}</span>
                  <code className="font-mono text-[11px] text-white/80">{e.path}</code>
                  {e.note && <span className="ml-auto text-[9.5px] text-white/35">{e.note}</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── §8 Permissions ─────────────────────────────────────────────────────────
const CELL_STYLE: Record<string, string> = {
  full: "bg-[#1d3527] text-[#4CC38A]", scoped: "bg-[#173042] text-[#8fc4dd]", read: "bg-white/5 text-white/50",
  gated: "bg-[#3a3320] text-[#e2a33c]", none: "bg-white/[0.02] text-white/25",
};
export function PermissionsView() {
  const [role, setRole] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TENANT_ROLES.map((r, i) => (
          <button key={r} onClick={() => setRole(i)} className={cx("rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors", role === i ? "border-brand bg-brand text-white" : "border-white/15 text-white/55 hover:border-white/30 hover:text-white")}>{r}</button>
        ))}
      </div>
      <Card title="resource : action matrix" sub="resolved by the entitlement service · asserted from a CI fixture so role drift can't slip through">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[9px] font-bold uppercase tracking-widest text-white/35">
              <th className="py-2 pr-3">resource : action</th>
              {TENANT_ROLES.map((r, i) => <th key={r} className={cx("px-1.5 py-2 text-center text-[8.5px]", i === role && "text-brand-bright")}>{r}</th>)}
            </tr></thead>
            <tbody>
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.res} className={cx("border-t border-white/5", row.cls && "bg-brand/[0.04]")}>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white/85">
                      {row.cls && <Ic name="lock" size={10} className="text-brand-bright" />}
                      {row.res}<span className="font-normal text-white/35">:{row.action}</span>
                    </span>
                    {row.cls && <span className="pl-[18px] text-[9px] text-white/35">sealed class — withholdable from any role</span>}
                  </td>
                  {row.cells.map((c, i) => (
                    <td key={i} className="px-1.5 py-2 text-center">
                      <span className={cx("inline-block rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", CELL_STYLE[c], i === role && "ring-1 ring-brand-bright")}>{PERM_LEGEND[c].label}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {PERM_NOTES.map((n) => <li key={n} className="rounded-lg border border-white/10 px-3.5 py-2.5 text-[10.5px] leading-snug text-white/55">{n}</li>)}
      </ul>
    </div>
  );
}

// ── §9 AI task inventory ───────────────────────────────────────────────────
export function AiTasksView() {
  const { record } = useAudit();
  const [killed, setKilled] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {AI_RULES.map((r) => <li key={r} className="rounded-lg border border-white/10 px-3.5 py-2.5 text-[10.5px] leading-snug text-white/60">{r}</li>)}
      </ul>
      <Card title="Registered AI tasks — fixed contracts, no free-form prompting" sub="every invocation writes an ai_generations row · per-tenant kill switch per task">
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {AI_TASKS.map((t) => (
            <div key={t.task} className={cx("rounded-lg border px-3.5 py-3", killed[t.task] ? "border-brand/50 bg-brand/[0.06]" : "border-white/10")}>
              <div className="flex items-center gap-2">
                <code className="font-mono text-[11.5px] font-bold text-white/90">{t.task}</code>
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[8.5px] text-white/40">golden {t.golden}</span>
                <span className="ml-auto"><Toggle checked={!killed[t.task]} onChange={(v) => { setKilled({ ...killed, [t.task]: !v }); record(`${v ? "re-enabled" : "KILLED"} AI task`, t.task, "sensitive"); }} label={`kill switch ${t.task}`} /></span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-[10px]">
                <p className="text-white/50"><b className="text-white/70">context</b> · {t.context}</p>
                <p className="font-mono text-[9.5px] text-[#8fc4dd]">{t.output}</p>
                <p className="text-[#e2a33c]"><b>guardrail</b> · {t.guardrail}</p>
                <p className="text-white/40"><b>fallback</b> · {t.fallback}</p>
              </div>
              {killed[t.task] && <p className="mt-1.5 font-mono text-[9px] font-bold text-[#f08c8c]">KILL SWITCH ON — {t.fallback} serves this surface now</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── §10 Jobs ───────────────────────────────────────────────────────────────
const PRIO: Record<string, string> = { high: "bg-[#3d1f1f] text-[#f08c8c]", medium: "bg-[#3a3320] text-[#e2a33c]", low: "bg-white/5 text-white/50" };
export function JobsView() {
  return (
    <Card title="Background job inventory — as critical as the web tier" sub={JOB_RULES}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="text-[9px] font-bold uppercase tracking-widest text-white/35">
            <th className="py-2 pr-3">job</th><th className="py-2 pr-3">cadence</th><th className="py-2 pr-3">idempotency key</th><th className="py-2 pr-3">priority</th><th className="py-2 text-right">depth</th>
          </tr></thead>
          <tbody>
            {JOB_INVENTORY.map((j) => (
              <tr key={j.job} className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
                <td className="py-2 pr-3 font-mono text-[11px] font-bold text-white/85">{j.job}</td>
                <td className="py-2 pr-3 text-[10.5px] text-white/55">{j.cadence}</td>
                <td className="py-2 pr-3 font-mono text-[10px] text-white/45">{j.idem}</td>
                <td className="py-2 pr-3"><span className={cx("rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", PRIO[j.prio])}>{j.prio}</span></td>
                <td className="py-2 text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex h-1.5 w-14 overflow-hidden rounded-full bg-white/5"><span className={cx("h-full rounded-full", j.depth > 2 ? "bg-[#e2a33c]" : "bg-[#4CC38A]")} style={{ width: `${Math.min(100, j.depth * 20)}%` }} /></span>
                    <span className="font-mono text-[10px] text-white/45">{j.depth}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── §11 Config & secrets ───────────────────────────────────────────────────
export function ConfigSecretsView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card title="Configuration — by environment, never in code">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-[9px] font-bold uppercase tracking-widest text-white/35">
              <th className="py-2 pr-3">env</th><th className="py-2 pr-3">database</th><th className="py-2 pr-3">queue</th><th className="py-2 pr-3">origins</th><th className="py-2 pr-3">locales</th><th className="py-2">retention</th>
            </tr></thead>
            <tbody>
              {CONFIG_ENVS.map((e) => (
                <tr key={e.env} className="border-t border-white/5">
                  <td className="py-2 pr-3"><span className={cx("rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase", e.env === "production" ? "bg-brand text-white" : "bg-white/5 text-white/60")}>{e.env}</span></td>
                  <td className="py-2 pr-3 font-mono text-[9.5px] text-white/55">{e.db}</td>
                  <td className="py-2 pr-3 font-mono text-[9.5px] text-white/55">{e.queue}</td>
                  <td className="py-2 pr-3 font-mono text-[9.5px] text-white/55">{e.origins}</td>
                  <td className="py-2 pr-3 font-mono text-[9.5px] text-white/55">{e.locales}</td>
                  <td className="py-2 font-mono text-[9.5px] text-white/55">{e.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[9.5px] text-white/30">plus: rate-limit tiers · entitlement cache TTL · allowed custom-domain suffix · retention windows per data class</p>
      </Card>
      <Card title="Secrets — KMS-backed, rotated, never displayed" sub="this console shows metadata only; values are decrypted at point of use">
        <ul className="space-y-1.5">
          {SECRET_CLASSES.map((s) => (
            <li key={s.secret} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2">
              <Ic name="lock" size={12} className="shrink-0 text-brand-bright" />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold text-white/85">{s.secret}</p>
                <p className="font-mono text-[9px] text-white/35">{s.storage} · rotate {s.rotation} · scope: {s.scope}</p>
              </div>
              <span className="font-mono text-[9px] text-[#4CC38A]">● healthy</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-[10.5px] text-[#f0a0a0]">
          Nothing in this inventory may appear in {SECRET_NEVER.map((n, i) => <span key={n}><b>{n}</b>{i < SECRET_NEVER.length - 1 ? ", " : ""}</span>)} — enforced by secret-scanning in CI.
        </p>
      </Card>
    </div>
  );
}

// ── §12 Derived calculations — live against the signed-in tenant ──────────
const TZ_OFFSET: Record<string, number> = { "Asia/Makassar": 8, "Asia/Jakarta": 7, "Europe/Amsterdam": 1 };
const CONSUMING = ["confirmed", "deposit_paid", "checked_in", "checked_out"];
const nights = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 86_400_000);

export function CalculationsView() {
  const { toast } = useApp();
  const properties = useApp((s) => s.properties);
  const reservations = useApp((s) => s.reservations);
  const expenses = useApp((s) => s.expenses);
  const [propId, setPropId] = useState(properties.find((p) => !p.archived && !p.parentId)?.id ?? properties[0].id);
  const [prorationDay, setProrationDay] = useState(30);
  const [naive, setNaive] = useState(false);
  const [stmtRun, setStmtRun] = useState(0);

  const prop = properties.find((p) => p.id === propId);
  if (!prop) return null;

  const cur = prop.currency;

  // billable meter
  const billableUnits = properties.filter((p) => !p.archived && !p.parentId).length;
  const billableServices = SERVICES.filter((s) => s.active).length;
  const monthRate = 49 + billableUnits * 12 + billableServices * 4;
  const prorated = Math.round((monthRate * prorationDay) / 30);

  // owner statement — period: last 30 days
  const start = dayKey(addDays(today(), -30));
  const end = dayKey(today());
  const stmt = useMemo(() => {
    const rs = reservations.filter((r) => r.propertyId === propId && CONSUMING.includes(r.status) && r.checkIn < end && r.checkOut > start);
    const gross = rs.reduce((s, r) => s + r.items.filter((i) => i.kind === "night" || i.kind === "extra_guest").reduce((a, i) => a + i.amount, 0), 0);
    const extras = rs.reduce((s, r) => s + r.items.filter((i) => ["fee", "addon"].includes(i.kind)).reduce((a, i) => a + i.amount, 0), 0);
    const commission = Math.round((gross + extras) * 0.15);
    const mgmt = Math.round((gross * prop.commissionPct) / 100);
    const attr = expenses.filter((e) => e.propertyId === propId && e.approval === "approved").reduce((s, e) => s + e.amount, 0);
    const tax = Math.round(gross * 0.1);
    const net = gross + extras - commission - mgmt - attr - tax;
    const hash = ((gross + extras - commission - mgmt - attr - tax) >>> 0).toString(16).padStart(8, "0");
    return { count: rs.length, gross, extras, commission, mgmt, attr, tax, net, hash };
  }, [reservations, expenses, propId, prop.commissionPct, stmtRun]);
  void stmtRun;

  // occupancy — current month
  const monthDays = new Date(today().getFullYear(), today().getMonth() + 1, 0).getDate();
  const units = properties.filter((p) => !p.archived).length;
  const monthStart = dayKey(new Date(today().getFullYear(), today().getMonth(), 1));
  const monthEnd = dayKey(new Date(today().getFullYear(), today().getMonth() + 1, 1));
  const blockNights = (type: string) => BLOCKS.filter((b) => b.type === type).reduce((s, b) => s + Math.max(0, nights(b.checkIn > monthStart ? b.checkIn : monthStart, b.checkOut < monthEnd ? b.checkOut : monthEnd)), 0);
  const ownerN = blockNights("owner");
  const maintN = blockNights("manual");
  const booked = reservations.filter((r) => CONSUMING.includes(r.status) && r.checkIn < monthEnd && r.checkOut > monthStart)
    .reduce((s, r) => s + Math.max(0, nights(r.checkIn > monthStart ? r.checkIn : monthStart, r.checkOut < monthEnd ? r.checkOut : monthEnd)), 0);
  const denom = units * monthDays - (naive ? 0 : ownerN + maintN);
  const occupancy = booked / denom;
  const monthRev = reservations.filter((r) => CONSUMING.includes(r.status) && r.checkIn < monthEnd && r.checkOut > monthStart)
    .reduce((s, r) => s + r.items.filter((i) => i.kind === "night" || i.kind === "extra_guest").reduce((a, i) => a + i.amount, 0), 0);
  const adr = booked ? monthRev / booked : 0;
  const revpar = monthRev / denom;

  // task generation — next arriving reservation
  const next = [...reservations].filter((r) => CONSUMING.includes(r.status) && r.checkIn >= dayKey(today())).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  const off = TZ_OFFSET[prop.tz] ?? 0;
  void off;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Billable meter */}
        <Card title="Billable meter — live from this tenant's rows" sub={CALC_DEFS.meter}>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-white/10 bg-pine-950 px-3.5 py-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">billable property units</p>
              <p className="mt-1 font-display text-[26px] font-extrabold text-white">{billableUnits}</p>
              <p className="font-mono text-[9px] text-white/35">active ∧ parent IS NULL</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-pine-950 px-3.5 py-3">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">billable service units</p>
              <p className="mt-1 font-display text-[26px] font-extrabold text-white">{billableServices}</p>
              <p className="font-mono text-[9px] text-white/35">store items ∨ services · active</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="mb-1 flex justify-between font-mono text-[10px] text-white/50"><span>mid-cycle proration · day {prorationDay} of 30</span><span className="text-white/80">${prorated} of ${monthRate}</span></p>
            <NumStepper value={prorationDay} onChange={(v) => setProrationDay(v)} min={1} max={30} suffix="d" w={110} label="Proration day in period" allowNegative={false} />
            <p className="mt-1 text-[9.5px] text-white/35">usage.metered emitted per measurement with stored inputs — the tenant sees this exact breakdown</p>
          </div>
        </Card>

        {/* Owner statement */}
        <Card title="Owner statement — regenerates identically for a closed period" sub={CALC_DEFS.statement}
          actions={<Select value={propId} onChange={(e) => setPropId(e.target.value)} className="!h-8 !w-[170px] !bg-[#171714] !text-white" aria-label="Statement property">{properties.filter((p) => !p.archived && !p.parentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}>
          <table className="w-full text-left">
            <tbody>
              {[
                [`Gross nights · ${stmt.count} reservations`, stmt.gross, false],
                ["Collected extras & fees", stmt.extras, false],
                ["Channel commission · 15% weighted", -stmt.commission, true],
                [`Management fee · ${prop.commissionPct}%`, -stmt.mgmt, true],
                ["Attributed expenses · billable_to=owner", -stmt.attr, true],
                ["Tourism levy · host-remit 10%", -stmt.tax, true],
              ].map(([label, amt, neg]) => (
                <tr key={String(label)} className="border-b border-white/5">
                  <td className="py-1.5 pr-2 text-[11px] text-white/65">{label}</td>
                  <td className={cx("py-1.5 text-right font-mono text-[11.5px] font-bold", neg ? "text-[#f08c8c]" : "text-white/85")}>{moneyRaw(Number(amt), cur, { sign: Number(amt) < 0 })}</td>
                </tr>
              ))}
              <tr><td className="py-2 text-[12px] font-bold text-white">Net to owner · closing balance</td><td className="py-2 text-right font-mono text-[14px] font-extrabold text-[#4CC38A]">{moneyRaw(stmt.net, cur)}</td></tr>
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[9.5px] text-white/35">checksum 0x{stmt.hash} · every line traces to a journal entry</span>
            <Btn size="xs" variant="ghost" className="ml-auto !text-white/60" icon="refresh" onClick={() => { setStmtRun((n) => n + 1); toast("ok", "Regenerated — identical", `checksum 0x${stmt.hash} · rates & agreements snapshotted, not recomputed`); }}>Regenerate</Btn>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Occupancy / ADR / RevPAR */}
        <Card title="Occupancy · ADR · RevPAR — the denominator, published" sub={CALC_DEFS.occupancy}>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              ["occupancy", `${(occupancy * 100).toFixed(1)}%`],
              ["ADR", money(Math.round(adr), cur, { compact: true })],
              ["RevPAR", money(Math.round(revpar), cur, { compact: true })],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-white/10 bg-pine-950 px-3 py-3">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">{l}</p>
                <p className="mt-1 font-display text-[20px] font-extrabold text-white">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-white/10 px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-white/50">
            <p>available = {units} units × {monthDays} nights − {ownerN} owner − {maintN} maint = <b className="text-white/85">{denom}</b></p>
            <p>booked = <b className="text-white/85">{booked}</b> unit-nights (stop-sells included in denominator)</p>
          </div>
          <label className="mt-2.5 flex items-center gap-2.5 text-[10.5px] text-white/55">
            <Toggle checked={naive} onChange={setNaive} label="naive denominator" />
            naive denominator (ignore blocks) → {((booked / (units * monthDays)) * 100).toFixed(1)}% — the number operators wrongly expect
          </label>
        </Card>

        {/* Task generation */}
        <Card title="Task generation — timezone-correct, version-stamped, deduped" sub={CALC_DEFS.taskgen}>
          {next ? (
            <div className="space-y-2.5">
              {[
                { tpl: "checkout-clean · v6", anchor: `checkout ${prop.checkOutTime} ${prop.tzShort}`, local: `${prop.checkOutTime} ${next.checkOut}`, utc: `${String((Number(prop.checkOutTime.slice(0, 2)) - (TZ_OFFSET[prop.tz] ?? 0) + 24) % 24).padStart(2, "0")}${prop.checkOutTime.slice(2)} UTC`, key: `(v6, ${next.ref}, stay-end)` },
                { tpl: "pre-arrival-prep · v4", anchor: `check-in − 4h in ${prop.tz}`, local: `${String((Number(prop.checkInTime.slice(0, 2)) - 4 + 24) % 24).padStart(2, "0")}${prop.checkInTime.slice(2)} ${next.checkIn}`, utc: `${String((Number(prop.checkInTime.slice(0, 2)) - 4 - (TZ_OFFSET[prop.tz] ?? 0) + 48) % 24).padStart(2, "0")}${prop.checkInTime.slice(2)} UTC`, key: `(v4, ${next.ref}, arrival)` },
              ].map((t) => (
                <div key={t.tpl} className="rounded-lg border border-white/10 px-3.5 py-2.5">
                  <p className="flex items-center gap-2 text-[11.5px] font-bold text-white/85">{t.tpl}<span className="rounded bg-white/5 px-1.5 font-mono text-[8.5px] text-white/40">{next.ref} · {next.checkIn} → {next.checkOut}</span></p>
                  <p className="mt-1 font-mono text-[10px] text-white/50">anchor: {t.anchor}</p>
                  <p className="font-mono text-[10px] text-white/50">due_at_local <b className="text-white/80">{t.local}</b> → due_at_utc <b className="text-white/80">{t.utc}</b></p>
                  <p className="mt-0.5 font-mono text-[9px] text-[#4CC38A]">dedupe {t.key}</p>
                </div>
              ))}
              <div className="flex items-center gap-2.5 rounded-lg border border-[#e2a33c]/40 bg-[#3a3320]/30 px-3.5 py-2.5">
                <Ic name="alertTri" size={14} className="text-[#e2a33c]" />
                <p className="text-[10.5px] text-white/60"><b className="text-[#e2a33c]">template_mismatch</b> — task stamped v5, template now v6 → surfaced with “review & re-apply”, never silent divergence</p>
                <Btn size="xs" variant="ghost" className="ml-auto !text-white/60" onClick={() => toast("ok", "Re-applied v6", "Flag cleared · checklist preserved where completed")}>re-apply</Btn>
              </div>
            </div>
          ) : <p className="py-6 text-center font-mono text-[11px] text-white/40">no upcoming confirmed reservation in this tenant</p>}
        </Card>
      </div>
      <p className="font-mono text-[9.5px] text-white/30">all four definitions are the contract — reports, owner statements and the meter derive from them, and the tenant sees the same math</p>
    </div>
  );
}

// ── §13 Ready-to-code checklist ────────────────────────────────────────────
export function ChecklistView() {
  return (
    <Card title="Before implementation starts — these exist as artefacts in the repo" sub="skipping any of these is the decision you regret at customer fifty">
      <ul className="space-y-2">
        {READINESS.map((r) => (
          <li key={r.artefact} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3.5 py-2.5">
            <Pill ok={r.status === "in repo"} label={r.status} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-white/85">{r.artefact}</p>
              <p className="font-mono text-[9.5px] text-white/35">{r.where}</p>
            </div>
            <Ic name={r.status === "in repo" ? "checkCircle" : "clock"} size={15} className={r.status === "in repo" ? "text-[#4CC38A]" : "text-[#e2a33c]"} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
