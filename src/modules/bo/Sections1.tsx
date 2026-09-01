import { useMemo, useState } from "react";
import { cx, money, timeAgo, pct } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Dot, Modal, Ring, Spark, Toggle } from "../../components/ui";
import { useApp } from "../../store";
import { useAudit, Card, Stat, ago } from "../../components/Backoffice";
import {
  AI_ESCALATIONS, BO_TENANTS, COHORTS, DUNNING, FAILED_PAYMENTS, FAILING_CONNECTIONS, FAILING_WEBHOOKS, LIFECYCLE,
  LIFECYCLE_RULES, METERING, MRR_MOVEMENT, PLANS, QUARANTINED_RESERVATIONS, STUCK_JOBS,
  type BoTenant,
} from "../../lib/backoffice";

const CH_LABEL: Record<string, string> = { airbnb: "Airbnb", booking: "Booking", vrbo: "VRBO", expedia: "Expedia", agoda: "Agoda", trip: "Trip", ical: "iCal" };

// ── Section A · Ops dashboard ─────────────────────────────────────────────
export function OpsDashboard({ onEmergencyStop }: { onEmergencyStop: () => void }) {
  const { toast } = useApp();
  const { record } = useAudit();
  const act = (action: string, target: string) => { record(action, target); toast("ok", "Queued for retry", `${target} — idempotent, one push per unit-night`); };

  const failing = FAILING_CONNECTIONS.length + FAILING_WEBHOOKS.length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Failing connections" value={FAILING_CONNECTIONS.length} tone={FAILING_CONNECTIONS.length ? "danger" : "ok"} sub="circuit-open & backoff" />
        <Stat label="Quarantined inbound" value={QUARANTINED_RESERVATIONS.length} tone={QUARANTINED_RESERVATIONS.length ? "warn" : "ok"} sub="unmapped, not dropped" />
        <Stat label="Stuck jobs" value={STUCK_JOBS.length} tone="warn" sub="DLQ & stalled leases" />
        <Stat label="Failing webhooks" value={FAILING_WEBHOOKS.length} tone={FAILING_WEBHOOKS.length ? "danger" : "ok"} sub="tenant endpoints 5xx" />
        <Stat label="AI escalations >4h" value={AI_ESCALATIONS.length} tone={AI_ESCALATIONS.length ? "warn" : "ok"} sub="needs a human" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Channel connections failing platform-wide" sub="Seen here before the customer files a ticket">
          <ul className="space-y-2">
            {FAILING_CONNECTIONS.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-danger dot-pulse" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white">{f.tenant} · {CH_LABEL[f.channel]} · {f.property}</p>
                  <p className="font-mono text-[10.5px] text-white/45">{f.error} · {f.retries} retries · {f.state} · {ago(f.since)}</p>
                </div>
                <Btn size="xs" icon="refresh" onClick={() => act("retried channel sync", `${f.tenant}/${f.channel}`)}>Retry</Btn>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Quarantined inbound reservations" sub="Unmapped room type → held for review, never force-assigned, never dropped">
          <ul className="space-y-2">
            {QUARANTINED_RESERVATIONS.map((q) => (
              <li key={q.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{q.tenant} · {q.ref} · {q.guest}</p>
                  <Badge tone="warn">{q.nights} nights</Badge>
                </div>
                <p className="mt-0.5 font-mono text-[10.5px] text-white/45">{q.issue} · arrived {ago(q.arrived)}</p>
                <div className="mt-2 flex gap-2">
                  <Btn size="xs" variant="solid" icon="check" onClick={() => act("mapped room type & imported", q.ref)}>Map & import</Btn>
                  <Btn size="xs" icon="x" onClick={() => act("returned reservation to channel", q.ref)}>Return</Btn>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Stuck background jobs" sub="Durable queues with DLQ — no silent failure">
          <ul className="space-y-2">
            {STUCK_JOBS.map((j) => (
              <li key={j.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white">{j.queue} / {j.job}</p>
                  <p className="font-mono text-[10.5px] text-white/45">{j.tenant} · stuck {ago(Date.now() - j.stuckFor)} · {j.attempts} attempts</p>
                </div>
                <Btn size="xs" icon="refresh" onClick={() => act("requeued stuck job", `${j.queue}/${j.job}`)}>Requeue</Btn>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Webhook endpoints failing" sub="Notify tenant before disabling">
          <ul className="space-y-2">
            {FAILING_WEBHOOKS.map((w) => (
              <li key={w.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-white">{w.tenant}</p>
                <p className="truncate font-mono text-[10.5px] text-white/45">{w.endpoint} · HTTP {w.status || "timeout"} · {w.consecutive}× · {ago(w.failingSince)}</p>
                <div className="mt-2 flex gap-2">
                  <Btn size="xs" icon="send" onClick={() => act("replayed webhook deliveries", w.endpoint)}>Replay</Btn>
                  <Btn size="xs" icon="chat" onClick={() => act("notified tenant of failing endpoint", w.tenant)}>Notify tenant</Btn>
                </div>
              </li>
            ))}
            {FAILED_PAYMENTS.map((p) => (
              <li key={p.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-white">{p.tenant} · {p.invoice} · ${p.amount}</p>
                <p className="font-mono text-[10.5px] text-white/45">{p.lastError} · {p.attempts} attempts · next dunning {ago(p.nextDunning)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
        <Ic name="alertTri" size={16} className="text-[#f08c8c]" />
        <p className="text-[12px] text-white/70">Break-glass: halt <b>all</b> automated outbound guest messaging platform-wide. Takes effect in &lt;30s. Logged as a destructive action.</p>
        <Btn variant="danger" size="sm" className="ml-auto" icon="lock" onClick={onEmergencyStop}>Engage emergency stop</Btn>
      </div>
    </div>
  );
}

// ── Section B · Tenants & lifecycle ──────────────────────────────────────
export function TenantsView() {
  const { toast } = useApp();
  const { record } = useAudit();
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [sel, setSel] = useState<BoTenant | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; tenant: BoTenant; destructive?: boolean } | null>(null);

  const list = useMemo(() => BO_TENANTS.filter((t) =>
    (state === "all" || t.state === state) &&
    (t.name.toLowerCase().includes(q.toLowerCase()) || t.email.toLowerCase().includes(q.toLowerCase())),
  ), [q, state]);

  const run = () => {
    if (!confirm) return;
    record(`${confirm.action} tenant`, confirm.tenant.name, confirm.destructive ? "destructive" : "sensitive");
    toast("ok", confirm.destructive ? "Two-person approval recorded" : "Action applied", `${confirm.action} — ${confirm.tenant.name}`);
    setConfirm(null);
    setSel(null);
  };

  if (sel) return <TenantDetail t={sel} onBack={() => setSel(null)} onAction={(action, destructive) => setConfirm({ action, tenant: sel, destructive })} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Ic name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or owner email" className="h-9 w-64 rounded-md border border-white/15 bg-[#0d0d0b] pl-8 pr-3 text-[12.5px] text-white placeholder:text-white/30 focus:border-brand focus:outline-none" />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-white/15 bg-[#0d0d0b] p-0.5">
          {["all", ...LIFECYCLE].map((s) => (
            <button key={s} onClick={() => setState(s)} className={cx("rounded px-2.5 py-1 text-[11px] font-bold capitalize transition-colors", state === s ? "bg-brand text-white" : "text-white/50 hover:text-white")}>{s}</button>
          ))}
        </div>
        <p className="ml-auto font-mono text-[10.5px] text-white/40">{list.length} workspaces · MRR ${BO_TENANTS.filter((t) => t.state === "active").reduce((s, t) => s + t.mrr, 0)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-[#0d0d0b]">
            <tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">
              {["Workspace", "State", "Plan", "Units", "MRR", "Health", "Region", "Last active"].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} onClick={() => setSel(t)} className="cursor-pointer border-t border-white/8 bg-[#0d0d0b]/50 transition-colors hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <p className="text-[13px] font-bold text-white">{t.name}</p>
                  <p className="font-mono text-[10px] text-white/40">{t.email}</p>
                </td>
                <td className="px-4 py-3"><StateChip s={t.state} /></td>
                <td className="px-4 py-3 text-[12px] text-white/70">{t.plan}</td>
                <td className="px-4 py-3 font-mono text-[12px] text-white/70">{t.unitsBillable}<span className="text-white/35">+{t.unitsArchived} arch</span></td>
                <td className="px-4 py-3 font-mono text-[12px] font-bold text-white">${t.mrr}</td>
                <td className="px-4 py-3"><Ring value={t.health / 100} size={34} /></td>
                <td className="px-4 py-3 font-mono text-[10.5px] text-white/50">{t.region}</td>
                <td className="px-4 py-3 font-mono text-[10.5px] text-white/50">{ago(t.lastActivity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.destructive ? "Two-person approval required" : "Confirm action"} w={460}
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant={confirm?.destructive ? "danger" : "solid"} icon={confirm?.destructive ? "shield" : "check"} onClick={run}>{confirm?.destructive ? "Approve (2 of 2)" : "Apply"}</Btn>
        </>}>
        <p className="text-[13px] leading-relaxed text-white/75">
          <b className="text-white">{confirm?.action}</b> on <b className="text-white">{confirm?.tenant.name}</b>.
          {confirm?.destructive ? " Destructive actions require a second approver and are written to the immutable audit stream." : " This is permissioned, rate-limited and audited."}
        </p>
      </Modal>
    </div>
  );
}

function StateChip({ s }: { s: BoTenant["state"] }) {
  const map: Record<BoTenant["state"], string> = {
    trialing: "bg-[#e2a33c]/15 text-[#e2a33c]", active: "bg-[#4CC38A]/15 text-[#4CC38A]", past_due: "bg-[#e2703c]/15 text-[#e2703c]",
    suspended: "bg-danger/15 text-[#f08c8c]", cancelled: "bg-white/10 text-white/50", purged: "bg-white/5 text-white/30",
  };
  return <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10px] font-bold capitalize", map[s])}>{s.replace("_", " ")}</span>;
}

function TenantDetail({ t, onBack, onAction }: { t: BoTenant; onBack: () => void; onAction: (a: string, d?: boolean) => void }) {
  const { record } = useAudit();
  const { toast } = useApp();
  const errSeries = [2, 1, 3, 2, 8, 12, 9, 4, 2, 3, 1, 2, 4, 7, 3, 2];
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-bold text-white/50 hover:text-white"><Ic name="chevL" size={13} /> All tenants</button>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#0d0d0b] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-[20px] font-bold text-white">{t.name}</h2>
            <StateChip s={t.state} />
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-white/40">{t.legal} · {t.subdomain}.derzen.site · since {t.created} · {t.region}</p>
        </div>
        <div className="flex gap-2">
          {t.state === "trialing" && <Btn icon="clock" onClick={() => onAction("extended trial 14d")}>Extend trial</Btn>}
          {(t.state === "active" || t.state === "past_due") && <Btn variant="danger" icon="lock" onClick={() => onAction("suspended", false)}>Suspend</Btn>}
          {(t.state === "suspended" || t.state === "past_due") && <Btn variant="solid" icon="refresh" onClick={() => onAction("restored")}>Restore</Btn>}
          {(t.state === "cancelled" || t.state === "suspended") && <Btn variant="danger" icon="trash" onClick={() => onAction("purged (hard delete)", true)}>Purge</Btn>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Plan" value={t.plan} sub={`${t.addons.length ? t.addons.join(", ") : "no add-ons"}`} />
        <Stat label="Billable units" value={t.unitsBillable} sub={`${t.serviceUnits} service units · ${t.unitsArchived} archived`} />
        <Stat label="MRR" value={`$${t.mrr}`} sub={t.trialEnds ? `trial ends ${ago(t.trialEnds)}` : t.currency + " workspace"} />
        <Stat label="AI credits" value={pct(t.credits.used / t.credits.limit)} sub={`${t.credits.used.toLocaleString()} / ${t.credits.limit.toLocaleString()}`} tone={t.credits.used / t.credits.limit > 0.8 ? "warn" : "default"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Lifecycle" sub="What this state permits">
          <ol className="space-y-1.5">
            {LIFECYCLE.map((s, i) => (
              <li key={s} className={cx("flex items-start gap-2.5 rounded-lg border px-3 py-2", s === t.state ? "border-brand/50 bg-brand/10" : "border-white/8")}>
                <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold", s === t.state ? "bg-brand text-white" : "bg-white/10 text-white/40")}>{i + 1}</span>
                <div>
                  <p className={cx("text-[12px] font-bold capitalize", s === t.state ? "text-white" : "text-white/50")}>{s.replace("_", " ")}</p>
                  <p className="text-[10.5px] leading-snug text-white/40">{LIFECYCLE_RULES[s]}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Error rate · 30d" sub="Support-resolution signal">
          <Spark points={errSeries} color="#D92B2B" h={64} w={300} />
          <div className="mt-3 space-y-1.5">
            <p className="flex justify-between text-[11.5px] text-white/60"><span>Users</span><span className="font-mono font-bold text-white">{t.users}</span></p>
            <p className="flex justify-between text-[11.5px] text-white/60"><span>Storage</span><span className="font-mono font-bold text-white">{t.storageMB} MB</span></p>
            <p className="flex justify-between text-[11.5px] text-white/60"><span>Health drivers</span><span className="font-mono font-bold text-white">{t.health}/100</span></p>
          </div>
          <button onClick={() => { record("generated diagnostic bundle", t.name); toast("ok", "Diagnostic bundle ready", "Redacted config, errors, sync, jobs, entitlements, flags"); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70 hover:border-brand hover:text-white">
            <Ic name="download" size={13} /> Generate diagnostic bundle
          </button>
        </Card>

        <Card title="Recent internal audit" sub="Append-only · staff cannot mutate">
          <ul className="space-y-2">
            <li className="text-[11.5px] text-white/60"><span className="font-mono text-white/35">{ago(Date.now() - 2 * 3600_000)}</span> — read tenant snapshot</li>
            <li className="text-[11.5px] text-white/60"><span className="font-mono text-white/35">{ago(Date.now() - 9 * 3600_000)}</span> — entitlement cache invalidated</li>
            <li className="text-[11.5px] text-white/60"><span className="font-mono text-white/35">{ago(Date.now() - 26 * 3600_000)}</span> — impersonation (consented, read-only)</li>
          </ul>
          <p className="mt-3 rounded-md bg-white/[0.04] px-3 py-2 font-mono text-[10px] text-white/35">row-level isolation: RLS on tenant_id · cross-tenant suite green</p>
        </Card>
      </div>
    </div>
  );
}

// ── Section C · Commercial engine ────────────────────────────────────────
export function CommercialsView() {
  const { toast } = useApp();
  const { record } = useAudit();
  const max = Math.max(...MRR_MOVEMENT.map((m) => Math.abs(m.value)));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Plan & pricing catalogue" sub="Data, not code — price changes never need a deploy" className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Plan", "Version", "Monthly", "Annual", "Units", "Services", "Credits", "Grandfathered"].map((h) => <th key={h} className="py-2 pr-4 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.id} className="border-t border-white/8">
                    <td className="py-2.5 pr-4 text-[13px] font-bold text-white">{p.name}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-white/50">v{p.version}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white">${p.monthly}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">${p.annual}/mo</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">{p.units}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">{p.services}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">{p.credits.toLocaleString()}</td>
                    <td className="py-2.5 font-mono text-[11px] text-[#e2a33c]">{p.grandfathered} tenants on older v</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-mono text-[10px] text-white/35">Existing tenants stay on their signed plan version until explicitly migrated.</p>
        </Card>

        <Card title="MRR movement · this month" sub="Decomposed, not a single number">
          <ul className="space-y-1.5">
            {MRR_MOVEMENT.map((m) => (
              <li key={m.label} className="flex items-center gap-2">
                <span className="w-28 shrink-0 text-[11px] text-white/60">{m.label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-white/5">
                  <div className={cx("flex h-full items-center rounded px-1.5 font-mono text-[9.5px] font-bold", m.value < 0 ? "justify-end bg-danger/60 text-white" : m.label.includes("MRR") ? "bg-white/20 text-white" : "bg-[#4CC38A]/60 text-white")} style={{ width: `${Math.max(8, (Math.abs(m.value) / max) * 100)}%` }}>
                    {m.value < 0 ? `-$${Math.abs(m.value)}` : `$${m.value}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Per-unit metering" sub="Billable unit = active listings at measurement; child listings counted; reconciled nightly">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Tenant", "Active", "Archived", "Child", "Services", "Billed", "Drift"].map((h) => <th key={h} className="py-2 pr-4 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {METERING.map((m) => (
                  <tr key={m.tenant} className="border-t border-white/8">
                    <td className="py-2.5 pr-4 text-[12.5px] font-bold text-white">{m.tenant}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">{m.listingsActive}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/40">{m.listingsArchived}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/40">{m.childListings}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-white/70">{m.services}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] font-bold text-white">{m.billedUnits}+{m.serviceUnits}</td>
                    <td className="py-2.5">{m.drift === 0 ? <Badge tone="ok">meter = subscription</Badge> : <Badge tone="danger">drift {m.drift}</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Dunning & failed payments" sub="Escalating sequence with self-serve recovery">
            <ul className="space-y-2">
              {DUNNING.map((d) => (
                <li key={d.invoice} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-white">{d.tenant} · {d.invoice} · ${d.amount}</p>
                    <Badge tone="warn">step {d.step}</Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[10.5px] text-white/45">{d.sequence} · next {ago(d.next)}{d.willSuspend && " · will suspend"}</p>
                  <Btn size="xs" className="mt-2" icon="send" onClick={() => { record("sent dunning reminder", d.invoice); toast("ok", "Reminder sent", d.invoice); }}>Send reminder now</Btn>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Cohort retention · logo" sub="% of cohort still active">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Cohort", "Size", "M1", "M2", "M3", "M4"].map((h) => <th key={h} className="py-1.5 pr-3 font-bold">{h}</th>)}</tr></thead>
                <tbody>
                  {COHORTS.map((c) => (
                    <tr key={c.month} className="border-t border-white/8">
                      <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{c.month}</td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{c.size}</td>
                      {[c.m1, c.m2, c.m3, c.m4].map((v, i) => (
                        <td key={i} className="py-2 pr-3">
                          {v == null ? <span className="text-white/20">·</span> : (
                            <span className={cx("rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold", v >= 90 ? "bg-[#4CC38A]/15 text-[#4CC38A]" : v >= 80 ? "bg-[#e2a33c]/15 text-[#e2a33c]" : "bg-danger/15 text-[#f08c8c]")}>{v}%</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
