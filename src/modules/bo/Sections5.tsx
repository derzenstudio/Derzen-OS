import { useEffect, useState } from "react";
import { cx, timeAgo } from "../../lib/format";
import { Ic } from "../../components/icons";
import { Badge, Btn, Toggle } from "../../components/ui";
import { useAudit } from "../../components/Backoffice";
import {
  BULK_ACCESS_GRANTS, CERT_TEST_LISTINGS, CHART_OF_ACCOUNTS, COMMERCIAL_TERMS, CONTENT_CHECKS,
  CONTENT_PATTERNS, CRASH_FREE, DEPRECATION_RISK, DS_STATES, DS_TOKENS, EMAIL_TEMPLATES, FX_POLICY,
  GUARDRAILS, JOURNAL, KYC_QUEUE, LOCALE_COVERAGE, MOBILE_DECISION, APP_MATRIX,
  OWNER_FUNDS_POLICY, PARITY_WATCH, PARTNER_PROGRAMS, RECON_JOBS, STORE_TRACK, TAX_COLLECTED_BY,
  TMS_PIPELINE, VCC_FLOWS,
} from "../../lib/backoffice";

const tone = (s: string) =>
  s === "pass" || s === "clean" || s === "compliant" || s === "green" || s === "done" || s === "shipped" || s === "posted" || s === "certified" || s === "live" || s === "enforced" || s === "approved"
    ? "ok" : s === "wip" || s === "amber" || s === "breach-risk" || s === "alert" || s === "pending" || s === "in review" || s === "testflight" || s === "in sunset" || s === "notice sent" || s === "planned" || s === "reversal" || s === "internal track"
    ? "warn" : "danger";

