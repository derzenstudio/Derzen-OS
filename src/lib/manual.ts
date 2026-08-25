// ── Part 5 · The Operator's Manual — datasets for the internal console ────
const now = Date.now();
const M = 60_000, H = 3_600_000, D = 86_400_000;

// ── 5.1 /queues — claimable daily work surfaces ──────────────────────────
export interface QueueItem { id: string; title: string; tenant: string; ageMin: number; slaMin: number; raw: string; normalised: string; fix: string; }
export interface QueueDef { id: string; name: string; icon: string; desc: string; items: QueueItem[]; }
export const QUEUES: QueueDef[] = [
  { id: "sync-failures", name: "Sync failures", icon: "refresh", desc: "Push/pull failures past retry budget", items: [
    { id: "sf-1", title: "VRBO · Villa Purnama AUTH_EXPIRED", tenant: "Sanggraha Villas", ageMin: 26 * 60, slaMin: 120, raw: "{code:401, err:'oauth_token_rejected', retried:14}", normalised: "connection=vrbo/purnama · state=degraded · last_ok=26h", fix: "Re-auth via OAuth refresh; token store shows expired 2026-02-10" },
    { id: "sf-2", title: "Agoda rate below floor", tenant: "Sanggraha Villas", ageMin: 9 * 60, slaMin: 240, raw: "{code:422, err:'rate_below_floor', floor:'USD348'}", normalised: "push_rates · Villa Purnama · 3 nights rejected", fix: "Raise base above USD 348 or exclude dates; surface to operator" },
  ]},
  { id: "quarantined-res", name: "Quarantined reservations", icon: "ticket", desc: "Inbound bookings that failed mapping", items: [
    { id: "qr-1", title: "BDC #4471902 · DLX-SEA unmapped", tenant: "Ambara Island Co.", ageMin: 180, slaMin: 60, raw: "{channel:'booking.com', room:'DLX-SEA', nights:2, guest:'Chen Wei'}", normalised: "external_id=4471902 · no local unit_type matches", fix: "Map DLX-SEA → 'Ambara One' (confidence 0.92); then import" },
  ]},
  { id: "unmapped-inventory", name: "Unmapped inventory", icon: "map", desc: "Remote listings with no local target", items: [
    { id: "ui-1", title: "Expedia rate plan 'FLEX-2026' unmapped", tenant: "Kite & Palm Co.", ageMin: 42 * 60, slaMin: 480, raw: "{remote:'FLEX-2026', type:'rate_plan'}", normalised: "connection=expedia · 0 local rate_plans linked", fix: "Suggest link to 'Base · flexible' (name similarity 0.88)" },
  ]},
  { id: "dead-letter", name: "Dead-letter jobs", icon: "terminal", desc: "Jobs past max attempts", items: [
    { id: "dl-1", title: "import.run batch B-201 stalled", tenant: "Nordlys Stays", ageMin: 6 * 60, slaMin: 360, raw: "{job:'import.run', batch:'B-201', attempt:8, err:'row_4412 schema'}", normalised: "resumable at row 4412 · 9k/12k rows done", fix: "Fix row 4412 date format, requeue from checkpoint" },
  ]},
  { id: "webhook-failures", name: "Webhook failures", icon: "webhook", desc: "Customer endpoints returning 5xx", items: [
    { id: "wf-1", title: "hooks.sanggraha.co 500 ×6", tenant: "Sanggraha Villas", ageMin: 40, slaMin: 120, raw: "{endpoint:'…/trellis', status:500, consecutive:6}", normalised: "event=reservation.created · retry #7 in 12m", fix: "Notify tenant endpoint unhealthy before disabling (policy)" },
  ]},
  { id: "stuck-kyc", name: "Stuck KYC", icon: "shield", desc: "Connected-account verification stalled", items: [
    { id: "sk-1", title: "Nordlys bank account mismatch", tenant: "Nordlys Stays", ageMin: 9 * 24 * 60, slaMin: 1440, raw: "{provider:'stripe', state:'requires_action', reason:'bank_mismatch'}", normalised: "restricted · payouts paused · nudged 0×", fix: "Nudge tenant to re-submit bank details; escalate to finance" },
  ]},
  { id: "payment-failures", name: "Payment failures", icon: "card", desc: "Guest / subscription charge failures", items: [
    { id: "pf-1", title: "R-2432 balance card declined", tenant: "Sanggraha Villas", ageMin: 8 * 60, slaMin: 480, raw: "{intent:'pi_3Q', code:'insufficient_funds', amount:94000}", normalised: "reservation R-2432 · balance $940 · dunning step 2", fix: "Dunning queued; offer payment-link retry to guest" },
  ]},
  { id: "ai-escalations", name: "AI escalations aged", icon: "sparkle", desc: "Escalations past SLA without a human", items: [
    { id: "ae-1", title: "Payment dispute · 6h unattended", tenant: "Ambara Island Co.", ageMin: 6 * 60, slaMin: 60, raw: "{conv:'c-1180', intent:'payment', sentiment:'angry'}", normalised: "autopilot correctly refused · needs human now", fix: "Assign to booking coordinator; audit refusal reason" },
  ]},
  { id: "fraud-review", name: "Fraud review", icon: "alertTri", desc: "Signup / payment abuse signals", items: [
    { id: "fr-1", title: "6 trial accounts, same card", tenant: "(signup)", ageMin: 2 * 60, slaMin: 240, raw: "{signal:'trial_farming', card_hash:'••8821', accounts:6}", normalised: "shared payment instrument across 6 signups", fix: "Freeze outbound + acceptance; require manual review" },
  ]},
  { id: "domain-stuck", name: "Domain verification stuck", icon: "globe", desc: "Custom domains stalled in DNS", items: [
    { id: "ds-1", title: "stay.kiteandpalm.com dns_pending 5d", tenant: "Kite & Palm Co.", ageMin: 5 * 24 * 60, slaMin: 2880, raw: "{domain:'stay.kiteandpalm.com', state:'dns_pending', days:5}", normalised: "CNAME not observed · cert blocked", fix: "Email tenant DNS instructions; verify TTL / proxy off" },
  ]},
];

