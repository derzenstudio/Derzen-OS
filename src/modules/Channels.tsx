import { Fragment, useState } from "react";
import { cx, money, timeAgo, fmtDateTime } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, Empty, Field, Input, Modal, Select, Tabs } from "../components/ui";
import { useApp } from "../store";
import { CHANNEL_DEFS, channelDef, propertyById } from "../lib/data";
import { ChannelMark } from "../components/ota";
import type { ChannelDef } from "../lib/types";

const OTA_LAUNCH = ["airbnb", "booking", "vrbo", "expedia", "agoda", "trip", "mmt", "traveloka"] as const;

export default function Channels({ tab: initialTab }: { tab?: string }) {
  const [tab, setTab] = useState(initialTab ?? "dashboard");
  const sync = useApp((s) => s.sync);
  const conflicts = useApp((s) => s.conflicts);
  const errors = sync.filter((s) => s.state === "error");
  return (
    <div className="space-y-4">
      {!initialTab && (
        <Tabs
          tabs={[
            { id: "dashboard", label: "Dashboard" },
            { id: "connections", label: "Connections & mapping" },
            { id: "sync", label: "Sync Health", count: errors.length },
            { id: "conflicts", label: "Conflict queue", count: conflicts.length },
          ]}
          active={tab} onChange={setTab}
        />
      )}
      {tab === "dashboard" && <Dash goSync={() => setTab("sync")} />}
      {tab === "connections" && <Connections />}
      {tab === "sync" && <SyncHealth embedded={!!initialTab} />}
      {tab === "conflicts" && <Conflicts />}
    </div>
  );
}

