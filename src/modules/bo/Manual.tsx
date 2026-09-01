import { useEffect, useRef, useState } from "react";
import { cx, timeAgo } from "../../lib/format";
import { Ic, type IconName } from "../../components/icons";
import { Badge, Btn } from "../../components/ui";
import { Card, Pill, Stat, useAudit } from "../../components/Backoffice";
import { useApp } from "../../store";
import {
  BUDGET_POLICY, GOLIVE_PHASES, GUARDRAIL_METRICS, INSPECT_SAMPLE, METRIC_DEFS, MIN_TEAM,
  PROVIDER_HEALTH, QUEUES, RISK_REGISTER, RUNBOOKS, SEVERITY_LADDER, SLOS, UNIT_ECONOMICS,
  type QueueDef, type QueueItem,
} from "../../lib/manual";

// ── shared SLA countdown hook ─────────────────────────────────────────────
function useTick(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}
function fmtDur(min: number) {
  if (min <= 0) return "breached";
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`;
}
const srcChip: Record<string, string> = { ui: "bg-white/10 text-white/70", automation: "bg-[#3a3320] text-[#e2a33c]", channel_sync: "bg-[#173042] text-[#8fc4dd]", ai: "bg-[#2a2140] text-[#c9b3f0]", system: "bg-white/5 text-white/40" };

// ── 5.1 /queues ───────────────────────────────────────────────────────────
export function QueuesView() {
  const { record } = useAudit();
  const tick = useTick();
  const mount = useRef(Date.now());
  const elapsedMin = Math.floor((tick - mount.current) / 60_000);
  const [active, setActive] = useState<string>(QUEUES[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [pendingResolve, setPendingResolve] = useState<string | null>(null);

  const q = QUEUES.find((x) => x.id === active)!;
  const visible = (queue: QueueDef) => queue.items.filter((i) => !resolved.has(i.id));
  const totalOpen = QUEUES.reduce((s, x) => s + visible(x).length, 0);

  const doResolve = (item: QueueItem) => {
    if (!reason.trim()) return;
    setResolved((r) => new Set(r).add(item.id));
    record(`resolved ${item.id} · ${item.title}`, `reason: ${reason.trim()}`, "info");
    setPendingResolve(null);
    setReason("");
    setExpanded(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      {/* queue list */}
      <aside className="space-y-1">
        <p className="px-2 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/35">{totalOpen} open across {QUEUES.length} queues</p>
        {QUEUES.map((queue) => {
          const n = visible(queue).length;
          const breach = queue.items.some((i) => !resolved.has(i.id) && i.ageMin + elapsedMin > i.slaMin);
          return (
            <button key={queue.id} onClick={() => { setActive(queue.id); setExpanded(null); }}
              className={cx("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors", active === queue.id ? "border-brand/50 bg-brand/10" : "border-white/10 bg-[#0d0d0b] hover:border-white/25")}>
              <Ic name={queue.icon as IconName} size={14} className={active === queue.id ? "text-brand-bright" : "text-white/40"} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-white/85">{queue.name}</span>
                <span className="block truncate text-[9.5px] text-white/35">{queue.desc}</span>
              </span>
              {n > 0 && <span className={cx("rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold", breach ? "bg-danger text-white" : "bg-white/10 text-white/70")}>{n}</span>}
            </button>
          );
        })}
      </aside>

      {/* queue items */}
      <section className="rounded-xl border border-white/10 bg-[#0d0d0b]">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div>
            <h3 className="font-display text-[14px] font-bold text-white">{q.name}</h3>
            <p className="text-[10.5px] text-white/40">{q.desc} · claimable · reason required on resolve</p>
          </div>
          <Badge tone={visible(q).length ? "warn" : "ok"}>{visible(q).length} open</Badge>
        </header>
        <div className="p-3">
          {visible(q).length === 0 && (
            <div className="py-10 text-center">
              <Ic name="checkCircle" size={30} className="mx-auto text-[#4CC38A]" />
              <p className="mt-2 font-display text-[14px] font-bold text-white">Queue clear</p>
              <p className="text-[11px] text-white/40">Nothing to work — enjoy it while it lasts.</p>
            </div>
          )}
          {visible(q).map((item) => {
            const age = item.ageMin + elapsedMin;
            const remaining = item.slaMin - age;
            const breach = remaining <= 0;
            const open = expanded === item.id;
            return (
              <div key={item.id} className="mb-2 overflow-hidden rounded-lg border border-white/10">
                <button onClick={() => setExpanded(open ? null : item.id)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-white/90">{item.title}</p>
                    <p className="text-[10px] text-white/40">{item.tenant} · aged {fmtDur(age)}</p>
                  </div>
                  <span className={cx("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold", breach ? "bg-danger/15 text-[#f08c8c]" : "bg-white/5 text-white/60")}>
                    <Ic name="clock" size={11} /> SLA {breach ? "breached" : fmtDur(remaining)}
                  </span>
                  <Ic name={open ? "chevU" : "chevD"} size={13} className="text-white/40" />
                </button>
                {open && (
                  <div className="space-y-3 border-t border-white/8 bg-pine-950/60 px-3.5 py-3">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div><p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">Raw payload</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 font-mono text-[9.5px] leading-relaxed text-[#e2a33c]">{item.raw}</pre></div>
                      <div><p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">Normalised record</p><pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 font-mono text-[9.5px] leading-relaxed text-white/70">{item.normalised}</pre></div>
                      <div><p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">Suggested fix</p><p className="rounded-md bg-[#1d3527]/40 p-2 text-[10.5px] leading-relaxed text-[#9fdcb8]">{item.fix}</p></div>
                    </div>
                    {pendingResolve === item.id ? (
                      <div className="flex items-center gap-2 anim-pop">
                        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Resolution reason (required, logged)…"
                          className="h-9 flex-1 rounded-md border border-white/15 bg-[#171714] px-3 text-[12px] text-white outline-none focus:border-brand" />
                        <Btn size="sm" variant="solid" icon="check" onClick={() => doResolve(item)} disabled={!reason.trim()}>Resolve</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => { setPendingResolve(null); setReason(""); }}>Cancel</Btn>
                      </div>
                    ) : (
                      <div className="flex justify-end"><Btn size="sm" variant="solid" icon="checkCircle" onClick={() => setPendingResolve(item.id)}>Resolve with reason</Btn></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ── 5.1 /inspect — universal entity inspector ─────────────────────────────
export function InspectorView() {
  const { record } = useAudit();
  const s = INSPECT_SAMPLE;
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand/40 bg-[#120909]">
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/20 text-brand-bright"><Ic name="eye" size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[15px] font-bold text-white">Universal entity inspector — the highest-leverage screen</h2>
            <p className="text-[11px] text-white/60">Normalised record + mutation history + raw provider payload + permission trace, without touching production.</p>
          </div>
          <code className="rounded-md bg-black/40 px-3 py-1.5 font-mono text-[11px] text-brand-bright">/inspect/{s.resource}/{s.id}</code>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Normalised record" sub="the tenant-scoped row, field by field" actions={<Badge tone="ok">{s.tenant}</Badge>}>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {s.normalised.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5">
                <span className="font-mono text-[10px] text-white/40">{k}</span>
                <span className="truncate text-right text-[11.5px] font-semibold text-white/85">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Mutation history" sub="actor + source for every change — answers “who changed this and when”">
          <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-white/10">
            {s.history.map((h) => (
              <li key={h.ts} className="relative pl-5">
                <span className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-[#0d0d0b] bg-brand" />
                <p className="text-[12px] font-bold text-white/85">{h.action}</p>
                <p className="text-[10px] text-white/40">{h.actor} · <span className={cx("rounded px-1 py-0.5 font-mono text-[8.5px] font-bold", srcChip[h.source])}>{h.source}</span> · {timeAgo(h.ts)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Raw provider payload" sub="retention-limited · the single most useful support artefact" actions={<Btn size="xs" variant="ghost" className="!text-white/60" onClick={() => record("copied raw payload to diagnostic bundle", `${s.resource}/${s.id}`, "sensitive")}>copy</Btn>}>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[10.5px] leading-relaxed text-[#8fc4dd]">{s.payload}</pre>
        </Card>
        <div className="space-y-4">
          <Card title="Related events" sub="from the outbox event log">
            <div className="flex flex-wrap gap-1.5">{s.events.map((e) => <span key={e} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70">{e}</span>)}</div>
          </Card>
          <Card title="Resolved permission trace" sub="what the entitlement service decided for the requesting staff">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-[#9fdcb8]">{s.permTrace}</pre>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── 5.1 /providers — per-channel health ───────────────────────────────────
export function ProvidersView() {
  const { record } = useAudit();
  const [running, setRunning] = useState<string | null>(null);
  const [ran, setRan] = useState<Set<string>>(new Set());
  const runSuite = (p: string) => {
    setRunning(p);
    setTimeout(() => { setRunning(null); setRan((r) => new Set(r).add(p)); record(`ran sandbox certification suite`, p); }, 1400);
  };
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {PROVIDER_HEALTH.map((p) => (
        <Card key={p.provider} title={p.provider} sub={`${p.conns} connections · ${p.cert}`} actions={<Pill ok={p.success >= 98} label={`${p.success}% ok`} />}>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[9px] font-bold uppercase tracking-widest text-white/35">Success</p><p className="font-mono text-[15px] font-bold text-white">{p.success}%</p></div>
            <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[9px] font-bold uppercase tracking-widest text-white/35">p95 latency</p><p className="font-mono text-[15px] font-bold text-white">{p.p95}ms</p></div>
            <div className="rounded-md bg-white/5 px-2.5 py-2"><p className="text-[9px] font-bold uppercase tracking-widest text-white/35">Deprecation</p><p className="truncate font-mono text-[10px] font-bold text-[#e2a33c]">{p.deprecation}</p></div>
          </div>
          <p className="mb-1 text-[9.5px] font-bold uppercase tracking-widest text-white/35">Error taxonomy (24h)</p>
          <div className="mb-3 space-y-1">
            {Object.entries(p.taxonomy).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-[130px] font-mono text-[10px] text-white/55">{k}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5"><div className={cx("h-full rounded-full", k === "Unknown" ? "bg-danger" : "bg-white/35")} style={{ width: `${Math.min(100, v * 4)}%` }} /></div>
                <span className="w-6 text-right font-mono text-[10px] text-white/50">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/8 pt-2.5">
            <Btn size="xs" variant="solid" icon={running === p.provider ? "refresh" : "zap"} onClick={() => runSuite(p.provider)} disabled={running !== null}>
              {running === p.provider ? "Running suite…" : ran.has(p.provider) ? "Re-run sandbox suite" : "Run sandbox suite"}
            </Btn>
            {ran.has(p.provider) && <Pill ok label="suite green" />}
            <a className="ml-auto font-mono text-[10px] text-white/45 underline decoration-white/20 hover:text-white" href="#/dev/backoffice">{p.runbook}</a>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── 5.2 Runbooks + severity ladder ────────────────────────────────────────
export function RunbooksView() {
  const [open, setOpen] = useState<string | null>(RUNBOOKS[0].id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {SEVERITY_LADDER.map((s) => (
          <div key={s.sev} className={cx("rounded-xl border px-3.5 py-3", s.sev === "Sev-1" ? "border-danger/50 bg-danger/10" : s.sev === "Sev-2" ? "border-[#e2a33c]/40 bg-[#e2a33c]/5" : "border-white/10 bg-[#0d0d0b]")}>
            <p className="font-display text-[14px] font-bold text-white">{s.sev}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-white/60">{s.def}</p>
            <p className="mt-1.5 font-mono text-[9px] font-bold text-[#e2a33c]">{s.response}</p>
            <p className="font-mono text-[9px] text-white/35">postmortem: {s.postmortem}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {RUNBOOKS.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0b]">
              <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
                <Badge tone={r.sev === "Sev-1" ? "danger" : r.sev === "Sev-2" ? "warn" : "mute"}>{r.sev}</Badge>
                <span className="flex-1 text-[13px] font-bold text-white/90">{r.name}</span>
                <span className="hidden font-mono text-[9.5px] text-white/30 sm:block">{r.id}</span>
                <Ic name={isOpen ? "chevU" : "chevD"} size={13} className="text-white/40" />
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 gap-3 border-t border-white/8 bg-pine-950/50 px-4 py-3.5 md:grid-cols-2 anim-rise">
                  <div><p className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#8fc4dd]"><Ic name="search" size={11} /> Detection</p><p className="text-[11.5px] leading-relaxed text-white/75">{r.detect}</p></div>
                  <div><p className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#9fdcb8]"><Ic name="bolt" size={11} /> Immediate mitigation</p><p className="text-[11.5px] leading-relaxed text-white/75">{r.mitigate}</p></div>
                  <div><p className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#e2a33c]"><Ic name="chat" size={11} /> Customer comms</p><p className="text-[11.5px] leading-relaxed text-white/75">{r.comms}</p></div>
                  <div><p className="mb-1 flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-[#c9b3f0]"><Ic name="refresh" size={11} /> Follow-up</p><p className="text-[11.5px] leading-relaxed text-white/75">{r.followup}</p></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5.3 SLOs ──────────────────────────────────────────────────────────────
export function SlosView() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#e2a33c]/40 bg-[#e2a33c]/5 px-5 py-4">
        <p className="flex items-start gap-2.5 text-[12px] leading-relaxed text-[#f0d9a0]">
          <Ic name="alertTri" size={15} className="mt-0.5 shrink-0 text-[#e2a33c]" />
          <span><b>Error-budget policy:</b> {BUDGET_POLICY}</span>
        </p>
      </section>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {SLOS.map((s) => (
          <div key={s.name} className="rounded-xl border border-white/10 bg-[#0d0d0b] px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[12.5px] font-bold text-white/90">{s.name}</p>
              <span className="font-mono text-[10px] text-white/40">owner: {s.owner}</span>
            </div>
            <p className="mt-0.5 font-mono text-[10.5px] text-white/45">target {s.target} · now <span className="text-[#4CC38A]">{s.current}</span></p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <div className={cx("h-full rounded-full transition-all duration-700", s.budgetLeft > 60 ? "bg-[#4CC38A]" : s.budgetLeft > 30 ? "bg-[#e2a33c]" : "bg-danger")} style={{ width: `${s.budgetLeft}%` }} />
              </div>
              <span className="w-[74px] text-right font-mono text-[10px] font-bold text-white/60">{s.budgetLeft}% budget</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5.4 Go-live playbook — operational, sequentially gated ───────────────
// Which items carry a real action, keyed by "phase-item". Actions either run a
// store mutation (enable pushes, run import/recon, freeze) or deep-link to the
// surface where the work happens. Everything else is a manual confirmation.
const GOLIVE_ACTION: Record<string, { label: string; kind: "run" | "open"; to?: string }> = {
  "1-0": { label: "Run dry-run", kind: "run" },
  "2-2": { label: "Open queue", kind: "open", to: "queues" },
  "2-3": { label: "Enable now", kind: "run" },
  "3-0": { label: "Freeze now", kind: "run" },
  "3-1": { label: "Run import", kind: "run" },
  "3-2": { label: "Enable now", kind: "run" },
  "3-3": { label: "Open board", kind: "open", to: "ops" },
  "4-1": { label: "Run recon", kind: "run" },
  "4-3": { label: "Open metrics", kind: "open", to: "metrics" },
};

export function GoLiveView({ go }: { go: (section: string) => void }) {
  const { record } = useAudit();
  const { golive, setGolive, goliveActions, goliveEnablePushes, goliveRunImport, goliveRunRecon, goliveFreeze } = useApp();
  const [justRan, setJustRan] = useState<string | null>(null);

  // Sequential gating: a phase unlocks only when every prior phase is complete.
  const phaseComplete = (i: number) => GOLIVE_PHASES[i].items.every((_, j) => golive[`${i}-${j}`]);
  const unlocked = (i: number) => i === 0 || phaseComplete(i - 1);

  const total = GOLIVE_PHASES.reduce((s, p) => s + p.items.length, 0);
  const doneCount = Object.values(golive).filter(Boolean).length;
  const overall = Math.round((doneCount / total) * 100);
  const constraintMet = !!golive["0-4"]; // hard cutover constraint acknowledged

  const fire = (i: number, j: number, it: string) => {
    const a = GOLIVE_ACTION[`${i}-${j}`];
    if (!a) return;
    setJustRan(`${i}-${j}`);
    setTimeout(() => setJustRan(null), 900);
    if (a.kind === "open") {
      if (a.to) go(a.to);
      return;
    }
    if (it.includes("Enable pushes")) goliveEnablePushes();
    else if (it.toLowerCase().includes("delta import")) goliveRunImport("Final delta import");
    else if (it.toLowerCase().includes("dry-run")) goliveRunImport("Dry-run import");
    else if (it.toLowerCase().includes("reconciliation")) goliveRunRecon();
    else if (it.toLowerCase().includes("freeze")) goliveFreeze();
  };

  return (
    <div className="space-y-5">
      {/* Overall rail + the hard constraint */}
      <section className={cx("rounded-xl border px-5 py-4", constraintMet ? "border-white/10 bg-[#0d0d0b]" : "border-[#e2a33c]/60 bg-[#2a2113]")}>
        <div className="flex flex-wrap items-center gap-5">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[15px] font-bold text-white">Migration progress</h3>
            <p className="text-[11px] text-white/50">A signed customer only activates if this runs clean. Phases unlock in order — no skipping the cutover guard.</p>
          </div>
          <div className="w-full sm:w-[260px]">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-white/60"><span>{doneCount}/{total} steps</span><span>{overall}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-bright to-[#4CC38A] transition-all duration-500" style={{ width: `${overall}%` }} />
            </div>
          </div>
          <div className={cx("flex items-center gap-2 rounded-lg border px-3 py-2", constraintMet ? "border-[#4CC38A]/40 bg-[#4CC38A]/10" : "border-[#e2a33c]/50 bg-[#e2a33c]/10")}>
            <Ic name="shield" size={16} className={constraintMet ? "text-[#4CC38A]" : "text-[#e2a33c]"} />
            <div>
              <p className={cx("text-[11px] font-bold", constraintMet ? "text-[#4CC38A]" : "text-[#e2a33c]")}>{constraintMet ? "Cutover guard acknowledged" : "Cutover guard not acknowledged"}</p>
              <p className="text-[9.5px] text-white/45">No lost or double-sold future bookings</p>
            </div>
          </div>
        </div>
      </section>

      {/* Phase cards — sequential */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        {GOLIVE_PHASES.map((ph, i) => {
          const keys = ph.items.map((_, j) => `${i}-${j}`);
          const n = keys.filter((k) => golive[k]).length;
          const complete = n === keys.length;
          const isOpen = unlocked(i);
          return (
            <div key={ph.phase} className={cx("relative rounded-xl border px-3.5 py-3.5 transition-opacity", complete ? "border-[#4CC38A]/50 bg-[#4CC38A]/5" : "border-white/10 bg-[#0d0d0b]", !isOpen && "opacity-45")}>
              {!isOpen && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-white/50">
                  <Ic name="lock" size={10} /> locked
                </span>
              )}
              <div className="mb-2.5 flex items-center gap-2">
                <span className={cx("flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold", complete ? "bg-[#4CC38A] text-black" : "bg-brand text-white")}>
                  {complete ? <Ic name="check" size={11} sw={3} /> : i + 1}
                </span>
                <p className="font-display text-[13px] font-bold leading-tight text-white">{ph.phase}</p>
              </div>
              <ul className="space-y-2">
                {ph.items.map((it, j) => {
                  const k = `${i}-${j}`;
                  const on = !!golive[k];
                  const action = GOLIVE_ACTION[k];
                  const ran = justRan === k;
                  const isGuard = k === "0-4";
                  return (
                    <li key={k} className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5">
                      <button onClick={() => isOpen && setGolive(k, !on)} disabled={!isOpen} className="flex w-full items-start gap-2 text-left">
                        <span className={cx("mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded border transition-colors", on ? "border-[#4CC38A] bg-[#4CC38A]" : "border-white/25")}>{on && <Ic name="check" size={9} sw={3} className="text-black" />}</span>
                        <span className={cx("text-[10.5px] leading-snug", on ? "text-white/40 line-through" : isGuard ? "font-bold text-[#e2a33c]" : "text-white/75")}>{it}</span>
                      </button>
                      {action && isOpen && !on && (
                        <button onClick={() => fire(i, j, it)} className={cx("mt-1.5 ml-[23px] flex items-center gap-1 rounded px-2 py-1 font-mono text-[9px] font-bold transition-all", ran ? "bg-[#4CC38A] text-black" : "bg-brand/20 text-brand-bright hover:bg-brand/30")}>
                          <Ic name={ran ? "check" : action.kind === "run" ? "play" : "arrowR"} size={9} sw={3} />
                          {ran ? "done" : action.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="font-mono text-[9px] text-white/35">{n}/{keys.length}</span>
                {complete && <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-[#4CC38A]"><Ic name="check" size={9} sw={3} /> complete</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live state + activation metrics */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card title="Cutover state" sub="flipped by the actions above — persisted and audited">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-[11.5px] text-white/75">Channel pushes</span>
              <Badge tone={goliveActions.pushesEnabled ? "ok" : "mute"}>{goliveActions.pushesEnabled ? "enabled" : "disabled (pull-only)"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-[11.5px] text-white/75">Legacy system</span>
              <Badge tone={goliveActions.frozen ? "warn" : "mute"}>{goliveActions.frozen ? "frozen" : "writable"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-[11.5px] text-white/75">Imports run</span>
              <span className="font-mono text-[12px] font-bold text-white">{goliveActions.importsRun}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-[11.5px] text-white/75">Reconciliations run</span>
              <span className="font-mono text-[12px] font-bold text-white">{goliveActions.reconsRun}</span>
            </div>
          </div>
        </Card>
        <section className="rounded-xl border border-white/10 bg-[#0d0d0b] px-5 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[14px] font-bold text-white">Activation metrics</h3>
              <p className="text-[11px] text-white/50">The work that decides whether a signed customer ever activates — treated as a product, not heroics.</p>
            </div>
            <Stat label="Time-to-first-synced-channel" value="3.2 days" tone="ok" />
            <Stat label="Time-to-first-direct-booking" value="9 days" tone="warn" />
            <Btn variant="ghost" className="!text-white/60" onClick={() => record("exported go-live checklist", "migration playbook")}>Export checklist</Btn>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 5.5 Metric definitions ────────────────────────────────────────────────
export function MetricsView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Card title="Internal metric definitions" sub="agreed once in the semantic layer, so nobody argues in a meeting">
        <div className="space-y-2">
          {METRIC_DEFS.map((m) => (
            <div key={m.cat} className="rounded-lg border border-white/10 px-3.5 py-2.5">
              <p className="text-[12px] font-bold text-brand-bright">{m.cat}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/75">{m.def}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-4">
        <Card title="Guardrail metrics" sub="must not degrade while you chase growth">
          <div className="space-y-2">
            {GUARDRAIL_METRICS.map((g) => (
              <div key={g} className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5">
                <Ic name="shield" size={14} className="shrink-0 text-[#f08c8c]" />
                <span className="text-[12px] font-bold text-white/85">{g}</span>
                <Pill ok={g !== "overbooking rate"} label={g === "overbooking rate" ? "0.02 / 10k" : "green"} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Why this matters" sub="">
          <p className="text-[11.5px] leading-relaxed text-white/65">Every operator computes occupancy differently and will assume you're wrong. Publishing the denominator in the UI — and agreeing these definitions in the semantic layer — is what turns a metric from an argument into a fact.</p>
        </Card>
      </div>
    </div>
  );
}

// ── 5.6 Team, cost & risk ─────────────────────────────────────────────────
export function TeamView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card title="Minimum viable team" sub="fewer than this and reliability silently becomes nobody's job">
        <div className="space-y-1.5">
          {MIN_TEAM.map((t) => (
            <div key={t.role} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <Ic name="users" size={13} className="shrink-0 text-white/40" />
              <span className="w-[110px] shrink-0 text-[11.5px] font-bold text-white/85">{t.role}</span>
              <span className="text-[10.5px] text-white/55">{t.focus}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Unit economics — per tenant, per month" sub="inference & messaging are the two lines that turn margin negative">
        <div className="space-y-1.5">
          {UNIT_ECONOMICS.map((u, i) => (
            <div key={u.line} className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <span className="w-5 font-mono text-[10px] text-white/30">{String(i + 1).padStart(2, "0")}</span>
              <span className={cx("flex-1 text-[11.5px] font-bold", u.note.startsWith("surprise") ? "text-[#f08c8c]" : "text-white/85")}>{u.line}</span>
              <span className="text-[10px] text-white/45">{u.note}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-md bg-pine-950 px-3 py-2 font-mono text-[10px] text-[#e2a33c]">Compare against realised ARPU by plan · set per-tenant ceilings + a pricing lever on both surprise lines.</p>
      </Card>
      <Card title="Risk register" sub="reviewed quarterly with an owner and a mitigation each">
        <div className="space-y-1.5">
          {RISK_REGISTER.map((r) => (
            <div key={r.risk} className="rounded-lg border border-white/10 px-3 py-2">
              <p className="text-[11.5px] font-bold text-white/85">{r.risk}</p>
              <p className="mt-0.5 text-[10px] text-white/55"><span className="font-mono text-[9px] text-[#8fc4dd]">{r.owner}</span> — {r.mitigation}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