// ── 5.1 /inspect — universal entity inspector (sample reservation) ────────
export const INSPECT_SAMPLE = {
  resource: "reservation", id: "R-2418", tenant: "Sanggraha Villas",
  normalised: [
    ["id", "R-2418"], ["tenant_id", "t-sanggraha"], ["property", "Villa Purnama"],
    ["status", "confirmed"], ["check_in → out", "2026-02-14 → 2026-02-19 (5 nights)"],
    ["guests", "2 adults · 1 child"], ["channel", "booking.com · #4471902"],
    ["currency", "IDR"], ["total_minor", "54,000,000"], ["balance_minor", "0"],
    ["payment_state", "paid (VCC •••• 4412)"], ["fx_rate_at", "16,285 IDR/USD @ 2026-02-12"],
  ],
  history: [
    { ts: now - 5 * D, actor: "booking.com (channel)", action: "reservation.created", source: "channel_sync" },
    { ts: now - 5 * D + 40_000, actor: "sync-worker", action: "mapped DLX-SEA → Villa Purnama", source: "automation" },
    { ts: now - 4 * D, actor: "payment-gateway", action: "VCC authorised → captured", source: "channel_sync" },
    { ts: now - 4 * D + 60_000, actor: "system", action: "reservation.confirmed · task.checkout_cleaning scheduled", source: "automation" },
    { ts: now - 2 * D, actor: "Kadek Mira (staff)", action: "note added: late arrival ~23:00", source: "ui" },
  ],
  payload: `{ "id": "4471902", "status": "new",
  "room": { "id": "DLX-SEA", "name": "Deluxe Sea View" },
  "guest": { "name": "Chen Wei", "email": "c•••@guest.booking.com" },
  "dates": { "arrival": "2026-02-14", "departure": "2026-02-19" },
  "price": { "total": "54000000", "currency": "IDR" },
  "vcc": { "last4": "4412", "activates": "2026-02-13T14:00Z" } }`,
  events: ["reservation.created", "reservation.confirmed", "payment.captured", "task.created"],
  permTrace: "staff=Kadek Mira · role=booking_coordinator · asserts reservations:read + guests:pii_masked → ALLOW (PII masked) · channel_credentials:read → DENY",
};

