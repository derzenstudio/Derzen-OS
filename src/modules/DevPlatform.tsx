import { useState } from "react";
import { cx, timeAgo, pct } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, Modal, Select, Spark, Textarea, Input } from "../components/ui";
import { useApp } from "../store";
import {
  AGENCY_ACCOUNTS, AI_COST, AI_ESCALATIONS, ANNOUNCEMENTS, BACKFILL_JOBS, BLOCKLIST, CAP_LABELS, CAPABILITY_MATRIX,
  ADAPTERS, CERT_SCENARIOS, COMING_SOON, DELIVERABILITY, DUNNING_SEQUENCE, EVAL_RUNS, FAILED_PAYMENTS,
  FAILED_WEBHOOKS, HITL_STATS, INSPECTOR_ENTITY, KB_COVERAGE, LIFECYCLE_STATES, MERGE_SPLIT_JOBS,
  METERING_EVENTS, MODEL_ROUTER, MRR_WATERFALL, ONBOARDING_FUNNEL, ORCHESTRATOR, PLATFORM_FLAGS,
  PLAN_CATALOG, PROMPT_REGISTRY, PROVIDER_WATCHLIST, QUARANTINED_RESERVATIONS, QUOTAS, RECONCILIATION,
  STUCK_JOBS, FAILING_CONNECTIONS, TEMPLATE_GOVERNANCE, TENANT_DETAIL, THROTTLE_STATE, TRANSPORTS, VAULT,
  type OpsItem,
} from "../lib/platform";

