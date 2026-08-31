import { useState } from "react";
import { cx, timeAgo, copyText } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Field, Input, Modal, Select, Tabs, Toggle } from "../components/ui";
import { useApp } from "../store";
import { WORKSPACE, CHANNEL_DEFS } from "../lib/data";
import { EVENT_CATALOGUE, API_CONVENTIONS } from "../lib/reference";
import { ChannelMark } from "../components/ota";

export default function Integrations() {
  const [tab, setTab] = useState("apps");
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "apps", label: "Connected apps" }, { id: "webhooks", label: "Webhooks" }, { id: "api", label: "REST & GraphQL API" }, { id: "messaging", label: "Messaging & identity" }]} active={tab} onChange={setTab} />
      {tab === "apps" && <Apps />}
      {tab === "webhooks" && <Webhooks />}
      {tab === "api" && <Api />}
      {tab === "messaging" && <Messaging />}
    </div>
  );
}

const APPS: { cat: string; icon: IconName; items: { name: string; status: "connected" | "available" | "waitlist"; note: string }[] }[] = [
  {
    cat: "The three the others forgot", icon: "sparkle",
    items: [
      { name: "RatePilot · dynamic pricing", status: "connected", note: "PriceLabs / Beyond / Wheelhouse-style feed into the “Dynamic” rate plan — suggestions await review, never auto-apply." },
      { name: "LedgerSync · accounting", status: "connected", note: "Xero & QuickBooks: mapped chart of accounts, expenses/invoices/payouts reconciled monthly." },
      { name: "DoorFlow · smart locks", status: "connected", note: "Nuki, TTLock, August, Igloohome — codes issue at ID-verification and revoke at checkout, tied to reservation windows." },
    ],
  },
  {
    cat: "Payments — shipped working, honestly", icon: "card",
    items: [
      { name: "Stripe", status: "connected", note: "Hosted fields only — raw card data never touches DERZEN (PCI-minimised)." },
      { name: "Razorpay", status: "available", note: "UPI + cards for INR direct bookings. Connect in two minutes." },
      { name: "Offline / bank transfer", status: "available", note: "Free-form instructions rendered verbatim on quotes & PDFs." },
      { name: "HitPay · Xendit · DOKU", status: "waitlist", note: "In development. We'd rather ship two gateways that work than five that don't." },
    ],
  },
  {
    cat: "Calendar & places", icon: "calendar",
    items: [
      { name: "iCal import / export", status: "connected", note: "Per-listing feeds — the 10-minute fast path for new workspaces." },
      { name: "Places & Maps", status: "connected", note: "Powers guidebook recommendations + address geocoding." },
    ],
  },
];