// ── 5.1 /providers — per-channel health ───────────────────────────────────
export const PROVIDER_HEALTH = [
  { provider: "Booking.com", conns: 38, success: 99.2, p95: 420, taxonomy: { AuthExpired: 2, RateLimited: 5, Transient: 12, ValidationRejected: 3 }, cert: "Tier 2 certified", deprecation: "R&A v2 sunset 2026-11", runbook: "runbooks/booking.md" },
  { provider: "Airbnb (aggregator)", conns: 41, success: 98.7, p95: 610, taxonomy: { AuthExpired: 4, Transient: 18, ProviderOutage: 1 }, cert: "via aggregator TAM", deprecation: "aggregator path — watch", runbook: "runbooks/airbnb.md" },
  { provider: "Expedia Group", conns: 29, success: 97.9, p95: 880, taxonomy: { AuthExpired: 6, Transient: 21, MappingMissing: 8 }, cert: "sandbox 8/11 green", deprecation: "EPS Rapid current", runbook: "runbooks/expedia.md" },
  { provider: "Agoda", conns: 12, success: 96.4, p95: 1240, taxonomy: { ValidationRejected: 14, RateLimited: 9, Unknown: 3 }, cert: "contract negotiation", deprecation: "n/a", runbook: "runbooks/agoda.md" },
  { provider: "iCal (direct)", conns: 57, success: 99.8, p95: 180, taxonomy: { Transient: 4 }, cert: "self-hosted", deprecation: "n/a", runbook: "runbooks/ical.md" },
];

// ── 5.2 Runbooks — the ten incidents that will actually happen ────────────
export interface Runbook { id: string; name: string; sev: string; detect: string; mitigate: string; comms: string; followup: string; }
export const RUNBOOKS: Runbook[] = [
  { id: "rb-1", name: "Double-booking / overbooking", sev: "Sev-1", detect: "Unique-index rejection rate + nightly drift report", mitigate: "Freeze pushes for the unit; identify the losing reservation; trigger relocation workflow; notify host before guest", comms: "Host first, guest second, status page if systemic", followup: "Root-cause: sync race vs mapping error vs channel lag; add to concurrency test suite" },
  { id: "rb-2", name: "Channel sync stalled", sev: "Sev-2", detect: "last-success-age SLO (page at 2h, never 11 days)", mitigate: "Check provider status page + circuit breakers; if provider-side post to status + suppress dup tickets; if ours, drain & replay queue", comms: "Status page + affected-tenant banner", followup: "Replay verification; SLO review if recurrence" },
  { id: "rb-3", name: "Aggregator outage", sev: "Sev-2", detect: "All channel jobs failing simultaneously", mitigate: "Banner affected tenants; queue outbound deltas durably (never drop); keep iCal + direct bookings live; give a real ETA", comms: "Broad banner + status page with ETA you have", followup: "Revisit direct-connection contingency plan" },
  { id: "rb-4", name: "Mass-send accident", sev: "Sev-1", detect: "Outbound volume anomaly circuit breaker", mitigate: "Global emergency stop <30s; quantify blast radius from message log; prepare one corrective message; notify hosts individually", comms: "Single corrective message, not silence", followup: "Add case to template linting + volume-anomaly breaker" },
  { id: "rb-5", name: "Model provider outage / quality regression", sev: "Sev-2", detect: "Router health + eval regression alarms", mitigate: "Fail over to secondary model; if quality not availability, force autopilot-On→Suggestion via kill switch and say why", comms: "Tenant notice explaining the downgrade", followup: "Eval-set gap analysis on the missed cases" },
  { id: "rb-6", name: "Payment provider incident", sev: "Sev-1", detect: "Gateway error rate + checkout failure rate", mitigate: "Queue authorisations where safe; never double-charge; honest checkout error not a spinner; reconcile aggressively after", comms: "Checkout shows honest error; status page", followup: "Recon report; refund any duplicate captures" },
  { id: "rb-7", name: "Cross-tenant data exposure", sev: "Sev-1", detect: "Isolation-suite failure / anomaly alert", mitigate: "Revoke the path immediately; preserve logs; scope exactly which records + by whom; engage legal; notify within regulatory clock", comms: "Legal-reviewed notice to affected tenants, never minimise", followup: "Regulatory notification log; suite coverage expansion" },
  { id: "rb-8", name: "Channel vault credential compromise", sev: "Sev-1", detect: "Anomalous credential use / provider alert", mitigate: "Rotate all affected credentials; force re-auth; notify providers per contract; audit + reverse unauthorised inventory/rate changes", comms: "Provider + tenant notification per contract", followup: "Rotation drill review; KMS access audit" },
  { id: "rb-9", name: "Database failover / corruption", sev: "Sev-1", detect: "Replication lag / failover event", mitigate: "Promote replica; reconcile lag; replay outbox; per-tenant point-in-time restore with documented verification step", comms: "Status page through the event", followup: "DR-drill result written down; restore verified" },
  { id: "rb-10", name: "Tenant self-inflicted destruction", sev: "Sev-3", detect: "Bulk delete / calendar wipe in audit log", mitigate: "Per-tenant restore + targeted event replay; soft deletes with grace window make this routine", comms: "Direct message to tenant with restore timeline", followup: "Confirm before/after captured; suggest confirmation UX" },
];
export const SEVERITY_LADDER = [
  { sev: "Sev-1", def: "Guest booking/check-in broken, money mis-stated, cross-tenant exposure, mass-send", response: "Page immediately · comms within 30 min", postmortem: "Mandatory" },
  { sev: "Sev-2", def: "Module unusable, one channel down, AI sending wrongly", response: "Page in hours · status page", postmortem: "Mandatory" },
  { sev: "Sev-3", def: "Degraded, workaround exists", response: "Business hours", postmortem: "Optional" },
  { sev: "Sev-4", def: "Cosmetic", response: "Backlog", postmortem: "No" },
];

