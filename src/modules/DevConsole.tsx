import { useEffect, useMemo, useRef, useState } from "react";
import { cx, timeAgo, pct } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Toggle } from "../components/ui";
import { NumStepper } from "../components/controls";
import { useApp } from "../store";
import { MODULE_FLAGS, PLATFORM_ENV, type PlatformIntegration } from "../lib/tenants";
import { WORKSPACE } from "../lib/data";

type DevTab = "overview" | "tenants" | "integrations" | "ai" | "platform";

const SECTIONS: { id: DevTab; label: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "tenants", label: "Tenants & features", icon: "users" },
  { id: "integrations", label: "Integrations", icon: "plug" },
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
          {tab === "integrations" && <Integrations />}
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
function Tenants() {
  const { tenants, setTenantFeature, setTenantPlan, setTenantSuspended, impersonate, toast } = useApp();
  const [open, setOpen] = useState<string | null>(tenants[0]?.id ?? null);
  return (
    <div className="space-y-3">
      {tenants.map((t) => {
        const on = Object.values(t.features).filter(Boolean).length;
        return (
          <section key={t.id} className={cx("rounded-xl border bg-[#0a0a09]", t.suspended ? "border-[#5a2020]" : "border-white/10")}>
            <header className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white font-display text-[13px] font-extrabold text-ink">{t.name.slice(0, 1)}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[14px] font-bold text-white">{t.name} {t.suspended && <Badge tone="danger">suspended</Badge>}</p>
                <p className="font-mono text-[10.5px] text-white/40">{t.id} · {t.subdomain}.derzen.site · {t.legal} · since {t.created}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select value={t.plan} onChange={(e) => { setTenantPlan(t.id, e.target.value as never); toast("ok", `${t.name} → ${e.target.value}`, "Metering updates on the next billing tick."); }} aria-label={`Plan for ${t.name}`} className="h-8 rounded-md border border-white/15 bg-[#171714] px-2 font-mono text-[11px] font-bold text-white">
                  <option>Starter</option><option>Scale</option><option>Enterprise</option>
                </select>
                <Btn size="xs" variant={t.suspended ? "solid" : "danger"} icon={t.suspended ? "check" : "lock"} onClick={() => { setTenantSuspended(t.id, !t.suspended); toast(t.suspended ? "ok" : "warn", t.suspended ? `${t.name} reactivated` : `${t.name} suspended`, t.suspended ? undefined : "Sign-in blocked; data retained per retention policy."); }}>{t.suspended ? "Reactivate" : "Suspend"}</Btn>
                <Btn size="xs" icon="arrowR" onClick={() => impersonate(t.id)}>Open workspace</Btn>
                <button aria-label={`Toggle details for ${t.name}`} onClick={() => setOpen(open === t.id ? null : t.id)} className="rounded-md border border-white/15 p-1.5 text-white/60 hover:text-white"><Ic name={open === t.id ? "chevU" : "chevD"} size={13} /></button>
              </div>
            </header>
            <div className="grid grid-cols-4 gap-px border-t border-white/10 bg-white/5 text-center">
              {[
                ["MRR", `$${t.mrr}`], ["Credits", `${t.credits.used.toLocaleString()} / ${t.credits.limit.toLocaleString()}`],
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

// ── Platform & infra ───────────────────────────────────────────────────────
function Platform() {
  const { toast } = useApp();
  const [rls, setRls] = useState<"idle" | "running" | "pass">("idle");
  const [progress, setProgress] = useState(0);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const runSuite = () => {
    setRls("running"); setProgress(0);
    const i = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(i); setRls("pass"); return 100; }
        return p + 7;
      });
    }, 120);
  };
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
        <h2 className="mb-3 font-display text-[15px] font-bold text-white">Infrastructure</h2>
        {[
          ["PostgreSQL (RLS)", "primary + 2 replicas", "healthy", "db-1.internal"],
          ["Redis / BullMQ", "queues + cache", "healthy", "depth 3 · 4 workers"],
          ["S3-compatible storage", "photos · receipts · docs", "healthy", `${WORKSPACE.name} bucket`],
          ["OTel collector", "traces across sync path", "healthy", "p95 calendar 312ms"],
          ["Sync workers", "channel push/pull", "1 degraded", "vrbo worker retrying"],
        ].map(([name, role, state, detail]) => (
          <div key={name} className="mb-2 flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5">
            <Ic name="server" size={14} className={state === "healthy" ? "text-[#4CC38A]" : "text-[#e2a33c]"} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-white/85">{name} <span className="font-normal text-white/40">· {role}</span></p>
              <p className="font-mono text-[10px] text-white/35">{detail}</p>
            </div>
            <span className={cx("rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase", state === "healthy" ? "bg-[#1d3527] text-[#4CC38A]" : "bg-[#3a3320] text-[#e2a33c]")}>{state}</span>
          </div>
        ))}
        <div className="mt-4 rounded-lg border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-bold text-white/85">Cross-tenant isolation suite</p>
            <Btn size="xs" variant="solid" icon="shield" onClick={runSuite} disabled={rls === "running"}>{rls === "running" ? `running ${Math.min(progress, 100)}%` : "Run now"}</Btn>
          </div>
          {rls === "running" && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-bright transition-all" style={{ width: `${progress}%` }} /></div>}
          {rls === "pass" && <p className="anim-pop mt-2 font-mono text-[11px] font-bold text-[#4CC38A]">✓ 214/214 routes — tenant A token cannot read or mutate tenant B. New routes auto-enrolled.</p>}
          {rls === "idle" && <p className="mt-1.5 font-mono text-[10px] text-white/35">asserts read + write isolation for 100% of API routes · last green 4h ago in CI</p>}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
        <h2 className="mb-1 font-display text-[15px] font-bold text-white">Environment & secrets</h2>
        <p className="mb-3 font-mono text-[10px] text-white/35">sourced from the secrets manager · values masked unless revealed · rotate from here, never in files</p>
        <div className="space-y-1.5">
          {PLATFORM_ENV.map((e) => (
            <div key={e.key} className="rounded-md border border-white/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-white/80">{e.key}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  {e.masked && (
                    <button aria-label={`Reveal ${e.key}`} onClick={() => setReveal({ ...reveal, [e.key]: !reveal[e.key] })} className="rounded p-1 text-white/40 hover:text-white"><Ic name="eye" size={12} /></button>
                  )}
                  <button aria-label={`Copy ${e.key}`} onClick={() => { navigator.clipboard?.writeText(e.key).catch(() => undefined); toast("ok", `${e.key} copied`); }} className="rounded p-1 text-white/40 hover:text-white"><Ic name="copy" size={12} /></button>
                </span>
              </div>
              <p className="mt-0.5 truncate font-mono text-[10.5px] text-[#4CC38A]/80">{e.masked && !reveal[e.key] ? e.value : e.value.replace(/•{4,}/g, "demo-value-")} <span className="text-white/25">· {e.note}</span></p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-md border border-white/10 bg-[#171714] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-white/45">
          PII retention: <b className="text-white/70">{PLATFORM_ENV.find((e) => e.key === "PII_RETENTION_DAYS")?.value} days</b> after checkout · guest erase/export workflows per tenant · ID documents field-encrypted · card PANs never stored (gateways tokenise).
        </p>
      </section>
    </div>
  );
}