function Dash({ goSync }: { goSync: () => void }) {
  const sync = useApp((s) => s.sync);
  const properties = useApp((s) => s.properties);
  const live = sync.filter((s) => s.state === "live");
  const errors = sync.filter((s) => s.state === "error");
  const queueTotal = sync.reduce((n, s) => n + s.queueDepth, 0);
  const oldest = Math.max(...sync.map((s) => Date.now() - s.lastSuccessTs));
  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <button onClick={goSync} className="flex w-full items-center gap-3 rounded-xl border border-danger/50 bg-danger-soft px-4 py-3 text-left transition-transform hover:scale-[1.005]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger text-white"><Ic name="alertTri" size={17} /></span>
          <span className="flex-1">
            <span className="block text-[13.5px] font-bold text-danger">{errors.length} connections failing — {queueTotal} pushes queued behind them</span>
            <span className="text-[11.5px] font-semibold text-[#93331f]">{errors.map((e) => `${propertyById(e.propertyId).code}×${channelDef(e.channel).short}`).join(" · ")} — nothing is silently dropped; drill down, fix, retry.</span>
          </span>
          <Ic name="arrowR" size={16} className="text-danger" />
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Connected listings</p><p className="mt-1 font-display text-[26px] font-bold text-ink">{live.length}<span className="text-[13px] text-faint"> / {sync.length}</span></p></div>
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Push queue depth</p><p className={cx("mt-1 font-display text-[26px] font-bold", queueTotal > 10 ? "text-danger" : "text-ink")}>{queueTotal}</p></div>
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Oldest last-success</p><p className={cx("mt-1 font-display text-[26px] font-bold", oldest > 2 * 3_600_000 ? "text-danger" : "text-ink")}>{Math.round(oldest / 3_600_000)}h</p><p className="text-[10px] font-semibold text-faint">alert threshold: 2h</p></div>
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Room types + plans mapped</p><p className="mt-1 font-display text-[26px] font-bold text-ink">14 <span className="text-[13px] text-faint">types · 32 plans</span></p></div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-4">
          <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Per-channel last sync</h3>
          {sync.slice(0, 8).map((s) => (
            <div key={s.key} className="mb-1.5 flex items-center gap-2 text-[12px]">
              <span className="flex h-5 w-5 items-center justify-center"><ChannelMark id={s.channel} size={16} /></span>
              <span className="w-[120px] truncate font-bold text-ink">{propertyById(s.propertyId).name}</span>
              <span className="flex-1 text-mute">{timeAgo(s.lastSuccessTs)}</span>
              {s.state === "live" ? <Dot tone="ok" label="ok" /> : s.state === "error" ? <Dot tone="danger" label="error" pulse /> : <Dot tone="warn" label={s.state} />}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Adapter layer</h3>
          <p className="text-[12px] leading-relaxed text-mute">
            Distribution runs on a <b className="text-ink">swappable channel-aggregation adapter</b> — Channex today, Nuvho or direct OTA APIs tomorrow, behind one normalised model.
            Hotel-structured channels map room types + rate plans; unit-structured channels map whole listings (one account can cover many).
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CHANNEL_DEFS.slice(0, 8).map((c) => <Badge key={c.id} tone="mute">{c.name} · {c.structure}</Badge>)}
            <Badge tone="ok">iCal in/out</Badge><Badge tone="ok">Direct</Badge>
          </div>
          <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-mute">
            Two-way sync: push availability/rates/restrictions · pull reservations, modifications, cancellations, messages. Inbound processing is idempotent on the channel reservation ID.
          </p>
        </div>
      </div>
      {voidP(properties.length)}
    </div>
  );
}
function voidP(_n: number) { return null; }

function Connections() {
  const { properties } = useApp();
  const sync = useApp((s) => s.sync);
  const [wizard, setWizard] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-mute">Multiple accounts per OTA supported · mapping states: unmapped → mapping → live / paused / error.</p>
        <Btn variant="solid" icon="plus" onClick={() => setWizard(true)}>Connect channel</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
              <th className="px-4 py-2.5">Connection</th><th className="px-3 py-2.5">Structure</th><th className="px-3 py-2.5">Listings mapped</th>
              <th className="px-3 py-2.5">Mapping state</th><th className="px-3 py-2.5">Last success</th><th className="px-3 py-2.5 text-right">Markup</th>
            </tr>
          </thead>
          <tbody>
            {OTA_LAUNCH.map((cid) => {
              const def = channelDef(cid);
              const rows = sync.filter((s) => s.channel === cid);
              const props = [...new Set(rows.map((r) => r.propertyId))];
              const worst = rows.some((r) => r.state === "error") ? "error" : rows.some((r) => r.state === "mapping") ? "mapping" : rows.length ? "live" : "unmapped";
              return (
                <tr key={cid} className="border-b border-line/60 transition-colors hover:bg-paper/70">
                  <td className="px-4 py-2.5"><span className="flex items-center gap-2.5 text-[12.5px] font-bold text-ink"><ChannelMark id={def.id} size={20} />{def.name}</span></td>
                  <td className="px-3 py-2.5"><Badge tone={def.structure === "hotel" ? "info" : "plum"}>{def.structure}</Badge></td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold">{rows.length ? `${rows.length} listings · ${props.map((p) => propertyById(p).code).join(", ")}` : "—"}</td>
                  <td className="px-3 py-2.5">
                    {worst === "unmapped" ? <Dot tone="mute" label="unmapped" /> : worst === "mapping" ? <Dot tone="warn" label="mapping" /> : worst === "error" ? <Dot tone="danger" label="error" pulse /> : <Dot tone="ok" label="live" />}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-mute">{rows.length ? timeAgo(Math.max(...rows.map((r) => r.lastSuccessTs))) : "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold">{def.markupPct}%</td>
                </tr>
              );
            })}
            <tr className="border-b border-line/60">
              <td className="px-4 py-2.5"><span className="flex items-center gap-2.5 text-[12.5px] font-bold text-ink"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[9.5px] font-bold text-white">DR</span>Direct website</span></td>
              <td className="px-3 py-2.5"><Badge tone="plum">unit</Badge></td>
              <td className="px-3 py-2.5 text-[12px] font-semibold">{properties.filter((p) => p.channels.direct === "live").length} listings published</td>
              <td className="px-3 py-2.5"><Dot tone="ok" label="live" /></td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-mute">just now</td>
              <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold">0%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ConnectWizard open={wizard} onClose={() => setWizard(false)} />
    </div>
  );
}

function ConnectWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { retrySync, toast } = useApp();
  const sync = useApp((s) => s.sync);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<ChannelDef | null>(null);
  const authLabel = (c: ChannelDef) =>
    c.auth === "oauth" ? "One-click sign-in — listings import automatically" :
    c.auth === "extranet" ? "Extranet login + property/hotel ID" :
    c.auth === "email_code" ? "Login, then a verification code emailed to you" : "API key + secret from the partner portal";

  const finish = () => {
    const key = sync.find((s) => s.state === "error");
    if (key) retrySync(key.key);
    toast("ok", `${picked?.name} connected & synced`, "Wizard completed without touching the database — mapping went live, first full push acked.");
    setStep(0); setPicked(null); onClose();
  };

  return (
    <Modal open={open} onClose={() => { setStep(0); setPicked(null); onClose(); }} title={`Connect a channel — step ${step + 1} of 3`} w={620}
      footer={<>
        {step > 0 && <Btn variant="ghost" icon="chevL" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < 2 && <Btn variant="solid" disabled={step === 0 && !picked} onClick={() => setStep(step + 1)}>Continue <Ic name="chevR" size={12} /></Btn>}
        {step === 2 && <Btn variant="solid" icon="check" onClick={finish}>Finish — start syncing</Btn>}
      </>}>
      {step === 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OTA_LAUNCH.map((cid) => {
            const c = channelDef(cid);
            return (
              <button key={cid} onClick={() => setPicked(c)} className={cx("flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all", picked?.id === cid ? "border-brand bg-brand-soft shadow-sm" : "border-line hover:border-line2")}>
                <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface"><ChannelMark id={c.id} size={24} /></span>
                <span className="text-[11px] font-bold text-ink">{c.name}</span>
                <span className="text-[8.5px] font-bold uppercase text-faint">{c.structure}</span>
              </button>
            );
          })}
          <button className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-line2 p-3 text-mute"><Ic name="calendar" size={18} /><span className="text-[11px] font-bold">iCal</span><span className="text-[8.5px] font-bold uppercase">fast path</span></button>
        </div>
      )}
      {step === 1 && picked && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[13px] font-bold text-ink"><ChannelMark id={picked.id} size={22} /> Authenticate — {authLabel(picked)}</p>
          {picked.auth === "oauth" && <Btn variant="solid" icon="external" className="w-full" size="md" onClick={() => setStep(2)}>Sign in with {picked.name} (OAuth)</Btn>}
          {picked.auth === "extranet" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Extranet username"><Input placeholder="sanggraha@…" /></Field>
              <Field label="Property / hotel ID"><Input placeholder="e.g. 8841209" /></Field>
            </div>
          )}
          {picked.auth === "email_code" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account email"><Input placeholder="owner@…" /></Field>
              <Field label="Verification code (emailed)"><Input placeholder="6 digits" /></Field>
            </div>
          )}
          {picked.auth === "api_key" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="API key"><Input placeholder="mmt_live_…" /></Field>
              <Field label="API secret"><Input type="password" placeholder="••••••••" /></Field>
            </div>
          )}
          <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Tokens are scoped, rotatable and encrypted at rest. Multiple accounts per OTA are supported.</p>
        </div>
      )}
      {step === 2 && picked && (
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-ink">Map {picked.structure === "hotel" ? "room types & rate plans" : "listings"} — nothing goes live unmapped.</p>
          {[["Deluxe King Room", "Samudra Two (SM2)"], ["Garden Villa 2BR", "Samudra One (SM1)"], ["Cliff Pool Villa", "Villa Anggrek (ANG)"]].map(([from, to]) => (
            <div key={from} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              <span className="flex-1 font-mono text-[11.5px] font-bold text-mute">{from}</span>
              <Ic name="arrowR" size={13} className="text-faint" />
              <Select defaultValue={to} className="!h-8 !w-[190px] !text-[11.5px]" aria-label={`Map ${from}`}>
                <option>{to}</option><option>Samudra Three (SM3)</option><option>Villa Cemara (CEM)</option>
              </Select>
              <Badge tone="ok">suggested</Badge>
            </div>
          ))}
          <p className="text-[11px] text-mute">Inbound reservations for unmapped types are quarantined in the conflict queue with a suggestion — never dropped, never force-assigned.</p>
        </div>
      )}
    </Modal>
  );
}

