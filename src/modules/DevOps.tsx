import { useEffect, useRef, useState } from "react";
import { cx, timeAgo, pct } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Btn, Modal, Toggle } from "../components/ui";
import { useApp } from "../store";
import { Panel } from "./DevPlatform";
import {
  ACCEPTANCE, ACTIVATION_FUNNEL, API_SURFACE, CHAOS_RUNS, CI_STAGES, CLOUD_COSTS, COMPLIANCE, DIAGNOSTIC_BUNDLES,
  DOD, DR_DRILLS, ENVIRONMENTS, EVENT_CATALOG, FRAUD_QUEUE, HEALTH_SCORES, IMPERSONATION_LOG, INTERNAL_AUDIT,
  JOB_PLATFORM, MIGRATION_RULES, OAUTH_APPS, PHASES, RELEASE_TRAIN, RUNBOOKS, SDKS, SEARCH_INDEXES, SLO_BUDGETS,
  STAFF_ROLES, STATUS_COMPONENTS, SUPPORT_TICKETS, THREAT_MODEL, TRUST_CENTRE, WAREHOUSE_MARTS, WEBHOOK_INFRA,
} from "../lib/platform";

type STab = "roadmap" | "data" | "support" | "engineering" | "security" | "developers" | "release" | "access";
const TABS: { id: STab; label: string; icon: IconName }[] = [
  { id: "roadmap", label: "Roadmap & acceptance", icon: "flag" },
  { id: "data", label: "Data platform", icon: "chart" },
  { id: "support", label: "Support & success", icon: "lifeBuoy" },
  { id: "engineering", label: "Engineering substrate", icon: "server" },
  { id: "security", label: "Security & compliance", icon: "shield" },
  { id: "developers", label: "Developer ecosystem", icon: "code" },
  { id: "release", label: "Release & quality", icon: "history" },
  { id: "access", label: "Internal access", icon: "key" },
];

