import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cx, timeAgo, addDays, dayKey, today, fmtShort } from "../lib/format";
import { fxInfo } from "../lib/fx";
import { Ic, type IconName } from "./icons";
import { CommandPalette } from "./CommandPalette";
import { Avatar, Badge, Btn, IconBtn, Kbd, Modal, Ring, Toggle } from "./ui";
import { useApp, useOverdue, useSyncAlerts, useUnreadTotal, nightsInRange, arrivalsOn } from "../store";
import { channelDef, MEMBERS, MONTHLY, propertyById, WORKSPACE, RESERVATIONS } from "../lib/data";
import type { Property } from "../lib/types";

// ── Nav model ──────────────────────────────────────────────────────────────
const NAV: { group: string; items: { path: string; icon: IconName; label: string }[] }[] = [
  {
    group: "nav.operate",
    items: [
      { path: "dashboard", icon: "grid", label: "nav.dashboard" },
      { path: "calendar", icon: "calendar", label: "nav.calendar" },
      { path: "inbox", icon: "inbox", label: "nav.inbox" },
      { path: "reservations", icon: "ticket", label: "nav.reservations" },
      { path: "ops", icon: "wrench", label: "nav.ops" },
      { path: "sync", icon: "refresh", label: "nav.sync" },
    ],
  },
  {
    group: "nav.sell",
    items: [
      { path: "listings", icon: "home", label: "nav.listings" },
      { path: "channels", icon: "plug", label: "nav.channels" },
      { path: "websites", icon: "globe", label: "nav.websites" },
      { path: "styling", icon: "palette", label: "nav.styling" },
      { path: "quotes", icon: "doc", label: "nav.quotes" },
      { path: "guidebooks", icon: "book", label: "nav.guidebooks" },
    ],
  },
  {
    group: "nav.engage",
    items: [
      { path: "concierge", icon: "sparkle", label: "nav.concierge" },
      { path: "reviews", icon: "star", label: "nav.reviews" },
      { path: "customers", icon: "users", label: "nav.customers" },
    ],
  },
  {
    group: "nav.business",
    items: [
      { path: "reports", icon: "chart", label: "nav.reports" },
      { path: "integrations", icon: "bolt", label: "nav.integrations" },
      { path: "settings", icon: "gear", label: "nav.settings" },
    ],
  },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { route, navigate, t, chatOpen, setChatOpen, featureOn, logout, session, tenants } = useApp();
  const unread = useUnreadTotal();
  const syncAlerts = useSyncAlerts();
  const overdue = useOverdue();
  const active = route.path[0] ?? "dashboard";
  const reviews = useApp((s) => s.reviews);
  const needsReply = reviews.filter((r) => !r.reply && r.replyDeadline && r.replyDeadline > Date.now()).length;
  const tenant = session?.kind === "tenant" ? tenants.find((x) => x.id === session.tenantId) : null;

  const badge = (path: string) =>
    path === "inbox" ? unread : path === "sync" ? syncAlerts : path === "ops" ? overdue : path === "reviews" ? needsReply : 0;

  return (
    <nav
      className={cx(
        "fixed inset-y-0 left-0 z-[72] flex h-full w-[240px] shrink-0 flex-col border-r border-line bg-card text-ink shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:w-[220px] lg:translate-x-0 lg:shadow-none",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      aria-label="Primary"
    >
      <button onClick={() => { onClose(); navigate("/dashboard"); }} className="flex items-center gap-2.5 px-4 pb-5 pt-6 text-left">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand shadow-[0_0_0_3px_rgba(14,107,78,0.2)]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.5 5.5h4.5a6.5 6.5 0 0 1 0 13H7.5V5.5z" stroke="#fff" strokeWidth="2.4" />
            <path d="M7.5 5.5v13" stroke="#8FE3BF" strokeWidth="2.4" />
          </svg>
        </span>
        <span>
          <span className="block font-display text-[17px] font-bold uppercase leading-none tracking-[0.04em] text-ink">Derzen</span>
          <span className="block text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">Hospitality OS</span>
        </span>
      </button>

      {session?.kind === "tenant" && session.impersonated && (
        <div className="mx-3 mb-3 rounded-sm border border-brand/40 bg-brand-soft/60 p-2.5 anim-pop">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-deep">
            <Ic name="code" size={11} /> Impersonating tenant
          </p>
          <button
            onClick={() => { onClose(); navigate("/dev"); }}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-sm btn-grad py-1.5 text-[11px] font-bold text-white"
          >
            <Ic name="chevL" size={12} /> Back to console (re-auth)
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {NAV.map((g) => {
          const items = g.items.filter((it) => featureOn(it.path));
          if (!items.length) return null;
          return (
            <div key={g.group} className="mt-3">
              <p className="px-2 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">{t(g.group)}</p>
              {items.map((it) => {
                const isActive = active === it.path;
                const b = badge(it.path);
                return (
                  <button
                    key={it.path}
                    onClick={() => { onClose(); navigate(`/${it.path}`); }}
                    aria-current={isActive ? "page" : undefined}
                    className={cx(
                      "group mb-0.5 flex w-full items-center gap-2.5 rounded-sm px-2 py-[8px] text-left text-[12.5px] font-semibold transition-all duration-150",
                      isActive ? "bg-brand-soft text-brand-deep shadow-[inset_2px_0_0_#0E6B4E]" : "text-mute hover:bg-paper hover:text-ink",
                    )}
                  >
                    <Ic name={it.icon} size={15} className={isActive ? "text-brand" : "text-faint group-hover:text-mute"} />
                    <span className="flex-1">{t(it.label)}</span>
                    {b > 0 && (
                      <span className={cx("rounded-full px-1.5 py-px font-mono text-[10px] font-bold", it.path === "sync" ? "bg-danger text-white" : "bg-brand text-white")}>{b}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="border-t border-line p-3">
        <button onClick={() => setChatOpen(!chatOpen)} className="mb-2 flex w-full items-center gap-2 rounded-sm bg-paper px-2.5 py-2 text-left text-[12px] font-semibold text-ink transition-colors hover:bg-line/50">
          <Ic name="chat" size={14} className="text-brand" />
          Team chat
          <span className="ml-auto rounded-full bg-brand px-1.5 font-mono text-[10px] font-bold text-white">3</span>
        </button>
        <div className="flex items-center gap-2.5 rounded-sm px-1.5 py-1">
          <Avatar name={tenant ? tenant.name : "Operator"} size={30} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-ink">{tenant ? tenant.name : WORKSPACE.name}</p>
            <p className="text-[10px] text-faint">{tenant ? `${tenant.plan} plan · ${tenant.currency}` : "workspace"}{session?.kind === "tenant" && session.impersonated && " · impersonated"}</p>
          </div>
          <button onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-sm p-1.5 text-faint transition-colors hover:bg-paper hover:text-danger">
            <Ic name="logOut" size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}

function Topbar({ title, sub, onMenu, onPalette }: { title: string; sub?: string; onMenu: () => void; onPalette: () => void }) {
  const { route, navigate, t, chatOpen, setChatOpen, copilotOpen, setCopilotOpen, displayCurrency, setWorkspaceCurrency, refreshRates, fxTick, session, tenants, logout, toast, theme, setTheme } = useApp();
  const syncAlerts = useSyncAlerts();
  const creditsUsed = useApp((s) => s.creditsUsed);
  const locale = route.locale;
  void fxTick;
  const fx = fxInfo();
  const impersonated = session?.kind === "tenant" && session.impersonated;
  const tenantName = session?.kind === "tenant" ? tenants.find((x) => x.id === session.tenantId)?.name : null;

  return (
    <>
    {impersonated && (
      <div className="flex shrink-0 items-center gap-3 border-b border-brand/40 bg-brand-soft px-4 py-1.5">
        <Ic name="eye" size={13} className="text-brand-deep" />
        <p className="text-[11.5px] font-bold text-brand-deep">Impersonating {tenantName}. Every action is logged to the audit trail as a developer session.</p>
        <button onClick={() => { logout(); }} className="ml-auto rounded-md bg-brand px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-deep">Return to console</button>
      </div>
    )}
    <header className="ticks relative flex h-[58px] shrink-0 items-center gap-3 bg-card/85 px-4 backdrop-blur md:px-6">
      <button onClick={onMenu} aria-label="Open navigation" className="flex h-8 w-8 items-center justify-center rounded-sm text-mute transition-colors hover:bg-paper hover:text-ink lg:hidden">
        <Ic name="menu" size={17} />
      </button>
      <div className="min-w-0">
        <h1 className="truncate font-display text-[15.5px] font-bold leading-tight text-ink">{title}</h1>
        {sub && <p className="truncate text-[10.5px] text-mute">{sub}</p>}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={onPalette}
          className="hidden items-center gap-2 rounded-md border border-line bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-faint transition-colors hover:border-brand hover:text-brand-deep md:flex"
          aria-label="Open command palette"
          title="Jump to any tool, property or booking (Ctrl/Cmd+K)"
        >
          <Ic name="search" size={13} />
          <span className="max-w-[150px] truncate">Search anything…</span>
          <kbd className="hidden lg:inline">⌘K</kbd>
        </button>
        <button
          onClick={onPalette}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-card text-mute transition-colors hover:border-brand hover:text-brand-deep md:hidden"
          aria-label="Open command palette"
        >
          <Ic name="search" size={15} />
        </button>
        <button
          onClick={() => navigate("/sync")}
          className={cx(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-bold transition-colors",
            syncAlerts > 0 ? "border-danger/40 bg-danger-soft text-danger hover:bg-danger/15" : "border-line bg-card text-mute hover:text-ink",
          )}
        >
          <span className={cx("h-1.5 w-1.5 rounded-full", syncAlerts > 0 ? "bg-danger dot-pulse" : "bg-brand")} />
          {syncAlerts > 0 ? `${syncAlerts} sync alerts` : "All channels synced"}
        </button>
        <button onClick={() => setCopilotOpen(!copilotOpen)} className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 text-[11.5px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep" aria-label="Open AI copilot">
          <Ic name="sparkle" size={13} className="text-brand" />
          Copilot
          <span className="font-mono text-[10px] text-faint">{WORKSPACE.credits.limit - creditsUsed} cr</span>
        </button>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-card text-mute transition-colors hover:border-brand hover:text-brand"
        >
          <Ic name={theme === "light" ? "moon" : "sun"} size={14} />
        </button>
        <div className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {/* Reporting currency — IDR/USD primary, live rates */}
        <div className="flex items-center gap-1 rounded-md border border-line bg-card p-0.5" role="group" aria-label="Reporting currency">
          {(["IDR", "USD", "EUR"] as const).map((c) => (
            <button
              key={c}
              onClick={() => { setWorkspaceCurrency(c); toast("ok", `Reporting currency → ${c}`, `1 USD = ${fx.rate.IDR.toLocaleString()} IDR · 1 USD = €${fx.rate.EUR} (${fx.source === "live" ? "live" : "snapshot"} rates)`); }}
              className={cx("rounded px-1.5 py-0.5 font-mono text-[10.5px] font-bold", displayCurrency === c ? "bg-brand text-white" : "text-mute hover:text-ink")}
            >
              {c}
            </button>
          ))}
          <button
            onClick={async () => { const ok = await refreshRates(); toast(ok ? "ok" : "warn", ok ? "Live FX rates loaded" : "Using dated snapshot", ok ? "open.er-api.com · just now" : "Offline. Amounts still convert at the snapshot rate."); }}
            aria-label="Refresh exchange rates"
            title={`Rates: ${fx.source === "live" ? "live · " + fx.asOf : "snapshot · " + fx.asOf}`}
            className="rounded p-1 text-mute transition-colors hover:bg-paper hover:text-brand"
          >
            <Ic name="refresh" size={11} />
          </button>
          <span className={cx("mr-0.5 h-1.5 w-1.5 rounded-full", fx.source === "live" ? "bg-brand" : "bg-faint")} aria-label={fx.source === "live" ? "Live rates" : "Snapshot rates"} />
        </div>
        <div className="mx-1 h-5 w-px bg-line" />
        <div className="flex items-center rounded-md border border-line bg-card p-0.5" role="group" aria-label="Language">
          {(["en", "id"] as const).map((l) => (
            <button
              key={l}
              onClick={() => { window.location.hash = `/${l}/${route.path.join("/") || "dashboard"}`; }}
              className={cx("rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase", locale === l ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}
            >
              {l}
            </button>
          ))}
        </div>
        <IconBtn label="Toggle team chat" name="chat" onClick={() => setChatOpen(!chatOpen)} className={chatOpen ? "bg-brand-soft text-brand-deep" : ""} />
      </div>
    </header>
    </>
  );
}

// ── Team chat panel ────────────────────────────────────────────────────────
function ChatPanel() {
  const { chatOpen, setChatOpen, chat, sendChat } = useApp();
  const [activeId, setActiveId] = useState("ch-desk");
  const [draft, setDraft] = useState("");
  const chan = chat.find((c) => c.id === activeId)!;
  const endRef = useRef<HTMLDivElement>(null);

  const pick = (id: string) => {
    setActiveId(id);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };
  const submit = () => {
    if (!draft.trim()) return;
    sendChat(activeId, draft.trim());
    setDraft("");
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  };

  return (
    <aside className={cx("flex h-full w-[300px] shrink-0 flex-col border-l border-line bg-card transition-all duration-300", chatOpen ? "ml-0" : "-mr-[300px] hidden")}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <p className="font-display text-[13px] font-bold text-ink">Team chat</p>
        <IconBtn label="Close team chat" name="x" onClick={() => setChatOpen(false)} />
      </div>
      <div className="border-b border-line px-2 py-1.5">
        {chat.map((c) => (
          <button key={c.id} onClick={() => pick(c.id)} className={cx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] font-semibold transition-colors", c.id === activeId ? "bg-brand-soft text-brand-deep" : "text-mute hover:bg-black/5")}>
            <Ic name={c.kind === "dm" ? "users" : c.kind === "handoff" ? "ticket" : "chat"} size={13} />
            <span className="flex-1 truncate">{c.kind === "channel" ? `#${c.name}` : c.name}</span>
            {c.unread > 0 && <span className="rounded-full bg-danger px-1.5 font-mono text-[9.5px] font-bold text-white">{c.unread}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {chan.kind === "handoff" && (
          <p className="rounded-md bg-sea-soft px-2 py-1.5 text-[10.5px] font-semibold text-sea">Handoff thread · linked to reservation {chan.refId}</p>
        )}
        {chan.messages.map((m) => (
          <div key={m.id} className={cx("max-w-[92%]", m.author === "You" && "ml-auto")}>
            <div className={cx("rounded-lg border px-2.5 py-1.5 text-[12px] leading-snug", m.author === "You" ? "border-brand/30 bg-brand-soft text-ink" : "border-line bg-paper text-ink")}>
              <p className="mb-0.5 flex items-baseline gap-2 text-[10px] font-bold text-mute">
                {m.author} <span className="font-normal text-faint">{timeAgo(m.ts)}</span>
              </p>
              {m.body.split(/(@\w+)/g).map((part, i) =>
                part.startsWith("@") ? <mark key={i} className="rounded bg-gold-soft px-0.5 font-bold text-[#8a5c07]">{part}</mark> : <span key={i}>{part}</span>,
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-2.5">
        <div className="flex items-center gap-1.5 rounded-md border border-line2 bg-card px-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder={`Message ${chan.kind === "channel" ? "#" : ""}${chan.name}, @ to mention`} className="h-9 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint" />
          <IconBtn label="Send message" name="send" onClick={submit} tone="text-brand" />
        </div>
      </div>
    </aside>
  );
}

// ── Copilot ────────────────────────────────────────────────────────────────
interface CoMsg { role: "user" | "ai"; text: string; confirm?: { label: string; taskId: string } }
function copilotAnswer(q: string, props: Property[]): { text: string; confirm?: CoMsg["confirm"] } {
  const s = q.toLowerCase();
  const t = today();
  const weekendStart = addDays(t, ((6 - t.getDay()) + 7) % 7 || 7);
  if (/(adr|average.*rate|revenue.*last year|last year)/.test(s)) {
    const adrNow = Math.round(MONTHLY.slice(-3).reduce((a, m) => a + m.adr, 0) / 3);
    return { text: `Trailing-90-day ADR is €${adrNow} vs €${Math.round(adrNow / 1.12)} in the same window last year, up 12%. Villa Anggrek is pulling the average up (+18%); Rumah Senja is flat. I'd test a +4% mid-week overlay on Senja for next month.` };
  }
  if (/(open|available|free).*(weekend|next)/.test(s)) {
    const open = props.filter((p) => !p.archived && !p.isParent && arrivalsOn(RESERVATIONS, ((6 - t.getDay()) + 7) % 7 || 7, p.id).length === 0);
    return { text: `For next weekend (${fmtShort(weekendStart)}–${fmtShort(addDays(weekendStart, 2))}) these are open: ${open.slice(0, 5).map((p) => p.name).join(", ") || "none, every villa has an arrival"}. Samudra Three is open but its direct checkout is disabled.` };
  }
  if (/(overdue|behind|late)/.test(s)) {
    return { text: `3 tasks are overdue: the AC drip at Villa Purnama (urgent, 20h over), water heater descale at Kelapa, and nothing else critical. The AC one has a flagged ceiling stain, so I'd escalate to Bali Pool & Plumbing today. Want me to create the provider task?`, confirm: { label: "Create provider task", taskId: "Fix: master suite ceiling (Bali Pool & Plumbing)" } };
  }
  if (/(draft|reply).*(jonas|weber|cottage|cot)/.test(s) || /draft.*reply/.test(s)) {
    return { text: `Draft for Jonas Weber (Booking.com, Villa Cemara):\n\n"Hi Jonas, yes to both! We'll have a cot set up in the ground-floor bedroom, and while the pool isn't heated it sits at a lovely 29° this week. See you at 14:00. Kadek"\n\nTone-checked against your brand rules. Send it from the Inbox, or I can queue it under Autopilot → Suggestion.` };
  }
  if (/(automation|automate|sop)/.test(s)) {
    return { text: `Two automation gaps I can see:\n1. No "guest cancellation notice" template fires for VRBO cancellations (R-2432 was cancelled with no outbound message).\n2. Kelapa has no checkout-cleaning task generated because it's unmanaged. Set a template anyway?\nI can wire both. Write actions need your confirm.` };
  }
  if (/(anomal|weird|unusual|issue)/.test(s)) {
    return { text: `Anomalies right now:\n• Agoda rate pushes failing: base USD 322 is below their USD 348 floor (4th failure).\n• VRBO OAuth token expired 26h ago, 6 pushes queued behind it.\n• Rumah Senja knowledge scope is empty → concierge escalated 2 guest questions this week.\n• Samudra Two ↔ Booking.com room-type conflict is 2h old and holding an inbound reservation.` };
  }
  if (/(occupancy|occup)/.test(s)) {
    return { text: `Occupancy next 30 days: 71% across 9 active units (83% if you include holds). Best week is the 21st–27th at 89%. Weakest is Kelapa mid-week, where the Traveloka markup is your lowest (7%); a flash rate there would likely fill it.` };
  }
  if (/create.*task|add.*task/.test(s)) {
    return { text: `Got it, I'll create a task from your request. Confirm below and I'll write it to the Command Center (logged to the audit trail as source: ai).`, confirm: { label: "Confirm & create task", taskId: "Copilot task: follow up on request" } };
  }
  return { text: `I read your tenant data (properties, calendar, ledger, inbox). Try:\n• "Which villas are open next weekend?"\n• "What's my ADR vs last year?"\n• "Show anomalies"\n• "Draft a reply to Jonas"\n• "Create a task to …" (write actions always ask you first).` };
}

function CopilotPanel() {
  const { copilotOpen, setCopilotOpen, creditsUsed, spendCredit, toast, addTask, audit } = useApp();
  const properties = useApp((s) => s.properties);
  const [msgs, setMsgs] = useState<CoMsg[]>([
    { role: "ai", text: "Hi Sarah, I'm wired into Sanggraha's live data: 9 units, 22 reservations, 6 channels. Ask me anything operational, or have me draft guest replies and review responses." },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const ask = (q?: string) => {
    const question = (q ?? input).trim();
    if (!question) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: question }]);
    spendCredit(1);
    setTimeout(() => {
      const a = copilotAnswer(question, properties);
      setMsgs((m) => [...m, { role: "ai", text: a.text, confirm: a.confirm }]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
    }, 700);
  };

  const confirmWrite = (taskId: string) => {
    addTask({
      id: `t-${Date.now()}`, title: taskId, type: "custom", propertyId: "p-purnama", assigneeId: "m-wayan",
      due: Date.now() + 2 * 86_400_000, priority: "high", status: "open",
      checklist: [{ id: `ci-${Date.now()}`, label: "Resolve & close", done: false, requiresPhoto: false }],
      createdAt: Date.now(),
    });
    audit(`Task created via copilot: ${taskId}`, "ai");
    toast("ok", "Task created", "Logged to audit trail · source: ai");
    setMsgs((m) => [...m, { role: "ai", text: "Done: task created and assigned to Wayan. It's in the Command Center under Active." }]);
  };

  const pctUsed = creditsUsed / WORKSPACE.credits.limit;
  return (
    <aside className={cx("fixed right-0 top-0 z-[75] flex h-full w-[380px] flex-col border-l border-line bg-paper shadow-2xl transition-transform duration-300", copilotOpen ? "translate-x-0" : "translate-x-full")} aria-hidden={!copilotOpen}>
      <header className="flex items-center gap-2 border-b border-line bg-pine-900 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand"><Ic name="sparkle" size={14} className="text-white" /></span>
        <div className="flex-1">
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.04em] text-white">Derzen Copilot</p>
          <p className="text-[10px] text-pine-200/70">Reads tenant data · writes need your confirm</p>
        </div>
        <IconBtn label="Close copilot" name="x" onClick={() => setCopilotOpen(false)} className="text-pine-100 hover:bg-white/10 hover:text-white" />
      </header>
      <div className="border-b border-line bg-card px-4 py-2">
        <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold text-mute">
          <span>AI credits · this period</span>
          <span className="font-mono">{creditsUsed} / {WORKSPACE.credits.limit}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className={cx("h-full rounded-full transition-all duration-500", pctUsed > 0.85 ? "bg-danger" : "bg-brand")} style={{ width: `${pctUsed * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={cx("max-w-[94%]", m.role === "user" ? "ml-auto" : "")}>
            <div className={cx("anim-rise whitespace-pre-line rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed", m.role === "user" ? "border-pine-800 bg-pine-900 text-pine-100" : "border-line bg-card text-ink")}>
              {m.text}
            </div>
            {m.confirm && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gold/50 bg-gold-soft px-2.5 py-2">
                <Ic name="shield" size={14} className="text-[#8a5c07]" />
                <span className="flex-1 text-[11px] font-semibold text-[#8a5c07]">Write action requires confirmation</span>
                <Btn size="xs" variant="gold" onClick={() => confirmWrite(m.confirm!.taskId)}>Confirm</Btn>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line bg-card p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {["Open next weekend?", "ADR vs last year", "Show anomalies", "Draft reply to Jonas"].map((sug) => (
            <button key={sug} onClick={() => ask(sug)} className="rounded-full border border-line2 bg-paper px-2.5 py-1 text-[11px] font-semibold text-mute transition-colors hover:border-brand hover:text-brand-deep">
              {sug}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask about your portfolio…"
            className="h-10 flex-1 rounded-md border border-line2 bg-paper px-3 text-[13px] outline-none focus:border-brand"
          />
          <Btn variant="solid" size="md" icon="send" onClick={() => ask()} aria-label="Send to copilot" />
        </div>
      </div>
    </aside>
  );
}

// ── Onboarding wizard ──────────────────────────────────────────────────────
function OnboardWizard() {
  const { onboardOpen, setOnboardOpen, onboardSteps, doneOnboard, navigate, t } = useApp();
  const done = onboardSteps.filter((s) => s.done).length;
  return (
    <Modal open={onboardOpen} onClose={() => setOnboardOpen(false)} title={<span className="flex items-center gap-2"><Ic name="nav" size={16} className="text-brand" /> Setup guide: get bookable in 10 minutes</span>} w={560}
      footer={<Btn variant="ghost" onClick={() => setOnboardOpen(false)}>{t("common.close")}</Btn>}>
      <div className="mb-4 flex items-center gap-3">
        <Ring value={done / onboardSteps.length} size={48} label="Setup progress" />
        <div>
          <p className="font-display text-[14px] font-bold text-ink">{done} of {onboardSteps.length} steps complete</p>
          <p className="text-[11.5px] text-mute">The iCal fast-path already blocks dates while full channel approvals are pending.</p>
        </div>
      </div>
      <ol className="space-y-2">
        {onboardSteps.map((s, i) => (
          <li key={s.id} className={cx("flex items-center gap-3 rounded-lg border px-3 py-2.5", s.done ? "border-brand/30 bg-brand-soft/50" : "border-line bg-card")}>
            <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", s.done ? "bg-brand text-white" : "border border-line2 text-mute")}>
              {s.done ? <Ic name="check" size={12} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-ink">{s.label}</p>
              <p className="text-[11px] text-mute">{s.detail}</p>
            </div>
            {!s.done && (
              <>
                <Btn size="xs" onClick={() => { navigate(s.route); setOnboardOpen(false); }}>Go</Btn>
                <Btn size="xs" variant="ghost" onClick={() => doneOnboard(s.id)}>Done</Btn>
              </>
            )}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

// ── Shell ──────────────────────────────────────────────────────────────────
const TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard", "What needs attention today"],
  calendar: ["Multi-calendar", "Rates · availability · reservations"],
  inbox: ["Unified guest inbox", "Airbnb · Booking.com · WhatsApp · Email · Direct"],
  reservations: ["Reservations", "Stays & service bookings"],
  ops: ["Command Center", "Tasks · templates · providers · automations · expenses"],
  sync: ["Sync Health", "Channel distribution, treated as a product surface"],
  listings: ["Listings & Services", "Properties, pricing, checkout pages"],
  channels: ["Channel Manager", "Distribution & mapping"],
  websites: ["Websites & Embeds", "Builder · collections · widgets"],
  styling: ["Global Styling", "Brand across sites · widgets · invoices · emails"],
  quotes: ["Quotes", "Build, send, convert"],
  guidebooks: ["Digital guidebooks", "Per-property guest guides + store"],
  concierge: ["AI Concierge", "Knowledge · autopilot · scheduled messages"],
  reviews: ["Reviews", "Aggregate, reply, analyse"],
  customers: ["Customers (CRM)", "Deduplicated guest records"],
  reports: ["Financial reports", "Timezone & currency correct rollups"],
  integrations: ["Integrations & API", "Webhooks · keys · connectors"],
  settings: ["Settings", "Workspace, team, billing, policies"],
};

export function Shell({ children }: { children: ReactNode }) {
  const route = useApp((s) => s.route);
  const [mobileNav, setMobileNav] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const page = route.path[0] ?? "dashboard";
  const [title, sub] = TITLES[page] ?? ["Derzen", ""];
  // Global command palette — Ctrl/Cmd+K from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="flex h-screen overflow-hidden">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {mobileNav && <div className="fixed inset-0 z-[71] bg-pine-950/55 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileNav(false)} aria-hidden="true" />}
      <Sidebar open={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} sub={sub} onMenu={() => setMobileNav(true)} onPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div key={route.path.join("/") + route.query.toString()} className="anim-rise mx-auto w-full max-w-[1300px] px-4 py-6 pb-20 md:px-7 lg:px-9">
            {children}
          </div>
        </main>
      </div>
      <ChatPanel />
      <CopilotPanel />
      <OnboardWizard />
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[22px] font-bold leading-tight text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-[12.5px] text-mute">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}
export { Kbd as ShellKbd };
export const useNow = () => Date.now();
export { channelDef as shellChannelDef };
export const usePropertyScope = () => {
  const scope = useApp((s) => s.scope);
  const properties = useApp((s) => s.properties);
  return useMemo(() => ({ scope, inScope: (pid: string) => scope === "all" || pid === scope || propertyById(pid)?.parentId === scope, properties }), [scope, properties]);
};
export function nightsBetweenDates(a: string, b: string) { return Math.round((+new Date(b) - +new Date(a)) / 86_400_000); }
export { nightsInRange };
