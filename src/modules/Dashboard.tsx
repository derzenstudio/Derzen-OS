import { useMemo } from "react";
import { cx, money, fmtDate, relDay, timeAgo } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Empty, PriorityChip, Ring, Select, Toggle, useCountUp, Avatar } from "../components/ui";
import { useApp, arrivalsOn, departuresOn, scopedProperties } from "../store";
import { guestById, propertyById, channelDef } from "../lib/data";
import { Reveal, StaggerGroup } from "../components/animations";
import type { Reservation } from "../lib/types";

function Stat({ label, value, to, tone, spark, suffix }: { label: string; value: number; to: string; tone?: string; spark?: number[]; suffix?: string }) {
  const v = useCountUp(value);
  const navigate = useApp((s) => s.navigate);
  return (
    <button
      onClick={() => navigate(to)}
      className="group relative flex flex-col items-start overflow-hidden border border-line bg-card px-4 pb-3 pt-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-[0_10px_28px_-14px_rgba(20,24,17,0.35)]"
      aria-label={`${label}: ${value}. Open filtered list`}
    >
      {/* 2px status notch — the only colour signal */}
      <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: tone ?? "var(--color-line2)" }} aria-hidden="true" />
      <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-faint">{label}</span>
      <span className="mt-1.5 flex items-baseline gap-2">
        <span className="font-display text-[46px] font-extrabold leading-[0.9] text-ink tabular-nums">{v}</span>
        {suffix && <span className="max-w-[90px] text-[10.5px] font-semibold leading-tight text-mute">{suffix}</span>}
      </span>
      <span className="mt-2.5 flex w-full items-end justify-between">
        {spark ? (
          <svg width="84" height="22" aria-hidden="true">
            <polyline points={spark.map((p, i) => `${(i / (spark.length - 1)) * 84},${20 - p * 18}`).join(" ")} fill="none" stroke={tone ?? "#0E6B4E"} strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-faint">open filtered ↗</span>}
        <Ic name="arrowR" size={14} className="text-faint transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand" />
      </span>
    </button>
  );
}

function TimeLabel({ r }: { r: Reservation }) {
  if (r.checkInTime === "FLEXIBLE") return <span className="inline-flex items-center gap-1 rounded bg-sea-soft px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-sea">FLEXIBLE · after {propertyById(r.propertyId).checkInTime}</span>;
  return <span className="font-mono text-[11px] font-bold text-ink">{r.checkInTime}</span>;
}