// ── 5.3 SLO targets ───────────────────────────────────────────────────────
export const SLOS = [
  { name: "API availability", target: "99.9% / mo", current: "99.94%", budgetLeft: 78, owner: "platform" },
  { name: "Guest checkout availability", target: "99.95%", current: "99.96%", budgetLeft: 84, owner: "guest-surface" },
  { name: "Calendar grid p95 (200 listings × 3mo)", target: "< 800ms", current: "612ms", budgetLeft: 66, owner: "availability" },
  { name: "Inbox list p95", target: "< 500ms", current: "288ms", budgetLeft: 90, owner: "inbox" },
  { name: "Inbound reservation → visible in app (p95)", target: "< 60s", current: "34s", budgetLeft: 81, owner: "integrations" },
  { name: "Availability change → channel ack (p95)", target: "< 120s", current: "87s", budgetLeft: 72, owner: "integrations" },
  { name: "Sync freshness (no live conn > 30min)", target: "99% conn-hours", current: "99.1%", budgetLeft: 69, owner: "integrations" },
  { name: "Scheduled message on-time (±5min)", target: "99.5%", current: "99.6%", budgetLeft: 75, owner: "messaging" },
  { name: "AI draft generated p95", target: "< 8s", current: "4.2s", budgetLeft: 88, owner: "ai-platform" },
  { name: "Webhook first-attempt delivery p95", target: "< 10s", current: "6.8s", budgetLeft: 82, owner: "api" },
];
export const BUDGET_POLICY = "Exhaust the budget on any SLO and feature work in that subsystem stops until reliability work restores it. The decision is made by the subsystem owner and is visible on the same dashboard as the SLO.";