// ── shared bits ────────────────────────────────────────────────────────────
export function Panel({ title, note, children, right }: { title: string; note?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-display text-[14px] font-bold text-white">{title}</h2>
          {note && <p className="text-[10.5px] text-white/40">{note}</p>}
        </div>
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

const sevTone: Record<OpsItem["severity"], string> = { p1: "bg-[#3d1f1f] text-[#f08c8c]", p2: "bg-[#3a3320] text-[#e2a33c]", p3: "bg-white/5 text-white/50" };
function Sev({ s }: { s: OpsItem["severity"] }) {
  return <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase", sevTone[s])}>{s}</span>;
}
const srcChip: Record<string, string> = { ui: "bg-white/10 text-white/70", ai: "bg-[#1b2f3d] text-[#9cc3d8]", automation: "bg-[#3a3320] text-[#e2a33c]", channel_sync: "bg-[#173042] text-[#8fc4dd]", api: "bg-[#1d3527] text-[#4CC38A]", system: "bg-white/5 text-white/40" };
export function SourceChip({ s }: { s: string }) {
  return <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", srcChip[s] ?? srcChip.system)}>{s.replace("_", " ")}</span>;
}

// ── Section A · Global operations queues ───────────────────────────────────
function Queue({ title, items, tone, onInspect }: { title: string; items: OpsItem[]; tone: "danger" | "warn"; onInspect?: () => void }) {
  const { toast } = useApp();
  const [list, setList] = useState(items);
  return (
    <Panel
      title={title}
      note={list.length === 0 ? "clear — nothing to work" : `${list.length} item${list.length > 1 ? "s" : ""} · sorted oldest first`}
      right={<span className={cx("rounded-full px-2.5 py-1 font-mono text-[11px] font-bold", list.length ? (tone === "danger" ? "bg-[#3d1f1f] text-[#f08c8c]" : "bg-[#3a3320] text-[#e2a33c]") : "bg-[#1d3527] text-[#4CC38A]")}>{list.length}</span>}
    >
      {list.length === 0 && <p className="py-4 text-center font-mono text-[11px] text-[#4CC38A]">✓ queue clear</p>}
      {list.map((q) => (
        <div key={q.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 last:mb-0">
          <Sev s={q.severity} />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-white/90">{q.label} <span className="font-mono text-[9.5px] font-normal text-white/35">· {q.tenant}</span></p>
            <p className="text-[10.5px] text-white/45">{q.detail} <span className="font-mono text-white/30">· {q.meta}</span></p>
          </div>
          <span className="font-mono text-[10px] text-white/35">{timeAgo(q.since)}</span>
          <div className="flex gap-1.5">
            {onInspect && <Btn size="xs" variant="ghost" className="text-white/70" icon="eye" onClick={onInspect}>Inspect</Btn>}
            <Btn size="xs" variant="ghost" className="text-white/70" icon="refresh" onClick={() => { setList(list.filter((x) => x.id !== q.id)); toast("ok", "Requeued with fresh idempotency key", q.label); }}>Requeue</Btn>
          </div>
        </div>
      ))}
    </Panel>
  );
}

export function OpsQueues({ onInspect }: { onInspect: () => void }) {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 rounded-lg border border-[#5a2020] bg-[#1c0f0f] px-4 py-2.5 text-[11.5px] text-white/70">
        <Ic name="alertTri" size={14} className="text-[#f08c8c]" />
        These queues cut across <b className="text-white">every tenant</b>. The reference failure — an 11-day sync gap — is only preventable if your team sees it before the customer does. Alert thresholds: sync gap &gt;2h · push fails &gt;3× · unmapped inbound · endpoint failures.
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Queue title="Failing channel connections" items={FAILING_CONNECTIONS} tone="danger" />
        <Queue title="Quarantined inbound reservations" items={QUARANTINED_RESERVATIONS} tone="warn" onInspect={onInspect} />
        <Queue title="Stuck background jobs" items={STUCK_JOBS} tone="warn" />
        <Queue title="Webhook endpoints failing" items={FAILED_WEBHOOKS} tone="warn" />
        <Queue title="AI escalations breaching SLA" items={AI_ESCALATIONS} tone="danger" />
        <Queue title="Failed payments" items={FAILED_PAYMENTS} tone="warn" />
      </div>
    </div>
  );
}

// ── Section A · Entity inspector ───────────────────────────────────────────
export function Inspector() {
  const { toast } = useApp();
  const [kind, setKind] = useState("reservation");
  const e = INSPECTOR_ENTITY;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onChange={(ev) => setKind(ev.target.value)} className="!w-[180px] bg-[#171714] text-white border-white/15" aria-label="Entity kind">
          <option value="reservation">Reservation</option><option value="listing">Listing</option><option value="conversation">Conversation</option><option value="rateplan">Rate plan</option>
        </Select>
        <code className="rounded-md border border-white/15 bg-[#171714] px-3 py-2 font-mono text-[11.5px] font-bold text-white">{e.ref}</code>
        <Badge tone="mute">tenant {e.tenant}</Badge>
        <span className="font-mono text-[10px] text-white/35">deep link: admin.derzen.site/inspect/{kind}/{e.ref.toLowerCase()}</span>
        <Btn size="xs" className="ml-auto" icon="copy" onClick={() => { navigator.clipboard?.writeText(`admin.derzen.site/inspect/${kind}/${e.ref.toLowerCase()}`).catch(() => undefined); toast("ok", "Deep link copied", "Paste into a support ticket — opens this exact view."); }}>Copy deep link</Btn>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Normalised record — every field carries its source" note="read-only · the single feature that cuts support resolution time most">
          <table className="w-full text-left">
            <tbody>
              {e.normalized.map((f) => (
                <tr key={f.field} className="border-b border-white/5">
                  <td className="py-2 pr-3 font-mono text-[11px] font-bold text-white/70">{f.field}</td>
                  <td className="py-2 pr-3 text-[11.5px] text-white/85">{f.value}</td>
                  <td className="py-2 pr-3"><SourceChip s={f.source} /></td>
                  <td className="py-2 text-[10px] text-white/35">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] font-bold text-white/50">Mutation history</p>
          <ol className="mt-1.5">
            {e.mutations.map((m, i) => (
              <li key={i} className="relative pb-2.5 pl-5 last:pb-0">
                {i < e.mutations.length - 1 && <span className="absolute left-[5px] top-3.5 h-full w-px bg-white/10" />}
                <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[#0a0a09] bg-[#4CC38A]" />
                <p className="text-[11.5px] text-white/80">{m.text}</p>
                <p className="font-mono text-[9.5px] text-white/35">{m.actor} · {timeAgo(m.ts)}</p>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Raw provider payload (redacted)" note="captured by the record/replay proxy · PII masked">
          <pre className="overflow-x-auto rounded-lg bg-[#050505] p-3.5 font-mono text-[10.5px] leading-relaxed text-[#8fd6b4]">{e.rawPayload}</pre>
          <p className="mt-3 rounded-md border border-white/10 px-3 py-2 text-[10.5px] text-white/45">
            <b className="text-white/70">Support runbook:</b> compare <code>unit-night locks</code> against the calendar, then replay the push from the orchestrator tab if a channel missed the change.
          </p>
        </Panel>
      </div>
    </div>
  );
}

// ── Section A · Tenant deep-dive + action panel ────────────────────────────
export function TenantDetail({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const { tenants, toast, setTenantFeature } = useApp();
  const t = tenants.find((x) => x.id === tenantId)!;
  const d = TENANT_DETAIL[tenantId] ?? TENANT_DETAIL["t-sanggraha"];
  const [action, setAction] = useState<{ label: string; destructive: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [secondOk, setSecondOk] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const run = () => {
    if (!action || reason.trim().length < 8) return;
    if (action.destructive && !secondOk) return;
    setLog([`${new Date().toLocaleTimeString()} · ${action.label} — reason: “${reason.trim()}”${action.destructive ? " · 2-person approved (you + R. Chen)" : ""}`, ...log]);
    toast(action.destructive ? "warn" : "ok", `${action.label} executed`, "Permissioned, reason-required, audited" + (action.destructive ? " · two-person rule satisfied" : ""));
    setAction(null); setReason(""); setSecondOk(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-bold text-white/50 hover:text-white"><Ic name="chevL" size={13} /> Tenant directory</button>
      <header className="rounded-xl border border-white/10 bg-[#0a0a09] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white font-display text-[16px] font-extrabold text-ink">{t.name.slice(0, 1)}</span>
          <div>
            <h2 className="font-display text-[20px] font-extrabold text-white">{t.name}</h2>
            <p className="font-mono text-[10.5px] text-white/40">{t.id} · {t.subdomain}.derzen.site · region ap-southeast-1 · health {t.suspended ? "suspended" : "good"}</p>
          </div>
          <div className="ml-auto grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 text-center">
            {[["MRR", `$${t.mrr}`], ["Plan", t.plan], ["Units", "9 / 15"], ["Error 30d", "3.2%"]].map(([k, v]) => (
              <div key={k} className="bg-[#0a0a09] px-4 py-2">
                <p className="text-[8.5px] font-bold uppercase tracking-widest text-white/30">{k}</p>
                <p className="font-mono text-[13px] font-bold text-white/90">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Users & last login">
          {d.users.map((u) => (
            <div key={u.email} className="mb-2 flex items-center gap-2.5 rounded-lg border border-white/10 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white/85">{u.name}</p>
                <p className="font-mono text-[9.5px] text-white/35">{u.email}</p>
              </div>
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-white/50">{u.role}</span>
              <span className="font-mono text-[9.5px] text-white/35">{u.lastLogin}</span>
            </div>
          ))}
          <Panel title="Open tickets" note="">
            {d.tickets.map((tk) => <p key={tk.id} className="mb-1 flex items-center gap-2 text-[11.5px] text-white/70"><Badge tone={tk.state === "open" ? "danger" : "warn"}>{tk.state}</Badge> {tk.id} · {tk.subject}</p>)}
          </Panel>
        </Panel>

        <Panel title="Billing & error rate" note="invoice history + 30-day API error %">
          {d.invoices.map((iv) => (
            <p key={iv.ref} className="mb-1.5 flex items-center gap-2 font-mono text-[11px] text-white/70">
              {iv.ref} <span className="text-white/35">{iv.date}</span>
              <span className="ml-auto font-bold text-white/90">{iv.amount}</span>
              <Badge tone={iv.status === "paid" ? "ok" : "danger"}>{iv.status}</Badge>
            </p>
          ))}
          <div className="mt-3">
            <Spark points={d.errorRate30d} color="#B42318" h={52} w={280} />
            <p className="mt-1 font-mono text-[9.5px] text-white/35">30d error rate · spike = VRBO auth expiry window</p>
          </div>
        </Panel>

        <Panel title="Audit · last events" note="actor · source · reversibility">
          {d.audit.map((a, i) => (
            <div key={i} className="mb-2 border-b border-white/5 pb-2 last:border-0">
              <p className="text-[11px] text-white/80">{a.action}</p>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] text-white/35">{a.actor} · {timeAgo(a.ts)} <SourceChip s={a.source} /> {a.reversible && <span className="text-[#4CC38A]">reversible</span>}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Feature-flag overrides for this tenant" note="edits propagate instantly via entitlement cache invalidation">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {["concierge", "websites", "reviews", "channels", "quotes", "reports"].map((k) => (
              <label key={k} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
                <span className="text-[12px] font-semibold capitalize text-white/75">{k}</span>
                <ToggleMini checked={t.features[k] !== false} onChange={(v) => { setTenantFeature(t.id, k, v); toast("info", `${k} ${v ? "enabled" : "disabled"} for ${t.name}`); }} label={`${k} for ${t.name}`} />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Action panel — graduated privileges" note="permissioned · reason-required · rate-limited · audited · reversible where possible">
          <div className="flex flex-wrap gap-2">
            <Btn size="sm" variant="ghost" className="text-white/75" icon="refresh" onClick={() => setAction({ label: "Retry all channel syncs", destructive: false })}>Retry syncs</Btn>
            <Btn size="sm" variant="ghost" className="text-white/75" icon="clock" onClick={() => setAction({ label: "Extend trial +14 days", destructive: false })}>Extend trial</Btn>
            <Btn size="sm" variant="ghost" className="text-white/75" icon="grid" onClick={() => setAction({ label: "Adjust billable unit count", destructive: false })}>Adjust units</Btn>
            <Btn size="sm" variant="ghost" className="text-white/75" icon="sparkle" onClick={() => setAction({ label: "Force knowledge-base reindex", destructive: false })}>Reindex KB</Btn>
            <Btn size="sm" variant="ghost" className="text-white/75" icon="key" onClick={() => setAction({ label: "Rotate tenant API keys", destructive: true })}>Rotate API keys</Btn>
            <Btn size="sm" variant="danger" icon="trash" onClick={() => setAction({ label: "PURGE tenant data", destructive: true })}>Purge tenant</Btn>
          </div>
          {log.length > 0 && (
            <div className="mt-3 rounded-lg bg-[#050505] p-3">
              {log.map((l, i) => <p key={i} className="mb-1 font-mono text-[10px] leading-relaxed text-[#8fd6b4]">{l}</p>)}
            </div>
          )}
        </Panel>
      </div>

      <Modal open={!!action} onClose={() => setAction(null)} title={action?.label ?? ""} w={460}
        footer={<>
          <Btn variant="ghost" onClick={() => setAction(null)}>Cancel</Btn>
          <Btn variant={action?.destructive ? "danger" : "solid"} icon="check" disabled={reason.trim().length < 8 || (action?.destructive && !secondOk)} onClick={run}>
            {action?.destructive ? "Execute (2-person)" : "Execute"}
          </Btn>
        </>}>
        <div className="space-y-3">
          {action?.destructive && (
            <p className="flex items-start gap-2 rounded-md border border-[#5a2020] bg-[#1c0f0f] px-3 py-2.5 text-[11.5px] text-[#f08c8c]">
              <Ic name="alertTri" size={14} className="mt-0.5 shrink-0" /> Destructive action — requires two-person approval and is written to the immutable admin audit stream.
            </p>
          )}
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-mute">Reason (min 8 chars, stored on the audit record)</span>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer reported missing Jan rates after VRBO token lapse — full re-push requested on call T-1042" className="!min-h-[84px]" />
          </label>
          {action?.destructive && (
            <label className="flex items-center gap-2.5 rounded-md border border-line px-3 py-2.5 text-[12px] font-semibold">
              <input type="checkbox" checked={secondOk} onChange={(e) => setSecondOk(e.target.checked)} />
              R. Chen (staff engineer) has reviewed and approved this action
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}

function ToggleMini({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx("relative h-[18px] w-[34px] shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-white/15")}>
      <span className={cx("absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-[2px]")} />
    </button>
  );
}

// ── Section A · Announcements ──────────────────────────────────────────────
export function AnnouncementsPanel() {
  const { toast } = useApp();
  const [list, setList] = useState(ANNOUNCEMENTS);
  const [draft, setDraft] = useState({ title: "", body: "", targeting: "All tenants", severity: "notice" });
  const sevColor: Record<string, string> = { notice: "bg-[#173042] text-[#8fc4dd]", changelog: "bg-[#1d3527] text-[#4CC38A]", "ack-required": "bg-[#3a3320] text-[#e2a33c]" };
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Live & scheduled notices" note="scoped by plan, region, flag, or arbitrary tenant list · kill switch per notice">
        {list.map((a) => (
          <div key={a.id} className="mb-2 rounded-lg border border-white/10 px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx("rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase", sevColor[a.severity])}>{a.severity}</span>
              <p className="text-[13px] font-bold text-white/90">{a.title}</p>
              <span className="ml-auto font-mono text-[9.5px] text-white/35">{a.state === "scheduled" ? a.when : a.when}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-white/55">{a.body}</p>
            <p className="mt-1.5 flex items-center gap-2 font-mono text-[9.5px] text-white/35">→ {a.targeting}
              <button className="ml-auto rounded border border-white/15 px-2 py-0.5 font-bold text-white/50 hover:border-[#5a2020] hover:text-[#f08c8c]" onClick={() => { setList(list.filter((x) => x.id !== a.id)); toast("warn", "Notice killed", "Removed from all tenants within 30s."); }}>kill</button>
            </p>
          </div>
        ))}
      </Panel>
      <Panel title="Compose" note="preview before publish · forced-ack notices block until confirmed">
        <div className="space-y-2.5">
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Notice title" className="bg-[#171714] text-white border-white/15" />
          <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="What is changing, when, and what tenants need to do…" className="!min-h-[90px] bg-[#171714] text-white border-white/15" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={draft.targeting} onChange={(e) => setDraft({ ...draft, targeting: e.target.value })} className="bg-[#171714] text-white border-white/15" aria-label="Targeting">
              {["All tenants", "Scale + Enterprise", "Trial tenants", "Tenants with Agoda live", "Custom list…"].map((x) => <option key={x}>{x}</option>)}
            </Select>
            <Select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} className="bg-[#171714] text-white border-white/15" aria-label="Severity">
              <option value="notice">notice</option><option value="changelog">changelog</option><option value="ack-required">forced ack</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" className="text-white/70" onClick={() => toast("info", "Preview rendered", "Shown as each tenant's banner + inbox card.")}>Preview</Btn>
            <Btn variant="solid" icon="send" disabled={!draft.title || !draft.body} onClick={() => { setList([{ id: `an-${Date.now()}`, ...draft, state: "scheduled", when: "queued" }, ...list]); setDraft({ title: "", body: "", targeting: "All tenants", severity: "notice" }); toast("ok", "Notice scheduled", "Delivery begins in the next sync window."); }}>Schedule</Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ── Section B · Lifecycle ──────────────────────────────────────────────────
export function LifecyclePanel() {
  const { toast } = useApp();
  const [gen, setGen] = useState({ properties: 12, months: 12 });
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState(0);
  const generate = () => {
    setRunning(true); setProg(0);
    const i = setInterval(() => setProg((p) => {
      if (p >= 100) { clearInterval(i); setRunning(false); toast("ok", "Sandbox tenant seeded", `${gen.properties} properties · ${gen.months} months of reservations · fake channel provider attached`); return 100; }
      return p + 9;
    }), 110);
  };
  return (
    <div className="space-y-4">
      <Panel title="Tenant state machine" note="each state precisely defines what is permitted — suspended tenants keep serving inbound reservations & guest-facing pages during grace">
        <div className="flex flex-wrap items-center gap-2">
          {LIFECYCLE_STATES.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cx("rounded-lg border px-3.5 py-2.5 text-center", s.id === "active" ? "border-[#4CC38A]/50 bg-[#12251b]" : s.id === "suspended" || s.id === "past_due" ? "border-[#4a3d1e] bg-[#191610]" : s.id === "purged" ? "border-white/10 bg-[#050505]" : "border-white/15 bg-[#171714]")}>
                <p className={cx("font-mono text-[10px] font-bold uppercase tracking-wider", s.id === "active" ? "text-[#4CC38A]" : s.id === "purged" ? "text-white/30" : "text-white/70")}>{s.id}</p>
                <p className="font-display text-[20px] font-extrabold text-white">{s.count}</p>
                <p className="max-w-[150px] text-[9px] leading-tight text-white/35">{s.note}</p>
              </div>
              {i < LIFECYCLE_STATES.length - 1 && <Ic name="arrowR" size={13} className="text-white/25" />}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Activation funnel — instrumented drop-off" note="server-side onboarding model drives the in-app checklist + lifecycle emails">
          {ONBOARDING_FUNNEL.map((f, i) => (
            <div key={f.step} className="mb-2.5">
              <div className="mb-1 flex items-baseline justify-between">
                <p className="text-[12px] font-bold text-white/80">{i + 1}. {f.step}</p>
                <p className="font-mono text-[10.5px] text-white/45">{f.reached}%{f.dropped > 0 && <span className="text-[#e2a33c]"> · −{f.dropped}pts</span>}</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                <div className={cx("h-full rounded-full", f.dropped >= 15 ? "bg-brand-bright" : "bg-[#4CC38A]")} style={{ width: `${f.reached}%` }} />
              </div>
            </div>
          ))}
          <p className="mt-2 font-mono text-[10px] text-white/35">biggest leak: payment method → first direct booking. Experiment q1-exp-checkout running on 10% ring.</p>
        </Panel>

        <div className="space-y-4">
          <Panel title="Sandbox generator" note="one command → realistic tenant for demos, E2E, load tests, new-engineer onboarding. Never real guest data outside production.">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block font-mono text-[10px] font-bold uppercase text-white/35">properties</span>
                <Input type="number" value={gen.properties} onChange={(e) => setGen({ ...gen, properties: Number(e.target.value) })} className="bg-[#171714] text-white border-white/15" /></label>
              <label className="block"><span className="mb-1 block font-mono text-[10px] font-bold uppercase text-white/35">months of history</span>
                <Input type="number" value={gen.months} onChange={(e) => setGen({ ...gen, months: Number(e.target.value) })} className="bg-[#171714] text-white border-white/15" /></label>
            </div>
            {running && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-bright transition-all" style={{ width: `${prog}%` }} /></div>}
            <Btn className="mt-3" variant="solid" icon="sparkle" disabled={running} onClick={generate}>{running ? `seeding ${prog}%…` : "Generate sandbox tenant"}</Btn>
            <p className="mt-2 font-mono text-[9.5px] text-white/30">$ derzen seed --properties {gen.properties} --months {gen.months} --fake-channels --seasonality</p>
          </Panel>
          <Panel title="Merge / split / rename" note="scripted, dry-runnable migrations — never manual SQL">
            {MERGE_SPLIT_JOBS.map((j) => (
              <div key={j.id} className="mb-2 rounded-lg border border-white/10 px-3 py-2.5">
                <p className="flex items-center gap-2 text-[12px] font-bold text-white/85"><Badge tone={j.kind === "merge" ? "info" : "warn"}>{j.kind}</Badge> {j.from}</p>
                <p className="mt-0.5 font-mono text-[10px] text-white/40">{j.rows} · {j.state} · by {j.by}</p>
                <div className="mt-1.5 flex gap-2">
                  <Btn size="xs" variant="ghost" className="text-white/70" onClick={() => toast("ok", "Dry run complete", "Diff preview attached to the job · no rows touched.")}>Dry run</Btn>
                  <Btn size="xs" variant="ghost" className="text-white/70" onClick={() => toast("info", "Scheduled for 02:00 UTC", "Runs inside a maintenance window with rollback plan.")}>Schedule</Btn>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Section C · Commercial engine ──────────────────────────────────────────
export function BillingPanel() {
  const { toast } = useApp();
  const maxAbs = Math.max(...MRR_WATERFALL.map((m) => Math.abs(m.value)));
  return (
    <div className="space-y-4">
      <Panel title="Plan & pricing catalogue — data, not code" note="price changes never require a deploy · tenants stay on their signed version until explicitly migrated">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="border-b border-white/10 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35">
              <th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">USD</th><th className="py-2 pr-3">IDR</th><th className="py-2 pr-3">Metering</th><th className="py-2 pr-3">Tenants</th><th className="py-2 pr-3">Grandfathered</th><th className="py-2" /></tr></thead>
            <tbody>
              {PLAN_CATALOG.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-3 text-[13px] font-bold text-white/90">{p.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[#8fd6b4]">{p.version}</td>
                  <td className="py-2.5 pr-3"><Input type="number" defaultValue={p.priceUSD || ""} placeholder="custom" onBlur={() => toast("ok", `${p.name} price draft saved`, "Applies to NEW signups only — existing tenants keep " + p.version + ".")} className="!h-7 !w-[84px] !bg-[#171714] !text-white !border-white/15 font-mono !text-[11px]" aria-label={`${p.name} USD price`} /></td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-white/60">{p.priceIDR ? `Rp ${(p.priceIDR).toLocaleString()}` : "—"}</td>
                  <td className="py-2.5 pr-3 text-[11px] text-white/60">{p.units}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-white/80">{p.tenants}</td>
                  <td className="py-2.5 pr-3">{p.grandfathered ? <Badge tone="warn">{p.grandfathered} on older terms</Badge> : <span className="text-white/30">—</span>}</td>
                  <td className="py-2.5 text-right"><Btn size="xs" variant="ghost" className="text-white/60" onClick={() => toast("info", "Migration planner", `Preview moving ${p.grandfathered} tenants to ${p.version} with notice period.`)}>Migrate</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Per-unit metering — append-only usage stream" note="billable unit = active listing at measurement time · child listings roll into parent · nightly reconciliation with drift alerts">
          {METERING_EVENTS.map((e, i) => (
            <p key={i} className="mb-1.5 flex items-center gap-2 font-mono text-[10.5px]">
              <span className="text-white/30">{timeAgo(e.ts)}</span>
              <span className="text-white/55">{e.tenant}</span>
              <span className={cx("rounded px-1.5 py-0.5 text-[9px] font-bold", e.event.includes("archived") || !e.billable ? "bg-white/5 text-white/40" : "bg-[#1d3527] text-[#4CC38A]")}>{e.event}</span>
              <span className="ml-auto text-white/45">{e.unit} · {e.billable ? "billable" : "not billable"}</span>
            </p>
          ))}
          <div className="mt-3 rounded-lg border border-white/10 bg-[#050505] p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/35">what Sanggraha will be billed for, live</p>
            <p className="mt-1.5 text-[12px] text-white/80">8 active property units + 2 parent-rolled children + 2 service units → <b className="font-mono text-[#4CC38A]">Scale tier, $118</b></p>
            <p className="mt-1 font-mono text-[9.5px] text-white/35">meter ↔ subscription reconciled 04:00Z · drift 0 · proration credit $4.20 queued (archived p-bayu mid-cycle)</p>
          </div>
        </Panel>

        <Panel title="MRR movement — this month" note="new / expansion / contraction / churn / reactivation">
          <div className="flex h-[150px] items-end gap-3 px-2">
            {MRR_WATERFALL.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className={cx("font-mono text-[10.5px] font-bold", m.value >= 0 ? "text-[#4CC38A]" : "text-[#f08c8c]")}>{m.value >= 0 ? "+" : "−"}${Math.abs(m.value)}</span>
                <div className="flex w-full items-end justify-center" style={{ height: 92 }}>
                  <div className="bar-grow w-full max-w-[46px] rounded-t" style={{ height: `${(Math.abs(m.value) / maxAbs) * 100}%`, background: m.color }} />
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-white/35">net +$1,450 · churn risk feed flags 3 accounts (usage ↓ 40% w/w)</p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Dunning sequence" note="grace rule: a billing problem must never become a guest-experience incident">
          {DUNNING_SEQUENCE.map((d, i) => (
            <div key={d.day} className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2">
              <span className="w-[46px] rounded bg-white/5 px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-white/60">{d.day}</span>
              <p className="flex-1 text-[11.5px] text-white/75">{d.action}</p>
              <span className="font-mono text-[9px] uppercase text-white/30">{d.channel}</span>
              {i < DUNNING_SEQUENCE.length - 1 && <Ic name="chevD" size={11} className="text-white/20" />}
            </div>
          ))}
        </Panel>
        <Panel title="Agency & reseller layer" note="parent-child hierarchies · agency billing · referral attribution · console switching without credential sharing">
          {AGENCY_ACCOUNTS.map((a) => (
            <div key={a.agency} className="mb-2 rounded-lg border border-white/10 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold text-white/90">{a.agency}</p>
                <Dot tone="ok" label={a.status} />
                <span className="ml-auto font-mono text-[11px] font-bold text-[#4CC38A]">${a.mrr} MRR</span>
              </div>
              <p className="mt-0.5 font-mono text-[10px] text-white/40">{a.children} managed workspaces · {a.commission}</p>
            </div>
          ))}
          <p className="font-mono text-[9.5px] text-white/30">payout ledger reconciles monthly against invoice lines · disputes route to finance approval workflow</p>
        </Panel>
      </div>
    </div>
  );
}

// ── Section D · Entitlements, flags, coming soon ───────────────────────────
export function EntitlementsPanel() {
  const { toast } = useApp();
  const [flags, setFlags] = useState(PLATFORM_FLAGS);
  const [registry, setRegistry] = useState(COMING_SOON);
  const statusTone: Record<string, string> = { planned: "bg-white/10 text-white/60", alpha: "bg-[#2a2140] text-[#c9b3f0]", beta: "bg-[#3a3320] text-[#e2a33c]", ga: "bg-[#1d3527] text-[#4CC38A]", deprecated: "bg-[#3d1f1f] text-[#f08c8c]" };
  return (
    <div className="space-y-4">
      <Panel title="Limits & quotas" note="soft limits warn · hard limits block with an actionable upgrade path · never fail silently">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead><tr className="border-b border-white/10 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35"><th className="py-2 pr-3">Metric</th><th className="py-2 pr-3">Starter</th><th className="py-2 pr-3">Scale</th><th className="py-2 pr-3">Enterprise</th><th className="py-2">Enforcement</th></tr></thead>
            <tbody>
              {QUOTAS.map((q) => (
                <tr key={q.metric} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-[12px] font-bold text-white/85">{q.metric}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{q.starter}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{q.scale}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-white/60">{q.ent}</td>
                  <td className="py-2"><span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", q.kind === "hard" ? "bg-[#3d1f1f] text-[#f08c8c]" : "bg-[#3a3320] text-[#e2a33c]")}>{q.kind}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Feature flags & kill switches" note="per-tenant · per-user · percentage · ring targeting · every flag has an owner and an expiry">
          {flags.map((f) => (
            <div key={f.key} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <code className="font-mono text-[11.5px] font-bold text-[#8fd6b4]">{f.key}</code>
                <span className="font-mono text-[9px] uppercase text-white/30">{f.targeting}</span>
                <span className="ml-auto flex items-center gap-2">
                  {f.kill && <span className="rounded bg-[#3d1f1f] px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-[#f08c8c]">kill switch</span>}
                  <ToggleMini checked={f.state === "on"} onChange={(v) => { setFlags(flags.map((x) => x.key === f.key ? { ...x, state: v ? "on" : "off" } : x)); toast(v ? "ok" : "warn", `${f.key} ${v ? "enabled" : "KILLED"}`, v ? "Rollout continues per targeting." : "All tenants fall back instantly · incident channel notified."); }} label={`Flag ${f.key}`} />
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-[10.5px] text-white/45">{f.name} · owner: {f.owner} · expires {f.expires}</p>
            </div>
          ))}
        </Panel>

        <Panel title="“Coming Soon” registry" note="status planned → alpha → beta → ga → deprecated · anything not ga is hidden or honestly labelled · a placeholder redirect is a bug">
          {registry.map((c) => (
            <div key={c.cap} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12.5px] font-bold text-white/90">{c.cap}</p>
                <span className={cx("rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase", statusTone[c.status])}>{c.status}</span>
                {c.waitlist > 0 && <span className="font-mono text-[9.5px] text-white/40">waitlist {c.waitlist}</span>}
                <Select value={c.status} onChange={(e) => { setRegistry(registry.map((x) => x.cap === c.cap ? { ...x, status: e.target.value } : x)); toast("ok", `${c.cap} → ${e.target.value}`, e.target.value === "ga" ? "Unlocked for entitled tenants · changelog drafted." : "Registry updated · UI labels follow."); }} className="ml-auto !h-7 !w-[104px] !bg-[#171714] !text-white !border-white/15 !text-[10.5px]" aria-label={`Status for ${c.cap}`}>
                  {["planned", "alpha", "beta", "ga", "deprecated"].map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <p className="mt-1 text-[10.5px] text-white/45">{c.note}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ── Section E · Integration engineering platform ──────────────────────────
export function ChannelPlatform() {
  const { toast } = useApp();
  const [certBusy, setCertBusy] = useState(false);
  const runCert = () => {
    setCertBusy(true);
    setTimeout(() => { setCertBusy(false); toast("ok", "Certification suite finished", "24/25 green · 1 flaky (VRBO modification) · report pinned to CI"); }, 1400);
  };
  const capCell = (v: boolean | "partial") =>
    v === true ? <span className="text-[#4CC38A]" aria-label="supported">✓</span> : v === "partial" ? <span className="text-[#e2a33c]" aria-label="partial">~</span> : <span className="text-white/20" aria-label="unsupported">—</span>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Capability matrix — data, not conditionals" note="the UI degrades features per channel from this matrix; adapters declare capabilities via the SDK contract v3.2">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-white/10 font-mono text-[9px] font-bold uppercase tracking-widest text-white/35">
                <th className="py-2 pr-3">Channel</th>{CAP_LABELS.map(([k, l]) => <th key={k} className="px-1.5 py-2 text-center" title={l}>{l}</th>)}
              </tr></thead>
              <tbody>
                {CAPABILITY_MATRIX.map((c) => (
                  <tr key={c.channel} className="border-b border-white/5">
                    <td className="py-1.5 pr-3 text-[11.5px] font-bold text-white/80">{c.channel}</td>
                    {CAP_LABELS.map(([k]) => <td key={k} className="px-1.5 py-1.5 text-center font-mono text-[12px]">{capCell(c.caps[k])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Adapters & credential vault" note="KMS envelope encryption · rotation · scoped decryption at point of use · never in logs, never in this console">
          {ADAPTERS.map((a) => (
            <p key={a.name} className="mb-1.5 flex items-center gap-2 font-mono text-[10.5px]">
              <span className="w-[110px] font-bold text-white/80">{a.name}</span>
              <span className="text-[#8fd6b4]">{a.contract}</span>
              <span className={cx("rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase", a.cert === "green" ? "bg-[#1d3527] text-[#4CC38A]" : a.cert === "amber" ? "bg-[#3a3320] text-[#e2a33c]" : a.cert === "beta" ? "bg-[#2a2140] text-[#c9b3f0]" : "bg-[#3d1f1f] text-[#f08c8c]")}>{a.cert}</span>
              <span className="ml-auto truncate text-white/35">{a.note}</span>
            </p>
          ))}
          <div className="mt-3 border-t border-white/10 pt-3">
            {VAULT.map((v) => (
              <p key={v.id} className="mb-1.5 flex items-center gap-2 font-mono text-[10px]">
                <Ic name={v.kind === "OAuth" ? "key" : "lock"} size={11} className={v.health === "warn" ? "text-[#e2a33c]" : "text-white/40"} />
                <span className="text-white/70">{v.scope}</span>
                <span className="text-white/35">{v.kind} · rotated {v.rotated}</span>
                <span className={cx("ml-auto rounded px-1.5 py-0.5 text-[8.5px] font-bold", v.health === "warn" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#1d3527] text-[#4CC38A]")}>{v.next}</span>
              </p>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Certification harness + record/replay" note="full scenario suite against provider sandboxes — on demand and in CI · a field-shape change breaks CI, not production"
          right={<Btn size="xs" variant="solid" icon={certBusy ? "refresh" : "check"} onClick={runCert} disabled={certBusy}>{certBusy ? "running…" : "Run suite now"}</Btn>}>
          <table className="w-full text-left">
            <thead><tr className="border-b border-white/10 font-mono text-[9px] font-bold uppercase text-white/35"><th className="py-1.5 pr-2">Scenario</th><th className="px-1.5 py-1.5 text-center">BDC</th><th className="px-1.5 py-1.5 text-center">VRBO</th><th className="px-1.5 py-1.5 text-center">Agoda</th></tr></thead>
            <tbody>
              {CERT_SCENARIOS.map((s) => (
                <tr key={s.name} className="border-b border-white/5">
                  <td className="py-1.5 pr-2 text-[11px] font-semibold text-white/75">{s.name}</td>
                  {[s.booking, s.vrbo, s.agoda].map((v, i) => (
                    <td key={i} className="px-1.5 py-1.5 text-center">
                      <span className={cx("rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", v === "pass" ? "bg-[#1d3527] text-[#4CC38A]" : v === "fail" ? "bg-[#3d1f1f] text-[#f08c8c]" : v === "flaky" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-white/5 text-white/30")}>{v}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Sync orchestrator" note="queues partitioned per tenant+connection · rate caps · backoff+jitter · circuit breakers · idempotency keys · change-set coalescing (20×30 edit → 6 batches, not 600 calls)">
          <table className="w-full text-left">
            <thead><tr className="border-b border-white/10 font-mono text-[9px] font-bold uppercase text-white/35"><th className="py-1.5 pr-2">Connection</th><th className="px-1.5 py-1.5 text-right">Depth</th><th className="px-1.5 py-1.5 text-right">Rate</th><th className="px-1.5 py-1.5">Circuit</th><th className="px-1.5 py-1.5 text-right">DLQ</th><th className="px-1.5 py-1.5" /></tr></thead>
            <tbody>
              {ORCHESTRATOR.map((o) => (
                <tr key={o.conn} className="border-b border-white/5">
                  <td className="py-2 pr-2 font-mono text-[10.5px] text-white/75">{o.conn}</td>
                  <td className={cx("px-1.5 py-2 text-right font-mono text-[11px] font-bold", o.depth > 10 ? "text-[#f08c8c]" : "text-white/80")}>{o.depth}</td>
                  <td className="px-1.5 py-2 text-right font-mono text-[10px] text-white/45">{o.rate}</td>
                  <td className="px-1.5 py-2"><span className={cx("rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", o.circuit === "closed" ? "bg-[#1d3527] text-[#4CC38A]" : o.circuit === "OPEN" ? "bg-[#3d1f1f] text-[#f08c8c] dot-pulse" : "bg-[#3a3320] text-[#e2a33c]")}>{o.circuit}</span></td>
                  <td className="px-1.5 py-2 text-right font-mono text-[10.5px] text-white/60">{o.dlq}</td>
                  <td className="px-1.5 py-2 text-right">{o.dlq > 0 && <Btn size="xs" variant="ghost" className="text-white/60" onClick={() => toast("ok", `${o.dlq} dead-lettered pushes requeued`, "Fresh idempotency keys · duplicates suppressed.")}>Requeue DLQ</Btn>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Reconciliation engine" note="pull full state · diff local truth · auto-heal the safe, escalate the rest">
          {RECONCILIATION.map((r) => (
            <p key={r.channel} className="mb-1.5 flex items-center gap-2 text-[11px]">
              <span className="w-[86px] font-bold text-white/80">{r.channel}</span>
              <span className={cx("font-mono", r.nightsDrifted > 0 ? "text-[#e2a33c]" : "text-[#4CC38A]")}>{r.nightsDrifted} drift</span>
              <span className="font-mono text-white/35">healed {r.autoHealed} · esc {r.escalated}</span>
              <span className="ml-auto max-w-[130px] truncate text-right text-[9.5px] text-white/30">{r.note}</span>
            </p>
          ))}
        </Panel>
        <Panel title="Backfill, replay & migration" note="all dry-runnable with diff previews">
          {BACKFILL_JOBS.map((j) => (
            <div key={j.id} className="mb-2 rounded-lg border border-white/10 px-3 py-2">
              <p className="text-[11px] font-semibold text-white/80">{j.desc}</p>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] text-white/40">{j.state} · {j.diff}
                <button className="ml-auto rounded border border-white/15 px-2 py-0.5 font-bold text-white/50 hover:text-white" onClick={() => toast("ok", "Dry run queued", "Diff preview lands in ~2 min.")}>dry-run</button>
              </p>
            </div>
          ))}
        </Panel>
        <Panel title="Provider changelog watchlist" note="assume one channel breaks every month — runbook per integration">
          {PROVIDER_WATCHLIST.map((w) => (
            <div key={w.item} className="mb-2 border-b border-white/5 pb-2 last:border-0">
              <p className="flex items-center gap-2 text-[11.5px] font-bold text-white/85">{w.provider} — {w.item}
                <span className={cx("ml-auto rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", w.risk === "medium" ? "bg-[#3a3320] text-[#e2a33c]" : "bg-[#1d3527] text-[#4CC38A]")}>{w.risk}</span>
              </p>
              <p className="font-mono text-[9.5px] text-white/35">{w.date} · {w.action}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ── Section F · Messaging infra ────────────────────────────────────────────
export function MessagingPanel() {
  const { toast } = useApp();
  const [stop, setStop] = useState(THROTTLE_STATE.globalStop);
  const [confirmStop, setConfirmStop] = useState(false);
  return (
    <div className="space-y-4">
      {stop && (
        <p className="anim-pop flex items-center gap-3 rounded-xl border border-[#5a2020] bg-[#2a1212] px-4 py-3">
          <Ic name="alertTri" size={18} className="text-[#f08c8c]" />
          <span className="text-[13px] font-bold text-[#f08c8c]">GLOBAL EMERGENCY STOP ENGAGED — all automated outbound messaging is halted platform-wide. Guest-initiated replies still work.</span>
          <button className="ml-auto rounded-md bg-white px-3 py-1.5 text-[12px] font-bold text-ink" onClick={() => { setStop(false); toast("ok", "Outbound messaging resumed", "Queues draining in order."); }}>Resume sending</button>
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Transport abstraction" note="one outbound API · per-channel fallback chains · per-tenant sender identity">
          {TRANSPORTS.map((t) => (
            <div key={t.name} className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5">
              <Dot tone={t.health === "ok" ? "ok" : "warn"} label={t.health} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-white/85">{t.name}</p>
                <p className="text-[10px] text-white/40">{t.note}</p>
              </div>
              <span className="font-mono text-[10px] text-white/45">{t.throughput}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[#5a2020] bg-[#1c0f0f] px-3.5 py-3">
            <div>
              <p className="text-[12.5px] font-bold text-[#f08c8c]">Emergency stop — all automated outbound</p>
              <p className="text-[10px] text-white/45">You will need this button one day. It exists.</p>
            </div>
            <Btn variant="danger" icon="alertTri" onClick={() => setConfirmStop(true)}>ENGAGE</Btn>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Deliverability" note="SPF/DKIM/DMARC · dedicated + shared IP pools · reputation monitoring — guest emails in spam silently break check-in">
            <table className="w-full text-left">
              <thead><tr className="border-b border-white/10 font-mono text-[9px] font-bold uppercase text-white/35"><th className="py-1.5 pr-2">Domain</th><th className="px-1.5 py-1.5">SPF</th><th className="px-1.5 py-1.5">DKIM</th><th className="px-1.5 py-1.5">DMARC</th><th className="px-1.5 py-1.5 text-right">Reputation</th></tr></thead>
              <tbody>
                {DELIVERABILITY.map((d) => (
                  <tr key={d.domain} className="border-b border-white/5">
                    <td className="py-2 pr-2 font-mono text-[10.5px] text-white/75">{d.domain}</td>
                    {[d.spf, d.dkim, d.dmarc].map((v, i) => (
                      <td key={i} className="px-1.5 py-2 font-mono text-[9.5px]">
                        <span className={cx(v === "pass" || v.startsWith("p=") ? "text-[#4CC38A]" : "text-[#e2a33c]")}>{v}</span>
                      </td>
                    ))}
                    <td className="px-1.5 py-2 text-right font-mono text-[9.5px] text-white/55">{d.rep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Template governance" note="versioned · variable-schema validated · preview with real data · lint blocks unresolved variables — this is what prevents SOP-mismatch rot">
            {TEMPLATE_GOVERNANCE.map((t) => (
              <p key={t.name} className={cx("mb-1.5 flex items-center gap-2 rounded-md border px-2.5 py-2 font-mono text-[10px]", t.lint.startsWith("BLOCKED") ? "border-[#5a2020] bg-[#1c0f0f]" : "border-white/10")}>
                <span className="font-bold text-white/80">{t.name}</span>
                <span className="text-[#8fd6b4]">{t.version}</span>
                <span className="text-white/35">{t.vars} · {t.locale}</span>
                <span className={cx("ml-auto", t.lint === "pass" ? "text-[#4CC38A]" : "text-[#f08c8c]")}>{t.lint}</span>
              </p>
            ))}
          </Panel>
        </div>
      </div>

      <Modal open={confirmStop} onClose={() => setConfirmStop(false)} title="Engage global emergency stop?" w={440}
        footer={<><Btn variant="ghost" onClick={() => setConfirmStop(false)}>Cancel</Btn><Btn variant="danger" icon="alertTri" onClick={() => { setStop(true); setConfirmStop(false); toast("warn", "Emergency stop engaged", "Recorded to the incident log with your operator id."); }}>Engage stop</Btn></>}>
        <p className="text-[13px] leading-relaxed text-mute">All <b>automated</b> outbound messaging halts platform-wide: autopilot replies, scheduled lifecycle messages, staff reminders. Guests can still message in; humans can still reply manually. This is written to the audit stream and pages on-call.</p>
      </Modal>
    </div>
  );
}

// ── Section G · AI platform ────────────────────────────────────────────────
export function AiPlatformPanel() {
  const { toast } = useApp();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Prompt & model registry" note="prompts are versioned, reviewed artefacts · every output stores prompt version + model + params + context IDs + tokens — non-reproducible AI is unsupportable">
          {PROMPT_REGISTRY.map((p) => (
            <div key={p.id} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <code className="font-mono text-[11.5px] font-bold text-[#8fd6b4]">{p.name}</code>
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white/60">{p.version}</span>
                <span className={cx("rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase", p.status === "stable" ? "bg-[#1d3527] text-[#4CC38A]" : "bg-[#2a2140] text-[#c9b3f0]")}>{p.status} · {p.rollout}</span>
                <span className="ml-auto font-mono text-[9px] text-white/30">{p.owner}</span>
              </div>
              <p className="mt-0.5 text-[10.5px] text-white/45">{p.changelog}</p>
            </div>
          ))}
          <p className="mt-3 mb-1.5 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35">model router — provider-agnostic, per-task fallbacks</p>
          {MODEL_ROUTER.map((m) => (
            <p key={m.task} className="mb-1 flex items-center gap-2 font-mono text-[10px] text-white/60">
              <span className="w-[120px] font-bold text-white/80">{m.task}</span>
              <span className="text-[#8fd6b4]">{m.model}</span>
              <span className="text-white/30">→ fallback {m.fallback}</span>
              <span className="ml-auto text-white/30">{m.streaming ? "stream" : "batch"}{m.structured ? " · structured" : ""}</span>
            </p>
          ))}
        </Panel>

        <Panel title="Evaluation harness" note="golden set of consented, PII-scrubbed conversations · no prompt ships without an eval run + diff report"
          right={<Btn size="xs" variant="solid" icon="check" onClick={() => toast("ok", "Eval #115 queued", "Running against golden set v12 (412 conversations)…")}>Run eval now</Btn>}>
          {EVAL_RUNS.map((e) => (
            <div key={e.id} className="mb-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
              <p className="flex items-center gap-2 font-mono text-[10px] text-white/45">{e.id} · {e.when} · {e.trigger}
                <span className="ml-auto rounded bg-[#1d3527] px-1.5 py-0.5 text-[8.5px] font-bold text-[#4CC38A]">{e.delta}</span>
              </p>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {[["accuracy", e.accuracy], ["refusal", e.refusal], ["policy", e.policy]].map(([k, v]) => (
                  <div key={String(k)}>
                    <p className="flex justify-between text-[9px] font-bold uppercase text-white/35"><span>{k}</span><span className="text-white/70">{v}%</span></p>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#4CC38A]" style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
                <div>
                  <p className="flex justify-between text-[9px] font-bold uppercase text-white/35"><span>tone</span><span className="text-white/70">{e.tone}/5</span></p>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#8fd6b4]" style={{ width: `${(e.tone / 5) * 100}%` }} /></div>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Guardrails" note="retrieval grounded in the tenant's own KB with citations · refusal-and-escalate when unsupported · injection defence on guest + guidebook content">
          <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-widest text-white/35">hard blocklist — the AI never commits to:</p>
          <div className="flex flex-wrap gap-1.5">
            {BLOCKLIST.map((b) => <span key={b} className="rounded-md border border-[#5a2020] bg-[#1c0f0f] px-2 py-1 text-[10.5px] font-semibold text-[#f08c8c]">{b}</span>)}
          </div>
          <p className="mt-3 rounded-md border border-white/10 px-3 py-2 font-mono text-[9.5px] leading-relaxed text-white/40">fixture set of 60 unanswerable questions runs on every prompt change · current pass rate 100% (eval-114)</p>
        </Panel>

        <Panel title="Human-in-the-loop" note="accept / edit / reject captured as training signal · escalation measurable per tenant & language">
          {HITL_STATS.map((h) => (
            <div key={h.tenant} className="mb-2.5">
              <p className="mb-1 flex justify-between text-[11px]"><span className="font-bold text-white/80">{h.tenant}</span><span className="font-mono text-white/40">{h.mode} · {h.lang}</span></p>
              <div className="flex h-3 overflow-hidden rounded-full">
                <div className="h-full bg-[#4CC38A]" style={{ width: `${h.resolvedNoHuman}%` }} title={`${h.resolvedNoHuman}% resolved without human`} />
                <div className="h-full bg-[#e2a33c]" style={{ width: `${h.escalated}%` }} title={`${h.escalated}% escalated`} />
              </div>
              <p className="mt-1 font-mono text-[9px] text-white/35">{h.resolvedNoHuman}% resolved without human · {h.escalated}% escalated</p>
            </div>
          ))}
        </Panel>

        <Panel title="Knowledge coverage & cost/margin" note="coverage gaps are a product feature and a churn-prevention tool · AI cost sits next to MRR — know your margin per account">
          {KB_COVERAGE.map((k) => (
            <div key={k.tenant} className="mb-2.5">
              <p className="mb-1 flex justify-between text-[11px]"><span className="font-bold text-white/80">{k.tenant}</span><span className={cx("font-mono font-bold", k.coverage >= 80 ? "text-[#4CC38A]" : "text-[#e2a33c]")}>{k.coverage}% covered</span></p>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={cx("h-full rounded-full", k.coverage >= 80 ? "bg-[#4CC38A]" : "bg-[#e2a33c]")} style={{ width: `${k.coverage}%` }} /></div>
              <p className="mt-1 font-mono text-[9px] text-white/35">unanswerable: {k.gaps.join(" · ")}</p>
            </div>
          ))}
          <div className="mt-2 border-t border-white/10 pt-2">
            {AI_COST.map((c) => (
              <p key={c.tenant} className="mb-1 flex items-center gap-2 font-mono text-[10px] text-white/60">
                <span className="font-bold text-white/80">{c.tenant}</span> {c.tokens} tok · ${c.cost.toFixed(2)}
                <span className="ml-auto">MRR ${c.mrr} → <span className={c.margin >= 85 ? "text-[#4CC38A]" : "text-[#e2a33c]"}>{c.margin}% margin</span></span>
              </p>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
