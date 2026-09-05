import { useEffect, useMemo, useRef, useState } from "react";
import { cx, timeAgo, pct } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Toggle } from "../components/ui";
import { NumStepper } from "../components/controls";
import { useApp } from "../store";
import { MODULE_FLAGS, type PlatformIntegration } from "../lib/tenants";
import { Platform } from "./DevPlatform";
import {
  addDevMember, listDevMembers, removeDevMember, setDevPassword, type DevMember, type DevRole,
} from "../lib/devTeam";
import { WORKSPACE } from "../lib/data";
import { PROVIDER_META, aiChat, fetchGatewayStatus, type GatewayStatus } from "../lib/aiGateway";

type DevTab = "overview" | "tenants" | "team" | "integrations" | "providers" | "ai" | "platform";

const SECTIONS: { id: DevTab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "tenants", label: "Tenants & features", icon: "users" },
  { id: "team", label: "Team access", icon: "lock" },
  { id: "integrations", label: "Integrations", icon: "plug" },
  { id: "providers", label: "AI providers", icon: "zap" },
  { id: "ai", label: "AI control", icon: "sparkle" },
  { id: "platform", label: "Platform & infra", icon: "server" },
];

export default function DevConsole() {
  const { logout, devIntegrations, tenants } = useApp();
  const [tab, setTab] = useState<DevTab>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const live = devIntegrations.filter((i) => i.status === "live").length;
  const sandbox = devIntegrations.filter((i) => i.status === "sandbox").length;
  const missing = devIntegrations.filter((i) => i.status === "missing").length;

  return (
    <div className="eng flex min-h-screen bg-pine-950 text-white">
      {navOpen && <div className="fixed inset-0 z-[84] bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      {/* Rail */}
      <aside className={cx("fixed inset-y-0 left-0 z-[85] flex h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a09] shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-[218px] lg:translate-x-0 lg:shadow-none", navOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#0E6B4E" /><path d="M10 8h6a8 8 0 0 1 0 16h-6V8z" stroke="#F4F5F0" strokeWidth="2.6" /><path d="M10 8v16" stroke="#8FE3BF" strokeWidth="2.6" /></svg>
          <div>
            <p className="font-display text-[14px] font-extrabold uppercase leading-none tracking-[0.05em]">derzen</p>
            <p className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-brand-bright">dev console</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => { setTab(s.id); setNavOpen(false); }} className={cx("flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[12.5px] font-bold transition-colors", tab === s.id ? "bg-brand text-white" : "text-white/55 hover:bg-white/5 hover:text-white")}>
              <Ic name={s.icon} size={14} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <p className="mb-2 font-mono text-[9.5px] text-white/35">prod · v2.14.0 · 88f21c</p>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-[12px] font-bold text-white/70 transition-colors hover:border-brand hover:text-white">
            <Ic name="logOut" size={13} /> Exit console
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0a09]/90 px-4 py-3.5 backdrop-blur md:px-6">
          <button onClick={() => setNavOpen(true)} aria-label="Open console navigation" className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/15 text-white/70 lg:hidden"><Ic name="menu" size={15} /></button>
          <h1 className="font-display text-[17px] font-extrabold tracking-tight">{SECTIONS.find((s) => s.id === tab)?.label}</h1>
          <div className="ml-auto flex items-center gap-2 font-mono text-[10.5px]">
            <span className="rounded-full bg-[#1d3527] px-2.5 py-1 font-bold text-[#4CC38A]">{live} live</span>
            <span className="rounded-full bg-[#3a3320] px-2.5 py-1 font-bold text-[#e2a33c]">{sandbox} sandbox</span>
            <span className={cx("rounded-full px-2.5 py-1 font-bold", missing ? "bg-[#3d1f1f] text-[#f08c8c]" : "bg-white/5 text-white/40")}>{missing} missing</span>
            <span className="hidden text-white/30 sm:inline">· {tenants.length} tenants · MRR ${tenants.reduce((s, t) => s + t.mrr, 0)}</span>
          </div>
        </header>
        <div className="bp-grid p-6">
          {tab === "overview" && <Overview goto={setTab} />}
          {tab === "tenants" && <Tenants />}
          {tab === "team" && <TeamAccess />}
          {tab === "integrations" && <Integrations />}
          {tab === "providers" && <AiProviders />}
          {tab === "ai" && <AiControl />}
          {tab === "platform" && <Platform />}
        </div>
      </main>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────
const LOG_ROUTES = [
  ["POST", "/v1/calendar/bulk-edit", 214], ["GET", "/v1/inbox?unread=1", 96], ["job", "channel-sync/booking", 1320],
  ["POST", "/v1/messages/send", 178], ["job", "webhook/dispatch", 88], ["GET", "/v1/reports/overview", 642],
  ["job", "automation/check-out-cleaning", 240], ["POST", "/v1/payments/intent", 391], ["job", "ical/poll", 1544],
  ["GET", "/v1/reservations?cursor=c_9f2", 121], ["job", "ai/concierge-draft", 902], ["POST", "/v1/quotes/Q-1201/convert", 268],
];
const LOG_TENANTS = ["t-sanggraha", "t-ambara"];

function Overview({ goto }: { goto: (t: DevTab) => void }) {
  const { tenants, devIntegrations, aiConfig } = useApp();
  const [logs, setLogs] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const seq = useRef(1042);
  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => {
      const [m, r, ms] = LOG_ROUTES[Math.floor(Math.random() * LOG_ROUTES.length)];
      const t = LOG_TENANTS[Math.floor(Math.random() * LOG_TENANTS.length)];
      const lvl = Math.random() > 0.93 ? "warn" : "info";
      seq.current += 1;
      setLogs((ls) => [
        `${new Date().toISOString().slice(11, 19)}Z ${lvl.padEnd(4)} ${t} corr=${(seq.current).toString(16)} ${m} ${r} ${ms}ms`,
        ...ls,
      ].slice(0, 14));
    }, 1500);
    return () => clearInterval(i);
  }, [paused]);

  const alerts = devIntegrations.filter((i) => i.status === "missing").map((i) => `${i.name} credentials missing — playbook §${i.playbookAnchor}`);
  const errConn = ["VRBO · Villa Purnama — AUTH_EXPIRED (retryable)"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Vital label="Tenants" value={String(tenants.length)} sub={`${tenants.filter((t) => t.suspended).length} suspended`} onClick={() => goto("tenants")} />
        <Vital label="MRR" value={`$${tenants.reduce((s, t) => s + t.mrr, 0)}`} sub="+$49 this month" />
        <Vital label="Integrations live" value={`${devIntegrations.filter((i) => i.status === "live").length}/${devIntegrations.length}`} sub="2 in sandbox review" onClick={() => goto("integrations")} warn={devIntegrations.some((i) => i.status === "missing")} />
        <Vital label="AI" value={aiConfig.enabled ? "enabled" : "KILLED"} sub={`${aiConfig.model} · t=${aiConfig.temperature}`} onClick={() => goto("ai")} warn={!aiConfig.enabled} />
        <Vital label="Webhook success 24h" value="99.4%" sub="3 retries, 0 dead-letter" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        {/* Live log stream */}
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className={cx("h-2 w-2 rounded-full", paused ? "bg-white/30" : "bg-[#4CC38A] blink")} />
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/50">structured log stream</h2>
            <button onClick={() => setPaused(!paused)} className="ml-auto rounded border border-white/15 px-2 py-1 font-mono text-[10px] font-bold text-white/60 hover:text-white">{paused ? "resume" : "pause"}</button>
          </header>
          <div className="h-[290px] overflow-hidden p-3 font-mono text-[10.5px] leading-[1.7]">
            {logs.map((l, i) => (
              <p key={`${l}-${i}`} className={cx("anim-rise whitespace-pre-wrap", l.includes("warn") ? "text-[#e2a33c]" : "text-white/55")} style={{ opacity: 1 - i * 0.055 }}>{l}</p>
            ))}
          </div>
        </section>

        {/* Attention queue */}
        <section className="space-y-4">
          <div className="rounded-xl border border-[#5a2020] bg-[#1c0f0f] p-4">
            <h2 className="mb-2 flex items-center gap-2 font-display text-[13px] font-bold text-[#f08c8c]"><Ic name="alertTri" size={14} /> Needs your action</h2>
            {[...errConn, ...alerts].map((a) => (
              <p key={a} className="mb-1.5 flex items-start gap-2 text-[11.5px] leading-snug text-white/70">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-bright dot-pulse" /> {a}
              </p>
            ))}
            <p className="mt-2 border-t border-white/10 pt-2 font-mono text-[10px] text-white/35">alerts fire at: sync gap &gt;2h · push fails &gt;3× · unmapped inbound · endpoint failures</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0a09] p-4">
            <h2 className="mb-2 font-display text-[13px] font-bold text-white/80">Business metrics · today</h2>
            {[
              ["Bookings created", "14"], ["Messages auto-sent", "31"], ["Escalated to humans", "4 (11%)"],
              ["Tasks overdue", "2"], ["Owner statements drafted", "3"],
            ].map(([k, v]) => (
              <p key={k} className="flex justify-between border-b border-white/5 py-1.5 text-[11.5px]"><span className="text-white/50">{k}</span><span className="font-mono font-bold text-white/85">{v}</span></p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Vital({ label, value, sub, warn, onClick }: { label: string; value: string; sub: string; warn?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={cx("rounded-xl border p-4 text-left transition-all", warn ? "border-[#5a2020] bg-[#1c0f0f]" : "border-white/10 bg-[#0a0a09]", onClick && "hover:-translate-y-0.5 hover:border-white/25")}>
      <p className="text-[9.5px] font-bold uppercase tracking-widest text-white/35">{label}</p>
      <p className={cx("mt-1 font-display text-[22px] font-extrabold", warn ? "text-[#f08c8c]" : "text-white")}>{value}</p>
      <p className="mt-0.5 text-[10.5px] text-white/40">{sub}</p>
    </button>
  );
}

// ── Tenants ────────────────────────────────────────────────────────────────
const FREE_PERIODS: { label: string; days: number }[] = [
  { label: "7 days", days: 7 }, { label: "30 days", days: 30 },
  { label: "90 days", days: 90 }, { label: "1 year", days: 365 },
];
const freeDaysLeft = (until?: number) => (until && until > Date.now() ? Math.ceil((until - Date.now()) / 86_400_000) : 0);

function Tenants() {
  const { tenants, setTenantFeature, setTenantPlan, setTenantSuspended, impersonate, toast, grantFreeAccess, revokeFreeAccess } = useApp();
  const [open, setOpen] = useState<string | null>(tenants[0]?.id ?? null);
  const [grantFor, setGrantFor] = useState<string | null>(null);
  const [grantNote, setGrantNote] = useState("");
  return (
    <div className="space-y-3">
      {tenants.map((t) => {
        const on = Object.values(t.features).filter(Boolean).length;
        return (
          <section key={t.id} className={cx("rounded-xl border bg-[#0a0a09]", t.suspended ? "border-[#5a2020]" : "border-white/10")}>
            <header className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white font-display text-[13px] font-extrabold text-ink">{t.name.slice(0, 1)}</span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-white">
                  {t.name}
                  {t.suspended && <Badge tone="danger">suspended</Badge>}
                  {freeDaysLeft(t.freeUntil) > 0 && <Badge tone="brand">free · {freeDaysLeft(t.freeUntil)}d left</Badge>}
                  {!t.isDemo && <Badge tone="mute">customer</Badge>}
                </p>
                <p className="font-mono text-[10.5px] text-white/40">{t.id} · {t.subdomain}.derzen.site · {t.legal} · since {t.created}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select value={t.plan} onChange={(e) => { setTenantPlan(t.id, e.target.value as never); toast("ok", `${t.name} → ${e.target.value}`, "Metering updates on the next billing tick."); }} aria-label={`Plan for ${t.name}`} className="h-8 rounded-md border border-white/15 bg-[#171714] px-2 font-mono text-[11px] font-bold text-white">
                  <option>Starter</option><option>Scale</option><option>Enterprise</option>
                </select>
                <Btn size="xs" variant={t.suspended ? "solid" : "danger"} icon={t.suspended ? "check" : "lock"} onClick={() => { setTenantSuspended(t.id, !t.suspended); toast(t.suspended ? "ok" : "warn", t.suspended ? `${t.name} reactivated` : `${t.name} suspended`, t.suspended ? undefined : "Sign-in blocked; data retained per retention policy."); }}>{t.suspended ? "Reactivate" : "Suspend"}</Btn>
                <Btn size="xs" icon="ticket" onClick={() => { setGrantFor(grantFor === t.id ? null : t.id); setGrantNote(t.freeGrantNote ?? ""); }}>Grant free</Btn>
                <Btn size="xs" icon="arrowR" onClick={() => impersonate(t.id)}>Open workspace</Btn>
                <button aria-label={`Toggle details for ${t.name}`} onClick={() => setOpen(open === t.id ? null : t.id)} className="rounded-md border border-white/15 p-1.5 text-white/60 hover:text-white"><Ic name={open === t.id ? "chevU" : "chevD"} size={13} /></button>
              </div>
            </header>
            {grantFor === t.id && (
              <div className="border-t border-white/10 bg-[#111110] px-4 py-3 anim-rise">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  <Ic name="ticket" size={13} /> Waive billing for a period
                </p>
                {freeDaysLeft(t.freeUntil) > 0 && (
                  <p className="mb-2 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-[12px] text-white/80">
                    Free until <b className="font-mono">{new Date(t.freeUntil ?? 0).toISOString().slice(0, 10)}</b>
                    {t.freeGrantNote ? ` · ${t.freeGrantNote}` : ""}. A new grant extends from that date, it does not replace it.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={grantNote} onChange={(e) => setGrantNote(e.target.value)}
                    placeholder="reason, recorded in the audit trail" aria-label={`Reason for granting free access to ${t.name}`}
                    className="h-9 min-w-[240px] flex-1 rounded-md border border-white/15 bg-[#171714] px-2.5 text-[12.5px] text-white outline-none focus:border-brand"
                  />
                  {FREE_PERIODS.map((f) => (
                    <Btn key={f.days} size="xs" icon="check" onClick={() => { grantFreeAccess(t.id, f.days, grantNote); setGrantFor(null); setGrantNote(""); }}>{f.label}</Btn>
                  ))}
                  {freeDaysLeft(t.freeUntil) > 0 && (
                    <Btn size="xs" variant="danger" icon="x" onClick={() => { revokeFreeAccess(t.id); setGrantFor(null); }}>End grant</Btn>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-px border-t border-white/10 bg-white/5 text-center">
              {[
                ["MRR", freeDaysLeft(t.freeUntil) > 0 ? "waived" : `$${t.mrr}`],
                ["Credits", `${t.credits.used.toLocaleString()} / ${t.credits.limit.toLocaleString()}`],
                ["Storage", `${t.storageMB} MB`], ["Modules on", `${on}/${MODULE_FLAGS.length}`],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#0a0a09] px-2 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{k}</p>
                  <p className="font-mono text-[12px] font-bold text-white/85">{v}</p>
                </div>
              ))}
            </div>
            {open === t.id && (
              <div className="border-t border-white/10 p-4 anim-rise">
                <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  <Ic name="toggle" size={13} /> Feature availability — flips instantly in this tenant's navigation
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3">
                  {MODULE_FLAGS.map((m) => (
                    <label key={m.key} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                      <span className="text-[12px] font-semibold text-white/75">{m.label}</span>
                      <Toggle checked={t.features[m.key] !== false} onChange={(v) => { setTenantFeature(t.id, m.key, v); toast("info", `${m.label} ${v ? "enabled" : "disabled"}`, `for ${t.name}`); }} label={`${m.label} for ${t.name}`} />
                    </label>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[10px] text-white/30">Enforced server-side per route; disabled modules return 402 PLAN_LIMIT and the tenant sees an upgrade screen — try it: turn one off, then impersonate.</p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ── Integrations ───────────────────────────────────────────────────────────
function Integrations() {
  const { devIntegrations, checking, checkIntegration, setIntegration, toast } = useApp();
  const [cat, setCat] = useState("all");
  const cats = ["all", "channels", "payments", "messaging", "identity", "backoffice"];
  const list = devIntegrations.filter((i) => cat === "all" || i.category === cat);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cx("rounded-md px-3 py-1.5 text-[11.5px] font-bold capitalize", cat === c ? "bg-brand text-white" : "bg-white/5 text-white/50 hover:text-white")}>{c}</button>
        ))}
        <p className="ml-auto font-mono text-[10.5px] text-white/35">status here = what tenants can actually use · see INTEGRATIONS_PLAYBOOK.md for how each was obtained</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {list.map((i) => <IntegrationCard key={i.id} i={i} busy={checking.includes(i.id)} onCheck={() => checkIntegration(i.id)} onPatch={(p) => setIntegration(i.id, p)} toast={toast} />)}
      </div>
    </div>
  );
}

function IntegrationCard({ i, busy, onCheck, onPatch, toast }: { i: PlatformIntegration; busy: boolean; onCheck: () => void; onPatch: (p: Partial<PlatformIntegration>) => void; toast: ReturnType<typeof useApp.getState>["toast"] }) {
  return (
    <article className={cx("rounded-xl border bg-[#0a0a09] p-4 transition-colors", i.status === "live" ? "border-white/12" : i.status === "sandbox" ? "border-[#4a3d1e]" : "border-[#5a2020]")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-white">
            {i.name}
            <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase", i.status === "live" ? "bg-[#1d3527] text-[#4CC38A]" : i.status === "sandbox" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#3d1f1f] text-[#f08c8c]")}>{i.status}</span>
          </p>
          <p className="mt-0.5 text-[11px] text-white/40">{i.category} · {i.auth} · API {i.version}</p>
        </div>
        <Dot tone={i.status === "live" ? "ok" : i.status === "sandbox" ? "warn" : "danger"} label={i.status} />
      </div>
      <div className="mt-2.5 space-y-1">
        {i.envKeys.length === 0 ? (
          <p className="font-mono text-[10.5px] text-white/35">no credentials required</p>
        ) : i.envKeys.map((k) => (
          <p key={k} className="flex items-center gap-2 font-mono text-[10.5px]">
            <Ic name={i.credentials ? "key" : "alertTri"} size={11} className={i.credentials ? "text-[#4CC38A]" : "text-[#f08c8c]"} />
            <span className="text-white/60">{k}</span>
            <span className={cx("ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", i.credentials ? "bg-[#1d3527] text-[#4CC38A]" : "bg-[#3d1f1f] text-[#f08c8c]")}>{i.credentials ? "configured" : "missing"}</span>
          </p>
        ))}
      </div>
      {i.lastCheck && (
        <p className={cx("mt-2 rounded-md px-2.5 py-1.5 font-mono text-[10.5px]", i.lastCheck.ok ? "bg-[#12251b] text-[#4CC38A]" : "bg-[#2a1212] text-[#f08c8c]")}>
          {i.lastCheck.ok ? `health ${i.lastCheck.ms}ms · signed round-trip OK · ${timeAgo(i.lastCheck.ts)}` : `unreachable · credentials missing · ${timeAgo(i.lastCheck.ts)}`}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <Btn size="xs" variant="ghost" icon={busy ? "refresh" : "pulse"} onClick={onCheck} disabled={busy} className="text-white/70">{busy ? "checking…" : "Health check"}</Btn>
        {i.status !== "missing" && (
          <button onClick={() => { const next = i.status === "live" ? "sandbox" : "live"; onPatch({ status: next }); toast(next === "live" ? "ok" : "warn", `${i.name} → ${next}`, next === "live" ? "Tenants can now connect and sync." : "Tenant connections paused; queues draining."); }} className={cx("rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold", i.status === "live" ? "border-[#4a3d1e] text-[#e2a33c] hover:bg-[#3a3320]" : "border-[#1d3527] text-[#4CC38A] hover:bg-[#1d3527]")}>
            {i.status === "live" ? "demote → sandbox" : "promote → live"}
          </button>
        )}
        {i.status === "missing" && (
          <button onClick={() => { onPatch({ status: "sandbox", credentials: true }); toast("ok", `${i.name} provisioned`, "Sandbox credentials imported from the secrets manager."); }} className="rounded-md border border-[#1d3527] px-2.5 py-1 font-mono text-[10px] font-bold text-[#4CC38A] hover:bg-[#1d3527]">
            import sandbox creds
          </button>
        )}
        <span className="ml-auto font-mono text-[9.5px] text-white/30">playbook §{i.playbookAnchor}</span>
      </div>
    </article>
  );
}

// ── AI gateway ───────────────────────────────────────────────
// Read-only, and measured on this deployment. What stood here was a form for
// typing provider keys into this browser, above a line claiming that requests
// and latency were real and nothing was mocked. Both stopped being true when
// the keys moved into ai-proxy: the form wrote to localStorage that nothing
// reads any more, and the chain it drew was not the chain the function walks.
// The status op answers for the live deployment instead, and it generates no
// completion, so reading this screen costs no tokens and writes no ledger row.
function AiProviders() {
  const { toast } = useApp();
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [probe, setProbe] = useState<null | { provider: string; model: string; ms: number; chain: string[] }>(null);
  const [probing, setProbing] = useState(false);

  const load = async () => {
    setBusy(true);
    setErr(null);
    try {
      setStatus(await fetchGatewayStatus());
    } catch (e) {
      setStatus(null);
      setErr(e instanceof Error ? e.message : "the gateway did not answer");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The one place a completion is spent on purpose, so the ledger row it
  // writes is labelled as a console probe rather than an app draft.
  const runProbe = async () => {
    setProbing(true);
    setProbe(null);
    try {
      const res = await aiChat("You are a connectivity probe. Reply with exactly: pong", "ping", { maxTokens: 8 });
      setProbe({ provider: String(res.provider), model: res.model, ms: res.ms, chain: res.chain });
      toast("ok", `${res.provider} answered in ${res.ms} ms`, res.model);
    } catch (e) {
      toast("err", "The gateway did not answer", e instanceof Error ? e.message : undefined);
    } finally {
      setProbing(false);
    }
  };

  const STATE_TONE: Record<string, string> = {
    ready: "text-[#4CC38A]",
    "no-key": "text-white/40",
    "held-back": "text-white/40",
    "no-free-models": "text-[#e2a33c]",
    throttled: "text-[#e2a33c]",
    "key-rejected": "text-[#f08c8c]",
    "list-failed": "text-[#f08c8c]",
  };

  return (
    <div className="space-y-5">
      <section className="reg-marks relative overflow-hidden rounded-xl border border-white/10 bg-[#0a0a09] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-brand-bright">Inference routing, resolved inside ai-proxy</p>
            <h2 className="mt-0.5 font-display text-[20px] font-extrabold uppercase tracking-tight text-white">
              {status ? status.chain.map((p) => PROVIDER_META[p].name).join(" then ") : busy ? "asking the deployment" : "chain unknown"}
            </h2>
          </div>
          <div className="flex items-center gap-2.5">
            <Btn size="sm" icon="refresh" onClick={() => void load()} disabled={busy}>{busy ? "reading" : "Re-read"}</Btn>
            <Btn size="sm" variant="solid" icon="play" onClick={() => void runProbe()} disabled={probing || !status}>
              {probing ? "probing" : "Send one prompt"}
            </Btn>
          </div>
        </div>
        {err && <p className="mt-3 rounded-sm border border-[#f08c8c]/40 bg-[#f08c8c]/10 px-3.5 py-2.5 font-mono text-[11px] text-[#f08c8c]">{err}</p>}
        {probe && (
          <p className="anim-rise mt-3 rounded-sm border border-[#4CC38A]/40 bg-[#4CC38A]/10 px-3.5 py-2.5 font-mono text-[11px] text-[#4CC38A]">
            answered by {probe.provider} · {probe.model} · {probe.ms} ms
            {probe.chain.length > 0 && <span className="mt-0.5 block text-white/50">skipped: {probe.chain.join(" · ")}</span>}
          </p>
        )}
      </section>

      <div className="space-y-3">
        {(status?.providers ?? []).map((p) => (
          <section key={p.provider} className="rounded-xl border border-white/10 bg-[#0a0a09] p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex w-[150px] shrink-0 flex-col">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-brand-bright">{PROVIDER_META[p.provider].role}</span>
                <span className="font-display text-[16px] font-extrabold uppercase tracking-tight text-white">{PROVIDER_META[p.provider].name}</span>
                <span className={cx("mt-0.5 font-mono text-[9.5px] font-bold", STATE_TONE[p.state] ?? "text-white/40")}>{p.state}{p.status ? ` · HTTP ${p.status}` : ""}</span>
              </div>
              <div className="min-w-[200px] flex-1">
                <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">Secret</span>
                <p className="font-mono text-[11.5px] text-white/75">{p.secret}{p.override ? ` · override ${p.override}` : ""}</p>
              </div>
              <div className="min-w-[220px] flex-[2]">
                <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">Free models serving now{p.models > 0 ? ` · ${p.models}` : ""}</span>
                <p className="truncate font-mono text-[10.5px] text-white/60">{p.candidates.length ? p.candidates.join(", ") : "none listed"}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-white/35">{p.ms} ms</span>
            </div>
          </section>
        ))}
        {!busy && status !== null && status.providers.length === 0 && (
          <p className="rounded-sm border border-dashed border-white/15 px-3.5 py-2.5 font-mono text-[10px] text-white/40">The function reported no providers at all.</p>
        )}
      </div>

      {status && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <p className="rounded-sm border border-dashed border-white/15 px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-white/45">
            Caps: signed in, {status.caps.trusted.maxTokens.toLocaleString()} tokens and {status.caps.trusted.promptChars.toLocaleString()} prompt characters. Visitor, {status.caps.untrusted.maxTokens} and {status.caps.untrusted.promptChars.toLocaleString()}. Model lists cached {Math.round(status.modelTtlMs / 60000)} minutes, {status.maxCandidates} candidates tried per provider.
          </p>
          <p className="rounded-sm border border-dashed border-white/15 px-3.5 py-2.5 font-mono text-[10px] leading-relaxed text-white/45">
            Visitor limits: {status.limits.anonPerWindow} per {status.limits.anonWindowMinutes} minutes, {status.limits.anonPerDay} per day per address, {status.limits.anonGlobalPerDay} per day across the endpoint. Signed-in daily ceiling {status.limits.trustedDailyTokens.toLocaleString()} tokens. Anthropic {status.anthropicEnabled ? "is in the chain" : "is held back until ENABLE_ANTHROPIC is set"}.
          </p>
        </div>
      )}
    </div>
  );
}

// ── AI control ─────────────────────────────────────────────────────────────
function AiControl() {
  const { aiConfig, setAiConfig, tenants, toast } = useApp();
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold text-white">Concierge engine</h2>
          <label className="flex items-center gap-2.5">
            <span className={cx("font-mono text-[10px] font-bold uppercase", aiConfig.enabled ? "text-[#4CC38A]" : "text-[#f08c8c]")}>{aiConfig.enabled ? "serving" : "kill switch on"}</span>
            <Toggle checked={aiConfig.enabled} onChange={(v) => { setAiConfig({ enabled: v }); toast(v ? "ok" : "warn", v ? "AI re-enabled" : "AI KILL SWITCH ENGAGED", v ? undefined : "All drafts pause; inbox falls back to manual. Tenants see a notice."); }} label="AI kill switch" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-white/35">model</span>
            <select value={aiConfig.model} onChange={(e) => { setAiConfig({ model: e.target.value }); toast("ok", `Model → ${e.target.value}`, "Prompt template pinned to v14."); }} className="h-9 w-full rounded-md border border-white/15 bg-[#171714] px-2 font-mono text-[12px] text-white">
              <option>concierge-v2</option><option>concierge-v1</option><option>generic-llm-a</option>
            </select>
          </label>
          <div>
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-white/35">temperature</span>
            <NumStepper value={aiConfig.temperature} onChange={(v) => setAiConfig({ temperature: Math.round(v * 100) / 100 })} min={0} max={1} step={0.05} w={110} label="Model temperature" allowNegative={false} />
          </div>
        </div>
        <p className="mt-4 mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white/35">guardrails — correctness over automation</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {([
            ["citationRequired", "Every answer cites retrieved sources"],
            ["paymentEscalation", "Payment topics always escalate"],
            ["complaintEscalation", "Complaints / negative sentiment escalate"],
            ["piiRedaction", "Redact PII from prompt payloads"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2.5">
              <span className="text-[12px] font-semibold text-white/75">{label}</span>
              <Toggle checked={aiConfig.guardrails[k]} onChange={(v) => { setAiConfig({ guardrails: { ...aiConfig.guardrails, [k]: v } }); toast("info", `Guardrail ${v ? "on" : "off"}`, label); }} label={label} />
            </label>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/30">prompt version pinned at {aiConfig.promptVersion} · every auto-send logs model + prompt version + cited sources · autopilot floor {aiConfig.autopilotMinDelaySec}s</p>
      </section>
      <div className="space-y-4">
        <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
          <h2 className="mb-3 font-display text-[15px] font-bold text-white">Guardrail evals · last CI run</h2>
          {aiConfig.evals.map((e) => (
            <div key={e.name} className="mb-2 flex items-center gap-3 rounded-md border border-white/10 px-3 py-2">
              <Ic name="check" size={13} className="text-[#4CC38A]" sw={2.6} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-white/80">{e.name}</p>
                {e.note && <p className="text-[10px] text-white/35">{e.note}</p>}
              </div>
              <span className="font-mono text-[11px] font-bold text-[#4CC38A]">{e.pass}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
          <h2 className="mb-3 font-display text-[15px] font-bold text-white">Credit metering</h2>
          {tenants.map((t) => {
            const p = t.credits.used / t.credits.limit;
            return (
              <div key={t.id} className="mb-3">
                <p className="mb-1 flex justify-between text-[11.5px]"><span className="font-bold text-white/75">{t.name}</span><span className="font-mono text-white/45">{t.credits.used.toLocaleString()} / {t.credits.limit.toLocaleString()}</span></p>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className={cx("h-full rounded-full", p > 0.85 ? "bg-brand-bright" : "bg-[#4CC38A]")} style={{ width: pct(p) }} />
                </div>
              </div>
            );
          })}
          <p className="font-mono text-[10px] text-white/30">hard limit at 100% → concierge pauses to suggestions-only · overages billed per plan</p>
        </section>
      </div>
    </div>
  );
}


// ── Team access ────────────────────────────────────────────────────────────
// Seats for the developer consoles. The registry is per-device (see the note
// in lib/devTeam.ts); this screen manages it, it does not secure it.
function TeamAccess() {
  const { session, toast, audit } = useApp();
  const meId = session?.kind === "developer" ? session.devMemberId : undefined;
  const isOwner = session?.kind === "developer" && session.devRole === "owner";
  const [members, setMembers] = useState<DevMember[]>(() => listDevMembers());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", pw: "", role: "admin" as DevRole });
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => setMembers(listDevMembers());

  const submitAdd = async () => {
    setErr(null);
    const res = await addDevMember(form);
    if (!res.ok) { setErr(res.error ?? "Could not add that member."); return; }
    refresh(); setAdding(false); setForm({ email: "", name: "", pw: "", role: "admin" });
    audit(`Developer seat added: ${res.member?.email} (${res.member?.role})`, "ui");
    toast("ok", `${res.member?.email} can sign in`, "Share the password over a channel you trust, then have them change it.");
  };

  const submitPw = async (id: string) => {
    setErr(null);
    const res = await setDevPassword(id, pwValue);
    if (!res.ok) { setErr(res.error ?? "Could not change that password."); return; }
    const who = members.find((m) => m.id === id)?.email ?? id;
    refresh(); setPwFor(null); setPwValue("");
    audit(`Developer password changed for ${who}`, "ui");
    toast("ok", "Password changed", id === meId ? "Your next sign-in uses the new password." : `${who} must use the new password.`);
  };

  const submitRemove = (id: string) => {
    const who = members.find((m) => m.id === id)?.email ?? id;
    const res = removeDevMember(id);
    if (!res.ok) { setErr(res.error ?? "Could not remove that member."); setConfirmRemove(null); return; }
    refresh(); setConfirmRemove(null);
    audit(`Developer seat removed: ${who}`, "ui");
    toast("warn", `${who} removed`, "Their next sign-in attempt is rejected. Any live session ends on reload.");
  };

  const field = "h-9 w-full rounded-md border border-white/15 bg-[#171714] px-2.5 text-[12.5px] text-white outline-none focus:border-brand";

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[15px] font-bold text-white">Team access</h2>
            <p className="mt-0.5 font-mono text-[10px] text-white/35">
              {members.length} seat{members.length === 1 ? "" : "s"} · passwords stored as SHA-256 digests · never shown after they are set
            </p>
          </div>
          {isOwner && <Btn size="xs" icon="plus" className="ml-auto" onClick={() => { setAdding(!adding); setErr(null); }}>{adding ? "Cancel" : "Add member"}</Btn>}
        </div>

        

        {err && <p role="alert" className="mt-3 rounded-md border border-[#5a2020] bg-[#2a1414] px-3 py-2 text-[12px] font-semibold text-[#E88] anim-pop">{err}</p>}

        {adding && (
          <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-[#111110] p-3 md:grid-cols-[1.3fr_1fr_1fr_auto_auto]">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="email" aria-label="Member email" className={field} />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="name (optional)" aria-label="Member name" className={field} />
            <input value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} type="password" placeholder="10+ characters" aria-label="Member password" className={field} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as DevRole })} aria-label="Member role" className={cx(field, "w-auto font-mono text-[11px] font-bold")}>
              <option value="admin">admin</option><option value="owner">owner</option>
            </select>
            <Btn size="xs" icon="check" onClick={submitAdd}>Create seat</Btn>
          </div>
        )}

        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li key={m.id} className="rounded-lg border border-white/10 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 font-display text-[12px] font-extrabold text-white">{m.email.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] font-bold text-white">
                    {m.name || m.email.split("@")[0]}
                    <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role}</Badge>
                    {m.id === meId && <Badge tone="brand">you</Badge>}
                  </p>
                  <p className="font-mono text-[10.5px] text-white/40">
                    {m.email} · added {new Date(m.createdAt).toISOString().slice(0, 10)}
                    {m.lastLogin ? ` · last sign-in ${timeAgo(m.lastLogin)}` : " · never signed in"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {(isOwner || m.id === meId) && (
                    <Btn size="xs" icon="key" onClick={() => { setPwFor(pwFor === m.id ? null : m.id); setPwValue(""); setErr(null); }}>Change password</Btn>
                  )}
                  {isOwner && m.id !== meId && (
                    <Btn size="xs" variant="danger" icon="trash" onClick={() => { setConfirmRemove(m.id); setErr(null); }}>Remove</Btn>
                  )}
                </div>
              </div>

              {pwFor === m.id && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
                  <input value={pwValue} onChange={(e) => setPwValue(e.target.value)} type="password" placeholder="new password, 10+ characters" aria-label={`New password for ${m.email}`} className={cx(field, "max-w-[300px]")} />
                  <Btn size="xs" icon="check" onClick={() => submitPw(m.id)}>Save</Btn>
                  <Btn size="xs" variant="ghost" onClick={() => { setPwFor(null); setPwValue(""); }}>Cancel</Btn>
                </div>
              )}

              {confirmRemove === m.id && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-[#5a2020] pt-2.5">
                  <span className="text-[12px] text-white/70">Remove {m.email}? They lose console access immediately.</span>
                  <Btn size="xs" variant="danger" icon="trash" onClick={() => submitRemove(m.id)}>Confirm remove</Btn>
                  <Btn size="xs" variant="ghost" onClick={() => setConfirmRemove(null)}>Keep</Btn>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