// ── Guardrails (preamble) ─────────────────────────────────────────────────
export function GuardrailsView() {
  const { record } = useAudit();
  const [grants, setGrants] = useState(BULK_ACCESS_GRANTS);
  const [denied, setDenied] = useState<string[]>([]);
  const [auditLock, setAuditLock] = useState(true);
  void auditLock;

  const probe = (g: typeof GUARDRAILS[number]) => {
    setDenied((d) => [...d, g.probe]);
    record(`GUARDRAIL PROBE DENIED · ${g.probe}`, g.rule, "sensitive");
  };
  const tryDisableAudit = () => {
    record("AUDIT-DISABLE ATTEMPT DENIED", "self-session audit suspension is not a mutation any role can invoke", "destructive");
    setDenied((d) => [...d, "AUDIT-OFF-ATTEMPT"]);
  };
  const approveGrant = (id: string) => {
    setGrants((gs) => gs.map((g) => (g.id === id ? { ...g, status: "approved", remainingMin: g.windowMin, approver: "dev@trellis (second approver)" } : g)));
    record(`bulk-access grant ${id} approved (2-person)`, "time-boxed · expires automatically · every read logged", "sensitive");
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-xl border border-brand/40 bg-[#160b0b]">
        <header className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5">
          <Ic name="shield" size={16} className="text-brand-bright" />
          <div>
            <h2 className="font-display text-[14px] font-bold text-white">Console invariants — enforced in code, not culture</h2>
            <p className="text-[10px] text-white/45">build the log before you build the power · every rule below is a hard boundary, probed continuously</p>
          </div>
        </header>
        <ul className="p-4">
          {GUARDRAILS.map((g) => (
            <li key={g.rule} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-pine-950 px-3.5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/20 text-brand-bright"><Ic name="lock" size={13} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-bold text-white/90">{g.rule}</p>
                <p className="text-[10.5px] text-white/45">{g.detail}</p>
              </div>
              <span className="rounded-full bg-[#1d3527] px-2 py-0.5 font-mono text-[9px] font-bold text-[#4CC38A]">enforced</span>
              <Btn size="xs" variant="ghost" className="!text-white/60" onClick={() => probe(g)}>probe</Btn>
            </li>
          ))}
        </ul>
        {denied.length > 0 && (
          <div className="mx-4 mb-4 rounded-lg border border-brand/50 bg-brand/10 px-3.5 py-2.5 anim-pop">
            <p className="font-mono text-[10.5px] font-bold text-[#f0a0a0]">DENIED ×{denied.length} — {denied.slice(-3).join(" · ")}</p>
            <p className="text-[10px] text-white/50">Each probe was refused at the API layer and written to the append-only audit stream with your operator identity.</p>
          </div>
        )}
        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-3">
          <p className="text-[11px] text-white/55">Session audit is <b className="text-white/85">always on</b>.</p>
          <button onClick={tryDisableAudit} className="ml-auto rounded-md border border-white/15 px-2.5 py-1.5 text-[10.5px] font-bold text-white/45 transition-colors hover:border-brand hover:text-white">try to suspend audit of this session</button>
        </footer>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-[14px] font-bold text-white">Bulk data access — approved, logged, time-boxed</h2>
          <p className="text-[10px] text-white/45">no ad-hoc exports · a separate process with two approvers</p>
        </header>
        <ul className="p-4">
          {grants.map((g) => (
            <li key={g.id} className="mb-2.5 rounded-lg border border-white/10 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-white/85">{g.id}</span>
                <Badge tone={g.status === "approved" ? "ok" : "warn"}>{g.status}</Badge>
                <span className="ml-auto font-mono text-[10px] text-white/40">{g.requester}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] text-white/70">{g.scope}</p>
              <p className="mt-0.5 text-[10px] text-white/40">approver: {g.approver} · window {g.windowMin} min{g.status === "approved" && g.remainingMin > 0 ? ` · ${g.remainingMin} min left` : ""}</p>
              {g.status === "approved" && g.remainingMin > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-brand-bright transition-all duration-1000" style={{ width: `${(g.remainingMin / g.windowMin) * 100}%` }} /></div>
              )}
              {g.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Btn size="xs" variant="solid" icon="check" onClick={() => approveGrant(g.id)}>Approve as second approver</Btn>
                  <Btn size="xs" variant="ghost" className="!text-white/55" onClick={() => record(`bulk-access grant ${g.id} declined`, g.scope, "sensitive")}>Decline</Btn>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="border-t border-white/10 px-5 py-3 font-mono text-[9.5px] text-white/30">grants expire server-side · reads under a grant are tagged in the audit stream with the grant id</p>
      </section>
    </div>
  );
}

// ── Section O · OTA partnerships & legal ──────────────────────────────────
export function PartnershipsView() {
  const { record } = useAudit();
  const programs = PARTNER_PROGRAMS;
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <h2 className="font-display text-[14px] font-bold text-white">Partner programme tracker</h2>
            <p className="text-[10px] text-white/45">application-to-production is measured in months, not sprints — the roadmap tells the truth</p>
          </div>
          <Badge tone="warn">2 in legal review</Badge>
        </header>
        <table className="w-full text-left">
          <thead><tr className="border-b border-white/10 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
            <th className="px-5 py-2">OTA</th><th className="px-3 py-2">Programme</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Owner</th><th className="px-3 py-2">Blocked features</th><th className="px-3 py-2" />
          </tr></thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.ota} className="border-b border-white/5 align-top">
                <td className="px-5 py-2.5 text-[12.5px] font-bold text-white/90">{p.ota}</td>
                <td className="px-3 py-2.5 text-[11px] text-white/60">{p.program}</td>
                <td className="px-3 py-2.5"><Badge tone={tone(p.status)}>{p.status}</Badge></td>
                <td className="px-3 py-2.5 text-[10.5px] text-white/50">{p.owner}</td>
                <td className="px-3 py-2.5 text-[10.5px] text-white/50">{p.blocked.join(", ")}</td>
                <td className="px-3 py-2.5"><Btn size="xs" variant="ghost" className="!text-white/55" onClick={() => record(`nudge partnership owner`, `${p.ota} · ${p.program}`)}>nudge</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-5 py-2.5 font-mono text-[9.5px] text-white/30">each application is a tracked project with owner, status and blocked-features list — mirrored in the capability registry</p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Certification test listings — never a customer's inventory</h2></header>
          <ul className="p-4">
            {CERT_TEST_LISTINGS.map((c) => (
              <li key={c.provider} className="mb-2 flex flex-wrap items-center gap-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
                <span className="text-[12px] font-bold text-white/85">{c.provider}</span>
                <span className="font-mono text-[10px] text-white/40">{c.listing}</span>
                <span className="ml-auto text-[10px] text-white/40">owner: {c.owner} · run {timeAgo(c.lastRun)}</span>
                <Badge tone={tone(c.state)}>{c.state}</Badge>
              </li>
            ))}
          </ul>
          <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Commercial terms — legal review before the UI</h2></header>
          <ul className="p-4">
            {COMMERCIAL_TERMS.map((c) => (
              <li key={c.ota} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <p className="text-[12px] font-bold text-white/85">{c.ota} · {c.term}</p>
                <p className="text-[10.5px] text-white/50">{c.value}</p>
                <p className="mt-1 font-mono text-[9.5px] text-[#e2a33c]">{c.constraint}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Rate-parity monitor — catch breaches before the OTA does</h2></header>
          <ul className="p-4">
            {PARITY_WATCH.map((p) => (
              <li key={p.tenant + p.listing} className="mb-2 flex flex-wrap items-center gap-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-white/85">{p.tenant} · {p.listing}</p>
                  <p className="font-mono text-[10px] text-white/40">{p.channel} — direct {p.direct} vs channel {p.channelPrice}</p>
                </div>
                <Badge tone={tone(p.status)}>{p.status}</Badge>
                {p.status === "breach-risk" && <Btn size="xs" variant="ghost" className="!text-white/55" onClick={() => record("parity nudge sent to tenant", `${p.tenant} · ${p.listing}`, "sensitive")}>nudge tenant</Btn>}
              </li>
            ))}
          </ul>
          <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Content-completeness checks — pre-push, not post-rejection</h2></header>
          <ul className="p-4">
            {CONTENT_CHECKS.map((c) => (
              <li key={c.channel} className="mb-2 flex flex-wrap items-center gap-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
                <span className="text-[12px] font-bold text-white/85">{c.channel}</span>
                <span className="min-w-0 flex-1 truncate text-[10px] text-white/45">{c.rule}</span>
                <span className={cx("font-mono text-[11px] font-bold", c.failures ? "text-[#e2a33c]" : "text-[#4CC38A]")}>{c.failures} fails / {c.listings}</span>
              </li>
            ))}
          </ul>
          <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Deprecation risk register — you're a guest in their API</h2></header>
          <ul className="p-4">
            {DEPRECATION_RISK.map((d) => (
              <li key={d.provider} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <p className="flex items-center gap-2 text-[12px] font-bold text-white/85">{d.provider} <Badge tone={d.exposure === "high" ? "danger" : "warn"}>{d.exposure} exposure</Badge></p>
                <p className="mt-0.5 text-[10.5px] text-white/50">{d.risk}</p>
                <p className="font-mono text-[9.5px] text-white/35">contingency: {d.contingency}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ── Section P · Money movement & accounting ───────────────────────────────
export function LedgerView() {
  const { record } = useAudit();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <div>
              <h2 className="font-display text-[14px] font-bold text-white">Double-entry ledger — the core, not a report</h2>
              <p className="text-[10px] text-white/45">every movement posts balanced journal entries · corrections are reversals, never updates</p>
            </div>
            <Badge tone="ok">append-only</Badge>
          </header>
          <ul className="p-4">
            {JOURNAL.map((j) => {
              const dr = j.lines.reduce((s, l) => s + l.dr, 0);
              const cr = j.lines.reduce((s, l) => s + l.cr, 0);
              return (
                <li key={j.id} className={cx("mb-2.5 rounded-lg border px-3.5 py-3", j.status === "reversal" ? "border-[#e2a33c]/40" : "border-white/10")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-white/85">{j.id}</span>
                    <Badge tone={j.status === "reversal" ? "warn" : "ok"}>{j.status}</Badge>
                    <span className="text-[11px] text-white/60">{j.memo}</span>
                    <span className="ml-auto font-mono text-[9.5px] text-white/35">{timeAgo(j.ts)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 rounded-md bg-pine-950 px-3 py-2 font-mono text-[10px]">
                    {j.lines.map((l, i) => (
                      <span key={i} className="contents">
                        <span className="text-white/55">{l.acct}</span>
                        <span className="text-right text-white/75">{l.dr ? `dr ${(l.dr / 100).toFixed(2)}` : ""}</span>
                        <span className="text-right text-white/45">{l.cr ? `cr ${(l.cr / 100).toFixed(2)}` : ""}</span>
                      </span>
                    ))}
                    <span className="col-span-3 mt-1 border-t border-white/10 pt-1 text-right">
                      <span className={cx("font-bold", dr === cr ? "text-[#4CC38A]" : "text-[#f08c8c]")}>{dr === cr ? `balanced · ${(dr / 100).toFixed(2)}` : `UNBALANCED ${dr}≠${cr}`}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <footer className="border-t border-white/10 px-5 py-2.5 font-mono text-[9.5px] text-white/30">chart of accounts: {CHART_OF_ACCOUNTS.length} heads · reports, owner statements and reconciliations all derive from these entries</footer>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
            <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Owner funds — deliberate no-custody</h2></header>
            <div className="p-4">
              <p className="flex items-center gap-2"><Badge tone="ok">custody: none</Badge><span className="text-[11.5px] text-white/70">{OWNER_FUNDS_POLICY.model}</span></p>
              <p className="mt-2 text-[10.5px] text-white/50">Trust account: {OWNER_FUNDS_POLICY.trustAccount} · {OWNER_FUNDS_POLICY.reviewGate}.</p>
            </div>
          </section>
          <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
            <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">KYC / connected-account queue</h2></header>
            <ul className="p-4">
              {KYC_QUEUE.map((k) => (
                <li key={k.tenant} className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-white/85">{k.tenant}</p>
                    <p className="text-[10px] text-white/45">{k.provider} · {k.state} · {k.ageDays}d</p>
                  </div>
                  {!k.nudged && <Btn size="xs" variant="ghost" className="!text-white/55" onClick={() => record("KYC nudge sent", k.tenant)}>nudge</Btn>}
                  {k.nudged && <Badge tone="warn">nudged</Badge>}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Virtual credit cards — surfaced, charged, never persisted</h2></header>
          <ul className="p-4">
            {VCC_FLOWS.map((v) => (
              <li key={v.vcc} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <p className="flex items-center gap-2 text-[12px] font-bold text-white/85">{v.ota} <span className="font-mono text-[10px] text-white/40">{v.vcc}</span></p>
                <p className="font-mono text-[10px] text-white/45">{v.reservation} · {v.amount} · {v.activatesIn}</p>
                <p className="mt-1 font-mono text-[9px] text-[#4CC38A]">persisted: {String(v.persisted)} — card never lands in our scope</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">FX rate-of-record</h2></header>
          <div className="space-y-2 p-4">
            <p className="text-[11.5px] text-white/70"><b className="text-white/90">Provider:</b> {FX_POLICY.provider}</p>
            <p className="text-[11.5px] text-white/70"><b className="text-white/90">Snapshot:</b> {FX_POLICY.snapshot}</p>
            <p className="text-[11.5px] text-white/70"><b className="text-white/90">Rate of record:</b> {FX_POLICY.rateOfRecord}</p>
            <p className="rounded-md bg-pine-950 px-3 py-2 font-mono text-[10px] text-[#e2a33c]">{FX_POLICY.rule}</p>
          </div>
          <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Guest-side tax — who collects what</h2></header>
          <ul className="p-4">
            {TAX_COLLECTED_BY.map((t) => (
              <li key={t.jurisdiction} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <p className="text-[12px] font-bold text-white/85">{t.jurisdiction} · {t.tax}</p>
                <p className="text-[10px] text-white/50">{t.collectedBy} → remits to {t.remitsTo}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Daily reconciliation — finance trust is won here</h2></header>
          <ul className="p-4">
            {RECON_JOBS.map((r) => (
              <li key={r.job} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-[12px] font-bold text-white/85">{r.job}</p>
                  <Badge tone={tone(r.status)}>{r.status}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-white/45">{r.matched} matched · {r.unmatched} unmatched · {timeAgo(r.lastRun)}</p>
                {r.unmatched > 0 && <Btn size="xs" variant="ghost" className="mt-1.5 !text-white/55" onClick={() => record("recon unmatched rows exported to finance", r.job, "sensitive")}>export unmatched</Btn>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// ── Section Q · Mobile & release pipeline ─────────────────────────────────
export function MobileView() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand/30 bg-[#120909]">
        <div className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/20 text-brand-bright"><Ic name="phone" size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[14px] font-bold text-white">The decision, written down</h2>
            <p className="text-[11.5px] text-white/60"><b className="text-white/85">{MOBILE_DECISION.choice}.</b> {MOBILE_DECISION.rationale}. Rollback story is server-side flags, never app releases.</p>
          </div>
          <Badge tone="warn">{MOBILE_DECISION.stores}</Badge>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">App-version ↔ API compatibility</h2></header>
          <ul className="p-4">
            {APP_MATRIX.map((a) => (
              <li key={a.client} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
                <div className="flex items-center gap-2"><p className="flex-1 text-[12px] font-bold text-white/85">{a.client}</p><Badge tone={tone(a.status)}>{a.status}</Badge></div>
                <p className="font-mono text-[10px] text-white/45">min API {a.minApi} · {a.offline} · push {a.push}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Store delivery track</h2></header>
          <ul className="p-4">
            {STORE_TRACK.map((s) => (
              <li key={s.item} className="mb-1.5 flex items-center gap-2.5">
                <Ic name={s.state === "done" || s.state === "live" ? "checkCircle" : "clock"} size={13} className={s.state === "done" || s.state === "live" ? "text-[#4CC38A]" : "text-[#e2a33c]"} />
                <span className="flex-1 text-[11.5px] text-white/75">{s.item}</span>
                <Badge tone={tone(s.state)}>{s.state}</Badge>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
          <header className="border-b border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Crash-free sessions</h2></header>
          <ul className="p-4">
            {CRASH_FREE.map((c) => (
              <li key={c.build} className="mb-2 flex items-center gap-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
                <div className="min-w-0 flex-1"><p className="text-[11.5px] font-bold text-white/85">{c.build}</p><p className="text-[9.5px] text-white/40">{c.platform}</p></div>
                <span className="font-mono text-[13px] font-bold text-[#4CC38A]">{c.rate}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-white/10 px-5 py-3 font-mono text-[9.5px] text-white/30">low-end Android baseline: 2GB RAM · Android 9 · offline-first per spec</p>
        </section>
      </div>
    </div>
  );
}

// ── Section R · Design system & content design ────────────────────────────
export function DesignSystemView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-[14px] font-bold text-white">Token sets — tenant branding can't break contrast</h2>
          <p className="text-[10px] text-white/45">versioned package · browsable catalogue · visual-regression tests gate merge</p>
        </header>
        <ul className="p-4">
          {DS_TOKENS.map((t) => (
            <li key={t.set} className="mb-2 rounded-lg border border-white/10 px-3.5 py-2.5">
              <p className="text-[12px] font-bold text-white/85">{t.set}</p>
              <p className="font-mono text-[10px] text-white/45">base {t.base} · radius {t.radius} · motion {t.motion}</p>
              <p className="mt-0.5 font-mono text-[9.5px] text-[#4CC38A]">{t.contrast}</p>
            </li>
          ))}
        </ul>
        <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Documented states on every primitive</h2></header>
        <div className="flex flex-wrap gap-1.5 p-4">
          {DS_STATES.map((s) => <span key={s} className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[9.5px] text-white/60">{s}</span>)}
        </div>
      </section>
      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="border-b border-white/10 px-5 py-3.5"><h2 className="font-display text-[14px] font-bold text-white">Transactional email + PDF templates</h2></header>
        <ul className="p-4">
          {EMAIL_TEMPLATES.map((e) => (
            <li key={e.template} className="mb-2 flex items-center gap-2.5 rounded-lg border border-white/10 px-3.5 py-2.5">
              <span className="flex-1 text-[12px] font-bold text-white/85">{e.template}</span>
              <span className="font-mono text-[9.5px] text-white/40">{e.clients} · {timeAgo(e.tested)}</span>
              <Badge tone="ok">pass</Badge>
            </li>
          ))}
        </ul>
        <header className="border-y border-white/10 px-5 py-3"><h2 className="font-display text-[13px] font-bold text-white">Content design standards</h2></header>
        <ul className="space-y-2 p-4">
          <li className="rounded-lg border border-white/10 px-3.5 py-2.5"><p className="text-[11.5px] font-bold text-white/85">Voice</p><p className="text-[10.5px] text-white/50">{CONTENT_PATTERNS.voice}</p></li>
          <li className="rounded-lg border border-brand/40 px-3.5 py-2.5"><p className="text-[11.5px] font-bold text-brand-bright">Empty states are product surface</p><p className="text-[10.5px] text-white/50">{CONTENT_PATTERNS.emptyRule}</p></li>
          <li className="rounded-lg border border-white/10 px-3.5 py-2.5"><p className="text-[11.5px] font-bold text-white/85">Errors</p><p className="text-[10.5px] text-white/50">{CONTENT_PATTERNS.errorRule}</p></li>
          <li className="rounded-lg border border-white/10 px-3.5 py-2.5"><p className="text-[11.5px] font-bold text-white/85">Icons & marks</p><p className="text-[10.5px] text-white/50">{CONTENT_PATTERNS.iconPolicy}</p></li>
        </ul>
      </section>
    </div>
  );
}

// ── Section S · Localisation operations ───────────────────────────────────
export function LocalisationView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-[14px] font-bold text-white">Per-locale coverage — tenant app vs guest content are separate</h2>
          <p className="text-[10px] text-white/45">guest content is tenant-authored with its own editorial workflow + staleness detection</p>
        </header>
        <ul className="p-4">
          {LOCALE_COVERAGE.map((l) => (
            <li key={l.locale} className="mb-3 rounded-lg border border-white/10 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-bold uppercase text-white/85">{l.locale}</span>
                <span className="ml-auto text-[10px] text-white/40">reviewer: {l.reviewer}</span>
              </div>
              <div className="mt-2">
                <p className="mb-0.5 flex justify-between text-[10px] text-white/50"><span>app strings</span><span className="font-mono">{l.app}%</span></p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className={cx("h-full rounded-full", l.app === 100 ? "bg-[#4CC38A]" : "bg-brand-bright")} style={{ width: `${l.app}%` }} /></div>
              </div>
              <div className="mt-1.5">
                <p className="mb-0.5 flex justify-between text-[10px] text-white/50"><span>guest content</span><span className="font-mono">{l.guestContent}%</span></p>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className={cx("h-full rounded-full", l.guestContent === 100 ? "bg-[#4CC38A]" : "bg-[#e2a33c]")} style={{ width: `${l.guestContent}%` }} /></div>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-white/10 px-5 py-2.5 font-mono text-[9.5px] text-white/30">formats, address forms, phone validation, name order and first-day-of-week are localised per locale</p>
      </section>
      <section className="rounded-xl border border-white/10 bg-[#0a0a09]">
        <header className="border-b border-white/10 px-5 py-3.5"><h2 className="font-display text-[14px] font-bold text-white">The translation pipeline — how strings actually get made</h2></header>
        <ol className="p-4">
          {TMS_PIPELINE.map((s, i) => (
            <li key={s.step} className="relative pb-3 pl-7 last:pb-0">
              {i < TMS_PIPELINE.length - 1 && <span className="absolute left-[9px] top-4 h-full w-px bg-white/10" />}
              <span className="absolute left-0 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full bg-brand font-mono text-[9px] font-bold text-white">{i + 1}</span>
              <p className="text-[12px] font-bold text-white/85">{s.step}</p>
              <p className="font-mono text-[9.5px] text-white/40">{s.state}</p>
            </li>
          ))}
        </ol>
        <p className="border-t border-white/10 px-5 py-2.5 text-[10.5px] text-white/50">Machine translation is a first pass only — guest-facing copy always gets a human reviewer before it ships.</p>
      </section>
    </div>
  );
}

// keep hook-order stable even when unused
let _t: ReturnType<typeof setTimeout> | undefined;
useEffectSafe();
function useEffectSafe() {
  useEffect(() => () => { if (_t) clearTimeout(_t); }, []);
}