// ── 5.4 Migration & go-live playbook ──────────────────────────────────────
export const GOLIVE_PHASES = [
  { phase: "Discovery", items: ["Current PMS + channel connections (who owns each account)", "Listing structure: whole-unit vs room-type", "Rate structure, tax & fee config, owner agreements", "Existing future reservations inventory", "Hard cutover constraint: no lost or double-sold future bookings"] },
  { phase: "Dry-run import", items: ["Import into a staging tenant", "Row-level diff report generated", "Customer signs off on the diff before anything touches production"] },
  { phase: "Connect read-only", items: ["Connect channels in pull-only mode first", "Verify inventory parity for 48 hours", "Resolve all mapping mismatches", "Only then enable pushes"] },
  { phase: "Cutover day", items: ["Freeze changes in the old system", "Final delta import", "Enable pushes", "Watch the dedicated cutover dashboard", "Keep old system readable 30 days"] },
  { phase: "Hypercare (14 days)", items: ["Named owner for the window", "Daily reconciliation", "Formal handover to standard support", "Measure time-to-first-synced-channel + time-to-first-direct-booking"] },
];

// ── 5.5 Internal metric definitions ───────────────────────────────────────
export const METRIC_DEFS = [
  { cat: "Activation", def: "First synced channel + first reservation flowing in, within 14 days of signup" },
  { cat: "Engagement", def: "Weekly active operators per tenant; share of reservations touched in-app" },
  { cat: "AI value", def: "Share of guest conversations resolved without a human + median first-response time before/after" },
  { cat: "Operations value", def: "Tasks completed on time; expense capture rate" },
  { cat: "Distribution value", def: "Direct-booking share of revenue; commission avoided" },
  { cat: "Reliability", def: "Sync freshness compliance; overbooking incidents per 10k reservations; checkout success rate" },
  { cat: "Commercial", def: "Net revenue retention; gross margin per tenant after inference + aggregator cost; CAC payback; support contacts per tenant-month per module" },
];
export const GUARDRAIL_METRICS = ["overbooking rate", "AI mis-send rate", "checkout success", "p95 calendar latency"];

// ── 5.6 Team, cost & risk ─────────────────────────────────────────────────
export const MIN_TEAM = [
  { role: "Backend × 2", focus: "Availability + ledger core" },
  { role: "Integrations × 1", focus: "Dedicated — this role never runs out of work" },
  { role: "Full-stack × 1", focus: "Tenant application" },
  { role: "Full-stack × 1", focus: "Guest-facing + builder" },
  { role: "Platform/Infra × 1", focus: "CI, observability, on-call" },
  { role: "AI engineer × 1", focus: "Prompts, evals, guardrails" },
  { role: "Designer × 1", focus: "Design system + product" },
  { role: "Product lead × 1", focus: "Also runs early migrations" },
  { role: "Support × 1", focus: "Hire before the 20th tenant" },
];
export const UNIT_ECONOMICS = [
  { line: "Infrastructure share", note: "compute, db, queues" },
  { line: "Aggregator fees", note: "per-connection / per-booking" },
  { line: "Inference cost", note: "surprise #1 — needs per-tenant ceiling" },
  { line: "Messaging cost", note: "surprise #2 — WhatsApp templates + SMS" },
  { line: "Storage & egress", note: "photos are the heavy line" },
  { line: "Payment provider fees", note: "per-transaction %" },
  { line: "Support cost", note: "derived from contact volume" },
  { line: "Amortised migration", note: "white-glove onboarding spread" },
];
export const RISK_REGISTER = [
  { risk: "OTA programme rejection / contract change", owner: "integrations + legal", mitigation: "Aggregator behind adapter interface; direct tracks for top 3" },
  { risk: "Aggregator concentration", owner: "platform", mitigation: "SLO on the aggregator as a dependency; written exit plan" },
  { risk: "Model provider price / policy change", owner: "ai-platform", mitigation: "Model router abstraction; per-tenant ceilings" },
  { risk: "Cross-tenant security failure", owner: "security", mitigation: "Isolation suite per PR; RLS below app layer" },
  { risk: "Regulatory shift in STR licensing", owner: "legal", mitigation: "Licence fields + expiry tracking; per-market config" },
  { risk: "Key-person dependency (integrations)", owner: "eng-org", mitigation: "Adapter SDK so new channels don't need the core team" },
  { risk: "Migration capacity = sales bottleneck", owner: "product", mitigation: "Templated playbook + dry-run tooling; measure cycle time" },
  { risk: "Unattended sync errors erode calendar trust", owner: "integrations", mitigation: "Sync Health as first-class surface; 2h page threshold" },
];
