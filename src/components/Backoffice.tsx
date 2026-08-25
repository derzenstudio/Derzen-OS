import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cx, timeAgo } from "../lib/format";
import { Ic, type IconName } from "./icons";
import { Badge, Toggle } from "./ui";
import { useApp } from "../store";
import { AUDIT_STREAM, FAILING_CONNECTIONS, QUARANTINED_RESERVATIONS, STUCK_JOBS, type AuditEvent } from "../lib/backoffice";
import { OpsDashboard, TenantsView, CommercialsView } from "../modules/bo/Sections1";
import { EntitlementsView, IntegrationsView, MessagingView } from "../modules/bo/Sections2";
import { AIPlatformView, DataPlatformView, SupportView } from "../modules/bo/Sections3";
import { EngineeringView, SecurityView, EcosystemView, AccessView } from "../modules/bo/Sections4";
import { ArchitectureView, SchemaView, StateMachinesView, ResolverView } from "../modules/bo/Sections6";
import { AdapterView, EventsView, ApiReferenceView, PermissionsView, AiTasksView, JobsView, ConfigSecretsView, CalculationsView, ChecklistView } from "../modules/bo/Sections7";
import { QueuesView, InspectorView, ProvidersView, RunbooksView, SlosView, GoLiveView, MetricsView, TeamView } from "../modules/bo/Manual";

// ── Internal audit context (append-only, staff cannot mutate) ─────────────
interface AuditCtx {
  events: AuditEvent[];
  record: (action: string, target: string, severity?: AuditEvent["severity"]) => void;
}
const AuditContext = createContext<AuditCtx>({ events: [], record: () => {} });
export const useAudit = () => useContext(AuditContext);

export type BoSection =
  | "ops" | "tenants" | "commercials" | "entitlements" | "integrations"
  | "messaging" | "ai" | "data" | "support" | "engineering" | "security" | "ecosystem" | "access"
  | "topology" | "schema" | "machines" | "resolver"
  | "adapter" | "events" | "api" | "permissions" | "aitasks" | "jobs" | "config" | "calcs" | "checklist"
  | "queues" | "inspector" | "providers" | "runbooks" | "slos" | "golive" | "metrics" | "team";

const NAV: { group: string; items: { id: BoSection; label: string; icon: IconName }[] }[] = [
  { group: "Operate", items: [
    { id: "ops", label: "Ops dashboard", icon: "grid" },
    { id: "queues", label: "Work queues", icon: "inbox" },
    { id: "inspector", label: "Entity inspector", icon: "eye" },
    { id: "providers", label: "Provider health", icon: "plug" },
    { id: "tenants", label: "Tenants & lifecycle", icon: "users" },
  ]},
  { group: "Operator's manual", items: [
    { id: "runbooks", label: "Incident runbooks", icon: "book" },
    { id: "slos", label: "SLO targets", icon: "trendUp" },
    { id: "golive", label: "Go-live playbook", icon: "flag" },
    { id: "metrics", label: "Metric definitions", icon: "chart" },
    { id: "team", label: "Team, cost & risk", icon: "users" },
  ]},
  { group: "Commercial", items: [
    { id: "commercials", label: "Plans & billing", icon: "card" },
    { id: "entitlements", label: "Entitlements & flags", icon: "toggle" },
  ]},
  { group: "Platform", items: [
    { id: "integrations", label: "Integrations", icon: "plug" },
    { id: "messaging", label: "Messaging infra", icon: "chat" },
    { id: "ai", label: "AI platform", icon: "sparkle" },
    { id: "data", label: "Data platform", icon: "chart" },
  ]},
  { group: "Trust & substrate", items: [
    { id: "support", label: "Support & success", icon: "lifeBuoy" },
    { id: "engineering", label: "Engineering substrate", icon: "server" },
    { id: "security", label: "Security & compliance", icon: "shield" },
  ]},
  { group: "Ecosystem & admin", items: [
    { id: "ecosystem", label: "Developer ecosystem", icon: "code" },
    { id: "access", label: "Internal access", icon: "key" },
  ]},
  { group: "Technical reference", items: [
    { id: "topology", label: "Service topology", icon: "map" },
    { id: "schema", label: "Data model & invariants", icon: "book" },
    { id: "machines", label: "State machines", icon: "refresh" },
    { id: "resolver", label: "Availability resolver", icon: "calc" },
  ]},
  { group: "Contracts", items: [
    { id: "adapter", label: "Adapter contract", icon: "plug" },
    { id: "events", label: "Event catalogue", icon: "send" },
    { id: "api", label: "Public API", icon: "code" },
    { id: "permissions", label: "Permission matrix", icon: "shield" },
  ]},
  { group: "Runtime & math", items: [
    { id: "aitasks", label: "AI task inventory", icon: "sparkle" },
    { id: "jobs", label: "Job inventory", icon: "terminal" },
    { id: "config", label: "Config & secrets", icon: "lock" },
    { id: "calcs", label: "Derived calculations", icon: "chart" },
    { id: "checklist", label: "Ready-to-code", icon: "checkCircle" },
  ]},
];

