import { useState } from "react";
import { cx, money, timeAgo, fmtDateTime, fmtShort } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Badge, Btn, Dot, Empty, Field, Input, Modal, Select, Tabs, Textarea, Toggle } from "../components/ui";
import { useApp, type AutopilotMode } from "../store";
import { KNOWLEDGE, MSG_TEMPLATES, UPSELLS, VARIABLES, WORKSPACE, propertyById, serviceById } from "../lib/data";
import { aiChat, isAiConfigured, loadProviders } from "../lib/aiGateway";

const LIFE: Record<string, string> = {
  new_reservation: "New reservation", pre_arrival: "Pre-arrival", check_in: "Check-in",
  during_stay: "During stay", checkout: "Checkout", post_stay: "Post-stay / review",
};

export default function Concierge() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "knowledge", label: "Knowledge base" },
          { id: "actions", label: "Action items", count: useApp((s) => s.actionItems.filter((a) => a.status === "open").length) },
          { id: "upsells", label: "Upsells" },
          { id: "variables", label: "Variables" },
          { id: "autopilot", label: "Autopilot" },
          { id: "scheduled", label: "Scheduled messages" },
        ]}
        active={tab} onChange={setTab}
      />
      {tab === "overview" && <Overview />}
      {tab === "knowledge" && <Knowledge />}
      {tab === "actions" && <Actions />}
      {tab === "upsells" && <Upsells />}
      {tab === "variables" && <Variables />}
      {tab === "autopilot" && <Autopilot />}
      {tab === "scheduled" && <Scheduled />}
    </div>
  );
}

