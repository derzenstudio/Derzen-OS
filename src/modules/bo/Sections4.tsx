import { cx, pct } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Toggle } from "../../components/ui";
import { useApp } from "../../store";
import { useAudit, Card, Pill, ago } from "../../components/Backoffice";
import {
  API_VERSIONS, CHANGELOG, CICD_STAGES, CLOUD_COST, COMPLIANCE, DR_DRILLS, ENVIRONMENTS, FRAUD_QUEUE,
  JOB_QUEUES, MARKETPLACE, MIGRATIONS, OAUTH_APPS, RELEASE_TRAIN, RUNBOOKS, SDKS, SLOS, STAFF_ROLES,
  THREAT_MODEL, WEBHOOK_EVENTS,
} from "../../lib/backoffice";

// ── Section J · Engineering substrate ────────────────────────────────────
export function EngineeringView() {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ENVIRONMENTS.map((e) => (
          <div key={e.env} className="rounded-xl border border-white/10 bg-[#0d0d0b] px-4 py-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-brand-bright">{e.env}</p>
            <p className="mt-1 text-[11.5px] text-white/70">{e.shape}</p>
            <p className="font-mono text-[10px] text-white/40">deploy: {e.deploy} · {e.data}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="CI/CD gates" sub="Trunk-based · every stage must pass to merge · progressive rollout with auto-rollback">
          <ol className="space-y-1.5">
            {CICD_STAGES.map((s, i) => (
              <li key={s.stage} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[10px] font-bold text-white/50">{i + 1}</span>
                <span className="text-[12px] font-semibold text-white/80">{s.stage}</span>
                <span className="ml-auto font-mono text-[10px] text-white/40">{s.secs}s</span>
                {s.gate ? <Pill ok label="gate" /> : <Pill ok={false} label="advisory" />}
              </li>
            ))}
          </ol>
          <p className="mt-2.5 rounded-md bg-white/[0.04] px-3 py-2 font-mono text-[10px] text-white/35">cross-tenant isolation suite runs against every new route automatically — coverage can't rot</p>
        </Card>

        <div className="space-y-4">
          <Card title="Migrations" sub="Expand/contract only · dry-run vs prod-sized clone · no destructive step beside code changes">
            <ul className="space-y-2">
              {MIGRATIONS.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11.5px] font-semibold text-white">{m.id}</p>
                    <p className="text-[10px] text-white/45">type {m.type} · dry-run {m.dryRun ? "✓" : "✗"} · reversible {m.reversible ? "yes" : "no"}</p>
                  </div>
                  <Badge tone={m.status === "applied" ? "ok" : "warn"}>{m.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Background job platform" sub="Durable, observable, tenant-fair · idempotency by default">
            <ul className="space-y-2">
              {JOB_QUEUES.map((j) => (
                <li key={j.queue} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[12px] font-semibold text-white">{j.queue}</p>
                    <p className="text-[10px] text-white/45">{j.priority} priority · {j.fairness}</p>
                  </div>
                  <span className="font-mono text-[11px] text-white/60">{j.depth} deep</span>
                  {j.dlq > 0 ? <Badge tone="danger">DLQ {j.dlq}</Badge> : <Pill ok label="DLQ 0" />}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="SLOs & error budgets" sub="Published internally · feature work freezes when a budget is exhausted" className="xl:col-span-2">
          <ul className="space-y-2.5">
            {SLOS.map((s) => {
              const usedPct = s.consumed / s.budget;
              return (
                <li key={s.subsystem}>
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-semibold text-white/80">{s.subsystem}</p>
                    <span className="font-mono text-[10px] text-white/40">SLO {s.slo} · p95 {s.p95}</span>
                    <span className={cx("ml-auto font-mono text-[10.5px] font-bold", usedPct > 0.5 ? "text-[#f08c8c]" : usedPct > 0.3 ? "text-[#e2a33c]" : "text-[#4CC38A]")}>{pct(usedPct)} budget used</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className={cx("h-full rounded-full", usedPct > 0.5 ? "bg-danger" : usedPct > 0.3 ? "bg-[#e2a33c]" : "bg-[#4CC38A]")} style={{ width: `${Math.min(100, usedPct * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card title="Backups & DR" sub="Tested restores · per-tenant PITR · drills on a schedule, results written down">
            <ul className="space-y-2">
              {DR_DRILLS.map((d) => (
                <li key={d.drill} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-white">{d.drill}</p>
                  <p className="font-mono text-[10px] text-white/45">{d.target} · RPO {d.rpo} · RTO {d.rto} · {ago(d.date)}</p>
                  <div className="mt-1"><Pill ok={d.result === "pass"} label={d.result} /></div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Cloud cost attribution" sub="Per-service · budget alerts · quarterly review">
            <ul className="space-y-2">
              {CLOUD_COST.map((c) => (
                <li key={c.service}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] font-semibold text-white/70">{c.service}</p>
                    <span className="font-mono text-[10.5px] text-white/50">${c.cost} <span className={c.trend.startsWith("+") ? "text-[#e2a33c]" : "text-[#4CC38A]"}>{c.trend}</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-white/40" style={{ width: `${c.pct * 2.5}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Section K · Security & compliance ────────────────────────────────────
export function SecurityView() {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <Card title="Threat model" sub="Reviewed explicitly — the surfaces that matter for a multi-tenant hospitality platform">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Threat", "Surface", "Likelihood", "Impact", "Controls"].map((h) => <th key={h} className="py-2 pr-4 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {THREAT_MODEL.map((t) => (
                <tr key={t.threat} className="border-t border-white/8 align-top">
                  <td className="py-2.5 pr-4 text-[12.5px] font-semibold text-white">{t.threat}</td>
                  <td className="py-2.5 pr-4 font-mono text-[10.5px] text-white/50">{t.surface}</td>
                  <td className="py-2.5 pr-4"><Badge tone={t.likelihood === "high" ? "danger" : t.likelihood === "med" ? "warn" : "mute"}>{t.likelihood}</Badge></td>
                  <td className="py-2.5 pr-4"><Badge tone={t.impact === "critical" ? "danger" : t.impact === "high" ? "warn" : "mute"}>{t.impact}</Badge></td>
                  <td className="py-2.5"><div className="flex flex-wrap gap-1">{t.controls.map((c) => <span key={c} className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[9.5px] text-white/60">{c}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Control surface" sub="Least privilege · short-lived creds · signed images">
          {["SSO + MFA + device trust for staff", "Secret scanning in CI", "SAST / DAST / dependency scanning", "Signed container images", "WAF + bot protection on guest endpoints", "Per-tenant public API rate limits", "Sanitize + sandbox tenant-rendered content", "Custom domains isolated from app origin"].map((c) => (
            <p key={c} className="flex items-center gap-2 border-b border-white/6 py-1.5 text-[11.5px] text-white/65 last:border-0"><Ic name="check" size={12} className="text-[#4CC38A]" sw={2.6} />{c}</p>
          ))}
        </Card>

        <Card title="Payments scope" sub="Stay out of PCI scope — on both tenant and guest sides">
          <p className="text-[12px] leading-relaxed text-white/65">Hosted fields / redirect only. <b className="text-white">Tokens only, never a PAN</b> in our systems or logs. 3DS/SCA, OTA virtual cards surfaced but not stored, payouts and refunds through the provider.</p>
          <div className="mt-3 border-t border-white/8 pt-3">
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">Compliance programme</p>
            {COMPLIANCE.map((c) => (
              <p key={c.item} className="flex items-center gap-2 border-b border-white/6 py-1.5 text-[11.5px] last:border-0">
                <span className="flex-1 text-white/70">{c.item}</span>
                <span className="font-mono text-[9.5px] text-white/40">{c.evidence}</span>
                <Badge tone={c.status === "in-force" || c.status === "published" ? "ok" : c.status === "in-audit" ? "info" : "warn"}>{c.status}</Badge>
              </p>
            ))}
          </div>
        </Card>

        <Card title="Abuse & fraud queue" sub="Freeze outbound messaging and payment acceptance independently">
          <ul className="space-y-2">
            {FRAUD_QUEUE.map((f) => (
              <li key={f.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11.5px] font-semibold text-white">{f.id}</p>
                  <Badge tone={f.status === "contained" ? "ok" : "warn"}>{f.status}</Badge>
                  {f.frozen && <Badge tone="danger">frozen</Badge>}
                </div>
                <p className="mt-0.5 text-[11px] text-white/60">{f.type}</p>
                <p className="font-mono text-[10px] text-white/40">{f.tenant}</p>
                {!f.frozen && <Btn size="xs" className="mt-2" variant="danger" icon="lock" onClick={() => { record("froze tenant outbound + payments", f.tenant, "destructive"); toast("warn", "Tenant frozen", "Outbound messaging and payment acceptance halted"); }}>Freeze</Btn>}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/8 pt-2.5 font-mono text-[10px] text-white/35">incident response: severity ladder, on-call rotation, blameless postmortems with tracked action items</p>
        </Card>
      </div>
    </div>
  );
}

// ── Section L · Developer ecosystem ──────────────────────────────────────
export function EcosystemView() {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Public API" sub="Versioned · idempotency keys on writes · deprecation with sunset headers">
          {API_VERSIONS.map((v) => (
            <div key={v.version} className="mb-2 flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="font-mono text-[13px] font-bold text-white">{v.version}</p>
              <Badge tone={v.status === "current" ? "ok" : "warn"}>{v.status}</Badge>
              <span className="ml-auto font-mono text-[10px] text-white/45">{v.keys} keys{v.sunset ? ` · sunset ${v.sunset}` : ""}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-white/8 pt-3">
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">Webhook event catalogue</p>
            <div className="flex flex-wrap gap-1.5">
              {WEBHOOK_EVENTS.map((e) => <span key={e} className="rounded bg-white/8 px-2 py-1 font-mono text-[10px] text-white/60">{e}</span>)}
            </div>
            <p className="mt-2 font-mono text-[10px] text-white/35">HMAC signed · rotating secrets · at-least-once · inspectable log + replay</p>
          </div>
        </Card>

        <Card title="OAuth apps & marketplace" sub="Granular scopes · consent screen · install lifecycle with entitlement checks">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">Third-party apps</p>
          {OAUTH_APPS.map((a) => (
            <div key={a.app} className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-white">{a.app}</p>
                <Badge tone={a.status === "listed" ? "ok" : "info"}>{a.status}</Badge>
              </div>
              <p className="font-mono text-[10px] text-white/45">{a.developer} · {a.scopes} · {a.installs} installs</p>
            </div>
          ))}
          <p className="mb-1.5 mt-3 border-t border-white/8 pt-3 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">Partner marketplace</p>
          {MARKETPLACE.map((m) => (
            <p key={m.partner} className="flex items-center gap-2 border-b border-white/6 py-1.5 text-[11.5px] last:border-0">
              <span className="flex-1 text-white/70">{m.partner} <span className="text-white/35">· {m.category}</span></span>
              <span className="font-mono text-[10px] text-white/40">{m.installs} installs</span>
              <Badge tone={m.status === "listed" ? "ok" : "info"}>{m.status}</Badge>
            </p>
          ))}
        </Card>

        <Card title="SDKs, docs & sandbox" sub="Generated from the OpenAPI spec · a sandbox tenant for integrators">
          {SDKS.map((s) => (
            <div key={s.lang} className="mb-2 flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <Ic name="code" size={14} className="text-white/40" />
              <p className="text-[12.5px] font-semibold text-white">{s.lang}</p>
              <span className="ml-auto font-mono text-[10.5px] text-white/45">{s.version}{s.generated ? " · generated" : ""}</span>
            </div>
          ))}
          <button onClick={() => { record("provisioned integrator sandbox", "dev-ecosystem"); toast("ok", "Sandbox tenant provisioned", "Fake channel provider + demo data behind it"); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70 hover:border-brand hover:text-white">
            <Ic name="plus" size={13} /> Provision integrator sandbox
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Release train" sub={`v${RELEASE_TRAIN.version} · ${RELEASE_TRAIN.cadence} · ${RELEASE_TRAIN.ring} · last deploy ${ago(RELEASE_TRAIN.lastDeploy)}`}>
          <ul className="space-y-2">
            {CHANGELOG.map((c) => (
              <li key={c.v} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[12px] font-bold text-white">{c.v}</p>
                  <span className="ml-auto font-mono text-[10px] text-white/40">{ago(c.date)}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/55">{c.note}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Runbooks" sub="Written by the builder, tested by someone who didn't build it">
          <ul className="space-y-2">
            {RUNBOOKS.map((r) => (
              <li key={r.subsystem} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-white">{r.subsystem}</p>
                <p className="font-mono text-[10px] text-white/45">owner {r.owner} · tested by {r.testedBy} · drilled {ago(r.lastDrill)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Definition of done & cadence" sub="The internal process that keeps quality from rotting">
          {["Tests + docs + telemetry + flag + rollback plan + changelog", "Weekly ops review of cross-tenant failure queues", "Monthly integration health review per provider", "Error budget gates feature work", "Visible in-app version links to changelog"].map((d) => (
            <p key={d} className="flex items-start gap-2 border-b border-white/6 py-1.5 text-[11.5px] text-white/65 last:border-0"><Ic name="check" size={12} className="mt-0.5 shrink-0 text-[#4CC38A]" sw={2.6} />{d}</p>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── Section N · Internal access control ──────────────────────────────────
export function AccessView() {
  const { events } = useAudit();
  return (
    <div className="space-y-4">
      <Card title="Staff roles & separation of duties" sub="Modelled as carefully as tenant roles — nobody can grant themselves elevation and use it unlogged">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Role", "Can", "Separation constraint"].map((h) => <th key={h} className="py-2 pr-4 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {STAFF_ROLES.map((r) => (
                <tr key={r.role} className="border-t border-white/8 align-top">
                  <td className="py-2.5 pr-4 font-mono text-[12px] font-bold text-brand-bright">{r.role}</td>
                  <td className="py-2.5 pr-4"><div className="flex flex-wrap gap-1">{r.perms.map((p) => <span key={p} className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[9.5px] text-white/60">{p}</span>)}</div></td>
                  <td className="py-2.5 text-[11px] text-white/50">{r.sep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Internal audit stream" sub="Append-only · internal roles cannot mutate · anomalous access patterns alert">
        <ul className="space-y-1.5">
          {events.map((e) => (
            <li key={e.id} className={cx("flex items-center gap-3 rounded-lg border px-3 py-2", e.severity === "destructive" ? "border-danger/40 bg-danger/10" : e.severity === "sensitive" ? "border-[#e2a33c]/30 bg-[#e2a33c]/5" : "border-white/8 bg-white/[0.03]")}>
              <Badge tone={e.severity === "destructive" ? "danger" : e.severity === "sensitive" ? "warn" : "mute"}>{e.severity}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-white/85">{e.action} <span className="text-white/40">→ {e.target}</span></p>
                <p className="font-mono text-[10px] text-white/40">{e.actor} · {ago(e.ts)}</p>
              </div>
              <Ic name={e.severity === "destructive" ? "alertTri" : e.severity === "sensitive" ? "eye" : "check"} size={13} className={e.severity === "destructive" ? "text-[#f08c8c]" : e.severity === "sensitive" ? "text-[#e2a33c]" : "text-white/25"} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