export default function DevOps() {
  const { navigate } = useApp();
  const [tab, setTab] = useState<STab>("roadmap");
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="eng flex min-h-screen bg-pine-950 text-white">
      {navOpen && <div className="fixed inset-0 z-[84] bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside className={cx("fixed inset-y-0 left-0 z-[85] flex h-screen w-[248px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a09] shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-[228px] lg:translate-x-0 lg:shadow-none", navOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="border-b border-white/10 px-4 py-4">
          <p className="font-display text-[14px] font-extrabold leading-none">platform substrate</p>
          <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-brand-bright">sections H–N · eng-owned surfaces</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {TABS.map((s) => (
            <button key={s.id} onClick={() => { setTab(s.id); setNavOpen(false); }} className={cx("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[12px] font-bold transition-colors", tab === s.id ? "bg-brand text-white" : "text-white/55 hover:bg-white/5 hover:text-white")}>
              <Ic name={s.icon} size={13} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <button onClick={() => navigate("/dev")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-bold text-white/60 hover:bg-white/5 hover:text-white"><Ic name="chevL" size={12} /> Developer console</button>
          <button onClick={() => navigate("/dev/backoffice")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-bold text-white/60 hover:bg-white/5 hover:text-white"><Ic name="alertTri" size={12} /> Ops backoffice →</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0a0a09]/90 px-4 py-3.5 backdrop-blur md:px-6">
          <button onClick={() => setNavOpen(true)} aria-label="Open substrate navigation" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/15 text-white/70 lg:hidden"><Ic name="menu" size={15} /></button>
          <h1 className="font-display text-[17px] font-extrabold tracking-tight">{TABS.find((t) => t.id === tab)?.label}</h1>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4CC38A] blink" /> release {RELEASE_TRAIN.current} · canary healthy
          </span>
        </header>
        <div className="bp-grid space-y-4 p-6">
          {tab === "roadmap" && <Roadmap />}
          {tab === "data" && <DataPlatform />}
          {tab === "support" && <Support />}
          {tab === "engineering" && <Engineering />}
          {tab === "security" && <Security />}
          {tab === "developers" && <Developers />}
          {tab === "release" && <Release />}
          {tab === "access" && <Access />}
        </div>
      </main>
    </div>
  );
}

// ── Roadmap & acceptance ───────────────────────────────────────────────────
function Roadmap() {
  const stateTone: Record<string, string> = {
    shipped: "bg-[#1d3527] text-[#4CC38A]", "in progress": "bg-[#3a3320] text-[#e2a33c]", next: "bg-white/10 text-white/60", planned: "bg-white/5 text-white/35",
  };
  const current = PHASES.find((p) => p.state === "in progress")!;
  return (
    <>
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a09] p-6">
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M0 60h120M60 0v120' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E\")" }} aria-hidden="true" />
        <div className="relative flex flex-wrap items-end gap-6">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bright">build order · the plan we ship by</p>
            <h2 className="mt-1 font-display text-[30px] font-extrabold tracking-tight">Phase {current.id} — {current.name}</h2>
            <p className="mt-1 max-w-[64ch] text-[12.5px] text-white/55">Phases are independently shippable. Skipping a foundation item is “the decision you regret at customer fifty” — so nothing below Phase 0 is optional, ever.</p>
          </div>
          <div className="flex gap-1.5" aria-label="Phase progress">
            {PHASES.map((p) => (
              <div key={p.id} className={cx("h-2 w-10 rounded-full", p.state === "shipped" ? "bg-[#4CC38A]" : p.state === "in progress" ? "bg-brand-bright blink" : "bg-white/10")} title={`Phase ${p.id} · ${p.state}`} />
            ))}
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PHASES.map((p) => (
          <section key={p.id} className={cx("rounded-xl border p-4 transition-all hover:-translate-y-0.5", p.state === "in progress" ? "border-brand/60 bg-[#1c0f0f]" : "border-white/10 bg-[#0a0a09]")}>
            <div className="flex items-center justify-between">
              <p className="font-display text-[14px] font-bold">Phase {p.id} · {p.name}</p>
              <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase", stateTone[p.state])}>{p.state}</span>
            </div>
            <ul className="mt-2.5 space-y-1">
              {p.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-[11.5px] text-white/65">
                  <Ic name={p.state === "shipped" ? "check" : p.state === "in progress" ? "bolt" : "clock"} size={11} className={cx("mt-0.5 shrink-0", p.state === "shipped" ? "text-[#4CC38A]" : p.state === "in progress" ? "text-[#e2a33c]" : "text-white/30")} sw={2.6} />
                  {it}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Panel title="Acceptance criteria — executable, not prose" note="the build is not done until each passes · states pull from CI + drill reports">
        <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
          {ACCEPTANCE.map((a) => (
            <p key={a.text} className="flex items-start gap-2.5 rounded-lg border border-white/10 px-3 py-2.5 text-[12px] leading-snug text-white/75">
              <span className="mt-0.5 shrink-0 rounded-full bg-[#1d3527] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#4CC38A]">{a.state}</span>
              {a.text}
            </p>
          ))}
        </div>
      </Panel>
    </>
  );
}

// ── Section H · Data platform ──────────────────────────────────────────────
function DataPlatform() {
  const [stream, setStream] = useState<string[]>([]);
  useEffect(() => {
    const names = EVENT_CATALOG.map((e) => e.name);
    const i = setInterval(() => {
      const n = names[Math.floor(Math.random() * names.length)];
      setStream((s) => [`${new Date().toISOString().slice(11, 23)}Z outbox→cdc ${n} tenant=t-${Math.random() > 0.5 ? "sanggraha" : "ambara"} seq=${Math.floor(Math.random() * 90_000 + 10_000)} ack=14ms`, ...s].slice(0, 9));
    }, 1400);
    return () => clearInterval(i);
  }, []);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Event catalogue — typed, versioned, outbox-guaranteed" note="emitted transactionally: analytics can never disagree with OLTP">
          <table className="w-full text-left">
            <thead><tr className="border-b border-white/10 text-[9.5px] font-bold uppercase tracking-widest text-white/35"><th className="py-1.5 pr-2">Event</th><th className="py-1.5 pr-2">v</th><th className="py-1.5 pr-2">Consumers</th><th className="py-1.5 text-right">Volume</th></tr></thead>
            <tbody>
              {EVENT_CATALOG.map((e) => (
                <tr key={e.name} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-mono text-[11.5px] font-bold text-white/85">{e.name}</td>
                  <td className="py-2 pr-2 font-mono text-[10.5px] text-[#4CC38A]">{e.version}</td>
                  <td className="py-2 pr-2 text-[10.5px] text-white/50">{e.consumers}</td>
                  <td className="py-2 text-right font-mono text-[10.5px] text-white/60">{e.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-white/30">live outbox → CDC stream</p>
            {stream.map((l, i) => <p key={`${l}${i}`} className="anim-rise whitespace-pre-wrap font-mono text-[10px] leading-[1.7] text-white/50" style={{ opacity: 1 - i * 0.1 }}>{l}</p>)}
          </div>
        </Panel>
        <Panel title="Warehouse marts — dbt-modelled" note="one semantic layer: internal analytics and tenant reports share models, so no number differs by surface">
          <div className="space-y-1.5">
            {WAREHOUSE_MARTS.map((m) => (
              <div key={m.model} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
                <span className="font-mono text-[11.5px] font-bold text-white/85">{m.model}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white/40">{m.layer}</span>
                <span className="ml-auto font-mono text-[9.5px] text-white/35">fresh {m.freshness}</span>
                <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold", m.drift.startsWith("ok") ? "bg-[#1d3527] text-[#4CC38A]" : "bg-[#3a3320] text-[#e2a33c]")}>{m.drift}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-[10px] text-white/40">tests on every model: freshness · uniqueness · grain · rls_predicate_present</p>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Activation funnel — the metric that pays the bills">
          {ACTIVATION_FUNNEL.map((f) => (
            <div key={f.step} className="mb-2">
              <p className="mb-0.5 flex justify-between text-[11px]"><span className="font-semibold text-white/70">{f.step}</span><span className="font-mono text-white/45">{f.count} · {f.pct}%</span></p>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/5"><div className={cx("bar-grow h-full rounded-full", f.pct < 40 ? "bg-brand-bright" : "bg-[#4CC38A]")} style={{ width: `${f.pct}%` }} /></div>
            </div>
          ))}
          <p className="mt-2 font-mono text-[10px] text-white/35">drop-off instrumented per step · “payment method” is the leak — graceful degradation, not a hard lock</p>
        </Panel>
        <Panel title="Tenant health scores → success queue" note="feeds the team's weekly call, not a spreadsheet">
          {HEALTH_SCORES.map((h) => (
            <div key={h.tenant} className="mb-2.5 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5">
              <span className={cx("font-display text-[20px] font-extrabold", h.score > 75 ? "text-[#4CC38A]" : h.score > 50 ? "text-[#e2a33c]" : "text-[#f08c8c]")}>{h.score}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white/85">{h.tenant}</p>
                <p className="truncate text-[10px] text-white/40">{h.signals}</p>
              </div>
              <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase", h.risk.startsWith("low") ? "bg-[#1d3527] text-[#4CC38A]" : h.risk.startsWith("medium") ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#3d1f1f] text-[#f08c8c]")}>{h.risk}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Search — per-tenant isolation, PII-aware">
          {SEARCH_INDEXES.map((s) => (
            <div key={s.index} className="mb-2 rounded-lg border border-white/10 px-3 py-2">
              <p className="flex items-center justify-between text-[12px] font-bold text-white/85">{s.index} <span className="font-mono text-[10px] text-white/40">{s.docs} docs</span></p>
              <p className="text-[10px] text-white/45">{s.perTenant} · PII: {s.pii}</p>
              <p className="font-mono text-[9.5px] text-white/30">reindex: {s.reindex}</p>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}

// ── Section I · Support & CS ───────────────────────────────────────────────
function Support() {
  const { toast } = useApp();
  const [impOpen, setImpOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [reason, setReason] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);
  const startSession = () => {
    if (!consent) { toast("err", "Blocked — tenant consent is the gate", "The tenant's support-access switch must be ON, or consent captured on the ticket."); return; }
    if (elevated && reason.trim().length < 10) { toast("err", "Elevated mode needs a real justification", "Minimum 10 characters — this lands in the append-only audit log."); return; }
    setImpOpen(false); setConsent(false); setElevated(false); setReason("");
    toast("ok", "Session started — 30:00 countdown", "Read-only · banner visible · payment & credential screens blocked.");
  };
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Impersonation — consent-gated, time-boxed, banner-flagged" note="the tenant's support-access setting is the gate; payment & credential screens are always excluded"
          right={<Btn size="xs" variant="solid" icon="eye" onClick={() => setImpOpen(true)}>Start consented session</Btn>}>
          {IMPERSONATION_LOG.map((s) => (
            <div key={s.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5">
              <span className={cx("rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase", s.mode === "read-only" ? "bg-[#1d3527] text-[#4CC38A]" : "bg-[#3a3320] text-[#e2a33c]")}>{s.mode}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white/85">{s.staff} → {s.tenant}</p>
                <p className="text-[10px] text-white/40">{s.consent} · {s.actions} actions attributed · banner {s.banner}</p>
              </div>
              <span className="font-mono text-[10px] text-white/35">{timeAgo(s.started)} · window {s.window}</span>
            </div>
          ))}
          <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[10.5px] text-white/40">Tenants can pull a full report of every session on their account — Settings → Security → Access reports.</p>
        </Panel>
        <Panel title="Diagnostic bundle — one click, redacted, auto-attached"
          right={<Btn size="xs" icon="bolt" disabled={diagBusy} onClick={() => { setDiagBusy(true); setTimeout(() => { setDiagBusy(false); toast("ok", "diag-442 generated · attached to T-1042", "credentials · guest PII · payment tokens redacted"); }, 1200); }}>{diagBusy ? "collecting…" : "Generate for Sanggraha"}</Btn>}>
          {DIAGNOSTIC_BUNDLES.map((b) => (
            <div key={b.id} className="rounded-lg border border-white/10 px-3 py-2.5">
              <p className="flex items-center justify-between text-[12px] font-bold text-white/85">{b.id} → {b.attachedTo} <span className="font-mono text-[10px] text-white/35">{b.size}</span></p>
              <p className="mt-1 text-[10.5px] text-white/50">{b.contents}</p>
              <p className="mt-1 font-mono text-[9.5px] text-[#f08c8c]">redacted: {b.redactions}</p>
            </div>
          ))}
          <div className="mt-3">
            <p className="mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35">ticket queue · macros pull live tenant state</p>
            {SUPPORT_TICKETS.map((tk) => (
              <div key={tk.id} className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2">
                <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", tk.sev === "S2" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-white/5 text-white/50")}>{tk.sev}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11.5px] font-bold text-white/80">{tk.id} · {tk.subject}</p><p className="text-[9.5px] text-white/35">{tk.tenant} · macro: {tk.macro} · health {tk.health}</p></div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-white/50">{tk.state}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Public status page — channel outages visible, tickets down" note="subscribe-by-email · auto-updates from monitoring">
          <div className="grid grid-cols-2 gap-1.5">
            {STATUS_COMPONENTS.map((c) => (
              <div key={c.name} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
                <span className={cx("h-2 w-2 rounded-full", c.status === "operational" ? "bg-[#4CC38A]" : "bg-[#e2a33c] blink")} />
                <span className="flex-1 truncate text-[11.5px] font-semibold text-white/75">{c.name}</span>
                <span className="font-mono text-[9.5px] text-white/35">{c.uptime90d}%</span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 rounded-lg bg-[#3a3320]/40 px-3 py-2 text-[10.5px] text-[#e2a33c]">active incident: Expedia Group OAuth API degraded since 05:40Z — tenant banner live, updates every 30m.</p>
        </Panel>
        <Panel title="Trust centre — where enterprise deals stop stalling">
          <div className="grid grid-cols-2 gap-1.5">
            {TRUST_CENTRE.map((d) => (
              <div key={d.doc} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="text-[11.5px] font-bold text-white/80">{d.doc}</p>
                <p className="font-mono text-[9.5px] text-white/35">{d.updated}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Modal open={impOpen} onClose={() => setImpOpen(false)} title="Impersonation — prove the gate before the session" w={460}
        footer={<><Btn variant="ghost" onClick={() => setImpOpen(false)}>Cancel</Btn><Btn variant="solid" icon="eye" onClick={startSession}>Start 30-min session</Btn></>}>
        <div className="space-y-3 text-[12.5px]">
          <label className="flex items-start gap-2.5 rounded-lg border border-white/10 px-3 py-2.5">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-white/75">Tenant consent verified — support-access is ON in their Settings (checked 12s ago), or captured in the ticket thread.</span>
          </label>
          <label className="flex items-start gap-2.5 rounded-lg border border-white/10 px-3 py-2.5">
            <input type="checkbox" checked={elevated} onChange={(e) => setElevated(e.target.checked)} className="mt-0.5" />
            <span className="text-white/75">Elevated mode (writes). Read-only is the default; elevation requires justification below.</span>
          </label>
          {elevated && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Justification — logged, immutable, reviewed weekly…" className="h-9 w-full rounded-md border border-white/15 bg-[#171714] px-3 text-[12px] text-white outline-none focus:border-brand" />}
          <p className="rounded-md bg-[#1c0f0f] px-3 py-2 font-mono text-[10px] text-[#f08c8c]">payment screens · credential screens · API keys — always blocked, even elevated.</p>
        </div>
      </Modal>
    </>
  );
}

// ── Section J · Engineering substrate ──────────────────────────────────────
function Engineering() {
  const { toast } = useApp();
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {ENVIRONMENTS.map((e) => (
          <section key={e.name} className="rounded-xl border border-white/10 bg-[#0a0a09] p-4">
            <p className="font-display text-[15px] font-extrabold uppercase tracking-tight text-white">{e.name}</p>
            <p className="mt-1.5 text-[10.5px] leading-snug text-white/50">{e.shape}</p>
            <p className="mt-2 font-mono text-[9.5px] text-[#4CC38A]">{e.db}</p>
            <p className="font-mono text-[9.5px] text-white/30">{e.note}</p>
          </section>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="CI pipeline — the merge gate nobody can skip">
          <div className="flex flex-wrap items-center gap-1.5">
            {CI_STAGES.map((s, i) => (
              <span key={s.stage} className="flex items-center gap-1.5">
                <span className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10.5px] font-bold text-white/75">{s.stage} <span className="font-mono text-[9px] text-white/35">{s.dur}</span></span>
                {i < CI_STAGES.length - 1 && <Ic name="chevR" size={11} className="text-white/25" />}
              </span>
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {MIGRATION_RULES.map((r) => <p key={r} className="flex gap-2 text-[11.5px] text-white/60"><Ic name="check" size={12} className="mt-0.5 shrink-0 text-[#4CC38A]" sw={2.6} />{r}</p>)}
          </div>
        </Panel>
        <Panel title="Job platform — durable, fair, observable">
          {JOB_PLATFORM.map((j) => (
            <div key={j.queue} className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2">
              <span className="font-mono text-[11.5px] font-bold text-white/85">{j.queue}</span>
              <span className="text-[9.5px] text-white/35">{j.partition}</span>
              <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-white/40">{j.priority}</span>
              <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", j.dlq > 0 ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#1d3527] text-[#4CC38A]")}>DLQ {j.dlq}</span>
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="SLOs & error budgets — feature work freezes when the budget is gone">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {SLO_BUDGETS.map((s) => (
            <div key={s.sub} className="rounded-lg border border-white/10 px-3 py-2.5">
              <p className="flex items-center justify-between text-[11.5px] font-bold text-white/80">{s.sub} <span className="font-mono text-[10px] text-white/35">{s.slo} · now {s.p95}</span></p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                <div className={cx("h-full rounded-full", s.budgetLeft > 60 ? "bg-[#4CC38A]" : s.budgetLeft > 30 ? "bg-[#e2a33c]" : "bg-brand-bright")} style={{ width: pct(s.budgetLeft / 100) }} />
              </div>
              <p className="mt-1 font-mono text-[9.5px] text-white/35">{s.budgetLeft}% budget left · {s.window}</p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="DR drills — scheduled, executed, written down" right={<Btn size="xs" variant="ghost" className="text-white/70" icon="history" onClick={() => toast("info", "Next drill booked", "Apr 28 — per-tenant PITR for Ambara")}>Schedule next</Btn>}>
          {DR_DRILLS.map((d) => (
            <div key={d.id} className="mb-2 rounded-lg border border-white/10 px-3 py-2.5">
              <p className="text-[12px] font-bold text-white/85">{d.what}</p>
              <p className="font-mono text-[10px] text-white/40">{d.when} · RTO {d.rto} · RPO {d.rpo} · next {d.next}</p>
              <p className="mt-0.5 font-mono text-[10px] font-bold text-[#4CC38A]">{d.result}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Chaos — 10× peak, on purpose">
          {CHAOS_RUNS.map((c) => (
            <div key={c.scenario} className="mb-2 rounded-lg border border-white/10 px-3 py-2.5">
              <p className="text-[11.5px] font-bold text-white/85">{c.scenario}</p>
              <p className="text-[10px] text-white/45">{c.result} <span className="font-mono text-white/30">· {c.when}</span></p>
            </div>
          ))}
        </Panel>
        <Panel title="Cloud cost — attribution per service">
          {CLOUD_COSTS.map((c) => (
            <div key={c.service} className="mb-1.5 flex items-center gap-2.5">
              <span className="w-[120px] text-[11px] font-semibold text-white/70">{c.service}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5"><div className="bar-grow h-full rounded-full bg-white/40" style={{ width: `${(c.cost / 420) * 100}%` }} /></div>
              <span className="font-mono text-[10.5px] font-bold text-white/80">${c.cost}k</span>
              <span className={cx("w-[86px] text-right font-mono text-[9px]", c.flag.startsWith("watch") ? "text-[#e2a33c]" : "text-white/30")}>{c.delta}</span>
            </div>
          ))}
          <p className="mt-2 font-mono text-[9.5px] text-white/30">inference · egress · blob — the usual surprises — reviewed quarterly</p>
        </Panel>
      </div>
    </>
  );
}

// ── Section K · Security & compliance ──────────────────────────────────────
function Security() {
  const { toast } = useApp();
  const [fraud, setFraud] = useState(FRAUD_QUEUE);
  return (
    <>
      <Panel title="Threat model — reviewed monthly, controls owned" note="the surfaces that hurt: tenancy, the credential vault, guest PII on public pages, injection, forgery">
        <table className="w-full text-left">
          <thead><tr className="border-b border-white/10 text-[9.5px] font-bold uppercase tracking-widest text-white/35"><th className="py-1.5 pr-3">Threat</th><th className="py-1.5 pr-3">Controls</th><th className="py-1.5 text-right">State</th></tr></thead>
          <tbody>
            {THREAT_MODEL.map((t) => (
              <tr key={t.threat} className="border-b border-white/5 align-top">
                <td className="py-2 pr-3"><p className="text-[12px] font-bold text-white/85">{t.threat}</p><p className="font-mono text-[9.5px] text-white/35">{t.surface}</p></td>
                <td className="py-2 pr-3 text-[10.5px] leading-snug text-white/55">{t.controls}</td>
                <td className="py-2 text-right"><span className="rounded-full bg-[#1d3527] px-2 py-0.5 font-mono text-[9px] font-bold text-[#4CC38A]">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Compliance programme">
          {COMPLIANCE.map((c) => (
            <div key={c.item} className="mb-1.5 flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2">
              <span className="flex-1 text-[12px] font-bold text-white/80">{c.item}</span>
              <span className="text-[9.5px] text-white/35">{c.detail}</span>
              <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9px] font-bold", c.state === "under audit" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#1d3527] text-[#4CC38A]")}>{c.state}</span>
            </div>
          ))}
          <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-[10.5px] text-white/40">PCI: hosted fields / redirect only — no PAN ever touches our systems, tenant side or guest side. OTA virtual cards are surfaced, never stored.</p>
        </Panel>
        <Panel title="Fraud & abuse queue" note="freeze outbound messaging and payment acceptance independently">
          {fraud.length === 0 && <p className="py-4 text-center font-mono text-[11px] text-[#4CC38A]">✓ queue clear</p>}
          {fraud.map((f) => (
            <div key={f.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-[#5a2020] bg-[#1c0f0f] px-3 py-2.5">
              <span className="rounded bg-[#3d1f1f] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-[#f08c8c]">{f.kind}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-bold text-white/85">{f.detail}</p>
                <p className="font-mono text-[9.5px] text-white/35">{f.tenant} · {f.action}</p>
              </div>
              <Btn size="xs" variant="danger" icon="lock" onClick={() => { setFraud(fraud.filter((x) => x.id !== f.id)); toast("warn", `${f.kind} contained`, "Freeze applied · case moved to investigations."); }}>Freeze & resolve</Btn>
            </div>
          ))}
          <div className="mt-2 rounded-lg border border-white/10 px-3 py-2.5">
            <p className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35">severity ladder</p>
            <p className="text-[10.5px] leading-relaxed text-white/55"><b className="text-[#f08c8c]">S1</b> data exposure / lost bookings → page on-call, 15m · <b className="text-[#e2a33c]">S2</b> degraded sync / failed sends → 1h · <b className="text-white/70">S3</b> single-tenant friction → business hours · blameless postmortems with tracked action items.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

// ── Section L · Developer ecosystem ────────────────────────────────────────
function Developers() {
  const { toast } = useApp();
  const [apps, setApps] = useState(OAUTH_APPS);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Public API — versioned, generated, honest about sunsets">
          {API_SURFACE.map((a) => (
            <div key={a.item} className="mb-1.5 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <span className="w-[140px] text-[11.5px] font-bold text-white/75">{a.item}</span>
              <span className="flex-1 font-mono text-[10.5px] text-white/50">{a.value}</span>
              <span className="rounded-full bg-[#1d3527] px-2 py-0.5 font-mono text-[9px] font-bold text-[#4CC38A]">{a.status}</span>
            </div>
          ))}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {WEBHOOK_INFRA.map((w) => (
              <div key={w.metric} className="rounded-lg bg-white/[0.03] px-3 py-2"><p className="text-[9.5px] font-bold uppercase tracking-widest text-white/35">{w.metric}</p><p className="font-mono text-[15px] font-bold text-white/85">{w.value}</p></div>
            ))}
          </div>
        </Panel>
        <Panel title="Third-party apps — OAuth consent, granular scopes, review gate" note="marketplace groundwork: directory + review + install lifecycle with entitlement checks">
          {apps.map((a) => (
            <div key={a.app} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-white/85">{a.app} <span className="font-mono text-[9.5px] font-normal text-white/35">· {a.dev} · {a.installs} installs</span></p>
                <p className="font-mono text-[9.5px] text-white/40">scopes: {a.scopes}</p>
              </div>
              {a.status === "in review" ? (
                <div className="flex gap-1.5">
                  <Btn size="xs" variant="solid" icon="check" onClick={() => { setApps(apps.map((x) => x.app === a.app ? { ...x, status: "listed" } : x)); toast("ok", `${a.app} listed`, "Install flow now checks tenant entitlements."); }}>Approve</Btn>
                  <Btn size="xs" variant="ghost" className="text-white/60" onClick={() => { setApps(apps.filter((x) => x.app !== a.app)); toast("warn", "Rejected with feedback", "Developer notified · scope request too broad."); }}>Reject</Btn>
                </div>
              ) : <span className="rounded-full bg-[#1d3527] px-2 py-0.5 font-mono text-[9px] font-bold text-[#4CC38A]">listed</span>}
            </div>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {SDKS.map((s) => (
              <div key={s.sdk} className="rounded-lg border border-white/10 px-3 py-2"><p className="text-[11.5px] font-bold text-white/80">{s.sdk}</p><p className="font-mono text-[9.5px] text-white/35">{s.generated} · {s.version}</p></div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ── Section M · Release & quality ──────────────────────────────────────────
function Release() {
  const { navigate } = useApp();
  return (
    <>
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a09] p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand-bright">release train</p>
            <p className="mt-1 font-display text-[44px] font-extrabold leading-none tracking-tight">v{RELEASE_TRAIN.current}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-white/60">{RELEASE_TRAIN.cadence} · {RELEASE_TRAIN.ring}</p>
            <div className="mt-3 space-y-1.5">
              {RELEASE_TRAIN.entries.map((e) => (
                <p key={e.v} className="flex flex-wrap items-center gap-2 text-[11.5px]">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/70">v{e.v}</span>
                  <span className="text-white/70">{e.notes}</span>
                  <span className="font-mono text-[9px] text-white/30">{e.flag} · {e.when}</span>
                </p>
              ))}
            </div>
          </div>
          <Btn variant="solid" icon="doc" onClick={() => navigate("/dev")}>Changelog</Btn>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Definition of done — all six, every time">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {DOD.map((d) => <p key={d} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-white/75"><Ic name="check" size={13} className="shrink-0 text-[#4CC38A]" sw={2.6} />{d}</p>)}
          </div>
          <p className="mt-2.5 rounded-lg bg-[#1c0f0f] px-3 py-2 text-[10.5px] text-[#f08c8c]">Sync freshness budget at 44% — two more breached weeks and feature work freezes on the sync squad. That's the deal, and it's published.</p>
        </Panel>
        <Panel title="Runbooks — written by the builder, tested by someone who isn't">
          {RUNBOOKS.map((r) => (
            <div key={r.sub} className="mb-1.5 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <Ic name="book" size={13} className="shrink-0 text-white/35" />
              <div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-white/80">{r.sub}</p><p className="text-[9.5px] text-white/35">author: {r.author} · tested by: {r.testedBy}</p></div>
              <span className="font-mono text-[9.5px] text-white/35">drilled {r.lastDrill}</span>
            </div>
          ))}
          <p className="mt-2 font-mono text-[10px] text-white/35">weekly ops review: cross-tenant failure queues · monthly integration health review per provider</p>
        </Panel>
      </div>
    </>
  );
}

// ── Section N · Internal access ────────────────────────────────────────────
function Access() {
  const [feed, setFeed] = useState(INTERNAL_AUDIT);
  const tickRef = useRef(0);
  useEffect(() => {
    const i = setInterval(() => {
      tickRef.current += 1;
      setFeed((f) => [{ ts: Date.now(), staff: ["Mira K.", "Jonas T.", "finance-bot", "platform-ci"][tickRef.current % 4], action: ["entitlement cache invalidated", "reconciliation diff exported", "flag autopilot_v3 ramped to 50%", "tenant health recomputed"][tickRef.current % 4], tenant: tickRef.current % 3 === 0 ? "Ambara" : "—", anomaly: false }, ...f].slice(0, 8));
    }, 3800);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <Panel title="Staff roles — least privilege, separation of duties" note="nobody can grant themselves elevation and use it unlogged">
        <table className="w-full text-left">
          <thead><tr className="border-b border-white/10 text-[9.5px] font-bold uppercase tracking-widest text-white/35"><th className="py-1.5 pr-3">Role</th><th className="py-1.5 pr-3">Can</th><th className="py-1.5">Cannot</th></tr></thead>
          <tbody>
            {STAFF_ROLES.map((r) => (
              <tr key={r.role} className="border-b border-white/5 align-top">
                <td className="py-2 pr-3 font-mono text-[11.5px] font-bold text-brand-bright">{r.role}</td>
                <td className="py-2 pr-3 text-[10.5px] text-white/60">{r.can}</td>
                <td className="py-2 text-[10.5px] text-white/40">{r.cannot}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2.5 rounded-lg bg-white/[0.03] px-3 py-2 text-[10.5px] text-white/45">Destructive actions (purge tenant, delete reservations, rotate tenant keys) require <b className="text-white/70">two-person approval</b>. Every action: permissioned, reason-required, rate-limited, audited, reversible where possible.</p>
      </Panel>
      <Panel title="Internal audit — append-only, staff-immutable" note="anomaly detection on access patterns · alerting on spikes" right={<span className="flex items-center gap-1.5 font-mono text-[9.5px] text-[#4CC38A]"><span className="h-1.5 w-1.5 rounded-full bg-[#4CC38A] blink" /> live</span>}>
        <div className="space-y-1.5">
          {feed.map((a, i) => (
            <div key={`${a.ts}-${i}`} className={cx("anim-rise flex items-start gap-2.5 rounded-lg border px-3 py-2", a.anomaly ? "border-[#5a2020] bg-[#1c0f0f]" : "border-white/10")}>
              <span className={cx("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", a.anomaly ? "bg-brand-bright dot-pulse" : "bg-white/25")} />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold text-white/80">{a.action} {a.tenant !== "—" && <span className="font-mono text-[9px] text-white/30">· {a.tenant}</span>}</p>
                <p className="font-mono text-[9px] text-white/30">{a.staff} · {timeAgo(a.ts)}{a.anomaly && <span className="ml-2 rounded bg-[#3d1f1f] px-1.5 py-0.5 font-bold text-[#f08c8c]">ANOMALY — paged security</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
