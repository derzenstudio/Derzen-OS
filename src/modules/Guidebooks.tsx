import { useMemo, useState } from "react";
import { cx, money, pct, timeAgo, copyText } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, Ring, Select, Spark, Tabs, Textarea, Toggle, Field, Input } from "../components/ui";
import { useApp } from "../store";
import { STORE_ITEMS, STORE_TXNS, propertyById } from "../lib/data";

const THRESHOLD = 0.8;

function completion(gb: { sections: { id: string; required: boolean; fields: Record<string, string>; fieldDefs: { key: string }[] }[] }): number {
  let filled = 0, total = 0;
  for (const s of gb.sections) {
    if (!s.required) continue;
    for (const f of s.fieldDefs) {
      total += 1;
      if ((s.fields[f.key] ?? "").trim().length > 0) filled += 1;
    }
  }
  return total ? filled / total : 0;
}

export default function Guidebooks() {
  const { guidebooks, setGuidebookField, setGuidebookAiOnly, setGbDesign, setGbPublished, toast } = useApp();
  const properties = useApp((s) => s.properties);
  const [pid, setPid] = useState("p-anggrek");
  const [tab, setTab] = useState("content");
  const gb = guidebooks.find((g) => g.propertyId === pid);
  const prop = propertyById(pid);

  if (!gb || !prop) return <div className="p-8 text-center text-mute">Guidebook or property not found.</div>;

  const comp = useMemo(() => completion(gb), [gb]);
  const canPublish = comp >= THRESHOLD;
  const [items, setItems] = useState(STORE_ITEMS);

  const viewsSeries = useMemo(() => Array.from({ length: 14 }, (_, i) => Math.round(gb.views30d / 14 * (0.6 + 0.6 * Math.sin(i / 2) + i * 0.03))), [gb.views30d]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card px-4 py-3">
        <Select value={pid} onChange={(e) => setPid(e.target.value)} className="!w-[210px]" aria-label="Choose property guidebook">
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived ? " (archived)" : ""}</option>)}
        </Select>
        <div className="flex items-center gap-2.5">
          <Ring value={comp} size={44} label="Guidebook completion" />
          <div>
            <p className="text-[12.5px] font-bold text-ink">{pct(comp)} complete</p>
            <p className="text-[10.5px] text-mute">{canPublish ? <Dot tone="ok" label={`meets ${pct(THRESHOLD)} publish threshold`} /> : <Dot tone="warn" label={`needs ${pct(THRESHOLD)} before publishing`} />}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10.5px] text-faint">autosaved {timeAgo(gb.lastSavedTs)}</span>
          <Btn size="sm" icon="link" onClick={() => { copyText(`https://stay.sanggraha.co/guide/${prop.code.toLowerCase()}`); toast("ok", "Guidebook URL copied", "Unique link regenerated per reservation at booking time."); }}>Copy guest URL</Btn>
          <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5">
            <span className="text-[12px] font-bold text-ink">Published</span>
            <Toggle checked={gb.published} onChange={(v) => { if (v && !canPublish) { toast("warn", "Below completion threshold", `Finish ${pct(THRESHOLD)} of required fields first — guests must never see an empty guide.`); return; } setGbPublished(pid, v); }} label="Publish guidebook" />
          </label>
        </div>
      </div>

      <Tabs tabs={[{ id: "content", label: "Content" }, { id: "design", label: "Design" }, { id: "store", label: "Store" }, { id: "settings", label: "Settings" }, { id: "analytics", label: "Analytics" }]} active={tab} onChange={setTab} />

      {tab === "content" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {gb.sections.filter((s) => s.id !== "ai").map((s) => {
            const sFilled = s.fieldDefs.filter((f) => (s.fields[f.key] ?? "").trim()).length;
            return (
              <section key={s.id} className="rounded-xl border border-line bg-card p-4">
                <header className="mb-2.5 flex items-center justify-between">
                  <h3 className="font-display text-[13.5px] font-bold text-ink">{s.name}</h3>
                  <Badge tone={sFilled === s.fieldDefs.length ? "ok" : sFilled > 0 ? "warn" : "mute"}>{sFilled}/{s.fieldDefs.length} filled</Badge>
                </header>
                <div className="space-y-2.5">
                  {s.fieldDefs.map((f) => (
                    <Field key={f.key} label={f.label + (f.sync ? ` · synced from ${f.sync}` : "")}>
                      {f.multiline ? (
                        <Textarea defaultValue={s.fields[f.key] ?? ""} onBlur={(e) => { setGuidebookField(pid, s.id, f.key, e.target.value); }} className="!min-h-[62px]" />
                      ) : (
                        <Input defaultValue={s.fields[f.key] ?? ""} onBlur={(e) => { setGuidebookField(pid, s.id, f.key, e.target.value); }} />
                      )}
                    </Field>
                  ))}
                </div>
              </section>
            );
          })}
          <section className="rounded-xl border border-plum/40 bg-card p-4 lg:col-span-2">
            <header className="mb-2 flex items-center gap-2">
              <Ic name="sparkle" size={15} className="text-plum" />
              <h3 className="font-display text-[13.5px] font-bold text-ink">AI-only instructions</h3>
              <Badge tone="plum">never shown to guests</Badge>
            </header>
            <Textarea defaultValue={gb.aiOnly} onBlur={(e) => setGuidebookAiOnly(pid, e.target.value)} className="!min-h-[90px]" />
            <p className="mt-1.5 text-[11px] text-mute">Feeds the in-guidebook assistant for this property only — guardrails apply, and anything unanswerable still escalates.</p>
          </section>
        </div>
      )}

      {tab === "design" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-line bg-card p-4">
            <Field label="Theme">
              <div className="grid grid-cols-3 gap-2">
                {["Bali Dusk", "Ocean Light", "Jungle Ink"].map((th) => (
                  <button key={th} onClick={() => setGbDesign(pid, { theme: th })} className={cx("rounded-lg border px-3 py-2.5 text-[12px] font-bold", gb.design.theme === th ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute hover:text-ink")}>{th}</button>
                ))}
              </div>
            </Field>
            <Field label="Fonts">
              <Select value={gb.design.font} onChange={(e) => setGbDesign(pid, { font: e.target.value })}>
                {["Fraunces / Inter", "Bricolage / Public Sans", "Sora / Instrument Sans"].map((f) => <option key={f}>{f}</option>)}
              </Select>
            </Field>
            <Field label="Accent colour">
              <div className="flex gap-2">
                {["#0E6B4E", "#9A6A0B", "#38708A", "#5C6357", "#B42318"].map((c) => (
                  <button key={c} aria-label={`Accent ${c}`} onClick={() => setGbDesign(pid, { accent: c })} className={cx("h-8 w-8 rounded-full border-2 transition-transform hover:scale-110", gb.design.accent === c ? "border-ink" : "border-transparent")} style={{ background: c }} />
                ))}
              </div>
            </Field>
            <Field label="Cover photo"><div className="h-28 overflow-hidden rounded-lg border border-line"><img src={prop.image} alt={`${prop.name} cover`} className="h-full w-full object-cover" /></div></Field>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Live guest preview</p>
            <div className="overflow-hidden rounded-xl border border-line" style={{ accentColor: gb.design.accent }}>
              <div className="relative h-36">
                <img src={prop.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 30%, rgba(10,19,16,0.85))" }} />
                <p className="absolute bottom-3 left-4 font-display text-[20px] font-bold text-white">{prop.name}</p>
                <p className="absolute bottom-3 right-4 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold text-white" style={{ background: gb.design.accent }}>{prop.city}</p>
              </div>
              <div className="space-y-2 p-4">
                {gb.sections.filter((s) => s.id !== "ai").slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: gb.design.accent }} />
                    <span className="text-[12.5px] font-bold text-ink">{s.name}</span>
                    <Ic name="chevR" size={12} className="ml-auto text-faint" />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[10.5px] text-mute">Per-property guest surfaces translate independently — untranslated strings are flagged, never silently fallback.</p>
          </div>
        </div>
      )}

      {tab === "store" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-4 py-2.5">
              <h3 className="font-display text-[13.5px] font-bold text-ink">Tenant-wide catalog — toggle what this guidebook sells</h3>
              <p className="text-[10.5px] text-mute">One catalog, many guidebooks. Prices in the listing currency.</p>
            </header>
            <ul className="divide-y divide-line">
              {items.map((it) => {
                const on = it.enabledProperties.includes(pid);
                return (
                  <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Badge tone={it.type === "upsell" ? "warn" : it.type === "experience" ? "plum" : it.type === "partner_offer" ? "info" : "ok"}>{it.type.replace("_", " ")}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-ink">{it.name} {!it.active && <Badge tone="mute">catalog-inactive</Badge>}</p>
                      <p className="text-[11px] text-mute">{it.desc}</p>
                    </div>
                    <span className="font-mono text-[12px] font-bold">{it.price ? money(it.price, it.currency) : "free perk"}</span>
                    <Toggle checked={on && it.active} onChange={(v) => { setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, enabledProperties: v ? [...x.enabledProperties.filter((p) => p !== pid), pid] : x.enabledProperties.filter((p) => p !== pid) } : x))); toast("ok", `${it.name} ${v ? "added to" : "removed from"} ${prop.code} store`); }} label={`Toggle ${it.name} for ${prop.name}`} />
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-4 py-2.5"><h3 className="font-display text-[13.5px] font-bold text-ink">Store transactions ledger</h3></header>
            <table className="w-full text-left">
              <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2">Item</th><th className="px-3 py-2">Guest</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Fulfillment</th></tr></thead>
              <tbody>
                {STORE_TXNS.map((t) => (
                  <tr key={t.id} className="border-b border-line/60">
                    <td className="px-4 py-2 text-[12px] font-bold text-ink">{t.item}</td>
                    <td className="px-3 py-2 text-[12px] text-mute">{t.guest}</td>
                    <td className="px-3 py-2 font-mono text-[12px] font-bold">{money(t.amount, "IDR")}</td>
                    <td className="px-3 py-2"><Dot tone={t.payment === "completed" ? "ok" : t.payment === "failed" ? "danger" : "warn"} label={t.payment} /></td>
                    <td className="px-3 py-2"><Dot tone={t.fulfillment === "fulfilled" ? "ok" : "mute"} label={t.fulfillment} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-card p-4">
            <Field label="Public slug"><Input defaultValue={`/guide/${prop.code.toLowerCase()}`} /></Field>
            <Field label="Minimum completion threshold">
              <div className="flex items-center gap-2"><Input type="number" defaultValue={80} className="!w-[80px]" aria-label="Completion threshold percent" /><span className="text-[12px] font-semibold text-mute">% of required fields — publishing is blocked below this.</span></div>
            </Field>
            <div className="rounded-lg bg-paper px-3 py-2.5 text-[11.5px] leading-relaxed text-mute">
              Each reservation gets a <b className="text-ink">unique guidebook URL</b> (e.g. <code className="font-mono">/guide/{prop.code.toLowerCase()}-{prop.code}2417</code>) so access codes can be issued and revoked per stay by the smart-lock integration.
            </div>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-2 font-display text-[13px] font-bold text-ink">Guest language coverage</h3>
            {[["English", 1], ["Bahasa Indonesia", 0.8], ["中文", 0.35], ["Français", 0]].map(([lang, cov]) => (
              <div key={String(lang)} className="mb-2 flex items-center gap-2">
                <span className="w-[130px] text-[12px] font-bold">{lang}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className={cx("h-full", Number(cov) === 1 ? "bg-brand" : Number(cov) === 0 ? "bg-danger" : "bg-gold")} style={{ width: `${Number(cov) * 100}%` }} /></div>
                {Number(cov) === 1 ? <Dot tone="ok" label="complete" /> : <Dot tone={Number(cov) === 0 ? "danger" : "warn"} label={`${Math.round(Number(cov) * 100)}% — ${Number(cov) === 0 ? "untranslated" : "flagged"}`} />}
              </div>
            ))}
            <Btn size="xs" className="mt-2" icon="translate">Run machine-translation assist</Btn>
          </div>
        </div>
      )}

      {tab === "analytics" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Views · 30d</p>
            <p className="mt-1 font-display text-[24px] font-bold text-ink">{gb.views30d}</p>
            <Spark points={viewsSeries} w={150} h={40} />
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Store conversion</p>
            <p className="mt-1 font-display text-[24px] font-bold text-brand-deep">{gb.storeConversionPct}%</p>
            <p className="text-[10.5px] text-mute">guidebook visitors → store purchase</p>
          </div>
          <div className="col-span-2 rounded-xl border border-line bg-card p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Section engagement (% of visitors opening)</p>
            {Object.entries(gb.sectionEngagement).map(([k, v]) => (
              <div key={k} className="mb-1.5 flex items-center gap-2">
                <span className="w-[90px] text-[11.5px] font-bold capitalize">{k === "where" ? "Where is it" : k}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="bar-grow h-full rounded-full bg-brand" style={{ width: `${v}%` }} /></div>
                <span className="font-mono text-[10.5px] font-bold">{v}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
