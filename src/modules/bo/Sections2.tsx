import { useState } from "react";
import { cx, pct } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Toggle } from "../../components/ui";
import { useApp } from "../../store";
import { useAudit, Card, Pill, ago } from "../../components/Backoffice";
import {
  CAPABILITY_MATRIX, CERTIFICATION, COMING_SOON, DELIVERABILITY, FLAGS, ORCHESTRATOR, QUOTAS,
  RECONCILIATION, TEMPLATE_GOVERNANCE, THROTTLE, TRANSPORTS, VAULT,
} from "../../lib/backoffice";

const CH_LABEL: Record<string, string> = { airbnb: "Airbnb", booking: "Booking", vrbo: "VRBO", expedia: "Expedia", agoda: "Agoda", trip: "Trip", ical: "iCal", mmt: "MakeMyTrip", traveloka: "Traveloka" };

// ── Section D · Entitlements, flags, coming soon ─────────────────────────
export function EntitlementsView() {
  const { toast } = useApp();
  const { record } = useAudit();
  const [flags, setFlags] = useState(FLAGS);
  const [kill, setKill] = useState<Record<string, boolean>>({});

  const flip = (key: string, on: boolean) => {
    setFlags((f) => f.map((x) => (x.key === key ? { ...x, on } : x)));
    record(`${on ? "enabled" : "disabled"} flag ${key}`, "flags", "sensitive");
    toast("ok", `Flag ${on ? "enabled" : "disabled"}`, `${key} — cache invalidated, tenants re-evaluated`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Feature flags" sub="Per-tenant, percentage and ring targeting · every flag has an owner and expiry">
          <ul className="space-y-2">
            {flags.map((f) => (
              <li key={f.key} className={cx("rounded-lg border px-3 py-2.5", kill[f.key] ? "border-danger/50 bg-danger/10" : "border-white/8 bg-white/[0.03]")}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white">{f.name}</p>
                    <p className="font-mono text-[10.5px] text-white/45">{f.key} · {f.targeting} · {f.tenants} tenants · owner {f.owners.join(",")}{f.expiry ? ` · expires ${f.expiry}` : ""}</p>
                  </div>
                  {kill[f.key] && <Badge tone="danger">KILLED</Badge>}
                  <button onClick={() => { setKill((k) => ({ ...k, [f.key]: !k[f.key] })); record(`${kill[f.key] ? "restored" : "kill-switched"} ${f.key}`, "flags", "destructive"); toast(kill[f.key] ? "ok" : "warn", kill[f.key] ? "Kill switch released" : "Kill switch engaged", f.key); }} className={cx("rounded-md border px-2 py-1 font-mono text-[9.5px] font-bold uppercase", kill[f.key] ? "border-[#4CC38A]/40 text-[#4CC38A]" : "border-white/20 text-white/50 hover:border-danger hover:text-[#f08c8c]")}>kill</button>
                  <Toggle checked={f.on && !kill[f.key]} onChange={(v) => flip(f.key, v)} label={`flag ${f.key}`} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card title="Limits & quotas" sub="Soft limits warn, hard limits block with an upgrade path — never fail silently">
            <ul className="space-y-2">
              {QUOTAS.map((q, i) => {
                const ratio = q.used / q.limit;
                return (
                  <li key={i} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-semibold text-white">{q.tenant}</p>
                      <Badge tone={q.kind === "hard" ? "danger" : "warn"}>{q.kind}</Badge>
                      <span className="ml-auto font-mono text-[10.5px] text-white/50">{q.used.toLocaleString()} / {q.limit.toLocaleString()}</span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-white/40">{q.metric}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className={cx("h-full rounded-full", ratio > 0.9 ? "bg-danger" : ratio > 0.7 ? "bg-[#e2a33c]" : "bg-[#4CC38A]")} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="“Coming Soon” registry" sub="Anything not GA is hidden or honestly labelled — no dead ends">
            <ul className="space-y-2">
              {COMING_SOON.map((c) => (
                <li key={c.capability} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-white">{c.capability}</p>
                    <p className="text-[10.5px] text-white/45">{c.expectation}</p>
                  </div>
                  {c.waitlist > 0 && <span className="font-mono text-[10.5px] text-white/50">{c.waitlist} waitlist</span>}
                  <StatusPill s={c.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = { planned: "bg-white/10 text-white/50", alpha: "bg-[#e2a33c]/15 text-[#e2a33c]", beta: "bg-[#3E9BFF]/15 text-[#7cc0ff]", ga: "bg-[#4CC38A]/15 text-[#4CC38A]", deprecated: "bg-danger/15 text-[#f08c8c]" };
  return <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase", map[s])}>{s}</span>;
}

// ── Section E · Integration engineering platform ─────────────────────────
const CAPS = [
  { k: "minStay", label: "Min stay" }, { k: "ctaCtd", label: "CTA/CTD" }, { k: "losPricing", label: "LOS pricing" },
  { k: "derived", label: "Derived rates" }, { k: "messaging", label: "Messaging" }, { k: "virtualCard", label: "Virtual cards" },
] as const;

export function IntegrationsView() {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <Card title="Capability matrix" sub="Every OTA supports a different subset — the UI degrades per channel from this data, not conditionals">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">
              <th className="py-2 pr-4 font-bold">Channel</th>
              {CAPS.map((c) => <th key={c.k} className="px-2 py-2 text-center font-bold">{c.label}</th>)}
            </tr></thead>
            <tbody>
              {CAPABILITY_MATRIX.map((row) => (
                <tr key={row.channel} className="border-t border-white/8">
                  <td className="py-2.5 pr-4 text-[12.5px] font-bold text-white">{CH_LABEL[row.channel] ?? row.channel}</td>
                  {CAPS.map((c) => (
                    <td key={c.k} className="px-2 py-2.5 text-center">
                      {row[c.k] ? <Ic name="check" size={13} className="mx-auto text-[#4CC38A]" sw={2.6} /> : <Ic name="x" size={12} className="mx-auto text-white/20" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Credential vault" sub="KMS envelope encryption · secrets never shown, even here">
          <ul className="space-y-2">
            {VAULT.map((v) => (
              <li key={v.connection} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Ic name="lock" size={14} className="shrink-0 text-white/40" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white">{v.connection}</p>
                  <p className="font-mono text-[10px] text-white/40">{v.type} · rotated {ago(v.rotated)}{v.expires ? ` · expires ${ago(v.expires)}` : ""}</p>
                </div>
                {v.status === "healthy" ? <Pill ok label="ok" /> : <Pill ok={false} label="rotate" />}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Certification harness" sub="Full scenario suite vs provider sandbox — in CI and on demand">
          <ul className="space-y-2">
            {CERTIFICATION.map((c) => (
              <li key={c.channel} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{CH_LABEL[c.channel] ?? c.channel}</p>
                  <span className="ml-auto font-mono text-[10.5px] text-white/50">{c.passing}/{c.scenarios} pass</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className={cx("h-full rounded-full", c.passing === c.scenarios ? "bg-[#4CC38A]" : "bg-[#e2a33c]")} style={{ width: `${(c.passing / c.scenarios) * 100}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="font-mono text-[10px] text-white/40">last run {ago(c.lastRun)}</p>
                  <Btn size="xs" icon="refresh" onClick={() => { record(`ran certification suite`, c.channel); toast("ok", "Certification started", `${c.channel} sandbox — results gate the next deploy`); }}>Run</Btn>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Sync orchestrator" sub="Per-tenant partitioned queues · rate limits, circuits, coalescing">
          <ul className="space-y-2">
            {ORCHESTRATOR.map((o) => (
              <li key={`${o.tenant}${o.connection}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{o.tenant} → {CH_LABEL[o.connection]}</p>
                  <span className={cx("ml-auto rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase", o.circuit === "open" ? "bg-danger/15 text-[#f08c8c]" : "bg-[#4CC38A]/15 text-[#4CC38A]")}>{o.circuit}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10.5px] text-white/45">depth {o.depth} · {o.ratePerMin}/{o.cap} per min · DLQ {o.dlq} · coalesced {o.coalesced}</p>
                {o.dlq > 0 && <Btn size="xs" className="mt-2" icon="refresh" onClick={() => { record("requeued dead-letter pushes", `${o.tenant}/${o.connection}`); toast("ok", "DLQ requeued", `${o.dlq} pushes with fresh idempotency keys`); }}>Requeue DLQ ({o.dlq})</Btn>}
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-white/8 pt-3">
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">Reconciliation · drift detection</p>
            {RECONCILIATION.map((r) => (
              <p key={r.channel} className="flex items-center gap-2 py-1 text-[11.5px] text-white/60">
                <span className="font-semibold text-white/80">{CH_LABEL[r.channel]}</span>
                <span className="font-mono text-[10px] text-white/40">run {ago(r.lastRun)}</span>
                <span className="ml-auto font-mono text-[10.5px]">{r.drift === 0 ? <span className="text-[#4CC38A]">no drift</span> : <span className="text-[#e2a33c]">{r.drift} drift</span>} · healed {r.autoHealed} · escalated {r.escalated}</span>
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Section F · Messaging infrastructure ─────────────────────────────────
export function MessagingView({ onEmergencyStop }: { onEmergencyStop: () => void }) {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Transport abstraction" sub="One outbound API · per-channel fallback chains">
          <ul className="space-y-2">
            {TRANSPORTS.map((t) => (
              <li key={t.channel} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white">{t.channel}</p>
                  <p className="font-mono text-[10.5px] text-white/45">{t.provider}{t.sessionWindow !== "—" ? ` · ${t.sessionWindow} window` : ""} · {t.templates} templates</p>
                </div>
                <span className="font-mono text-[10px] text-white/35">→ {t.fallback}</span>
                {t.status === "healthy" ? <Pill ok label="ok" /> : <Pill ok={false} label={t.status} />}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Deliverability" sub="Dedicated + shared pools · per-tenant sending domains">
          <ul className="space-y-2">
            {DELIVERABILITY.map((d) => (
              <li key={d.domain} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[12px] font-semibold text-white">{d.domain}</p>
                  <span className={cx("ml-auto font-mono text-[10.5px] font-bold", d.reputation >= 95 ? "text-[#4CC38A]" : d.reputation >= 85 ? "text-[#e2a33c]" : "text-[#f08c8c]")}>{d.reputation} rep</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Pill ok={d.spf} label="SPF" /> <Pill ok={d.dkim} label="DKIM" />
                  <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold", d.dmarc === "reject" ? "bg-[#4CC38A]/15 text-[#4CC38A]" : d.dmarc === "quarantine" ? "bg-[#e2a33c]/15 text-[#e2a33c]" : "bg-danger/15 text-[#f08c8c]")}>DMARC {d.dmarc}</span>
                  <span className="ml-auto font-mono text-[10px] text-white/40">{d.bounce}% bounce</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Template governance" sub="Versioned, variable-validated, lint blocks sends with unresolved vars">
          <ul className="space-y-2">
            {TEMPLATE_GOVERNANCE.map((t) => (
              <li key={t.template} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] font-semibold text-white">{t.template} <span className="text-white/40">v{t.version}</span></p>
                  <p className="text-[10.5px] text-white/45">{t.vars} vars · locales {t.locales.join(", ")}</p>
                </div>
                {t.lint === "pass" ? <Pill ok label="lint pass" /> : <Pill ok={false} label={`${t.unresolved} unresolved`} />}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Throttling & abuse prevention" sub="Per-tenant caps, spike detection, and the global stop">
          <ul className="space-y-2">
            {THROTTLE.map((t) => (
              <li key={t.tenant} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{t.tenant}</p>
                  <span className="ml-auto font-mono text-[10.5px] text-white/50">{t.sentToday} / {t.capPerDay} today</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-[#3E9BFF]" style={{ width: `${Math.min(100, (t.sentToday / t.capPerDay) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => { record("engaged global emergency stop", "messaging", "destructive"); onEmergencyStop(); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-danger/50 bg-danger/15 px-3 py-2.5 text-[12.5px] font-bold text-[#f08c8c] transition-colors hover:bg-danger/25">
            <Ic name="alertTri" size={14} /> Global emergency stop — halt all automated outbound
          </button>
        </Card>
      </div>
    </div>
  );
}