function Apps() {
  const { toast } = useApp();
  return (
    <div className="space-y-4">
      {APPS.map((g) => (
        <div key={g.cat} className="rounded-xl border border-line bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name={g.icon} size={15} className="text-brand" /> {g.cat}</h3>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((a) => (
              <div key={a.name} className={cx("rounded-lg border p-3", a.status === "connected" ? "border-brand/40 bg-brand-soft/40" : a.status === "available" ? "border-line" : "border-dashed border-line2")}>
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-ink">{a.name}</p>
                  {a.status === "connected" ? <Dot tone="ok" label="connected" /> : a.status === "available" ? <Dot tone="info" label="available" /> : <Dot tone="mute" label="waitlist" />}
                </div>
                <p className="mt-1 text-[10.5px] leading-snug text-mute">{a.note}</p>
                {a.status !== "connected" && (
                  <Btn size="xs" className="mt-2" icon={a.status === "available" ? "plug" : "clock"} onClick={() => toast(a.status === "available" ? "ok" : "info", a.status === "available" ? `${a.name} connected` : "Added to waitlist", a.status === "available" ? "Scopes granted · first sync queued." : "We'll email you the day it ships.")}>
                    {a.status === "available" ? "Connect" : "Join waitlist"}
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Webhooks() {
  const { webhooks, replayWebhook, toast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState("");
  const wh = webhooks[0];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-mute">Every delivery signed <code className="font-mono text-[11px]">HMAC-SHA256(timestamp + body)</code> · 5-minute replay window · exponential backoff ×5 · dead-letter with alert.</p>
        <Btn variant="solid" icon="plus" onClick={() => setAddOpen(true)}>Add endpoint</Btn>
      </div>
      <div className="rounded-xl border border-line bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <code className="font-mono text-[12px] font-bold text-ink">{wh.url}</code>
          <Badge tone="ok">active</Badge>
          <Badge tone="mute">secret: {wh.secret}</Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <Toggle checked={wh.active} onChange={() => toast("info", "Endpoint toggled")} label="Endpoint active" />
            <Btn size="xs" icon="code" onClick={() => toast("info", "Rotate secret", "Old secret stays valid for 24h for zero-downtime rotation.")}>Rotate secret</Btn>
          </div>
        </header>
        <div className="px-4 py-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">Subscribed events</p>
          <div className="flex flex-wrap gap-1.5">{wh.events.map((e) => <Badge key={e} tone="info">{e}</Badge>)}</div>
        </div>
        <table className="mt-1 w-full text-left">
          <thead><tr className="border-y border-line text-[10px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2">Delivery</th><th className="px-3 py-2">Event</th><th className="px-3 py-2 text-right">Status</th><th className="px-3 py-2 text-right">Latency</th><th className="px-3 py-2">Response</th><th className="px-3 py-2" /></tr></thead>
          <tbody>
            {wh.deliveries.map((d) => (
              <tr key={d.id} className="border-b border-line/50">
                <td className="px-4 py-2 font-mono text-[10.5px] text-mute">{timeAgo(d.ts)}</td>
                <td className="px-3 py-2 font-mono text-[11px] font-bold">{d.event}</td>
                <td className="px-3 py-2 text-right">
                  <span className={cx("rounded-full px-2 py-0.5 font-mono text-[10.5px] font-bold", d.status < 300 ? "bg-brand-soft text-brand-deep" : d.status === 202 ? "bg-sea-soft text-sea" : "bg-danger-soft text-danger")}>{d.status}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[11px]">{d.ms}ms</td>
                <td className="max-w-[280px] truncate px-3 py-2 font-mono text-[10px] text-mute">{d.response}</td>
                <td className="px-3 py-2 text-right"><Btn size="xs" variant="ghost" icon="refresh" onClick={() => replayWebhook(wh.id, d.id)}>Replay</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Register webhook endpoint" w={480}
        footer={<><Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn><Btn variant="solid" icon="webhook" onClick={() => { setAddOpen(false); toast("ok", "Endpoint registered", "Signing secret generated — a test delivery is on its way."); }}>Register</Btn></>}>
        <div className="space-y-3">
          <Field label="HTTPS URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourapp.com/hooks/derzen" /></Field>
          <Field label="Events — from the versioned catalogue" hint="subscription filtering · at-least-once delivery · HMAC-signed">
            <EventPicker />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function EventPicker() {
  const [subs, setSubs] = useState<Set<string>>(() => new Set(["reservation.created", "reservation.modified", "reservation.cancelled", "payment.captured", "review.received"]));
  const toggle = (name: string) => {
    const next = new Set(subs);
    if (next.has(name)) next.delete(name); else next.add(name);
    setSubs(next);
  };
  return (
    <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-md border border-line bg-paper/50 p-2.5">
      {EVENT_CATALOGUE.map((g) => (
        <div key={g.resource}>
          <p className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-widest text-faint">{g.resource}</p>
          <div className="flex flex-wrap gap-1">
            {g.events.map((e) => {
              const on = subs.has(e.name);
              return (
                <button key={e.name} type="button" onClick={() => toggle(e.name)} aria-pressed={on}
                  className={cx("rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold transition-colors", on ? "border-brand bg-brand-soft text-brand-deep" : "border-line bg-card text-mute hover:border-line2")}>
                  {on ? "✓ " : ""}{e.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="pt-1 font-mono text-[9.5px] font-bold text-mute">{subs.size} subscribed · naming is resource.past_tense · versions are additive-only</p>
    </div>
  );
}

function Api() {
  const { toast } = useApp();
  const [keys, setKeys] = useState([{ id: "k1", name: "Zapier sync", prefix: "tr_live_8f2k…", scopes: "reservations:read, calendar:read", created: Date.now() - 12 * 86_400_000 }]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Scoped API keys</h3>
          <Btn size="xs" variant="solid" icon="plus" onClick={() => { setKeys([{ id: `k${Date.now()}`, name: "New key", prefix: `tr_live_${Math.random().toString(36).slice(2, 6)}…`, scopes: "reservations:read", created: Date.now() }, ...keys]); toast("ok", "Key created", "Shown once — copy it now."); }}>Create key</Btn>
        </div>
        {keys.map((k) => (
          <div key={k.id} className="mb-2 rounded-lg border border-line px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Ic name="key" size={13} className="text-mute" />
              <span className="text-[12.5px] font-bold text-ink">{k.name}</span>
              <code className="font-mono text-[10.5px] text-mute">{k.prefix}</code>
              <span className="ml-auto text-[10px] text-faint">{timeAgo(k.created)}</span>
              <Btn size="xs" variant="ghost" icon="trash" onClick={() => { setKeys(keys.filter((x) => x.id !== k.id)); toast("warn", "Key revoked", "Requests using it now 401 immediately."); }}>Revoke</Btn>
            </div>
            <p className="mt-1 text-[10.5px] font-semibold text-mute">scopes: {k.scopes} · tenant rate limit 120 req/min</p>
          </div>
        ))}
        <div className="mt-2 space-y-1 rounded-md bg-paper px-3 py-2">
          {API_CONVENTIONS.slice(0, 4).map((c) => (
            <p key={c.rule} className="flex items-baseline gap-2 text-[10.5px]"><code className="shrink-0 font-mono font-bold text-brand-deep">{c.rule}</code><span className="text-mute">{c.detail}</span></p>
          ))}
          <p className="pt-1 font-mono text-[9.5px] text-faint">OpenAPI generated from the implementation — never maintained by hand</p>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Try it</h3>
        <pre className="overflow-x-auto rounded-lg bg-pine-950 p-3 font-mono text-[10.5px] leading-relaxed text-pine-100">
{`curl https://api.derzen.site/v1/reservations?cursor=… \\
  -H "Authorization: Bearer tr_live_8f2k…" \\
  -H "Idempotency-Key: 01HXYZ…"

→ 200 { "data": [ { "ref": "R-2418", … } ],
        "next_cursor": "c_9f2" }`}
        </pre>
        <div className="mt-2 flex gap-2">
          <Btn size="sm" icon="external" onClick={() => toast("info", "Opening API reference", "api.derzen.site/docs — live against your sandbox tenant.")}>OpenAPI docs</Btn>
          <Btn size="sm" variant="ghost" icon="copy" onClick={() => { copyText("https://api.derzen.site/v1"); toast("ok", "Base URL copied"); }}>Copy base URL</Btn>
        </div>
      </div>
    </div>
  );
}

const MSG_ICONS: Record<string, IconName> = { whatsapp: "whatsapp", gmail: "mail", instagram: "chat", messenger: "msg" };

function Messaging() {
  const msgConnections = useApp((s) => s.msgConnections);
  const { connectMsgPlatform, disconnectMsgPlatform, reconnectMsgPlatform, navigate } = useApp();
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5">
        <span className={cx("h-2 w-2 rounded-full", msgConnections.some((c) => c.status === "connected") ? "bg-brand dot-pulse" : "bg-line2")} />
        <p className="text-[12px] font-bold text-ink">{msgConnections.filter((c) => c.status === "connected").length} of {msgConnections.length} chat platforms live</p>
        <p className="hidden text-[11px] text-mute sm:block">· inbound threads land in the unified inbox within seconds</p>
        <Btn size="xs" variant="ghost" className="ml-auto" icon="inbox" onClick={() => navigate("/inbox")}>Open inbox</Btn>
      </div>

      {msgConnections.map((c) => (
        <div key={c.id} className={cx("rounded-xl border bg-card p-4 transition-colors", c.status === "connected" ? "border-brand/35" : "border-line")}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", c.status === "connected" ? "bg-brand-soft text-brand-deep" : "bg-paper text-mute")}>
              <Ic name={MSG_ICONS[c.id] ?? "chat"} size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink">
                {c.name}
                {c.status === "connected" && <Dot tone="ok" label="connected" />}
                {c.status === "connecting" && <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-gold"><span className="h-3 w-3 rounded-full border-2 border-gold/30 border-t-gold anim-spin" /> authorising…</span>}
                {c.status === "disconnected" && <Dot tone="mute" label="disconnected" />}
                {c.status === "error" && <Dot tone="danger" label="error" />}
              </p>
              <p className="text-[11px] leading-snug text-mute">{c.note}</p>
              {c.status === "connected" && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-faint">
                  {c.identity && <span className="rounded-sm bg-paper px-1.5 py-0.5 font-bold text-mute">{c.identity}</span>}
                  {c.lastSync && <span>last sync {timeAgo(c.lastSync)}</span>}
                  <span className="hidden items-center gap-1 sm:flex">{c.scopes.map((s) => <span key={s} className="rounded-sm border border-line px-1 py-px">{s}</span>)}</span>
                </p>
              )}
            </div>
            <div className="flex gap-1.5">
              {c.status === "connected" && <Btn size="sm" variant="ghost" icon="x" onClick={() => disconnectMsgPlatform(c.id)}>Disconnect</Btn>}
              {c.status === "disconnected" && <Btn size="sm" variant="solid" icon="plug" onClick={() => connectMsgPlatform(c.id)}>Connect</Btn>}
              {c.status === "error" && <Btn size="sm" variant="solid" icon="refresh" onClick={() => reconnectMsgPlatform(c.id)}>Reconnect</Btn>}
            </div>
          </div>
        </div>
      ))}

      {/* OTA native chat — two-way guest messaging that rides on channel connections */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-mute"><Ic name="globe" size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">OTA native chat</p>
            <p className="text-[11px] text-mute">Two-way guest messaging on channels that support it — threads unify into the same inbox.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CHANNEL_DEFS.filter((c) => c.replyWindowH !== null).map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/60 px-3 py-2">
              <ChannelMark id={c.id} size={18} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold text-ink">{c.name}</p>
                <p className="font-mono text-[9.5px] text-faint">reply window {c.replyWindowH}h</p>
              </div>
              <Dot tone="ok" label="live" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-deep"><Ic name="shield" size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-bold text-ink">ID verification & web check-in <Dot tone="ok" label="connected" /></p>
          <p className="text-[11px] leading-snug text-mute">Document capture + liveness + sanction screening. Writes a verification status to the reservation and gates access-code release. Raw documents purged after the retention window — only status, provider ref and expiry are stored.</p>
        </div>
      </div>

      <p className="rounded-lg border border-line bg-card px-4 py-3 text-[11px] text-mute">Retention: guest PII purges automatically after checkout + N days (configurable). Logs and AI prompts redact identity fields unless the task requires them. {WORKSPACE.name} current window: 90 days.</p>
    </div>
  );
}
