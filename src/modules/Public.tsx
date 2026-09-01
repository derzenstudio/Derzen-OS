import { useEffect, useRef, useState } from "react";
import { cx, moneyRaw, dayKey, addDays, today } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { PROPERTIES, RESERVATIONS, channelDef } from "../lib/data";
import { useApp } from "../store";
import { TENANTS } from "../lib/tenants";
import { devTeamEmpty } from "../lib/devTeam";
import { serverAuthReady } from "../lib/authServer";
import { ChannelMark } from "../components/ota";

const CHANNEL_TICKER = ["airbnb", "booking", "vrbo", "expedia", "agoda", "trip", "mmt", "traveloka", "ical", "direct"] as const;

export function PublicSite() {
  const { navigate, loginTenant, theme, setTheme } = useApp();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(i);
  }, []);

  const tonightIn = RESERVATIONS.filter((r) => r.checkIn === dayKey(today())).length + 2;
  const tonightOut = RESERVATIONS.filter((r) => r.checkOut === dayKey(today())).length + 1;
  const liveChannels = [0, 1, 2, 3, 4].map((i) => (tick + i) % 5);
  const adr = 4_650_000 + ((tick * 7913) % 60_000);

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const demo = async () => { const res = await loginTenant(TENANTS[0].email, TENANTS[0].password); if (res.ok) navigate("/dashboard"); };

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1160px] items-center gap-6 px-5">
          <a className="flex items-center gap-2" href="#/en" aria-label="DERZEN home">
            <Wordmark />
          </a>
          <nav className="ml-4 hidden items-center gap-5 text-[13px] font-semibold text-mute md:flex">
            <button onClick={() => go("product")} className="hover:text-ink">Product</button>
            <button onClick={() => go("integrations")} className="hover:text-ink">Integrations</button>
            <button onClick={() => go("pricing")} className="hover:text-ink">Pricing</button>
            <button onClick={() => go("security")} className="hover:text-ink">Security</button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-card text-mute transition-colors hover:border-brand hover:text-brand"
            >
              <Ic name={theme === "light" ? "moon" : "sun"} size={14} />
            </button>
            <button onClick={() => navigate("/login")} className="rounded-md px-3 py-1.5 text-[13px] font-bold text-ink transition-colors hover:bg-line/60">Sign in</button>
            <button onClick={demo} className="rounded-sm btn-grad px-3.5 py-1.5 text-[13px] font-bold text-white transition-transform hover:-translate-y-px">Launch live demo</button>
          </div>
        </div>
      </header>

      {/* Opening: the operations board, not a hero */}
      <section className="mx-auto grid max-w-[1160px] grid-cols-1 gap-10 px-5 pb-16 pt-14 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div className="anim-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-[11px] font-bold text-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-brand dot-pulse" /> Live from a demo workspace in Bali · 6 channels syncing now
          </p>
          <h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-[58px]">
            Every villa.<br />Every channel.<br /><span className="relative inline-block">One ledger.<span className="absolute inset-x-0 bottom-1 -z-10 h-3 bg-brand-soft" aria-hidden="true" /></span>
          </h1>
          <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-mute">
            DERZEN is the hospitality OS for operators of 1–100 units: channel distribution,
            a guest inbox with an AI concierge that <em className="font-semibold not-italic text-ink">escalates instead of inventing</em>,
            field operations, direct-booking commerce and financials that reconcile to the cent.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button onClick={demo} className="group flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[14px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(14,107,78,0.55)] transition-transform hover:-translate-y-0.5">
              Open the demo workspace <Ic name="arrowR" size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button onClick={() => go("pricing")} className="rounded-md border border-line2 bg-card px-5 py-3 text-[14px] font-bold text-ink transition-colors hover:border-ink">
              See pricing
            </button>
          </div>
          <p className="mt-4 font-mono text-[11px] text-faint">no card · pre-seeded with 7 villas, 22 reservations, a broken VRBO token to fix</p>
        </div>

        {/* Live ops pulse — the subject's most characteristic surface */}
        <div className="anim-pop relative" style={{ animationDelay: "0.1s" }}>
          <div className="absolute -inset-3 -z-10 rounded-2xl bg-[repeating-linear-gradient(-45deg,rgba(20,20,18,0.05)_0_2px,transparent_2px_9px)]" aria-hidden="true" />
          <div className="overflow-hidden rounded-xl border border-ink/80 bg-pine-950 text-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="h-2 w-2 rounded-full bg-brand blink" />
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-white/50">ops pulse · sanggraha.derzen.site</span>
              <span className="ml-auto font-mono text-[10px] text-white/40">WITA {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
              <div className="px-4 py-3">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/40">Check-ins tonight</p>
                <p className="font-display text-[26px] font-extrabold text-white">{tonightIn}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/40">Check-outs</p>
                <p className="font-display text-[26px] font-extrabold text-white">{tonightOut}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/40">ADR</p>
                <p className="font-display text-[26px] font-extrabold text-white">{moneyRaw(adr, "IDR", { compact: true })}</p>
              </div>
            </div>
            <div className="space-y-2 px-4 py-3">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/40">Channel sync · last push</p>
              {["airbnb", "booking", "vrbo", "agoda", "traveloka"].map((c, i) => {
                const def = channelDef(c as never);
                const phase = liveChannels[i];
                return (
                  <div key={c} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-white/10"><ChannelMark id={c} size={15} /></span>
                    <span className="w-[86px] text-[11px] font-semibold text-white/80">{def.name}</span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div key={`${c}-${tick}`} className="h-full rounded-full" style={{ width: "100%", background: phase === 4 ? "#B42318" : "#2E9E77", transformOrigin: "left", animation: "barGrowX 1.2s ease both" }} />
                    </div>
                    <span className="w-[64px] text-right font-mono text-[9.5px] text-white/45">{phase === 4 ? "retry 2/5" : `${6 + ((tick * 7 + i * 13) % 40)}s ago`}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 border-t border-white/10 bg-white/[0.03] px-4 py-2.5">
              <Ic name="alertTri" size={12} className="text-[#e2a33c]" />
              <p className="truncate text-[10.5px] text-white/60"><b className="text-white/85">1 sync alert:</b> VRBO OAuth expired on Purnama, one-click re-auth queued</p>
            </div>
          </div>
          <style>{`@keyframes barGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
        </div>
      </section>

      {/* The index — the switchboard, set like a ledger of contents */}
      <section id="product" className="border-t border-line bg-paper/60 py-20">
        <div className="mx-auto max-w-[1160px] px-5">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Index of operations</p>
              <h2 className="mt-1 font-display text-[38px] font-extrabold uppercase leading-[0.95] tracking-tight sm:text-[48px]">Eighteen modules.<br />Zero swivel-chair.</h2>
            </div>
            <p className="max-w-[42ch] text-[13.5px] leading-relaxed text-mute">Rates you edit once land on six OTAs. A guest message becomes a task becomes an invoice becomes an owner statement, all in one audit chain.</p>
          </div>
          <ol className="stagger border-t-2 border-ink">
            {([
              ["01", "Multi-calendar, bulk edit", "Drag across 20 listings × 30 nights, apply rate + min-stay + CTA in one transaction. Pushes queue per channel; failures surface with rollback, never a silent double-sell.", "Distribution", false],
              ["02", "AI concierge", "Cites your knowledge base or escalates. Three autopilot modes; humans approve in Suggestion mode.", "Engage", true],
              ["03", "Unified inbox", "Airbnb, Booking, WhatsApp, email, threaded to the right reservation in under 10 seconds.", "Engage", false],
              ["04", "Command Center", "Tasks, checklists with photo proof, provider escalation, offline-first for staff in dead spots.", "Operate", false],
              ["05", "Direct-booking sites", "Visual builder, embeddable widgets, quotes that convert to reservations with a payment link.", "Sell", false],
              ["06", "Financials that reconcile", "ADR, RevPAR, occupancy, owner statements; every total traces to the transaction ledger. IDR ⇄ USD at timestamped rates.", "Business", false],
              ["07", "Smart locks + ID checks", "Door codes issue at verification, revoke at checkout. Nuki, TTLock, August, Igloohome.", "Integrations", false],
            ] as [string, string, string, string, boolean][]).map(([no, title, body, tag, inverted]) => (
              <li key={no} className={cx("group grid grid-cols-[52px_1fr] items-baseline gap-x-4 border-b border-line px-2 py-5 transition-colors md:grid-cols-[80px_1fr_1.1fr_110px] md:gap-x-8", inverted ? "border-ink bg-ink text-paper hover:bg-pine-800" : "hover:bg-card")}>
                <span className={cx("font-mono text-[12px] font-bold tabular-nums transition-colors", inverted ? "text-[#8FE3BF]" : "text-faint group-hover:text-brand")}>{no}</span>
                <h3 className={cx("font-display text-[24px] font-extrabold uppercase leading-none tracking-tight transition-transform duration-200 group-hover:translate-x-1 md:text-[30px]", inverted ? "text-white" : "text-ink")}>{title}</h3>
                <p className={cx("col-span-2 mt-2 text-[13px] leading-relaxed md:col-span-1 md:mt-0", inverted ? "text-paper/70" : "text-mute")}>{body}</p>
                <span className={cx("col-start-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] md:col-start-4 md:text-right", inverted ? "text-paper/50" : "text-faint")}>{tag}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Integrations marquee */}
      <section id="integrations" className="border-t border-line py-14">
        <div className="mx-auto max-w-[1160px] px-5">
          <p className="mb-6 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-mute">Two-way sync, one adapter contract</p>
          <div className="relative overflow-hidden" aria-hidden="true">
            <div className="marquee-track flex w-max gap-3">
              {[...CHANNEL_TICKER, ...CHANNEL_TICKER].map((c, i) => {
                const def = channelDef(c);
                return (
                  <span key={i} className="flex items-center gap-2.5 rounded-sm border border-line bg-card px-4 py-2.5">
                    <ChannelMark id={def.id} size={20} />
                    <span className="text-[13px] font-bold text-ink">{def.name}</span>
                    <span className="font-mono text-[10px] text-mute">{def.structure === "hotel" ? "room-type mapping" : "unit mapping"}</span>
                  </span>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-surface to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-surface to-transparent" />
          </div>
          <p className="mx-auto mt-6 max-w-[64ch] text-center text-[13px] text-mute">
            Plus Stripe & Razorpay payments, WhatsApp Cloud, Instagram & Messenger, Google, Xero & QuickBooks,
            PriceLabs-style dynamic pricing and four smart-lock vendors. <button className="font-bold text-brand underline underline-offset-2" onClick={demo}>See how it all connects in a live demo.</button>
          </p>
        </div>
      </section>

      {/* Pricing — set like a rate card, not three equal cards */}
      <section id="pricing" className="border-t border-line bg-paper/60 py-20">
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-10 px-5 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Rate card · 2026</p>
            <h2 className="mt-1 font-display text-[38px] font-extrabold uppercase leading-[0.95] tracking-tight sm:text-[48px]">Metered per unit,<br />not per seat.</h2>
            <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-mute">Active property units and active service units are counted separately. Your whole team logs in free.</p>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="py-2.5 pr-4 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">Plan</th>
                    <th className="py-2.5 pr-4 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">Units</th>
                    <th className="py-2.5 pr-4 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">AI credits / mo</th>
                    <th className="py-2.5 text-right font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">Per month</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[13px] tabular-nums">
                  <tr className="border-b border-line transition-colors hover:bg-card">
                    <td className="py-3.5 pr-4"><span className="font-display text-[18px] font-extrabold uppercase text-ink">Starter</span></td>
                    <td className="py-3.5 pr-4 text-mute">3 properties</td>
                    <td className="py-3.5 pr-4 text-mute">1,000</td>
                    <td className="py-3.5 text-right font-bold text-ink">$49</td>
                  </tr>
                  <tr className="relative border-b border-line bg-brand-soft/60 transition-colors hover:bg-brand-soft">
                    <td className="py-3.5 pr-4 shadow-[inset_3px_0_0_var(--color-brand)]">
                      <span className="font-display text-[18px] font-extrabold uppercase text-ink">Scale</span>
                      <span className="ml-2 align-middle font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-brand-deep">most operators</span>
                    </td>
                    <td className="py-3.5 pr-4 text-mute">15 + 5 services</td>
                    <td className="py-3.5 pr-4 text-mute">5,000</td>
                    <td className="py-3.5 text-right font-bold text-ink">$118</td>
                  </tr>
                  <tr className="border-b border-line transition-colors hover:bg-card">
                    <td className="py-3.5 pr-4"><span className="font-display text-[18px] font-extrabold uppercase text-ink">Enterprise</span></td>
                    <td className="py-3.5 pr-4 text-mute">100+, multi-brand</td>
                    <td className="py-3.5 pr-4 text-mute">custom</td>
                    <td className="py-3.5 text-right font-bold text-ink">talk</td>
                  </tr>
                </tbody>
              </table>
              <div className="dbl-rule mt-0" aria-hidden="true" />
              <p className="mt-2 font-mono text-[10px] text-faint">per-unit metering · proration both directions · channel + gateway fees itemised on every invoice</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={demo} className="btn-grad rounded-sm px-5 py-2.5 text-[13px] font-bold text-white transition-transform hover:-translate-y-0.5">Open the demo workspace</button>
              <button onClick={() => navigate("/login")} className="rounded-sm border border-ink px-5 py-2.5 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-paper">Compare in product</button>
            </div>
          </div>

          <aside className="h-fit border border-line bg-card p-6">
            <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-faint">What every plan carries</p>
            <ul className="mt-4 space-y-3">
              {["Multi-calendar + iCal fast path", "Unified inbox & Command Center", "Quotes, guidebooks & store", "Owner portal & statements", "SSO, audit export, DR-tested backups"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] font-medium text-ink">
                  <span className="mt-[7px] h-[2px] w-3 shrink-0 bg-brand" aria-hidden="true" />{f}
                </li>
              ))}
            </ul>
            <div className="dbl-rule mt-5" aria-hidden="true" />
            <p className="mt-3 text-[11.5px] leading-relaxed text-mute">14-day trial, no card. When it ends the product keeps serving your guests; only the console asks for a payment method.</p>
          </aside>
        </div>
      </section>

      {/* Security / tenancy */}
      <section id="security" className="border-t border-line py-16">
        <div className="mx-auto grid max-w-[1160px] grid-cols-1 gap-8 px-5 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">Tenancy & trust</p>
            <h2 className="mt-1 font-display text-[32px] font-extrabold tracking-tight">Your guests' data never meets another operator's.</h2>
            <ul className="mt-5 space-y-3">
              {[
                ["Row-level isolation", "tenant_id enforced in PostgreSQL RLS on every table, verified by an automated cross-tenant suite that runs against every new API route."],
                ["Money is integer math", "Minor units + explicit currency everywhere. Listing, channel and reporting currencies stay separate, with the FX rate + timestamp stored on every conversion."],
                ["PII on a timer", "ID documents purge after the retention window; payments are tokenized; GDPR export & erase per guest, built in."],
                ["Nothing fails silently", "Every push, send and webhook runs on a durable queue with retry, dead-letter and alerts. Sync health is a first-class page."],
              ].map(([h, b]) => (
                <li key={h} className="flex gap-3">
                  <Ic name="check" size={15} className="mt-0.5 shrink-0 text-brand" sw={2.6} />
                  <p className="text-[13.5px] leading-relaxed text-mute"><b className="text-ink">{h}.</b> {b}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-pine-950 p-5 font-mono text-[11px] leading-relaxed text-white/70">
            <p className="mb-2 text-[9.5px] font-bold uppercase tracking-widest text-white/35">structured log · every request</p>
            <pre className="overflow-x-auto">{`{ "ts": "06:41:02Z", "level": "info",
  "tenant_id": "t-sanggraha",
  "actor_id": "u-sarah",
  "corr_id": "88f21c",
  "route": "POST /v1/calendar/bulk-edit",
  "listings": 7, "nights": 30,
  "pushes_queued": ["airbnb","booking",
    "vrbo","agoda","traveloka","direct"],
  "duration_ms": 214 }`}</pre>
            <p className="mt-3 border-t border-white/10 pt-3 text-white/45">Same shape on every background job, so “who changed this rate, and when” is always a query, not an investigation.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink bg-ink py-10 text-white">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-6 px-5">
          <Wordmark light />
          <p className="text-[12px] text-white/50">Hospitality OS for villa operators & boutique stays.</p>
          <div className="ml-auto flex gap-5 text-[12px] font-semibold text-white/70">
            <button onClick={() => navigate("/login")} className="hover:text-white">Sign in</button>
            <button onClick={demo} className="hover:text-white">Demo</button>
            <button onClick={() => go("product")} className="hover:text-white">Product</button>
          </div>
          <p className="w-full font-mono text-[10.5px] text-white/35">© 2026 DERZEN Systems · rates snapshot via open.er-api.com · PCI scope minimised, cards never touch our servers</p>
        </div>
      </footer>
    </div>
  );
}

function Wordmark({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="7" fill={light ? "#ffffff" : "#0E6B4E"} /><path d="M10 8h6a8 8 0 0 1 0 16h-6V8z" stroke={light ? "#0E6B4E" : "#F4F5F0"} strokeWidth="2.6" /><path d="M10 8v16" stroke={light ? "#9A6A0B" : "#8FE3BF"} strokeWidth="2.6" /></svg>
      <span className={cx("font-display text-[17px] font-extrabold uppercase tracking-[0.04em]", light ? "text-white" : "text-ink")}>derzen</span>
    </span>
  );
}

function BentoTile({ span, icon, title, body, tag, dark }: { span: string; icon: IconName; title: string; body: string; tag: string; dark?: boolean }) {
  return (
    <div className={cx("group rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl", span, dark ? "border-ink bg-ink text-white hover:shadow-black/30" : "border-line bg-card hover:border-ink/40")}>
      <div className="flex items-center justify-between">
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", dark ? "bg-white/10 text-white" : "bg-brand-soft text-brand")}><Ic name={icon} size={17} /></span>
        <span className={cx("font-mono text-[9.5px] font-bold uppercase tracking-widest", dark ? "text-white/40" : "text-faint")}>{tag}</span>
      </div>
      <h3 className={cx("mt-4 font-display text-[17px] font-bold tracking-tight", dark ? "text-white" : "text-ink")}>{title}</h3>
      <p className={cx("mt-1.5 text-[12.5px] leading-relaxed", dark ? "text-white/60" : "text-mute")}>{body}</p>
      <span className={cx("mt-3 inline-block h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-14", dark ? "bg-brand-bright" : "bg-brand")} aria-hidden="true" />
    </div>
  );
}

function PriceCard({ name, price, per, units, feats, cta, featured, badge }: { name: string; price: string; per: string; units: string; feats: string[]; cta: () => void; featured?: boolean; badge?: string }) {
  return (
    <div className={cx("relative flex flex-col rounded-xl border p-6", featured ? "border-brand bg-ink text-white shadow-2xl lg:-my-4 lg:py-10" : "border-line bg-card")}>
      {badge && <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{badge}</span>}
      <p className={cx("font-display text-[15px] font-bold", featured ? "text-white" : "text-ink")}>{name}</p>
      <p className="mt-2"><span className={cx("font-display text-[40px] font-extrabold tracking-tight", featured ? "text-white" : "text-ink")}>{price}</span><span className={cx("text-[13px] font-semibold", featured ? "text-white/50" : "text-mute")}>{per}</span></p>
      <p className={cx("text-[11.5px] font-bold", featured ? "text-brand-bright" : "text-brand-deep")}>{units}</p>
      <ul className={cx("mt-4 flex-1 space-y-2 border-t pt-4", featured ? "border-white/15" : "border-line")}>
        {feats.map((f) => (
          <li key={f} className={cx("flex gap-2 text-[12.5px]", featured ? "text-white/75" : "text-mute")}><Ic name="check" size={13} className={cx("mt-0.5 shrink-0", featured ? "text-brand-bright" : "text-brand")} sw={2.6} /> {f}</li>
        ))}
      </ul>
      <button onClick={cta} className={cx("mt-6 rounded-md py-2.5 text-[13.5px] font-bold transition-colors", featured ? "bg-brand text-white hover:bg-brand-bright" : "border border-ink bg-card text-ink hover:bg-ink hover:text-white")}>
        {name === "Enterprise" ? "Talk to us" : "Start with the demo"}
      </button>
    </div>
  );
}

// ── Login / Sign-up (customers) ────────────────────────────────────────────
// The public app host is for customers only: real sign-in + self-serve sign-up.
// The developer console is reachable ONLY from the dev.* subdomain — it is
// deliberately absent from this page on the app host.
const devHost = typeof window !== "undefined" && (() => {
  const h = window.location.hostname.toLowerCase();
  return h === "dev" || h.startsWith("dev.");
})();

function pwStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  if (pw.length < 12) return 2;
  return /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw) ? 4 : 3;
}

const PROVISION_STEPS = [
  "Creating your workspace",
  "Provisioning tenant schema + row-level security",
  "Seeding a starter portfolio you can replace",
  "Wiring inbox, calendar & channels",
];

export function LoginPage() {
  const { navigate, loginTenant, signupCustomer, resetCustomerPassword, resetDeveloperPassword, loginDeveloper } = useApp();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // sign-up provisioning overlay
  const [provisioning, setProvisioning] = useState(false);
  const [provStep, setProvStep] = useState(0);
  // forgot-password flow
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [newPw, setNewPw] = useState("");
  const [resetScope, setResetScope] = useState<"workspace" | "developer">("workspace");
  // developer sign-in (dev host only)
  const [devEmail, setDevEmail] = useState("");
  const [devPw, setDevPw] = useState("");
  const [devBusy, setDevBusy] = useState(false);
  const [devErr, setDevErr] = useState<string | null>(null);
  const serverAuth = serverAuthReady();
  // First-run seat claiming only exists in the browser-registry fallback. A
  // server-backed build has its owner seeded by SQL migration.
  const firstRun = devHost && !serverAuth && devTeamEmpty();

  const submitLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(null); setBusy(true);
    const res = await loginTenant(email, pw);
    setBusy(false);
    if (!res.ok) { setErr(res.error ?? "Sign-in failed."); return; }
    navigate("/dashboard");
  };

  const submitSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErr(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Enter a valid email address."); return; }
    if (pwStrength(pw) < 2) { setErr("Password needs at least 8 characters — letters and numbers."); return; }
    if (!name.trim()) { setErr("Tell us your name — it appears on guest replies you approve."); return; }
    // animated provisioning, then real account creation
    setProvisioning(true);
    for (let i = 0; i < PROVISION_STEPS.length; i++) {
      setProvStep(i);
      await new Promise((r) => setTimeout(r, 480));
    }
    const res = await signupCustomer({ name, workspace, email, pw });
    setProvisioning(false);
    if (!res.ok) { setErr(res.error ?? "Could not create the workspace."); return; }
    navigate("/dashboard");
  };

  const quick = async (em: string, p: string) => {
    setEmail(em); setPw(p); setErr(null); setBusy(true);
    const res = await loginTenant(em, p);
    setBusy(false);
    if (res.ok) navigate("/dashboard");
    else setErr(res.error ?? "Sign-in failed.");
  };

  const [resetSent, setResetSent] = useState(false);
  const sendReset = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) { setErr("Enter the email you signed up with."); return; }
    if (serverAuth) {
      // The link is generated and validated server-side. Nothing about the
      // reset is decided in this browser, and no code is displayed, because a
      // code the client can read verifies nothing.
      await (resetScope === "developer" ? resetDeveloperPassword(forgotEmail, "") : resetCustomerPassword(forgotEmail, ""));
      setResetSent(true); setErr(null);
      return;
    }
    setSentCode(String(Math.floor(100000 + Math.random() * 900000)));
  };
  const confirmReset = async () => {
    if (codeInput.trim() !== sentCode) { setErr("That code does not match. Check the 6 digits."); return; }
    if (pwStrength(newPw) < 2) { setErr("New password needs at least 8 characters."); return; }
    const res = resetScope === "developer"
      ? await resetDeveloperPassword(forgotEmail, newPw)
      : await resetCustomerPassword(forgotEmail, newPw);
    if (!res.ok) { setErr(res.error ?? "Reset failed."); return; }
    setForgotOpen(false); setSentCode(null); setCodeInput(""); setNewPw(""); setErr(null);
    if (resetScope === "developer") setDevEmail(forgotEmail);
    else { setEmail(forgotEmail); setTab("login"); }
  };

  const submitDevLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDevErr(null); setDevBusy(true);
    const res = await loginDeveloper(devEmail, devPw);
    setDevBusy(false);
    if (!res.ok) { setDevErr(res.error ?? "Developer sign-in failed."); return; }
    navigate("/dev");
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
      {/* Brand rail */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M0 60h120M60 0v120' stroke='%23ffffff' stroke-width='0.6'/%3E%3C/svg%3E\")" }} aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#0E6B4E" /><path d="M10 8h6a8 8 0 0 1 0 16h-6V8z" stroke="#F4F5F0" strokeWidth="2.6" /><path d="M10 8v16" stroke="#8FE3BF" strokeWidth="2.6" /></svg>
          <span className="font-display text-[19px] font-extrabold uppercase tracking-[0.04em]">derzen</span>
        </div>
        <div className="relative">
          <h1 className="font-display text-[40px] font-extrabold leading-[1.05] tracking-tight">The switchboard<br />for serious<br />villa operators.</h1>
          <div className="mt-8 space-y-3">
            {[
              ["Row-level tenant isolation", "each workspace is a sealed database row-space"],
              ["Sync that can't fail silently", "durable queues, dead-letters, alerts at 2h"],
              ["AI that escalates, never invents", "citations or a human, your call, per property"],
            ].map(([h, s]) => (
              <p key={h} className="flex items-start gap-3 text-[13.5px]"><Ic name="check" size={15} className="mt-0.5 shrink-0 text-brand-bright" sw={2.6} /><span><b>{h}.</b> <span className="text-white/55">{s}</span></span></p>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 font-mono text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4CC38A] dot-pulse" /> all systems operational · 99.98% 30d · 4 regions
        </div>
      </aside>

      {/* Form — customer sign-in / sign-up (developer entry only on dev.* host) */}
      <main className="flex items-center justify-center bg-surface px-5 py-10">
        <div className="w-full max-w-[430px] anim-rise">
          <button onClick={() => navigate("/")} className="mb-6 flex items-center gap-1 text-[12.5px] font-bold text-mute hover:text-ink"><Ic name="chevL" size={13} /> Back to derzen.site</button>

          {!serverAuth && (
            <p className="mb-5 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-[11.5px] leading-relaxed text-danger">
              <b>No backend configured.</b> Accounts, passwords and access checks are held in this browser, which means
              they are not enforced. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before this build handles real data.
            </p>
          )}

          <div className="mb-5 flex items-center rounded-lg border border-line bg-paper p-0.5">
            <button onClick={() => { setTab("login"); setErr(null); }} className={cx("flex-1 rounded-md py-2 text-[12.5px] font-bold transition-colors", tab === "login" ? "bg-ink text-white" : "text-mute hover:text-ink")}>Sign in</button>
            <button onClick={() => { setTab("signup"); setErr(null); }} className={cx("flex-1 rounded-md py-2 text-[12.5px] font-bold transition-colors", tab === "signup" ? "bg-brand text-white" : "text-mute hover:text-ink")}>Create account</button>
          </div>

          {tab === "login" ? (
            <>
              <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink">Welcome back</h2>
              <p className="mt-1 text-[13px] text-mute">Sign in to your workspace — your data stays sealed in your own tenant.</p>
              <form onSubmit={submitLogin} className="mt-6 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@youroperation.co" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Password</span>
                  <div className="relative">
                    <input value={pw} onChange={(e) => setPw(e.target.value)} type={showPw ? "text" : "password"} required placeholder="••••••••" className="h-11 w-full rounded-md border border-line2 bg-card px-3 pr-11 text-[14px] outline-none transition-colors focus:border-brand" />
                    <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-mute hover:bg-paper hover:text-ink"><Ic name="eye" size={15} /></button>
                  </div>
                </label>
                {err && <p role="alert" className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger anim-pop"><Ic name="alertTri" size={14} /> {err}</p>}
                <button type="submit" disabled={busy} className={cx("flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink text-[14px] font-bold text-white transition-all hover:bg-brand", busy && "opacity-70")}>
                  {busy ? <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white anim-spin" /> Verifying…</> : <>Enter workspace <Ic name="arrowR" size={15} /></>}
                </button>
                <button type="button" onClick={() => { setForgotOpen(true); setResetScope("workspace"); setForgotEmail(email); setSentCode(null); setCodeInput(""); setNewPw(""); setErr(null); }} className="mx-auto block text-[12px] font-bold text-brand-deep underline-offset-2 hover:underline">Forgot password?</button>
              </form>

              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-1 text-[10.5px] font-bold uppercase tracking-widest text-faint">Explore a demo workspace</p>
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-mute">Sample data, shared and reset. Your own account never appears here.</p>
                <div className="space-y-2">
                  {TENANTS.filter((t) => t.isDemo).map((t) => (
                    <button key={t.id} onClick={() => quick(t.email, t.password)} className="group flex w-full items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 text-left transition-all hover:-translate-y-px hover:border-ink hover:shadow-md">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink font-display text-[11px] font-extrabold text-white">{t.name.slice(0, 1)}</span>
                      <span className="flex-1">
                        <span className="block text-[13px] font-bold text-ink">{t.name}</span>
                        <span className="block text-[10.5px] text-mute">{t.plan} plan · {t.currency} · password demo123</span>
                      </span>
                      <Ic name="arrowR" size={14} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink">Start your free workspace</h2>
              <p className="mt-1 text-[13px] text-mute">14-day trial, no card. You get a clean workspace of your own — every listing, booking and setting you add is saved securely to your account. Want sample data first? Try a demo workspace on the Sign in tab.</p>
              <form onSubmit={submitSignup} className="mt-6 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sarah Whitfield" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Workspace name <span className="normal-case text-faint">(your business)</span></span>
                  <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} placeholder="Serenity Villas" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@youroperation.co" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Password</span>
                  <div className="relative">
                    <input value={pw} onChange={(e) => setPw(e.target.value)} type={showPw ? "text" : "password"} required placeholder="8+ characters, letters & numbers" className="h-11 w-full rounded-md border border-line2 bg-card px-3 pr-11 text-[14px] outline-none transition-colors focus:border-brand" />
                    <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-mute hover:bg-paper hover:text-ink"><Ic name="eye" size={15} /></button>
                  </div>
                  <span className="mt-1.5 flex gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => <span key={i} className={cx("h-1 flex-1 rounded-full transition-colors", pwStrength(pw) >= i ? (pwStrength(pw) <= 1 ? "bg-danger" : pwStrength(pw) === 2 ? "bg-gold" : "bg-brand") : "bg-line")} />)}
                  </span>
                </label>
                {err && <p role="alert" className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger anim-pop"><Ic name="alertTri" size={14} /> {err}</p>}
                <button type="submit" className="btn-grad flex h-11 w-full items-center justify-center gap-2 rounded-md text-[14px] font-bold text-white transition-transform hover:-translate-y-px">
                  Create my workspace <Ic name="arrowR" size={15} />
                </button>
                <p className="text-center text-[10.5px] leading-relaxed text-faint">By continuing you agree to the Terms and acknowledge the Privacy Policy. Passwords are stored as SHA-256 digests, sessions expire after 12h.</p>
              </form>
            </>
          )}

          {devHost && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-widest text-faint">Internal · dev host only</p>
              {firstRun ? (
                <p className="mb-3 rounded-md border border-brand/40 bg-brand-soft/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink">
                  <b>No developer seats exist on this device yet.</b> The credentials you enter now claim the owner
                  seat. After that, only registered members can sign in. Use at least 10 characters.
                </p>
              ) : (
                <p className="mb-3 text-[11.5px] leading-relaxed text-mute">Registered team members only. Ask an owner for a seat.</p>
              )}
              <form onSubmit={submitDevLogin} className="space-y-2.5">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Developer email</span>
                  <input value={devEmail} onChange={(e) => setDevEmail(e.target.value)} type="email" required autoComplete="username" placeholder="you@yourteam.dev" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Password</span>
                  <input value={devPw} onChange={(e) => setDevPw(e.target.value)} type="password" required autoComplete="current-password" placeholder={firstRun ? "Choose 10+ characters" : "••••••••••"} className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none transition-colors focus:border-brand" />
                </label>
                {devErr && <p role="alert" className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-[12.5px] font-semibold text-danger anim-pop"><Ic name="alertTri" size={14} /> {devErr}</p>}
                <button type="submit" disabled={devBusy} className={cx("flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand text-[14px] font-bold text-white transition-all hover:bg-brand-deep", devBusy && "opacity-70")}>
                  {devBusy ? <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white anim-spin" /> Verifying…</> : <>{firstRun ? "Claim owner seat" : "Open the backoffice"} <Ic name="arrowR" size={15} /></>}
                </button>
                {!firstRun && (
                  <button type="button" onClick={() => { setForgotOpen(true); setResetScope("developer"); setForgotEmail(devEmail); setSentCode(null); setCodeInput(""); setNewPw(""); setErr(null); }} className="mx-auto block text-[12px] font-bold text-brand-deep underline-offset-2 hover:underline">Forgot developer password?</button>
                )}
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Provisioning overlay during sign-up */}
      {provisioning && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/85 px-5 backdrop-blur-sm">
          <div className="w-full max-w-[400px] rounded-xl border border-white/15 bg-pine-900 p-6 text-white shadow-2xl anim-pop">
            <p className="font-display text-[20px] font-extrabold tracking-tight">Setting up {workspace.trim() || "your workspace"}…</p>
            <div className="mt-5 space-y-3">
              {PROVISION_STEPS.map((s, i) => (
                <p key={s} className={cx("flex items-center gap-2.5 text-[13px] transition-opacity", i < provStep ? "text-[#8FE3BF]" : i === provStep ? "text-white" : "text-white/35")}>
                  {i < provStep ? <Ic name="check" size={14} sw={2.6} /> : i === provStep ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white anim-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-white/25" />}
                  {s}
                </p>
              ))}
            </div>
            <p className="mt-5 border-t border-white/10 pt-3 font-mono text-[10px] text-white/40">tenant-isolated schema · RLS enabled · audit logging on from second one</p>
          </div>
        </div>
      )}

      {/* Forgot password */}
      {forgotOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/60 px-5 backdrop-blur-sm" onClick={() => setForgotOpen(false)}>
          <div className="w-full max-w-[400px] rounded-xl border border-line bg-card p-6 shadow-2xl anim-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-display text-[18px] font-extrabold tracking-tight text-ink">Reset your {resetScope === "developer" ? "developer" : "workspace"} password</h3>
              <button onClick={() => setForgotOpen(false)} aria-label="Close" className="rounded p-1 text-mute hover:bg-paper hover:text-ink"><Ic name="x" size={15} /></button>
            </div>
            {serverAuth && resetSent ? (
              <p className="mt-4 rounded-md border border-brand/40 bg-brand-soft/60 px-3 py-3 text-[12.5px] leading-relaxed text-ink">
                If an account exists for <b>{forgotEmail}</b>, a single-use reset link is on its way. The link expires;
                request another if it does. We do not confirm whether an address is registered.
              </p>
            ) : !sentCode ? (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">Account email</span>
                  <input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} type="email" placeholder={resetScope === "developer" ? "you@yourteam.dev" : "you@youroperation.co"} className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none focus:border-brand" />
                </label>
                <button onClick={sendReset} className="flex h-10 w-full items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white transition-colors hover:bg-brand">Send reset code</button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="rounded-md bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-mute">We emailed a 6-digit code to <b className="text-ink">{forgotEmail}</b>. <span className="font-mono text-brand-deep">Demo code: {sentCode}</span> (in production this is emailed, never shown).</p>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">6-digit code</span>
                  <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} inputMode="numeric" maxLength={6} placeholder="••••••" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-center font-mono text-[16px] font-bold tracking-[0.3em] outline-none focus:border-brand" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-mute">New password</span>
                  <input value={newPw} onChange={(e) => setNewPw(e.target.value)} type="password" placeholder="8+ characters" className="h-11 w-full rounded-md border border-line2 bg-card px-3 text-[14px] outline-none focus:border-brand" />
                </label>
                {err && <p role="alert" className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger anim-pop"><Ic name="alertTri" size={13} /> {err}</p>}
                <button onClick={confirmReset} className="flex h-10 w-full items-center justify-center rounded-md bg-ink text-[13px] font-bold text-white transition-colors hover:bg-brand">Set new password</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
