import { useState } from "react";
import { cx } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { useApp } from "../store";
import { TENANTS } from "../lib/tenants";
import {
  AnnouncementsPanel, AiPlatformPanel, BillingPanel, ChannelPlatform, EntitlementsPanel, Inspector,
  LifecyclePanel, MessagingPanel, OpsQueues, TenantDetail,
} from "./DevPlatform";

type BTab = "ops" | "tenants" | "inspector" | "lifecycle" | "billing" | "entitlements" | "channels" | "messaging" | "ai" | "announcements";

const TABS: { id: BTab; label: string; icon: IconName }[] = [
  { id: "ops", label: "Ops queues", icon: "alertTri" },
  { id: "tenants", label: "Tenant directory", icon: "users" },
  { id: "inspector", label: "Entity inspector", icon: "eye" },
  { id: "lifecycle", label: "Lifecycle", icon: "refresh" },
  { id: "billing", label: "Commercials", icon: "card" },
  { id: "entitlements", label: "Entitlements & flags", icon: "toggle" },
  { id: "channels", label: "Integration platform", icon: "plug" },
  { id: "messaging", label: "Messaging infra", icon: "chat" },
  { id: "ai", label: "AI platform", icon: "sparkle" },
  { id: "announcements", label: "Announcements", icon: "bell" },
];

export default function DevBackoffice() {
  const { navigate } = useApp();
  const [tab, setTab] = useState<BTab>("ops");
  const [navOpen, setNavOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = TENANTS.filter((t) => !q.trim() || t.name.toLowerCase().includes(q.toLowerCase()) || t.email.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="eng flex min-h-screen bg-pine-950 text-white">
      {navOpen && <div className="fixed inset-0 z-[84] bg-black/55 backdrop-blur-[2px] lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <aside className={cx("fixed inset-y-0 left-0 z-[85] flex h-screen w-[248px] shrink-0 flex-col border-r border-white/10 bg-[#0a0a09] shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-[228px] lg:translate-x-0 lg:shadow-none", navOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="border-b border-white/10 px-4 py-4">
          <p className="font-display text-[14px] font-extrabold leading-none">operations backoffice</p>
          <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-brand-bright">admin.derzen.internal · SSO + device trust</p>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {TABS.map((s) => (
            <button key={s.id} onClick={() => { setTab(s.id); setTenantId(null); setNavOpen(false); }} className={cx("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[12px] font-bold transition-colors", tab === s.id ? "bg-brand text-white" : "text-white/55 hover:bg-white/5 hover:text-white")}>
              <Ic name={s.icon} size={13} /> {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <button onClick={() => navigate("/dev")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-bold text-white/60 hover:bg-white/5 hover:text-white"><Ic name="chevL" size={12} /> Developer console</button>
          <button onClick={() => navigate("/dev/substrate")} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] font-bold text-white/60 hover:bg-white/5 hover:text-white"><Ic name="server" size={12} /> Platform substrate →</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0a0a09]/90 px-4 py-3.5 backdrop-blur md:px-6">
          <button onClick={() => setNavOpen(true)} aria-label="Open backoffice navigation" className="flex h-8 w-8 items-center justify-center rounded-sm border border-white/15 text-white/70 lg:hidden"><Ic name="menu" size={15} /></button>
          <h1 className="font-display text-[17px] font-extrabold tracking-tight">{TABS.find((t) => t.id === tab)?.label}</h1>
          <p className="hidden font-mono text-[10px] text-white/30 sm:block">separate deploy · separate auth · separate audit stream — never a hidden tenant route</p>
          <span className="ml-auto rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold text-white/50">session: mira.k@ · support · MFA ✓</span>
        </header>

        <div className="space-y-4 p-6">
          {tab === "ops" && <OpsQueues onInspect={() => setTab("inspector")} />}
          {tab === "tenants" && (
            tenantId ? <TenantDetail tenantId={tenantId} onBack={() => setTenantId(null)} /> : (
              <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
                <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
                  <h2 className="font-display text-[14px] font-bold">Every workspace</h2>
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, owner email…" aria-label="Search tenants" className="ml-auto h-8 w-[240px] rounded-md border border-white/15 bg-[#171714] px-3 text-[12px] text-white placeholder:text-white/30 outline-none focus:border-brand" />
                </header>
                <div className="divide-y divide-white/5">
                  {list.map((t) => (
                    <button key={t.id} onClick={() => setTenantId(t.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white font-display text-[13px] font-extrabold text-ink">{t.name.slice(0, 1)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[13px] font-bold text-white">{t.name} {t.suspended && <span className="rounded bg-[#3d1f1f] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#f08c8c]">SUSPENDED</span>}</span>
                        <span className="block truncate text-[10.5px] text-white/40">{t.email} · {t.subdomain}.derzen.site · since {t.created}</span>
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10.5px] font-bold text-white/60">{t.plan}</span>
                      <span className="font-mono text-[12px] font-bold text-[#4CC38A]">${t.mrr}</span>
                      <Ic name="chevR" size={14} className="text-white/30" />
                    </button>
                  ))}
                </div>
              </section>
            )
          )}
          {tab === "inspector" && <Inspector />}
          {tab === "lifecycle" && <LifecyclePanel />}
          {tab === "billing" && <BillingPanel />}
          {tab === "entitlements" && <EntitlementsPanel />}
          {tab === "channels" && <ChannelPlatform />}
          {tab === "messaging" && <MessagingPanel />}
          {tab === "ai" && <AiPlatformPanel />}
          {tab === "announcements" && <AnnouncementsPanel />}
        </div>
      </main>
    </div>
  );
}