const TITLES: Record<BoSection, { title: string; sub: string }> = {
  ops: { title: "Global operations", sub: "Cross-tenant failure queues — worked daily, seen before the customer sees them" },
  tenants: { title: "Tenants & lifecycle", sub: "Directory, drill-down, and the suspend/restore/purge state machine" },
  commercials: { title: "Plans & billing", sub: "Pricing as data, per-unit metering, dunning, and revenue movement" },
  entitlements: { title: "Entitlements & flags", sub: "The single source of truth for “can this tenant do this right now”" },
  integrations: { title: "Integration engineering", sub: "Adapter SDK, capability matrix, vault, certification, orchestration" },
  messaging: { title: "Messaging infrastructure", sub: "Transports, deliverability, template governance, abuse throttle" },
  ai: { title: "AI platform", sub: "Prompt registry, model router, evals, guardrails, KB, cost control" },
  data: { title: "Data platform", sub: "Event contracts, warehouse, analytics, search — one semantic layer" },
  support: { title: "Support & success", sub: "Consented impersonation, diagnostic bundles, desk, status page" },
  engineering: { title: "Engineering substrate", sub: "Environments, CI/CD, migrations, jobs, SLOs, DR, chaos, cost" },
  security: { title: "Security & compliance", sub: "Threat model, controls, payments scope, compliance, abuse" },
  ecosystem: { title: "Developer ecosystem", sub: "Public API, OAuth, webhooks, SDKs, marketplace, release train" },
  access: { title: "Internal access control", sub: "Staff roles, separation of duties, and the immutable audit stream" },
  topology: { title: "Service & repo topology", sub: "Independently deployable services · pure-core packages · CI-enforced boundaries" },
  schema: { title: "Core data model", sub: "40 tenant-scoped tables · conventions · invariants enforced in the database" },
  machines: { title: "State machines", sub: "Explicit transition tables — undefined transitions are rejected loudly" },
  resolver: { title: "Availability resolver", sub: "resolve() — the pure function at the heart of the product, running live" },
  adapter: { title: "Channel adapter contract", sub: "One interface every OTA sits behind · capability flags · error taxonomy" },
  events: { title: "Event catalogue & envelope", sub: "Transactional outbox · resource.past_tense · additive versions" },
  api: { title: "Public API surface", sub: "/v1 conventions · route inventory · the separate guest surface" },
  permissions: { title: "Role & permission matrix", sub: "resource:action triples · sealed classes · CI-asserted fixture" },
  aitasks: { title: "AI task inventory", sub: "Registered tasks with fixed contracts · guardrails · kill switches" },
  jobs: { title: "Background job inventory", sub: "Cadence, idempotency and priority for every job on the platform" },
  config: { title: "Configuration & secrets", sub: "Config by environment · KMS-backed secrets with rotation" },
  calcs: { title: "Derived calculations", sub: "Meter, owner statement, occupancy math and task generation — live" },
  checklist: { title: "Ready-to-code checklist", sub: "The artefacts that must exist before implementation starts" },
  queues: { title: "Work queues", sub: "Ten claimable daily surfaces with SLA timers — raw payload, fix, resolve-with-reason" },
  inspector: { title: "Universal entity inspector", sub: "Record + mutation history + raw payload + permission trace — no production access" },
  providers: { title: "Provider health", sub: "Per-channel success, latency, error taxonomy, certification and deprecation" },
  runbooks: { title: "Incident runbooks", sub: "The ten incidents that will actually happen — detection, mitigation, comms, follow-up" },
  slos: { title: "SLO targets", sub: "Put numbers on it or it isn't an SLO — with an error-budget policy that bites" },
  golive: { title: "Go-live playbook", sub: "Migration as a product with a checklist — dry-run, read-only parity, cutover, hypercare" },
  metrics: { title: "Metric definitions", sub: "Agreed once in the semantic layer so nobody argues in a meeting" },
  team: { title: "Team, cost & risk", sub: "Minimum viable team, per-tenant unit economics, and the quarterly risk register" },
};