function SyncHealth({ embedded }: { embedded: boolean }) {
  const { sync, retrySync, toast } = useApp();
  const [openFail, setOpenFail] = useState<string | null>(null);
  const alerts = sync.filter((s) => s.state === "error" || Date.now() - s.lastSuccessTs > 2 * 3_600_000);
  return (
    <div className="space-y-3">
      <div className={cx("rounded-xl border px-4 py-3", alerts.length ? "border-danger/50 bg-danger-soft" : "border-brand/40 bg-brand-soft")}>
        <p className={cx("flex items-center gap-2 text-[13px] font-bold", alerts.length ? "text-danger" : "text-brand-deep")}>
          <Ic name={alerts.length ? "alertTri" : "checkCircle"} size={16} />
          {alerts.length ? `${alerts.length} connections need attention — sync failure is a product surface here, not a background job.` : "All connections healthy — every push acked inside 60s."}
        </p>
        <p className={cx("mt-0.5 text-[11px] font-semibold", alerts.length ? "text-[#93331f]" : "text-brand-deep")}>
          Alerts fire on: no successful sync in 2h · a rate/availability push failing 3+ times · inbound reservations that fail to map · endpoints failing consistently. Alerts are dismissible only after resolution.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
              <th className="px-4 py-2.5">Connection</th><th className="px-3 py-2.5">Last success</th><th className="px-3 py-2.5 text-right">Queue</th>
              <th className="px-3 py-2.5 text-right">Error rate 24h</th><th className="px-3 py-2.5">Last failure</th><th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sync.map((s) => {
              const p = propertyById(s.propertyId);
              const c = channelDef(s.channel);
              const stale = Date.now() - s.lastSuccessTs > 2 * 3_600_000;
              return (
                <Fragment key={s.key}>
                <tr className={cx("border-b border-line/60", s.state === "error" && "bg-danger-soft/30")}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
                      <span className="flex h-6 w-9 items-center justify-center rounded text-[8.5px] font-bold text-white" style={{ background: c.color }}>{c.short}</span>
                      {p.name}
                      {s.state === "live" ? <Dot tone="ok" label="live" /> : s.state === "error" ? <Dot tone="danger" label="error" pulse /> : <Dot tone="warn" label={s.state} />}
                    </span>
                  </td>
                  <td className={cx("px-3 py-2.5 font-mono text-[11.5px] font-bold", stale ? "text-danger" : "text-mute")}>{timeAgo(s.lastSuccessTs)}{stale && " · stale"}</td>
                  <td className={cx("px-3 py-2.5 text-right font-mono text-[12px] font-bold", s.queueDepth > 5 ? "text-danger" : "text-ink")}>{s.queueDepth}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10.5px] font-bold", s.errorRate24h > 0.2 ? "bg-danger-soft text-danger" : s.errorRate24h > 0.05 ? "bg-gold-soft text-[#8a5c07]" : "bg-brand-soft text-brand-deep")}>{Math.round(s.errorRate24h * 100)}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {s.lastFailure ? (
                      <button className="text-left" onClick={() => setOpenFail(openFail === s.key ? null : s.key)}>
                        <span className="block font-mono text-[10.5px] font-bold text-danger">{s.lastFailure.cls}</span>
                        <span className="text-[10px] text-faint">{timeAgo(s.lastFailure.ts)} · view raw</span>
                      </button>
                    ) : <span className="text-[11px] text-faint">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {(s.state === "error" || stale) && <Btn size="xs" variant="danger" icon="refresh" onClick={() => retrySync(s.key)}>Re-sync</Btn>}
                  </td>
                </tr>
                {openFail === s.key && s.lastFailure && (
                  <tr className="bg-pine-950">
                    <td colSpan={6} className="px-4 py-3">
                      <pre className="overflow-x-auto font-mono text-[10.5px] leading-relaxed text-pine-100">
                        <span className="text-[#5BCBA9]">TRACE tr-88f21c · credentials redacted</span>{"\n→ "}{s.lastFailure.request}{"\n← "}{s.lastFailure.response}
                      </pre>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="font-display text-[13px] font-bold text-ink">Durable pipeline</h4>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mute">Every push goes through a queue with idempotency keys, exponential backoff, dead-letter and alerting. Kill the worker mid-push and restart — no duplicates, no lost updates.</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="font-display text-[13px] font-bold text-ink">Business metrics</h4>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mute">Bookings created, auto-sent vs escalated messages, overdue tasks — product regressions show up here before anyone reads a log.</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="font-display text-[13px] font-bold text-ink">Per-channel money</h4>
          <p className="mt-1 text-[11.5px] leading-relaxed text-mute">Markups modelled per channel: the same IDR base lands at different OTA prices, and each converted amount stores its FX rate + timestamp for drift-free history.</p>
        </div>
      </div>
      {embedded && <p className="text-[10.5px] text-faint">{fmtDateTime(Date.now())} · polling every 30s · structured logs carry tenant, actor and correlation IDs.</p>}
    </div>
  );
}

function Conflicts() {
  const { conflicts, resolveConflict } = useApp();
  return (
    <div className="space-y-2.5">
      {conflicts.length === 0 && <Empty icon="checkCircle" title="Conflict queue is clear" body="Inbound reservations that can't map land here with a suggestion — never dropped, never force-assigned." />}
      {conflicts.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/50 bg-card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface"><ChannelMark id={c.channel} size={24} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">Inbound {channelDef(c.channel).name} reservation {c.externalRef} — room type “{c.rawRoomType}” is unmapped</p>
            <p className="text-[11.5px] text-mute">{c.nights} nights · {money(c.total, "USD")} · held safely, guest not affected · {timeAgo(c.ts)}</p>
            <p className="mt-1 text-[11.5px] font-bold text-brand-deep">Suggested mapping: {suggestion(c)}</p>
          </div>
          <Btn size="sm" variant="solid" icon="check" onClick={() => resolveConflict(c.id, true)}>Approve mapping</Btn>
          <Btn size="sm" variant="ghost" onClick={() => resolveConflict(c.id, false)}>Return to channel</Btn>
        </div>
      ))}
    </div>
  );
}
function suggestion(c: { suggestion: string }) { return c.suggestion; }
