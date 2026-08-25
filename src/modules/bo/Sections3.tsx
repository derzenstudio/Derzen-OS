import { useState } from "react";
import { cx, money, pct } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Modal, Ring } from "../../components/ui";
import { useApp } from "../../store";
import { useAudit, Card, Pill, ago } from "../../components/Backoffice";
import {
  ACTIVATION_FUNNEL, AI_COST, BLOCKLIST, EVALS, EVENT_CATALOGUE, HEALTH_SCORES, IMPERSONATION_LOG,
  KB_COVERAGE, MODEL_ROUTER, PROMPT_REGISTRY, SEARCH_INDEXES, STATUS_PAGE, TICKETS, WAREHOUSE,
} from "../../lib/backoffice";

// ── Section G · AI platform ──────────────────────────────────────────────
export function AIPlatformView() {
  const { toast } = useApp();
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Prompt & model registry" sub="Versioned, reviewed artefacts — every output stores prompt version + model">
          <ul className="space-y-2">
            {PROMPT_REGISTRY.map((p) => (
              <li key={p.prompt} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[12px] font-semibold text-white">{p.prompt}</p>
                  <Badge tone={p.status === "live" ? "ok" : p.status === "staged" ? "info" : "warn"}>{p.status} {p.rollout}</Badge>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/45">v{p.version} · owner {p.owner} · {p.changelog}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Model router" sub="Provider-agnostic · per-task selection with fallbacks">
          <ul className="space-y-2">
            {MODEL_ROUTER.map((m) => (
              <li key={m.task} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-white">{m.task}</p>
                <p className="font-mono text-[10.5px] text-white/45">{m.model} <span className="text-white/30">→ fallback {m.fallback}</span></p>
                <div className="mt-1 flex items-center gap-2">
                  {m.streaming && <Badge tone="info">stream</Badge>}
                  {m.structured && <Badge tone="ok">structured</Badge>}
                  <span className="ml-auto font-mono text-[10px] text-white/40">{m.avgLatency}ms avg</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Evaluation harness" sub="Golden dataset · no prompt ships without an eval run">
          <ul className="space-y-2">
            {EVALS.map((e) => (
              <li key={e.run} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[12px] font-semibold text-white">{e.run}</p>
                  <span className="ml-auto font-mono text-[10px] text-white/40">{e.diff}</span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-white/40">{e.dataset}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {[["acc", e.accuracy], ["refusal", e.refusal], ["tone", e.tone], ["policy", e.policy]].map(([k, v]) => (
                    <div key={String(k)} className="rounded bg-white/5 px-1.5 py-1 text-center">
                      <p className={cx("font-mono text-[11px] font-bold", Number(v) >= 95 ? "text-[#4CC38A]" : "text-[#e2a33c]")}>{v}</p>
                      <p className="text-[8.5px] uppercase text-white/35">{k}</p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Btn size="sm" className="mt-3 w-full" icon="refresh" onClick={() => { record("triggered eval run", "ai-platform"); toast("ok", "Eval run queued", "Results gate the next prompt deploy"); }}>Run eval now</Btn>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Guardrails" sub="Retrieval grounded in tenant KB · hard refusal-and-escalate">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">Never-commit blocklist</p>
          <div className="flex flex-wrap gap-1.5">
            {BLOCKLIST.map((b) => <span key={b} className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-[#f08c8c]">{b}</span>)}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3">
            {["Cite sources or refuse", "PII redaction before prompt", "Injection defence on guest input", "Per-tenant confidence threshold"].map((g) => (
              <p key={g} className="flex items-center gap-2 text-[11.5px] text-white/60"><Ic name="check" size={12} className="text-[#4CC38A]" sw={2.6} />{g}</p>
            ))}
          </div>
        </Card>

        <Card title="Knowledge-base coverage" sub="What common guest questions the tenant still can't answer — a churn-prevention report">
          <ul className="space-y-2">
            {KB_COVERAGE.map((k) => (
              <li key={k.tenant} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{k.tenant}</p>
                  <span className="ml-auto"><Ring value={k.coverage / 100} size={34} /></span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {k.gaps.map((g) => <span key={g} className="rounded bg-[#e2a33c]/10 px-1.5 py-0.5 font-mono text-[9.5px] text-[#e2a33c]">{g}</span>)}
                </div>
                <p className="mt-1 font-mono text-[10px] text-white/40">{k.conflicts} conflicting facts · {k.stale} stale docs</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Cost control & margin" sub="Inference cost next to MRR — know gross margin per account">
          <ul className="space-y-2">
            {AI_COST.map((c) => (
              <li key={c.tenant} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-white">{c.tenant}</p>
                  <span className={cx("ml-auto rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold", c.margin >= 50 ? "bg-[#4CC38A]/15 text-[#4CC38A]" : c.margin >= 30 ? "bg-[#e2a33c]/15 text-[#e2a33c]" : "bg-danger/15 text-[#f08c8c]")}>{c.margin}% margin</span>
                </div>
                <p className="mt-0.5 font-mono text-[10.5px] text-white/45">{(c.tokens / 1_000_000).toFixed(1)}M tokens · ${c.cost} inference · ${c.mrr} MRR</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className={cx("h-full rounded-full", c.margin >= 50 ? "bg-[#4CC38A]" : c.margin >= 30 ? "bg-[#e2a33c]" : "bg-danger")} style={{ width: `${c.margin}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ── Section H · Data platform ────────────────────────────────────────────
export function DataPlatformView() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Event catalogue" sub="Typed, versioned, emitted transactionally via outbox — analytics never disagrees with OLTP">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left">
              <thead><tr className="text-[9.5px] uppercase tracking-[0.12em] text-white/40">{["Event", "v", "Schema", "Outbox", "Consumers"].map((h) => <th key={h} className="py-2 pr-4 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {EVENT_CATALOGUE.map((e) => (
                  <tr key={e.event} className="border-t border-white/8">
                    <td className="py-2.5 pr-4 font-mono text-[11.5px] font-semibold text-white">{e.event}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-white/50">v{e.version}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11px] text-white/50">{e.schema}</td>
                    <td className="py-2.5 pr-4">{e.outbox ? <Pill ok label="yes" /> : <Pill ok={false} label="no" />}</td>
                    <td className="py-2.5 font-mono text-[11px] text-white/50">{e.consumers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Warehouse & semantic layer" sub="CDC → dbt-style marts · shared by internal analytics and tenant reports">
          <ul className="space-y-2">
            {WAREHOUSE.map((w) => (
              <li key={w.model} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] font-semibold text-white">{w.model}</p>
                  <p className="text-[10.5px] text-white/45">{w.layer} · freshness {w.freshness} · tests: {w.tests}</p>
                </div>
                {w.status === "fresh" ? <Pill ok label="fresh" /> : <Pill ok={false} label={w.status} />}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Activation funnel" sub="Instrumented drop-off at every step — the activation metric">
          <ul className="space-y-2">
            {ACTIVATION_FUNNEL.map((f) => (
              <li key={f.step}>
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-white/70">{f.step}</p>
                  <span className="font-mono text-[10.5px] text-white/50">{f.users} · {f.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${f.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Tenant health scores" sub="Feeds the success team's queue">
          <ul className="space-y-2">
            {HEALTH_SCORES.map((h) => (
              <li key={h.tenant} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Ring value={h.score / 100} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white">{h.tenant}</p>
                  <p className="text-[10.5px] text-white/45">{h.drivers.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Search infrastructure" sub="Full-text + faceted · per-tenant index isolation · PII-aware retention">
          <ul className="space-y-2">
            {SEARCH_INDEXES.map((s) => (
              <li key={s.index} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[12px] font-semibold text-white">{s.index}</p>
                  <span className="ml-auto font-mono text-[10.5px] text-white/50">{s.docs.toLocaleString()} docs</span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/45">{s.isolation} · {s.retention} · reindexed {ago(s.lastReindex)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ── Section I · Support & customer success ───────────────────────────────
export function SupportView() {
  const { toast } = useApp();
  const { record, events } = useAudit();
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"read-only" | "elevated">("read-only");
  const [impOpen, setImpOpen] = useState(false);

  const startImpersonation = () => {
    if (!consent) { toast("err", "Blocked — no tenant consent", "Impersonation requires explicit tenant-side consent. It is the gate."); return; }
    record(`impersonation session (${mode})`, "Kite & Palm Co.", "sensitive");
    toast("ok", "Impersonation started", `${mode} · time-boxed 30m · banner shown · attributed to you`);
    setImpOpen(false); setConsent(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Impersonation — done responsibly" sub="Consent-gated, time-boxed, read-only by default, payment/credential screens excluded"
          actions={<Btn size="xs" variant="solid" icon="eye" onClick={() => setImpOpen(true)}>Start session</Btn>}>
          <ul className="space-y-2">
            {IMPERSONATION_LOG.map((s) => (
              <li key={s.started} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11.5px] font-semibold text-white">{s.staff}</p>
                  <Badge tone={s.mode === "read-only" ? "ok" : "warn"}>{s.mode}</Badge>
                </div>
                <p className="mt-0.5 text-[10.5px] text-white/45">→ {s.tenant} · consent {s.consent ? "✓" : "✗"} · {s.duration} · {s.actions} actions · {ago(s.started)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Support desk" sub="Tickets linked to tenant records · macros pull live tenant state">
          <ul className="space-y-2">
            {TICKETS.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <Badge tone={t.severity === "S1" ? "danger" : t.severity === "S2" ? "warn" : "mute"}>{t.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-white">{t.subject}</p>
                  <p className="font-mono text-[10px] text-white/40">{t.id} · {t.tenant}</p>
                </div>
                <span className="font-mono text-[10px] capitalize text-white/45">{t.status}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Public status page" sub="Component-level status · channel outages visible so tenants stop opening tickets">
          <ul className="space-y-1.5">
            {STATUS_PAGE.map((c) => (
              <li key={c.component} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                <span className={cx("h-2 w-2 rounded-full", c.status === "operational" ? "bg-[#4CC38A]" : "bg-[#e2a33c] dot-pulse")} />
                <span className="text-[12px] font-semibold text-white/80">{c.component}</span>
                <span className="ml-auto font-mono text-[10px] capitalize text-white/45">{c.status}{c.note ? ` — ${c.note}` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-white/8 pt-2.5 font-mono text-[10px] text-white/35">subscribe-by-email · auto-updates from monitoring · templated incident notices</p>
        </Card>
      </div>

      <Card title="Trust centre" sub="Security overview, subprocessors, uptime, DPA — enterprise deals stall without it">
        <div className="flex flex-wrap gap-2">
          {["Security overview", "Subprocessor register (14)", "Uptime history", "DPA & SCCs", "SOC 2 report (under audit)", "Compliance pack (self-serve)"].map((d) => (
            <button key={d} onClick={() => { record("downloaded trust-centre doc", d); toast("ok", "Document shared", d); }} className="flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] font-semibold text-white/70 transition-colors hover:border-brand hover:text-white">
              <Ic name="doc" size={13} /> {d}
            </button>
          ))}
        </div>
      </Card>

      <Modal open={impOpen} onClose={() => setImpOpen(false)} title="Impersonate tenant" w={480}
        footer={<>
          <Btn variant="ghost" onClick={() => setImpOpen(false)}>Cancel</Btn>
          <Btn variant="solid" icon="eye" onClick={startImpersonation}>Start time-boxed session</Btn>
        </>}>
        <div className="space-y-3">
          <label className="flex items-start gap-2.5 rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#B22222]" />
            <span className="text-[12.5px] leading-snug text-white/75">The tenant has granted <b className="text-white">support-access consent</b> (their Settings toggle is on). Without it this session is impossible.</span>
          </label>
          <div className="flex gap-2">
            {(["read-only", "elevated"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={cx("flex-1 rounded-md border px-3 py-2 text-[12px] font-bold", mode === m ? "border-brand bg-brand/20 text-white" : "border-white/15 text-white/50")}>
                {m === "read-only" ? "Read-only (default)" : "Elevated (justified)"}
              </button>
            ))}
          </div>
          <p className="rounded-md bg-white/[0.04] px-3 py-2 font-mono text-[10.5px] text-white/40">30m window · persistent banner · payment & credential screens excluded · every action attributed to dev@trellis in the audit stream · tenant can pull a full session report.</p>
        </div>
      </Modal>
    </div>
  );
}