export function Backoffice() {
  const { logout, navigate } = useApp();
  const [section, setSection] = useState<BoSection>("ops");
  const [events, setEvents] = useState<AuditEvent[]>(AUDIT_STREAM);
  const [emergencyStop, setEmergencyStop] = useState(false);

  const record = useCallback((action: string, target: string, severity: AuditEvent["severity"] = "info") => {
    setEvents((e) => [{ id: `a${Date.now()}`, ts: Date.now(), actor: "dev@trellis", action, target, severity }, ...e]);
  }, []);

  const ctx = useMemo(() => ({ events, record }), [events, record]);

  const queueCount = FAILING_CONNECTIONS.length + QUARANTINED_RESERVATIONS.length + STUCK_JOBS.length;

  return (
    <AuditContext.Provider value={ctx}>
      <div className="flex min-h-screen bg-pine-950 text-pine-100">
        {/* Rail */}
        <aside className="sticky top-0 flex h-screen w-[228px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a09]">
          <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <Ic name="server" size={16} className="text-white" sw={2.2} />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold leading-none text-white">Trellis Ops</p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-brand-bright">internal backoffice</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Backoffice sections">
            {NAV.map((g) => (
              <div key={g.group} className="mb-3">
                <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">{g.group}</p>
                {g.items.map((it) => {
                  const active = section === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => setSection(it.id)}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[12.5px] font-semibold transition-colors",
                        active ? "bg-brand/25 text-white shadow-[inset_2px_0_0_#2E9E77]" : "text-white/60 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Ic name={it.icon} size={14} className={active ? "text-brand-bright" : "text-white/40"} />
                      <span className="flex-1">{it.label}</span>
                      {it.id === "ops" && queueCount > 0 && (
                        <span className="rounded-full bg-danger px-1.5 font-mono text-[9.5px] font-bold text-white">{queueCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 p-3">
            <div className="mb-2 space-y-0.5">
              <button onClick={() => navigate("/dev/console")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-bold text-white/50 transition-colors hover:bg-white/5 hover:text-white"><Ic name="terminal" size={12} /> Engineering console</button>
              <button onClick={() => navigate("/dev/backoffice")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-bold text-white/50 transition-colors hover:bg-white/5 hover:text-white"><Ic name="alertTri" size={12} /> Ops deep-dive · A–G</button>
              <button onClick={() => navigate("/dev/substrate")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-bold text-white/50 transition-colors hover:bg-white/5 hover:text-white"><Ic name="flag" size={12} /> Substrate & roadmap · H–N</button>
            </div>
            <p className="mb-2 font-mono text-[9px] text-white/30">admin.trellis.internal · SSO + device trust</p>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70 transition-colors hover:border-brand hover:text-white">
              <Ic name="logOut" size={13} /> End internal session
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-pine-950/85 px-6 py-3.5 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-[17px] font-bold tracking-tight text-white">{TITLES[section].title}</h1>
                <p className="text-[11px] text-white/45">{TITLES[section].sub}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={cx("flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold", emergencyStop ? "border-danger/50 bg-danger/15 text-[#f08c8c]" : "border-white/15 text-white/50")}>
                  <span className={cx("h-1.5 w-1.5 rounded-full", emergencyStop ? "bg-danger dot-pulse" : "bg-[#4CC38A]")} />
                  {emergencyStop ? "OUTBOUND HALTED" : "outbound live"}
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] text-white/50">
                  <Ic name="shield" size={11} className="text-[#4CC38A]" /> audit on
                </span>
              </div>
            </div>
          </header>

          {emergencyStop && (
            <div className="flex items-center gap-3 border-b border-danger/40 bg-danger/15 px-6 py-2">
              <Ic name="alertTri" size={15} className="text-[#f08c8c]" />
              <p className="text-[12px] font-semibold text-[#f08c8c]">Global emergency stop engaged — all automated outbound guest messaging is halted platform-wide.</p>
              <button onClick={() => { setEmergencyStop(false); record("disengaged global emergency stop", "messaging", "destructive"); }} className="ml-auto rounded-md bg-white px-3 py-1 text-[11.5px] font-bold text-ink hover:bg-paper">Resume</button>
            </div>
          )}

          <div className="p-6">
            {section === "ops" && <OpsDashboard onEmergencyStop={() => { setEmergencyStop(true); record("engaged global emergency stop", "messaging", "destructive"); }} />}
            {section === "tenants" && <TenantsView />}
            {section === "commercials" && <CommercialsView />}
            {section === "entitlements" && <EntitlementsView />}
            {section === "integrations" && <IntegrationsView />}
            {section === "messaging" && <MessagingView onEmergencyStop={() => { setEmergencyStop(true); record("engaged global emergency stop", "messaging", "destructive"); }} />}
            {section === "ai" && <AIPlatformView />}
            {section === "data" && <DataPlatformView />}
            {section === "support" && <SupportView />}
            {section === "engineering" && <EngineeringView />}
            {section === "security" && <SecurityView />}
            {section === "ecosystem" && <EcosystemView />}
            {section === "access" && <AccessView />}
            {section === "topology" && <ArchitectureView />}
            {section === "schema" && <SchemaView />}
            {section === "machines" && <StateMachinesView />}
            {section === "resolver" && <ResolverView />}
            {section === "adapter" && <AdapterView />}
            {section === "events" && <EventsView />}
            {section === "api" && <ApiReferenceView />}
            {section === "permissions" && <PermissionsView />}
            {section === "aitasks" && <AiTasksView />}
            {section === "jobs" && <JobsView />}
            {section === "config" && <ConfigSecretsView />}
            {section === "calcs" && <CalculationsView />}
            {section === "checklist" && <ChecklistView />}
            {section === "queues" && <QueuesView />}
            {section === "inspector" && <InspectorView />}
            {section === "providers" && <ProvidersView />}
            {section === "runbooks" && <RunbooksView />}
            {section === "slos" && <SlosView />}
            {section === "golive" && <GoLiveView />}
            {section === "metrics" && <MetricsView />}
            {section === "team" && <TeamView />}
          </div>
        </main>
      </div>
    </AuditContext.Provider>
  );
}

// ── Shared backoffice primitives ───────────────────────────────────────────
export function Card({ title, sub, children, actions, className }: { title: string; sub?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-white/10 bg-[#0d0d0b]", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <h3 className="font-display text-[13.5px] font-bold text-white">{title}</h3>
          {sub && <p className="mt-0.5 text-[10.5px] text-white/40">{sub}</p>}
        </div>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone = "default", onClick }: { label: string; value: ReactNode; sub?: string; tone?: "default" | "danger" | "ok" | "warn"; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={cx("rounded-xl border border-white/10 bg-[#0d0d0b] px-4 py-3 text-left transition-colors", onClick && "hover:border-white/25")}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className={cx("mt-1 font-display text-[22px] font-bold leading-none", tone === "danger" ? "text-[#f08c8c]" : tone === "ok" ? "text-[#4CC38A]" : tone === "warn" ? "text-[#e2a33c]" : "text-white")}>{value}</p>
      {sub && <p className="mt-1.5 text-[10.5px] text-white/40">{sub}</p>}
    </Comp>
  );
}

export function Pill({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold", ok ? "bg-[#4CC38A]/15 text-[#4CC38A]" : "bg-danger/15 text-[#f08c8c]")}>
      {ok ? <Ic name="check" size={9} sw={2.6} /> : <Ic name="x" size={9} sw={2.6} />}{label ?? (ok ? "ok" : "fail")}
    </span>
  );
}

export function ago(ts: number) { return timeAgo(ts); }
export { Badge, Toggle };