function Overview() {
  const creditsUsed = useApp((s) => s.creditsUsed);
  const upsellRevenue = UPSELLS.reduce((s, u) => s + u.revenue, 0);
  const offered = UPSELLS.reduce((s, u) => s + u.offered, 0);
  const accepted = UPSELLS.reduce((s, u) => s + u.accepted, 0);
  const sourcesReady = KNOWLEDGE.reduce((s, k) => s + k.sources.length, 0);
  const cards = [
    { label: "Answered by concierge · 30d", value: "1,284", icon: "checkCircle" as IconName, tone: "text-brand-deep" },
    { label: "Needs human attention", value: "3", icon: "flag" as IconName, tone: "text-danger" },
    { label: "Knowledge sources ready", value: String(sourcesReady), icon: "book" as IconName, tone: "text-sea" },
    { label: "Upsell revenue · accept rate", value: `${money(upsellRevenue, "IDR", { compact: true })} · ${Math.round((accepted / offered) * 100)}%`, icon: "trendUp" as IconName, tone: "text-[#8a5c07]" },
    { label: "AI credits consumed", value: `${creditsUsed} / ${WORKSPACE.credits.limit}`, icon: "bolt" as IconName, tone: "text-plum" },
  ];
  const readiness = [
    { pid: "p-anggrek", pct: 0.92 }, { pid: "p-cemara", pct: 0.74 }, { pid: "p-senja", pct: 0.08 },
    { pid: "p-purnama", pct: 0.81 }, { pid: "p-kelapa", pct: 0.66 }, { pid: "p-samudra", pct: 0.55 },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c, i) => (
        <div key={i} className="anim-rise rounded-xl border border-line bg-card p-4" style={{ animationDelay: `${i * 60}ms` }}>
          <Ic name={c.icon} size={16} className={c.tone} />
          <p className="mt-2 font-display text-[19px] font-bold leading-tight text-ink">{c.value}</p>
          <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-mute">{c.label}</p>
        </div>
      ))}
      <div className="col-span-2 rounded-xl border border-line bg-card p-4 lg:col-span-3">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Readiness by property</h3>
        <p className="mb-3 text-[11px] text-mute">Property knowledge overrides general knowledge. Below 50% the concierge will escalate rather than guess.</p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {readiness.map((r) => (
            <div key={r.pid} className="flex items-center gap-3">
              <span className="w-[120px] truncate text-[12px] font-bold text-ink">{propertyById(r.pid).name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div className={cx("h-full rounded-full", r.pct >= 0.7 ? "bg-brand" : r.pct >= 0.4 ? "bg-gold" : "bg-danger")} style={{ width: `${r.pct * 100}%` }} />
              </div>
              {r.pct >= 0.7 ? <Dot tone="ok" label="ready" /> : r.pct >= 0.4 ? <Dot tone="warn" label="partial" /> : <Dot tone="danger" label="gaps" />}
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Guardrails</h3>
        <ul className="mt-2 space-y-1.5 text-[12px] text-mute">
          <li className="flex gap-2"><Ic name="shield" size={13} className="mt-0.5 text-brand" /> Unanswerable questions become action items — never invented answers (tested against a 40-question hallucination fixture set).</li>
          <li className="flex gap-2"><Ic name="shield" size={13} className="mt-0.5 text-brand" /> Payment, complaint & keyword topics always route to a human.</li>
          <li className="flex gap-2"><Ic name="shield" size={13} className="mt-0.5 text-brand" /> Every auto-send logs model, prompt version and cited sources.</li>
        </ul>
      </div>
    </div>
  );
}

function Knowledge() {
  const [sel, setSel] = useState("kb-general");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<null | { ok: boolean; text: string; citations: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const aiConfigOn = useApp((s) => s.aiConfig.enabled);
  const scope = KNOWLEDGE.find((k) => k.id === sel);

  if (!scope) return null;

  const runTest = async () => {
    if (!question.trim() || busy || !scope) return;
    setBusy(true);
    setResult(null);
    const providers = loadProviders();
    const srcNames = scope.sources.map((s) => s.name);
    const ruleText = scope.rules.map((r) => `${r.kind === "hard" ? "HARD RULE" : "tone"}: ${r.text}`).join("\n");
    // Live path: ground the answer strictly in this scope's sources + rules.
    if (aiConfigOn && isAiConfigured(providers)) {
      try {
        const sys = `You are a property concierge answering ONLY from the knowledge scope below. Scope: ${scope.name}.\nSources: ${srcNames.join("; ") || "none"}.\nRules:\n${ruleText || "none"}.\nAnswer in 2-4 sentences. If the answer is not covered by these sources/rules, reply exactly: ESCALATE. Never invent facts.`;
        const res = await aiChat(sys, question, { maxTokens: 200 });
        if (/^ESCALATE/i.test(res.text)) {
          setResult({ ok: false, text: "No source in this scope covers it — the concierge would escalate and log an action item.", citations: [] });
        } else {
          setResult({ ok: true, text: res.text, citations: srcNames.length ? srcNames : ["scope rules"] });
        }
        setBusy(false);
        return;
      } catch { /* fall through to the offline matcher */ }
    }
    // Offline fallback: deterministic matcher so the sandbox still demonstrates behaviour.
    const q = question.toLowerCase();
    const known = [
      { re: /(wifi|password|internet)/, a: "The Wi-Fi network and password are in your welcome message and printed on the desk card. Business-grade line, ~120 Mbps.", c: ["General · FAQ deposits & connectivity", "Property · access SOP"] },
      { re: /(cancel|refund|policy)/, a: "Cancellations up to 14 days before check-in are fully refunded; 7–14 days refund 50%; inside 7 days the deposit is retained. Published policy linked in every quote.", c: ["General · sanggraha.co/cancellation-policy"] },
      { re: /(chef|dinner|menu|allergen)/, a: "Our private chef serves a 5-course Balinese or Western menu for up to 10 guests. Allergens need 24h notice — same-day changes can't be promised.", c: ["Service · Private Chef Dinner (auto-synced)"] },
      { re: /(pool|heat)/, a: null, c: [] },
    ];
    for (const k of known) {
      if (k.re.test(q)) {
        if (!k.a) { setResult({ ok: false, text: "No source covers this in the selected scope. Stopped by guardrail — logged as an action item candidate.", citations: [] }); setBusy(false); return; }
        setResult({ ok: true, text: k.a, citations: k.c });
        setBusy(false);
        return;
      }
    }
    setResult({ ok: false, text: "Retrieval matched 0 of the scope's sources above the confidence floor. The concierge would escalate this and log an action item.", citations: [] });
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-1.5">
        {KNOWLEDGE.map((k) => (
          <button key={k.id} onClick={() => { setSel(k.id); setResult(null); }} className={cx("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all", sel === k.id ? "border-brand bg-brand-soft/60" : "border-line bg-card hover:border-line2")}>
            <Ic name={k.scope === "general" ? "globe" : k.scope === "property" ? "home" : "bag"} size={14} className={sel === k.id ? "text-brand-deep" : "text-mute"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-ink">{k.name}</span>
              <span className="text-[10.5px] font-semibold text-mute">{k.sources.length} sources · {k.rules.length} rules</span>
            </span>
            {k.sources.length === 0 && <Badge tone="danger">empty</Badge>}
          </button>
        ))}
        <p className="rounded-lg border border-dashed border-line2 px-3 py-2 text-[10.5px] leading-relaxed text-mute">
          Property knowledge overrides general. Service records auto-sync their own details as a source — you never maintain them twice.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-[13.5px] font-bold text-ink">{scope.name} — sources</h3>
            <div className="flex gap-1.5">
              <Btn size="xs" icon="upload">Upload doc</Btn>
              <Btn size="xs" icon="link">Add URL</Btn>
              <Btn size="xs" icon="pencil">Paste text</Btn>
            </div>
          </div>
          {scope.sources.length === 0 ? (
            <Empty icon="alertTri" title="No sources in this scope" body="The concierge refuses to guess — add a document, paste text, or link a URL." />
          ) : (
            <ul className="divide-y divide-line">
              {scope.sources.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 py-2">
                  <Ic name={s.kind === "document" ? "doc" : s.kind === "url" ? "link" : s.kind === "auto" ? "refresh" : "pencil"} size={14} className="text-mute" />
                  <span className="flex-1 text-[12.5px] font-semibold text-ink">{s.name}</span>
                  {s.kind === "auto" && <Badge tone="ok">auto-synced</Badge>}
                  <span className="text-[10.5px] text-faint">{timeAgo(s.ts)}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="mb-1.5 mt-4 text-[10.5px] font-bold uppercase tracking-wider text-mute">Rules — hard constraints & tone</h4>
          {scope.rules.length === 0 && <p className="text-[11.5px] text-faint">No rules yet for this scope.</p>}
          <div className="space-y-1.5">
            {scope.rules.map((r) => (
              <p key={r.id} className={cx("flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[12px] font-semibold", r.kind === "hard" ? "border-danger/30 bg-danger-soft/50 text-danger" : "border-sea/30 bg-sea-soft/60 text-sea")}>
                <Ic name={r.kind === "hard" ? "lock" : "chat"} size={12} className="mt-0.5 shrink-0" /> {r.text}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-plum/40 bg-card p-4">
          <h3 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink"><Ic name="sparkle" size={14} className="text-plum" /> Test sandbox — runs against this scope only</h3>
          <div className="mt-2 flex gap-2">
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runTest()} placeholder="e.g. What is the cancellation policy?" />
            <Btn variant="solid" onClick={runTest} icon="play" disabled={busy}>{busy ? "Asking…" : "Run"}</Btn>
          </div>
          {result && (
            <div className={cx("anim-rise mt-3 rounded-lg border p-3", result.ok ? "border-brand/40 bg-brand-soft/50" : "border-danger/40 bg-danger-soft/50")}>
              <p className="text-[12.5px] leading-relaxed text-ink">{result.text}</p>
              {result.ok ? (
                <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold text-brand-deep">
                  <Ic name="book" size={11} /> Citations: {result.citations.map((c, i) => <Badge key={i} tone="ok">{c}</Badge>)}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-[10.5px] font-bold text-danger"><Ic name="flag" size={11} /> Escalation path: log exact question → Action items → one-click fix</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Actions() {
  const actionItems = useApp((s) => s.actionItems);
  const resolveActionItem = useApp((s) => s.resolveActionItem);
  return (
    <div className="space-y-2.5">
      {actionItems.filter((a) => a.status === "open").length === 0 && <Empty icon="checkCircle" title="No open action items" body="When the concierge can't answer from sources, the exact question lands here." />}
      {actionItems.map((a) => (
        <div key={a.id} className={cx("rounded-xl border p-4", a.status === "open" ? "border-gold/50 bg-card" : "border-line bg-paper/60 opacity-70")}>
          <div className="flex flex-wrap items-start gap-3">
            <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", a.status === "open" ? "bg-gold-soft text-[#8a5c07]" : "bg-brand-soft text-brand-deep")}>
              <Ic name={a.status === "open" ? "alertTri" : "checkCircle"} size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-ink">“{a.question}”</p>
              <p className="mt-0.5 text-[11.5px] text-mute">{propertyById(a.propertyId).name} · {timeAgo(a.ts)} · <span className="font-semibold text-danger">{a.reason}</span></p>
            </div>
            {a.status === "open" ? (
              <div className="flex gap-2">
                <Btn size="sm" variant="solid" icon="book" onClick={() => resolveActionItem(a.id, "saved")}>Answer & save as knowledge</Btn>
                <Btn size="sm" icon="wrench" onClick={() => resolveActionItem(a.id, "tasked")}>Create task</Btn>
              </div>
            ) : (
              <Badge tone="ok">{a.status === "saved" ? "saved to knowledge" : "task created"}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Upsells() {
  const toast = useApp((s) => s.toast);
  const [rows, setRows] = useState(UPSELLS);
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
            <th className="px-4 py-2.5">Upsell</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Availability window</th>
            <th className="px-3 py-2.5">Eligibility</th><th className="px-3 py-2.5 text-right">Offered</th><th className="px-3 py-2.5 text-right">Accepted</th>
            <th className="px-3 py-2.5 text-right">Revenue</th><th className="px-3 py-2.5">Active</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-line/60 transition-colors hover:bg-paper/60">
              <td className="px-4 py-3">
                <p className="text-[12.5px] font-bold text-ink">{u.name}</p>
                <p className="max-w-[260px] text-[10.5px] leading-snug text-mute">Prompt: {u.prompt}</p>
              </td>
              <td className="px-3 py-3 font-mono text-[12px] font-bold text-ink">{money(u.price, u.currency)}</td>
              <td className="px-3 py-3 text-[11.5px] text-mute">{u.window}</td>
              <td className="px-3 py-3 text-[11.5px] text-mute">{u.eligibility}</td>
              <td className="px-3 py-3 text-right font-mono text-[12px]">{u.offered}</td>
              <td className="px-3 py-3 text-right font-mono text-[12px] font-bold text-brand-deep">{u.accepted}</td>
              <td className="px-3 py-3 text-right font-mono text-[12px] font-bold">{money(u.revenue, u.currency, { compact: true })}</td>
              <td className="px-3 py-3">
                <Toggle checked={u.active} onChange={(v) => { setRows((r) => r.map((x) => (x.id === u.id ? { ...x, active: v } : x))); toast("info", `${u.name} ${v ? "enabled" : "paused"}`, "Concierge prompt library updated."); }} label={`Toggle ${u.name}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Variables() {
  const [overFor, setOverFor] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Auto-filled from reservations</h3>
        <p className="mb-3 text-[11px] text-mute">Resolved in templates, automations and AI replies at send time — always in the property's local timezone.</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.filter((v) => v.auto).map((v) => (
            <code key={v.key} className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-[11px] font-semibold text-brand-deep" title={v.label}>{`{{${v.key}}}`}</code>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Operator-defined</h3>
          <Btn size="xs" icon="plus">New variable</Btn>
        </div>
        {VARIABLES.filter((v) => !v.auto).map((v) => (
          <div key={v.key} className="mb-2.5 rounded-lg border border-line p-2.5">
            <div className="flex items-center gap-2">
              <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-deep">{`{{${v.key}}}`}</code>
              <span className="text-[11.5px] font-semibold text-mute">{v.label}</span>
              <button className="ml-auto text-[11px] font-bold text-brand-deep hover:underline" onClick={() => setOverFor(overFor === v.key ? null : v.key)}>
                {Object.keys(v.overrides ?? {}).length} property overrides
              </button>
            </div>
            <p className="mt-1.5 font-mono text-[12px] text-ink">{v.value}</p>
            {overFor === v.key && (
              <div className="anim-rise mt-2 space-y-1 border-t border-line pt-2">
                {Object.entries(v.overrides ?? {}).map(([pid, val]) => (
                  <p key={pid} className="flex justify-between gap-2 text-[11.5px]"><span className="font-bold text-mute">{propertyById(pid).name}</span><span className="font-mono">{val}</span></p>
                ))}
                {Object.keys(v.overrides ?? {}).length === 0 && <p className="text-[11px] text-faint">No overrides — global value everywhere.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Autopilot() {
  const { autopilot, setAutopilotMode, setAutopilotDelay, setAutopilotOverride, toast, audit } = useApp();
  const modes: { id: AutopilotMode; name: string; desc: string; icon: IconName }[] = [
    { id: "off", name: "Off", desc: "Manual only — concierge stays silent.", icon: "moon" },
    { id: "suggestion", name: "Suggestion", desc: "AI drafts every reply; nothing sends without a human click.", icon: "pencil" },
    { id: "on", name: "On", desc: `Auto-send after a ${autopilot.delaySec}s delay. Escalation rules still apply.`, icon: "zap" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-2.5 lg:col-span-2">
        {modes.map((m) => (
          <button key={m.id} onClick={() => { setAutopilotMode(m.id); toast("ok", `Autopilot → ${m.name}`, m.id === "on" ? "Auto-sends are logged with model + prompt version + citations." : undefined); }}
            className={cx("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all", autopilot.mode === m.id ? "border-brand bg-brand-soft/60 shadow-sm" : "border-line bg-card hover:border-line2")}>
            <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", autopilot.mode === m.id ? "bg-brand text-white" : "bg-paper text-mute")}><Ic name={m.icon} size={16} /></span>
            <span className="flex-1">
              <span className="block text-[13.5px] font-bold text-ink">{m.name}</span>
              <span className="text-[11.5px] text-mute">{m.desc}</span>
            </span>
            <span className={cx("flex h-4 w-4 items-center justify-center rounded-full border-2", autopilot.mode === m.id ? "border-brand bg-brand" : "border-line2")}>
              {autopilot.mode === m.id && <Ic name="check" size={9} className="text-white" sw={3} />}
            </span>
          </button>
        ))}
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="mb-2 font-display text-[13px] font-bold text-ink">Per-property overrides</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {["p-anggrek", "p-purnama", "p-senja"].map((pid) => (
              <label key={pid} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 text-[12px] font-bold text-ink">
                {propertyById(pid).code}
                <Select value={autopilot.overrides[pid] ?? "inherit"} onChange={(e) => setAutopilotOverride(pid, e.target.value as never)} className="!h-7 !w-[104px] !text-[11px]" aria-label={`Autopilot override for ${pid}`}>
                  <option value="inherit">Inherit</option><option value="off">Off</option><option value="suggestion">Suggestion</option><option value="on">On</option>
                </Select>
              </label>
            ))}
          </div>
          <h4 className="mb-1.5 mt-4 font-display text-[13px] font-bold text-ink">Always escalate to a human</h4>
          <div className="flex flex-wrap gap-1.5">
            {autopilot.keywords.map((k) => <Badge key={k} tone="danger">{k}</Badge>)}
            <Badge tone="mute">payment topics</Badge><Badge tone="mute">negative sentiment</Badge><Badge tone="mute">legal / safety</Badge>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="mb-2 font-display text-[13px] font-bold text-ink">Auto-send delay</h4>
          <div className="flex items-center gap-2">
            <Input type="number" min={20} value={autopilot.delaySec} onChange={(e) => setAutopilotDelay(Number(e.target.value))} className="!w-[90px]" aria-label="Auto-send delay seconds" />
            <span className="text-[12px] font-semibold text-mute">seconds (min 20)</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-mute">Gives your team a window to intercept. Suggestion mode ignores this — humans always click.</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h4 className="mb-2 font-display text-[13px] font-bold text-ink">AI message audit trail</h4>
          <ul className="space-y-2">
            {autopilot.audit.map((a, i) => (
              <li key={i} className="rounded-lg border border-line p-2.5">
                <p className="flex items-center justify-between text-[11.5px] font-bold text-ink">{a.conv} <Badge tone={a.outcome === "sent" ? "ok" : "warn"}>{a.outcome}</Badge></p>
                <p className="mt-0.5 font-mono text-[10px] text-mute">model={a.model} · prompt={a.promptV} · cited={a.cited.length} · {timeAgo(a.ts)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Scheduled() {
  const { msgQueue, setQueuedState, toast } = useApp();
  const [qtab, setQtab] = useState("upcoming");
  const [preview, setPreview] = useState<string | null>(null);
  const groups = Object.keys(LIFE);
  const qMsg = msgQueue.find((m) => m.id === preview);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-line bg-card">
        <header className="border-b border-line px-4 py-2.5">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Template library</h3>
          <p className="text-[10.5px] text-mute">Versioned · rendered per channel (email / WhatsApp / OTA native) · offset from the anchor event in property-local time</p>
        </header>
        <div className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {groups.map((g) => {
            const items = MSG_TEMPLATES.filter((t) => t.lifecycle === g);
            if (!items.length) return null;
            return (
              <div key={g} className="px-4 py-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-deep">{LIFE[g]}</p>
                {items.map((t) => (
                  <div key={t.id} className="mb-1.5 rounded-lg border border-line bg-paper/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-[12.5px] font-bold text-ink">{t.name}</p>
                      <Badge tone="mute">v{t.version}</Badge>
                      <Badge tone={t.state === "active" ? "ok" : t.state === "paused" ? "warn" : "mute"}>{t.state}</Badge>
                    </div>
                    <p className="mt-0.5 text-[10.5px] font-semibold text-mute">{t.offsetLabel} · {t.targeting}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">{t.channels.map((c) => <span key={c} className="rounded bg-sea-soft px-1.5 py-0.5 text-[9px] font-bold text-sea">{c}</span>)}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Outgoing queue</h3>
          <Tabs tabs={["upcoming", "sent", "failed", "cancelled"].map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1), count: msgQueue.filter((m) => m.state === s || (s === "upcoming" && m.state === "paused")).length }))} active={qtab} onChange={setQtab} />
        </header>
        <div className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {msgQueue.filter((m) => (qtab === "upcoming" ? m.state === "upcoming" || m.state === "paused" : m.state === qtab)).map((m) => (
            <div key={m.id} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <p className="flex-1 truncate text-[12.5px] font-bold text-ink">{m.guestName} <span className="font-semibold text-mute">· {propertyById(m.propertyId).code} · {m.channel}</span></p>
                {m.state === "paused" && <Badge tone="warn">paused</Badge>}
                {m.state === "failed" && <Badge tone="danger">failed</Badge>}
                <span className="font-mono text-[10.5px] font-bold text-mute">{m.state === "upcoming" || m.state === "paused" ? fmtDateTime(m.sendAt) : timeAgo(m.sendAt)}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-mute">{m.preview}</p>
              {(m.state === "upcoming" || m.state === "paused" || m.state === "failed") && (
                <div className="mt-1.5 flex gap-1.5">
                  <Btn size="xs" icon="eye" onClick={() => setPreview(m.id)}>Preview</Btn>
                  <Btn size="xs" icon="pencil" onClick={() => { setPreview(m.id); toast("info", "Editing queued message", "Changes are versioned per template."); }}>Edit</Btn>
                  {m.state !== "paused" ? (
                    <Btn size="xs" icon="pause" onClick={() => setQueuedState(m.id, "paused")}>Pause</Btn>
                  ) : (
                    <Btn size="xs" icon="play" onClick={() => setQueuedState(m.id, "upcoming")}>Resume</Btn>
                  )}
                  <Btn size="xs" icon="send" variant="solid" onClick={() => { setQueuedState(m.id, "sent"); toast("ok", "Sent now", `${m.guestName} · ${m.channel}`); }}>Send now</Btn>
                  <Btn size="xs" icon="x" variant="ghost" onClick={() => setQueuedState(m.id, "cancelled")}>Cancel</Btn>
                </div>
              )}
              {m.state === "failed" && <p className="mt-1 text-[10.5px] font-bold text-danger">Reason: WhatsApp session window expired — guest must re-opt-in before retry.</p>}
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!qMsg} onClose={() => setPreview(null)} title={`Preview · ${qMsg?.guestName ?? ""}`} w={520}>
        {qMsg && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 text-[10.5px] font-bold">
              <Badge tone="info">{qMsg.channel}</Badge>
              <Badge tone="mute">{MSG_TEMPLATES.find((t) => t.id === qMsg.templateId)?.name}</Badge>
              <Badge tone="mute">{fmtDateTime(qMsg.sendAt)} · WITA</Badge>
            </div>
            <div className="rounded-lg border border-line bg-paper p-3 font-mono text-[11.5px] leading-relaxed text-ink">
              {MSG_TEMPLATES.find((t) => t.id === qMsg.templateId)?.body}
            </div>
            <p className="text-[11px] text-mute">Variables resolve per reservation & property at send time — including DST-correct local delivery.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