export default function Dashboard() {
  const { scope, setScope, myTasks, setMyTasks, refresh, refreshing, setOnboardOpen, onboardSteps, t, navigate, lastRefresh } = useApp();
  const properties = useApp((s) => s.properties);
  const reservations = useApp((s) => s.reservations);
  const conversations = useApp((s) => s.conversations);
  const tasks = useApp((s) => s.tasks);
  const reviews = useApp((s) => s.reviews);

  const active = properties.filter((p) => !p.archived);
  const scoped = <T extends { propertyId: string }>(list: T[]): T[] => list.filter((x) => scope === "all" || x.propertyId === scope || propertyById(x.propertyId)?.parentId === scope);

  const unread = scoped(conversations).reduce((n, c) => n + c.unread, 0);
  const you = "m-you";
  const openTasks = scoped(tasks).filter((tk) => (tk.status === "open" || tk.status === "in_progress") && (!myTasks || tk.assigneeId === you));
  const ciToday = scoped(arrivalsOn(reservations, 0, scope));
  const ciTmr = scoped(arrivalsOn(reservations, 1, scope));
  const coToday = scoped(departuresOn(reservations, 0, scope));
  const coTmr = scoped(departuresOn(reservations, 1, scope));
  const newReviews = reviews.filter((r) => Date.now() - r.date < 7 * 86_400_000).length;
  const newRes = reservations.filter((r) => Date.now() - r.createdAt < 7 * 86_400_000 && r.kind === "stay").length;
  const upcoming = useMemo(() => {
    const out: { r: Reservation; off: number }[] = [];
    for (let d = 2; d <= 7; d++) for (const r of arrivalsOn(reservations, d, scope)) out.push({ r, off: d });
    return out.slice(0, 6);
  }, [reservations, scope]);

  const needsReply = scoped(conversations).filter((c) => c.escalated || c.unread > 0 || c.needsReply);
  const taskQueue = [...openTasks].sort((a, b) => a.due - b.due).slice(0, 7);
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "dash.greeting.morning" : hour < 18 ? "dash.greeting.afternoon" : "dash.greeting.evening";
  const setupDone = onboardSteps.filter((s) => s.done).length;
  const tzNow = useMemo(() => new Date(Date.now() + 6 * 3_600_000).getHours(), [lastRefresh]);
  void tzNow;

  return (
    <div className="space-y-6">
      {/* Shift sheet — the day's work first, greeting in the margin */}
      <Reveal direction="up" distance={20}><div className="reg-marks relative overflow-hidden border border-line bg-card px-5 py-5">
        {/* Ghost date numeral — a living mark that changes daily */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-10 select-none font-display text-[170px] font-extrabold leading-none text-ink/[0.055] tabular-nums">
          {new Date().getDate()}
        </span>
        <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
              Front desk · {fmtDate(new Date(), { year: true })} · WITA {new Date(Date.now() + 6 * 3_600_000).toTimeString().slice(0, 5)}
            </p>
            <h2 className="mt-1 font-display text-[34px] font-extrabold uppercase leading-[0.95] tracking-[0.02em] text-ink sm:text-[42px]">
              Shift sheet
            </h2>
            <p className="mt-1.5 text-[12.5px] font-medium text-mute">
              {t(greetKey)}, Sarah — {active.length} active units on tonight's board.
            </p>
          </div>

          {/* Ledger line: today's movement at a glance, double-ruled */}
          <dl className="flex items-end gap-6 sm:gap-8">
            <div>
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-faint">Arrivals</dt>
              <dd className="font-display text-[44px] font-extrabold leading-[0.9] text-ink tabular-nums">{useCountUp(ciToday.length)}</dd>
            </div>
            <span aria-hidden="true" className="mb-1.5 h-10 w-px bg-line2" />
            <div>
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-faint">Departures</dt>
              <dd className="font-display text-[44px] font-extrabold leading-[0.9] text-ink tabular-nums">{useCountUp(coToday.length)}</dd>
            </div>
            <span aria-hidden="true" className="mb-1.5 h-10 w-px bg-line2" />
            <div>
              <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-faint">Awaiting reply</dt>
              <dd className={cx("font-display text-[44px] font-extrabold leading-[0.9] tabular-nums", needsReply.length ? "text-danger" : "text-ink")}>{useCountUp(needsReply.length)}</dd>
            </div>
          </dl>

          <div className="flex items-center gap-2.5">
            {setupDone < onboardSteps.length && (
              <button onClick={() => setOnboardOpen(true)} className="flex items-center gap-2.5 border border-line bg-paper px-3 py-2 transition-colors hover:border-brand" aria-label="Open setup guide">
                <Ring value={setupDone / onboardSteps.length} size={32} label="Setup progress" />
                <span className="text-left">
                  <span className="block text-[11.5px] font-bold text-ink">{t("dash.onboard")}</span>
                  <span className="block font-mono text-[9px] font-semibold uppercase tracking-wider text-faint">{setupDone}/{onboardSteps.length} · restartable</span>
                </span>
              </button>
            )}
            <div className="border border-line bg-paper px-3 py-2 text-[11.5px]">
              <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-faint">{t("dash.scope.all")}</p>
              <Select value={scope} onChange={(e) => setScope(e.target.value)} className="!h-7 !w-[168px] !border-line2 !bg-card !text-[11.5px]" aria-label="Property scope">
                <option value="all">All properties</option>
                {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="flex flex-col items-start gap-1.5 border border-line bg-paper px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-[11.5px] font-bold text-ink">
                <Toggle checked={myTasks} onChange={setMyTasks} label="My tasks only" />
                {t("dash.myTasks")}
              </label>
              <Btn size="xs" variant="ghost" icon="refresh" onClick={refresh}>
                <span className={refreshing ? "anim-spin inline-flex" : "inline-flex"}>{t("dash.refresh")}</span>
              </Btn>
            </div>
          </div>
        </div>
        <div className="dbl-rule relative mt-4" aria-hidden="true" />
      </div></Reveal>

      {/* Stat widgets — every number deep-links */}
      <Reveal direction="up" distance={30} delay={100}><div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("dash.unread")} value={unread} to="/inbox?filter=unread" tone="#2557D6" spark={[0.2, 0.5, 0.3, 0.8, 0.4, 0.9, 0.6]} />
        <Stat label={t("dash.openTasks")} value={openTasks.length} to="/ops?tab=board&filter=active&mine=1" tone="#C07F14" spark={[0.6, 0.4, 0.7, 0.5, 0.8, 0.4, 0.3]} />
        <Stat label={t("dash.checkins")} value={ciToday.length} to="/reservations?focus=arrivals-today" suffix={`+${ciTmr.length} ${t("dash.tomorrow")}`} tone="#0E6B4E" />
        <Stat label={t("dash.checkouts")} value={coToday.length} to="/reservations?focus=departures-today" suffix={`+${coTmr.length} ${t("dash.tomorrow")}`} tone="#38708A" />
        <Stat label={t("dash.reviews7")} value={newReviews} to="/reviews?filter=new" tone="#E8485F" spark={[0.1, 0.3, 0.2, 0.5, 0.7, 0.4, 0.6]} />
        <Stat label={t("dash.bookings7")} value={newRes} to="/reservations?focus=new" tone="#1485A8" spark={[0.3, 0.2, 0.5, 0.4, 0.6, 0.8, 0.7]} />
      </div></Reveal>

      <StaggerGroup staggerDelay={100} direction="up" distance={20} className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Arrivals & departures */}
        <section className="rounded-xl border border-line bg-card xl:col-span-2" aria-label={t("dash.arrivals")}>
          <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="font-display text-[13.5px] font-bold text-ink">{t("dash.arrivals")}</h3>
            <Btn size="xs" variant="ghost" onClick={() => navigate("/reservations")}>{t("dash.viewAll")} <Ic name="arrowR" size={11} /></Btn>
          </header>
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-deep"><Ic name="nav" size={11} /> Arrivals · today</p>
              <ul className="space-y-1.5">
                {ciToday.length === 0 && <li className="text-[12px] text-faint">No arrivals today.</li>}
                {ciToday.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => navigate(`/reservations/${r.id}`)} className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-paper">
                      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: channelDef(r.channel).color }} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink">{guestById(r.guestId).name}</span>
                        <span className="block truncate text-[11px] text-mute">{propertyById(r.propertyId).name} · {channelDef(r.channel).name}</span>
                      </span>
                      <TimeLabel r={r} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mb-2 mt-4 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#8a3fae]"><Ic name="door" size={11} /> Departures · today</p>
              <ul className="space-y-1.5">
                {coToday.length === 0 && <li className="text-[12px] text-faint">No departures today.</li>}
                {coToday.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => navigate(`/reservations/${r.id}`)} className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-paper">
                      <Avatar name={guestById(r.guestId).name} color="#38708A" size={26} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-bold text-ink">{guestById(r.guestId).name}</span>
                        <span className="block truncate text-[11px] text-mute">{propertyById(r.propertyId).name} · out by {propertyById(r.propertyId).checkOutTime}</span>
                      </span>
                      <Badge tone="plum">{money(r.total, r.currency, { compact: true })}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-mute"><Ic name="calendar" size={11} /> {t("dash.upcoming")}</p>
              <ul className="space-y-1">
                {upcoming.length === 0 && <li className="text-[12px] text-faint">Quiet week ahead — a good time for direct-booking promos.</li>}
                {upcoming.map(({ r, off }) => (
                  <li key={r.id}>
                    <button onClick={() => navigate(`/reservations/${r.id}`)} className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-paper">
                      <span className="w-[76px] shrink-0 font-mono text-[10.5px] font-bold text-brand-deep">{t("dash.inDays", { n: off })}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-ink">{guestById(r.guestId).name}</span>
                        <span className="block truncate text-[10.5px] text-mute">{propertyById(r.propertyId).name} · {fmtDate(r.checkIn)} · {r.adults + r.children} pax</span>
                      </span>
                      <span className="h-2 w-2 rounded-sm" style={{ background: channelDef(r.channel).color }} aria-label={channelDef(r.channel).name} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Needs a reply */}
        <section className="rounded-xl border border-line bg-card" aria-label={t("dash.needsReply")}>
          <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="font-display text-[13.5px] font-bold text-ink">{t("dash.needsReply")}</h3>
            <Btn size="xs" variant="ghost" onClick={() => navigate("/inbox?filter=needs-reply")}>{t("dash.viewAll")}</Btn>
          </header>
          {needsReply.length === 0 ? (
            <Empty icon="checkCircle" title={t("dash.inboxZero")} body={t("dash.inboxZeroBody")} />
          ) : (
            <ul className="divide-y divide-line">
              {needsReply.slice(0, 5).map((c) => {
                const g = guestById(c.guestId);
                const last = c.messages[c.messages.length - 1];
                return (
                  <li key={c.id}>
                    <button onClick={() => navigate(`/inbox?conv=${c.id}`)} className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-paper">
                      <Avatar name={g.name} size={30} color={c.escalated ? "#B42318" : "#141811"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[12.5px] font-bold text-ink">{g.name}</span>
                          {c.escalated && <Badge tone="danger"><Ic name="flag" size={9} /> Escalated</Badge>}
                          {c.unread > 0 && <span className="rounded-full bg-danger px-1.5 font-mono text-[9.5px] font-bold text-white">{c.unread}</span>}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-mute">{last.body}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
                          <Dot tone={c.escalated ? "danger" : "warn"} label={c.escalated ? "needs human now" : `waiting ${timeAgo(last.ts)}`} />
                          · {channelDef(c.channel as never).name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </StaggerGroup>

      {/* Tasks & reminders */}
      <section className="rounded-xl border border-line bg-card" aria-label={t("dash.tasksPanel")}>
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="font-display text-[13.5px] font-bold text-ink">{t("dash.tasksPanel")} <span className="ml-1 text-[11px] font-semibold text-mute">overdue first</span></h3>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-mute"><Toggle checked={myTasks} onChange={setMyTasks} label="My tasks only" /> mine</label>
            <Btn size="xs" variant="ghost" onClick={() => navigate("/ops?tab=board")}>{t("dash.viewAll")}</Btn>
          </div>
        </header>
        {taskQueue.length === 0 ? (
          <Empty icon="check" title="No open tasks in this scope" body="Automations will create turnover tasks automatically at checkout." />
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-x lg:grid-cols-3">
            {taskQueue.map((tk) => {
              const overdueMs = tk.due - Date.now();
              const overdue = overdueMs < 0;
              const p = propertyById(tk.propertyId);
              return (
                <li key={tk.id}>
                  <button onClick={() => navigate(`/ops?tab=board&task=${tk.id}`)} className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-paper">
                    <PriorityChip p={tk.priority} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold text-ink">{tk.title}</span>
                      <span className="block text-[11px] text-mute">{p.name} · {tk.checklist.filter((c) => c.done).length}/{tk.checklist.length} steps</span>
                      <span className={cx("mt-0.5 block font-mono text-[10.5px] font-bold", overdue ? "text-danger" : overdueMs < 6 * 3_600_000 ? "text-[#8a5c07]" : "text-faint")}>
                        {overdue ? `overdue ${timeAgo(tk.due)}` : `due ${timeAgo(tk.due).replace("ago", "from now")}`}
                      </span>
                    </span>
                    <Ic name={tk.type === "cleaning" ? "sparkle" : tk.type === "maintenance" ? "wrench" : "target"} size={14} className="mt-0.5 text-faint" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    
    </div>
  );
}
