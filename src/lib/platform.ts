// ── Platform-side datasets (internal console only — never tenant-visible) ──

export interface OpsItem { id: string; tenant: string; label: string; detail: string; since: number; severity: "p1" | "p2" | "p3"; meta: string; }
const h = 3_600_000, now = Date.now();

export const FAILING_CONNECTIONS: OpsItem[] = [
  { id: "fc-1", tenant: "Sanggraha Villas", label: "VRBO · Villa Purnama", detail: "AUTH_EXPIRED — OAuth token rejected by Expedia Group", since: now - 26 * h, severity: "p1", meta: "retries 14/∞ · circuit OPEN" },
  { id: "fc-2", tenant: "Sanggraha Villas", label: "Agoda · Villa Purnama", detail: "RATE_BELOW_FLOOR — base rate under Agoda's USD 348 floor", since: now - 9 * h, severity: "p2", meta: "push coalesced · awaiting operator" },
  { id: "fc-3", tenant: "Ambara Island Co.", label: "Booking.com · Ambara One", detail: "MAPPING_MISSING — inbound room type \"DLX-SEA\" unmapped", since: now - 3 * h, severity: "p2", meta: "reservation quarantined" },
];

export const QUARANTINED_RESERVATIONS: OpsItem[] = [
  { id: "qr-1", tenant: "Ambara Island Co.", label: "BDC #4471902 · DLX-SEA", detail: "2 nights · Chen Wei · $312 — no local unit matches raw room type", since: now - 3 * h, severity: "p2", meta: "suggestion: Ambara One" },
];

export const STUCK_JOBS: OpsItem[] = [
  { id: "sj-1", tenant: "Sanggraha Villas", label: "ical/poll · The Kelapa House", detail: "worker crashed mid-fetch; lease expired, not re-queued", since: now - 51 * 60_000, severity: "p2", meta: "bullmq stalled ×3" },
  { id: "sj-2", tenant: "Ambara Island Co.", label: "invoice/render · INV-2026-018", detail: "PDF renderer OOM on 42-page folio", since: now - 2 * h, severity: "p3", meta: "backoff 4/8" },
];

export const FAILED_WEBHOOKS: OpsItem[] = [
  { id: "fw-1", tenant: "Sanggraha Villas", label: "hooks.sanggraha.co/trellis", detail: "500 from customer endpoint on reservation.created ×6", since: now - 40 * 60_000, severity: "p2", meta: "next retry in 12m · DLQ at attempt 9" },
];

export const AI_ESCALATIONS: OpsItem[] = [
  { id: "ae-1", tenant: "Sanggraha Villas", label: "Escalated 14h ago · no human touch", detail: "\"Is the pool heated?\" — knowledge gap, conv #c-2291", since: now - 14 * h, severity: "p2", meta: "SLA 4h breached" },
  { id: "ae-2", tenant: "Ambara Island Co.", label: "Escalated 6h ago · sentiment: angry", detail: "Payment dispute keywords — autopilot correctly refused", since: now - 6 * h, severity: "p1", meta: "SLA 1h breached" },
];

export const FAILED_PAYMENTS: OpsItem[] = [
  { id: "fp-1", tenant: "Sanggraha Villas", label: "R-2432 balance · $940.00", detail: "card_declined (insufficient funds) — dunning step 2 queued", since: now - 8 * h, severity: "p3", meta: "Stripe ch_3Q…" },
];

// ── Tenant deep-dive (Section A) ───────────────────────────────────────────
export const TENANT_DETAIL: Record<string, {
  users: { name: string; email: string; role: string; lastLogin: string }[];
  invoices: { ref: string; date: string; amount: string; status: string }[];
  errorRate30d: number[];
  tickets: { id: string; subject: string; state: string }[];
  audit: { ts: number; actor: string; action: string; source: string; reversible: boolean }[];
}> = {
  "t-sanggraha": {
    users: [
      { name: "Sarah Whitfield", email: "sarah@sanggraha.co", role: "Account owner", lastLogin: "2m ago" },
      { name: "Marco Reyes", email: "marco@sanggraha.co", role: "Administrator", lastLogin: "1h ago" },
      { name: "Kadek Mira", email: "mira@sanggraha.co", role: "Booking coordinator", lastLogin: "4h ago" },
      { name: "Wayan Sudiarta", email: "wayan@sanggraha.co", role: "Staff · task", lastLogin: "26m ago" },
    ],
    invoices: [
      { ref: "INV-2026-041", date: "2026-02-01", amount: "$118.00", status: "paid" },
      { ref: "INV-2026-040", date: "2026-01-01", amount: "$112.00", status: "paid" },
      { ref: "INV-2025-039", date: "2025-12-01", amount: "$104.00", status: "paid" },
    ],
    errorRate30d: [0.8, 0.6, 1.2, 0.9, 3.4, 5.1, 6.8, 4.2, 2.1, 1.4, 1.1, 0.9, 1.6, 2.8, 3.1, 2.2, 1.2, 0.8, 0.7, 1.9, 4.4, 5.6, 3.8, 2.4, 1.3, 0.9, 0.8, 1.1, 2.3, 3.2],
    tickets: [
      { id: "T-1042", subject: "VRBO re-auth keeps expiring", state: "open" },
      { id: "T-1038", subject: "Owner statement currency", state: "waiting" },
    ],
    audit: [
      { ts: now - 12 * 60_000, actor: "Sarah Whitfield", action: "Bulk edit: 7 listings × 30 nights", source: "ui", reversible: true },
      { ts: now - 2 * h, actor: "Concierge (autopilot)", action: "Auto-sent reply · conv c-2301 (model concierge-v2, prompt v14)", source: "ai", reversible: false },
      { ts: now - 3 * h, actor: "Automation engine", action: "Task created: Post-checkout cleaning · Purnama", source: "automation", reversible: true },
      { ts: now - 5 * h, actor: "channel-sync", action: "Inbound reservation imported · BDC #4471902", source: "channel_sync", reversible: true },
      { ts: now - 9 * h, actor: "Marco Reyes", action: "Rate plan \"Peak\" nightly 5,400,000 → 5,900,000 IDR", source: "ui", reversible: true },
    ],
  },
  "t-ambara": {
    users: [
      { name: "Dewi Ambara", email: "dewi@ambara.co", role: "Account owner", lastLogin: "3d ago" },
      { name: "Jon Pratama", email: "jon@ambara.co", role: "Staff · task+service", lastLogin: "7h ago" },
    ],
    invoices: [{ ref: "INV-2026-009", date: "2026-02-01", amount: "$49.00", status: "past_due" }],
    errorRate30d: [0.2, 0.3, 0.2, 0.4, 0.3, 0.2, 0.5, 0.8, 1.2, 0.6, 0.4, 0.3, 0.2, 0.3, 0.4, 0.6, 0.9, 1.4, 0.8, 0.5, 0.3, 0.4, 0.6, 1.1, 0.7, 0.4, 0.3, 0.2, 0.4, 0.6],
    tickets: [{ id: "T-1051", subject: "Unmapped Booking room type", state: "open" }],
    audit: [
      { ts: now - 3 * h, actor: "channel-sync", action: "Reservation quarantined · unmapped DLX-SEA", source: "channel_sync", reversible: true },
      { ts: now - 26 * h, actor: "Dewi Ambara", action: "Checkout page disabled · Ambara Two", source: "ui", reversible: true },
    ],
  },
};

export const INSPECTOR_ENTITY = {
  kind: "reservation", ref: "R-2418", tenant: "t-sanggraha",
  normalized: [
    { field: "status", value: "checked_in", source: "channel_sync", note: "imported from Booking.com pull 06:12Z" },
    { field: "total", value: "46,350,000 IDR (minor 4635000000)", source: "ui", note: "Σ line items verified at write" },
    { field: "fx_rate", value: "0.0000614 EUR/IDR @ 2026-02-11T22:00Z", source: "system", note: "snapshot retained on record" },
    { field: "check_in_time", value: "FLEXIBLE", source: "ui", note: "guest requested; confirmed by K. Mira" },
    { field: "guest.identity", value: "verified · provider ref jmt_88f2 · expires 2026-05-12", source: "api", note: "raw docs purged per retention" },
  ],
  mutations: [
    { ts: now - 5 * h, actor: "channel-sync", text: "imported · BDC #88412-77 (idempotency key bk_88f21c)" },
    { ts: now - 4 * h, actor: "Sarah Whitfield", text: "status pending → confirmed · deposit link sent" },
    { ts: now - 90 * 60_000, actor: "Stripe webhook", text: "payment_intent.succeeded · 30% deposit" },
    { ts: now - 40 * 60_000, actor: "DoorFlow", text: "access code issued · window check-in→check-out WITA" },
  ],
  rawPayload: `← POST /webhooks/booking (signature ok)
{ "reservation_id": "88412-77",
  "room_type": "VILLA-4BR",
  "gross_amount": { "value": 4635000000,
    "currency": "IDR" },
  "guest": { "email": "j.weber@•••.com" } }

→ normalised → reservation R-2418
  unit-night locks acquired: 6/6
  channels notified: airbnb, vrbo, agoda,
    traveloka, direct, ical (6 pushes)`,
};

export const ANNOUNCEMENTS = [
  { id: "an-1", title: "Scheduled maintenance — sync workers", body: "Channel pushes paused 02:00–02:20 UTC Sun. Inbound reservations queue safely.", targeting: "All tenants", severity: "notice", state: "scheduled", when: "Fri 22:00" },
  { id: "an-2", title: "New: DoorFlow smart-lock codes", body: "Access codes now issue on ID verification and revoke at checkout.", targeting: "Scale + Enterprise", severity: "changelog", state: "live", when: "shipped" },
  { id: "an-3", title: "Agoda floor-rate enforcement", body: "Agoda rejects bases under USD 348. We now pre-validate and queue a retryable error instead of a silent fail.", targeting: "Tenants with Agoda live", severity: "ack-required", state: "live", when: "12 ack / 19 seen" },
];

// ── Lifecycle (Section B) ──────────────────────────────────────────────────
export const LIFECYCLE_STATES = [
  { id: "trialing", count: 14, note: "14-day trial · paywall degrades gracefully" },
  { id: "active", count: 213, note: "healthy billing" },
  { id: "past_due", count: 6, note: "dunning step 1–3 · retries with backoff" },
  { id: "suspended", count: 2, note: "guest-facing stays + guidebooks keep serving (grace)" },
  { id: "cancelled", count: 9, note: "export generated · 30-day retention window" },
  { id: "purged", count: 41, note: "hard-deleted everywhere incl. backups + warehouse" },
];

export const ONBOARDING_FUNNEL = [
  { step: "Workspace created", reached: 100, dropped: 0 },
  { step: "First property created", reached: 84, dropped: 16 },
  { step: "Calendar imported (iCal fast path)", reached: 71, dropped: 13 },
  { step: "First channel connected", reached: 58, dropped: 13 },
  { step: "Payment method added", reached: 47, dropped: 11 },
  { step: "First direct booking", reached: 31, dropped: 16 },
];

export const MERGE_SPLIT_JOBS = [
  { id: "mg-1", kind: "merge", from: "Ambara Island Co. + Ambara East (t-ambara-east)", state: "dry-run ready", rows: "2 tenants → 1 · 41 reservations · 2,208 calendar rows", by: "you" },
  { id: "mg-2", kind: "split", from: "Kelapa Group → 3 owner workspaces", state: "awaiting owner sign-off", rows: "1 tenant → 3 · unit reassignment map attached", by: "CS · Rani" },
];

// ── Commercial engine (Section C) ─────────────────────────────────────────
export const PLAN_CATALOG = [
  { id: "starter-v3", name: "Starter", version: "v3", priceUSD: 49, priceIDR: 795_000, units: "3 property units", tenants: 61, grandfathered: 0, changed: "2025-11-01" },
  { id: "scale-v5", name: "Scale", version: "v5", priceUSD: 118, priceIDR: 1_895_000, units: "15 units + 5 services", tenants: 128, grandfathered: 9, changed: "2026-01-15" },
  { id: "ent-v2", name: "Enterprise", version: "v2", priceUSD: 0, priceIDR: 0, units: "custom contract", tenants: 8, grandfathered: 2, changed: "2025-08-20" },
];

export const METERING_EVENTS = [
  { ts: now - 4 * 60_000, tenant: "t-sanggraha", event: "listing.activated", unit: "p-kelapa", billable: true },
  { ts: now - 19 * 60_000, tenant: "t-sanggraha", event: "listing.archived", unit: "p-bayu", billable: false },
  { ts: now - 42 * 60_000, tenant: "t-ambara", event: "service.checkout_enabled", unit: "svc-snorkel", billable: true },
  { ts: now - 2 * h, tenant: "t-sanggraha", event: "unit.child_created", unit: "p-sam-three → counted under parent", billable: false },
];

export const MRR_WATERFALL = [
  { label: "New", value: 1_240, color: "#4CC38A" },
  { label: "Expansion", value: 860, color: "#8fd6b4" },
  { label: "Contraction", value: -320, color: "#e2a33c" },
  { label: "Churn", value: -540, color: "#B42318" },
  { label: "Reactivation", value: 210, color: "#5b8bd9" },
];

export const DUNNING_SEQUENCE = [
  { day: "D+0", action: "Payment retry (smart retries, 4 attempts over 8 days)", channel: "gateway" },
  { day: "D+1", action: "Email: card failed + one-click card update link", channel: "email" },
  { day: "D+4", action: "WhatsApp to owner + in-app banner", channel: "whatsapp" },
  { day: "D+8", action: "Final notice · grace: guest-facing stays keep serving", channel: "email" },
  { day: "D+12", action: "→ suspended (inbound reservations still accepted & queued)", channel: "system" },
];

export const AGENCY_ACCOUNTS = [
  { agency: "Bali Premium PM", children: 6, mrr: 708, commission: "12% payout monthly", status: "active" },
  { agency: "Lombok Villas Collective", children: 3, mrr: 147, commission: "referral credit", status: "active" },
];

// ── Entitlements, flags, coming soon (Section D) ──────────────────────────
export const QUOTAS = [
  { metric: "Listings", starter: "3", scale: "15", ent: "custom", kind: "hard" },
  { metric: "Team seats", starter: "unlimited", scale: "unlimited", ent: "unlimited", kind: "—" },
  { metric: "API requests / min", starter: "60", scale: "240", ent: "1,200", kind: "hard" },
  { metric: "Webhook endpoints", starter: "1", scale: "5", ent: "20", kind: "hard" },
  { metric: "AI messages / mo", starter: "1,000", scale: "5,000", ent: "custom", kind: "soft → hard" },
  { metric: "Storage", starter: "5 GB", scale: "50 GB", ent: "custom", kind: "soft" },
  { metric: "Websites", starter: "1", scale: "3", ent: "custom", kind: "hard" },
];

export const PLATFORM_FLAGS = [
  { key: "autopilot-send", name: "Autopilot auto-send", targeting: "ring: internal → 10% → all", owner: "AI squad", expires: "never", kill: true, state: "on" },
  { key: "adapter-agoda-v2", name: "Agoda adapter v2", targeting: "tenants: 19 with Agoda live", owner: "Channels squad", expires: "2026-03-01", kill: true, state: "on" },
  { key: "builder-v3", name: "Page builder v3", targeting: "pct: 25% of Scale+", owner: "Web squad", expires: "2026-02-28", kill: true, state: "on" },
  { key: "pricing-engine-v2", name: "New pricing engine", targeting: "ring: internal only", owner: "Core squad", expires: "2026-02-20", kill: true, state: "off" },
  { key: "whatsapp-templates-v2", name: "WhatsApp template builder", targeting: "tenants: beta list (7)", owner: "Messaging squad", expires: "2026-03-15", kill: false, state: "on" },
];

export const COMING_SOON = [
  { cap: "Direct Booking.com connection", status: "beta", waitlist: 34, note: "behind adapter contract · cert suite green" },
  { cap: "HitPay gateway", status: "planned", waitlist: 12, note: "KYB filed · keys expected March" },
  { cap: "Xendit gateway", status: "alpha", waitlist: 21, note: "internal ring only · sandbox round-trip passing" },
  { cap: "Instagram Direct", status: "beta", waitlist: 48, note: "Meta app review round 2" },
  { cap: "Google review pull-in", status: "planned", waitlist: 17, note: "needs Business Profile verification flow" },
  { cap: "Legacy iCal v1 parser", status: "deprecated", waitlist: 0, note: "removal 2026-04-01 · migration mail sent" },
];

// ── Integration engineering platform (Section E) ──────────────────────────
export const CAPABILITY_MATRIX: { channel: string; caps: Record<string, boolean | "partial"> }[] = [
  { channel: "Airbnb", caps: { minStay: true, cta: true, los: "partial", derived: false, child: true, cancel: true, vcard: false, msg: true } },
  { channel: "Booking.com", caps: { minStay: true, cta: true, los: true, derived: true, child: true, cancel: true, vcard: true, msg: true } },
  { channel: "VRBO", caps: { minStay: true, cta: "partial", los: true, derived: false, child: true, cancel: true, vcard: false, msg: true } },
  { channel: "Agoda", caps: { minStay: true, cta: false, los: "partial", derived: true, child: false, cancel: true, vcard: true, msg: false } },
  { channel: "Trip.com", caps: { minStay: true, cta: false, los: false, derived: true, child: false, cancel: true, vcard: true, msg: "partial" } },
  { channel: "MakeMyTrip", caps: { minStay: true, cta: false, los: false, derived: false, child: false, cancel: true, vcard: false, msg: false } },
  { channel: "Traveloka", caps: { minStay: true, cta: "partial", los: "partial", derived: false, child: false, cancel: true, vcard: false, msg: true } },
  { channel: "iCal", caps: { minStay: false, cta: false, los: false, derived: false, child: false, cancel: false, vcard: false, msg: false } },
];
export const CAP_LABELS: [string, string][] = [
  ["minStay", "Min stay"], ["cta", "CTA/CTD"], ["los", "LOS pricing"], ["derived", "Derived rates"],
  ["child", "Child rates"], ["cancel", "Policies"], ["vcard", "Virtual cards"], ["msg", "Messaging"],
];

export const ADAPTERS = [
  { name: "channex", contract: "v3.2", sla: "99.9%", cert: "green", note: "aggregator — monitored as a dependency with its own SLO" },
  { name: "booking-direct", contract: "v3.2", sla: "—", cert: "beta", note: "top-3 direct plan #1 · cert suite 41/41" },
  { name: "airbnb-direct", contract: "v3.2", sla: "—", cert: "blocked", note: "partner-program application pending (long pole)" },
  { name: "expedia-eps", contract: "v3.1", sla: "99.5%", cert: "amber", note: "2 scenarios flaky on sandbox rate-plan update" },
  { name: "ical", contract: "v3.2", sla: "in-house", cert: "green", note: "10-minute fast path · 15-min poll" },
];

export const VAULT = [
  { id: "v-1", scope: "t-sanggraha · booking.com", kind: "OAuth", rotated: "6d ago", next: "24d", kms: "kms:eu-1", health: "ok" },
  { id: "v-2", scope: "t-sanggraha · vrbo", kind: "OAuth", rotated: "31d ago", next: "OVERDUE", kms: "kms:eu-1", health: "warn" },
  { id: "v-3", scope: "t-sanggraha · agoda", kind: "API key", rotated: "12d ago", next: "48d", kms: "kms:eu-1", health: "ok" },
  { id: "v-4", scope: "t-ambara · booking.com", kind: "OAuth", rotated: "9d ago", next: "21d", kms: "kms:ap-1", health: "ok" },
  { id: "v-5", scope: "platform · meta whatsapp", kind: "System token", rotated: "2d ago", next: "88d", kms: "kms:global", health: "ok" },
];

export const CERT_SCENARIOS = [
  { name: "rate-push round-trip", booking: "pass", airbnb: "n/a", vrbo: "pass", agoda: "pass" },
  { name: "availability delta", booking: "pass", airbnb: "n/a", vrbo: "pass", agoda: "pass" },
  { name: "reservation import (idempotent)", booking: "pass", airbnb: "n/a", vrbo: "pass", agoda: "pass" },
  { name: "modification + cancellation", booking: "pass", airbnb: "n/a", vrbo: "flaky", agoda: "pass" },
  { name: "message transport", booking: "pass", airbnb: "n/a", vrbo: "pass", agoda: "skip" },
  { name: "rate-plan shape regression", booking: "pass", airbnb: "n/a", vrbo: "fail", agoda: "pass" },
];

export const ORCHESTRATOR = [
  { conn: "sanggraha · airbnb", depth: 0, rate: "12/min", backoff: "—", circuit: "closed", dlq: 0 },
  { conn: "sanggraha · booking", depth: 2, rate: "12/min", backoff: "—", circuit: "closed", dlq: 0 },
  { conn: "sanggraha · vrbo", depth: 31, rate: "0 (halted)", backoff: "exp · jitter", circuit: "OPEN", dlq: 14 },
  { conn: "sanggraha · agoda", depth: 6, rate: "2/min", backoff: "paused operator", circuit: "half-open", dlq: 1 },
  { conn: "ambara · booking", depth: 1, rate: "12/min", backoff: "—", circuit: "closed", dlq: 0 },
];

export const RECONCILIATION = [
  { channel: "Booking.com", lastRun: "06:00Z", nightsDrifted: 3, autoHealed: 3, escalated: 0, note: "safe heals applied (rate-only)" },
  { channel: "Airbnb", lastRun: "06:00Z", nightsDrifted: 0, autoHealed: 0, escalated: 0, note: "clean" },
  { channel: "VRBO", lastRun: "06:00Z", nightsDrifted: 12, autoHealed: 0, escalated: 12, note: "auth down — cannot verify; escalated" },
  { channel: "Agoda", lastRun: "06:00Z", nightsDrifted: 4, autoHealed: 2, escalated: 2, note: "floor-rate conflicts need operator" },
];

export const BACKFILL_JOBS = [
  { id: "bf-1", desc: "Replay Booking webhooks · Jan 28–Feb 02 (t-sanggraha)", state: "dry-run ready", diff: "+2 reservations · 0 conflicts" },
  { id: "bf-2", desc: "Re-derive availability from scratch · all live listings", state: "idle", diff: "last full run 9d ago · 0 drift" },
  { id: "bf-3", desc: "Bulk re-map room types · Ambara (3 listings)", state: "awaiting approval", diff: "map attached · reversible" },
];

export const PROVIDER_WATCHLIST = [
  { provider: "Expedia EPS", item: "Rapid v3 deprecation", date: "2026-06-30", action: "contract tests pinned · migration epic open", risk: "medium" },
  { provider: "Agoda", item: "Rate floor policy change", date: "live now", action: "pre-validation shipped · runbook updated", risk: "low" },
  { provider: "Meta WhatsApp", item: "Template category re-review", date: "2026-03-10", action: "resubmit 4 marketing templates", risk: "medium" },
  { provider: "Booking.com", item: "Payments API v2 (virtual cards)", date: "2026-05-15", action: "adapter spike scheduled", risk: "low" },
];

// ── Messaging infra (Section F) ────────────────────────────────────────────
export const TRANSPORTS = [
  { name: "OTA-native (via adapters)", health: "ok", note: "threaded per reservation · fallback: email", throughput: "1.2k/day" },
  { name: "WhatsApp Cloud (BSP)", health: "warn", note: "4 templates pending re-review · session-window guard on", throughput: "640/day" },
  { name: "Email (own IP pool)", health: "ok", note: "dedicated IPs · per-tenant custom domains", throughput: "3.1k/day" },
  { name: "SMS (Twilio)", health: "ok", note: "fallback-of-last-resort for urgent ops alerts", throughput: "40/day" },
  { name: "Push", health: "ok", note: "staff app · offline queue durable", throughput: "900/day" },
];

export const DELIVERABILITY = [
  { domain: "mail.sanggraha.co", spf: "pass", dkim: "pass", dmarc: "p=quarantine", rep: "99.2% inbox" },
  { domain: "mail.ambara.co", spf: "pass", dkim: "pending DNS", dmarc: "—", rep: "guided verify sent" },
  { domain: "mail.trellis.site (shared)", spf: "pass", dkim: "pass", dmarc: "p=reject", rep: "99.6% inbox" },
];

export const TEMPLATE_GOVERNANCE = [
  { name: "pre-arrival · directions", version: "v7", vars: "12/12 resolved", locale: "en, id", lint: "pass", used: "2.1k sends" },
  { name: "check-in · access code", version: "v4", vars: "9/9 resolved", locale: "en, id", lint: "pass", used: "1.8k sends" },
  { name: "post-stay · review ask", version: "v3", vars: "7/8 resolved", locale: "en", lint: "BLOCKED — {{deposit}} unresolved", used: "paused" },
  { name: "cancellation · policy", version: "v5", vars: "10/10 resolved", locale: "en, id", lint: "pass", used: "310 sends" },
];

export const THROTTLE_STATE = {
  globalStop: false,
  caps: [
    { tenant: "t-sanggraha", cap: "500/day", used: 141, anomaly: false },
    { tenant: "t-ambara", cap: "150/day", used: 22, anomaly: false },
  ],
};

// ── AI platform (Section G) ────────────────────────────────────────────────
export const PROMPT_REGISTRY = [
  { id: "pr-1", name: "concierge-answer", version: "v14", owner: "AI squad", rollout: "100%", status: "stable", changelog: "citation format · refusal tone" },
  { id: "pr-2", name: "reply-draft", version: "v9", owner: "AI squad", rollout: "25% → ramping", status: "staged", changelog: "shorter openings · id locale" },
  { id: "pr-3", name: "review-response", version: "v6", owner: "Growth", rollout: "100%", status: "stable", changelog: "never promise compensation" },
  { id: "pr-4", name: "intent-router", version: "v21", owner: "AI squad", rollout: "100%", status: "stable", changelog: "cheap model · classification only" },
];

export const MODEL_ROUTER = [
  { task: "Concierge answer", model: "concierge-v2 (primary)", fallback: "generic-llm-a", streaming: true, structured: true },
  { task: "Reply drafts", model: "concierge-v2", fallback: "generic-llm-a", streaming: true, structured: false },
  { task: "Intent routing", model: "cheap-classifier", fallback: "rule-based", streaming: false, structured: true },
  { task: "Review responses", model: "concierge-v2", fallback: "template + human", streaming: false, structured: false },
];

export const EVAL_RUNS = [
  { id: "eval-114", when: "today 05:12Z", trigger: "prompt reply-draft v9", accuracy: 93.1, refusal: 98.4, tone: 4.6, policy: 100, delta: "+0.8 acc vs v8" },
  { id: "eval-113", when: "yesterday", trigger: "model fallback drill", accuracy: 91.7, refusal: 98.1, tone: 4.5, policy: 100, delta: "fallback path green" },
  { id: "eval-112", when: "2d ago", trigger: "golden set refresh (+34 convs)", accuracy: 92.3, refusal: 97.9, tone: 4.5, policy: 100, delta: "baseline reset" },
];

export const BLOCKLIST = [
  "price changes / discounts", "refunds or compensation", "late-checkout guarantees", "legal advice",
  "medical advice", "sharing other guests' data", "bypassing house rules", "unverified availability promises",
];

export const KB_COVERAGE = [
  { tenant: "t-sanggraha", coverage: 87, gaps: ["heated pool?", "early check-in fee", "airport pickup price"] },
  { tenant: "t-ambara", coverage: 64, gaps: ["boat schedule", "diving partner", "villa generator policy", "breakfast hours"] },
];

export const AI_COST = [
  { tenant: "t-sanggraha", tokens: "4.2M", cost: 18.4, mrr: 118, margin: 84 },
  { tenant: "t-ambara", tokens: "0.6M", cost: 2.9, mrr: 49, margin: 94 },
];

export const HITL_STATS = [
  { tenant: "t-sanggraha", resolvedNoHuman: 71, escalated: 29, mode: "suggestion", lang: "en 82% · id 18%" },
  { tenant: "t-ambara", resolvedNoHuman: 44, escalated: 56, mode: "off (manual)", lang: "id 91% · en 9%" },
];

// ── Data platform (Section H) ──────────────────────────────────────────────
export const EVENT_CATALOG = [
  { name: "reservation.created", version: "v3", outbox: "transactional", consumers: "warehouse · billing meter · webhooks", volume: "41k/d" },
  { name: "calendar.bulk_edit", version: "v2", outbox: "transactional", consumers: "sync orchestrator · audit", volume: "3.1k/d" },
  { name: "message.sent", version: "v4", outbox: "transactional", consumers: "AI evals · warehouse", volume: "118k/d" },
  { name: "payment.received", version: "v2", outbox: "transactional", consumers: "billing meter · finance mart", volume: "9k/d" },
  { name: "knowledge.reindexed", version: "v1", outbox: "transactional", consumers: "AI platform · coverage reports", volume: "240/d" },
];

export const WAREHOUSE_MARTS = [
  { model: "stg_reservations", layer: "staging", freshness: "≤15m", tests: "uniqueness · not_null · fk", drift: "ok" },
  { model: "fct_stays_daily", layer: "gold", freshness: "≤15m", tests: "uniqueness · grain · recency", drift: "ok" },
  { model: "fct_revenue_daily", layer: "gold", freshness: "≤15m", tests: "reconciles_to_ledger (±0)", drift: "ok" },
  { model: "fct_sync_pushes", layer: "gold", freshness: "≤5m", tests: "idempotency dedupe", drift: "warn · 2 dupes quarantined" },
  { model: "dim_tenants", layer: "core", freshness: "≤1h", tests: "rls_predicate_present", drift: "ok" },
];

export const ACTIVATION_FUNNEL = [
  { step: "Signed up", count: 128, pct: 100 },
  { step: "Property created", count: 119, pct: 93 },
  { step: "Calendar imported (iCal fast path)", count: 104, pct: 81 },
  { step: "First channel connected", count: 87, pct: 68 },
  { step: "Payment method added", count: 61, pct: 48 },
  { step: "First direct booking", count: 38, pct: 30 },
];

export const HEALTH_SCORES = [
  { tenant: "Sanggraha Villas", score: 91, signals: "↑ direct share · 0 support tickets 14d", risk: "low" },
  { tenant: "Ambara Island Co.", score: 58, signals: "trial d11 · calendar only · no channel yet", risk: "medium — success touch queued" },
  { tenant: "Kite & Palm Co.", score: 34, signals: "owner last login 21d · sync errors rising", risk: "high — churn model p=0.62" },
];

export const SEARCH_INDEXES = [
  { index: "reservations", docs: "2.4M", perTenant: "alias-isolated", pii: "guest phones masked after retention", reindex: "zero-downtime swap · last 6d ago" },
  { index: "conversations", docs: "11.8M", perTenant: "alias-isolated", pii: "message bodies expire with tenant policy", reindex: "blue/green · last 13d ago" },
  { index: "guests", docs: "890k", perTenant: "alias-isolated", pii: "fuzzy-name index purged on erase", reindex: "last 6d ago" },
  { index: "listings", docs: "112k", perTenant: "public subset on websites index", pii: "n/a", reindex: "last 2d ago" },
];

// ── Support & customer success (Section I) ─────────────────────────────────
export const IMPERSONATION_LOG = [
  { id: "imp-9", staff: "Mira K. (support)", tenant: "Sanggraha Villas", consent: "granted in Settings · support-access ON", mode: "read-only", window: "30m", started: now - 4 * h, actions: 12, banner: "visible", paymentsBlocked: true },
  { id: "imp-8", staff: "Jonas T. (integrations)", tenant: "Kite & Palm Co.", consent: "ticket T-1031 consent thread", mode: "elevated · reason logged", window: "15m", started: now - 26 * h, actions: 4, banner: "visible", paymentsBlocked: true },
];

export const DIAGNOSTIC_BUNDLES = [
  { id: "diag-441", tenant: "Sanggraha Villas", by: "Mira K.", attachedTo: "T-1042", contents: "config · last 50 errors · sync state · queue depth · entitlements · flags · session meta", redactions: "credentials · guest PII · payment tokens", size: "1.8 MB" },
];

export const SUPPORT_TICKETS = [
  { id: "T-1042", tenant: "Sanggraha Villas", subject: "VRBO re-auth keeps expiring", sev: "S2", state: "open", macro: "pull live sync state", health: "linked · 91" },
  { id: "T-1038", tenant: "Sanggraha Villas", subject: "Owner statement currency", sev: "S3", state: "waiting on customer", macro: "pull billing summary", health: "linked · 91" },
  { id: "T-1031", tenant: "Kite & Palm Co.", subject: "Calendar shows stale rates on Booking", sev: "S2", state: "escalated → on-call", macro: "run reconciliation diff", health: "linked · 34" },
];

export const STATUS_COMPONENTS = [
  { name: "Tenant app", status: "operational", uptime90d: 99.98 },
  { name: "Public API", status: "operational", uptime90d: 99.97 },
  { name: "Channel sync — Airbnb", status: "operational", uptime90d: 99.9 },
  { name: "Channel sync — Expedia/VRBO", status: "degraded", uptime90d: 98.2 },
  { name: "Guest checkout", status: "operational", uptime90d: 100 },
  { name: "Outbound messaging", status: "operational", uptime90d: 99.6 },
];

export const TRUST_CENTRE = [
  { doc: "Security overview v4", updated: "Jan 2026" }, { doc: "Subprocessor register (14)", updated: "Feb 2026" },
  { doc: "DPA + SCCs", updated: "Nov 2025" }, { doc: "SOC 2 Type II report", updated: "under audit · ETA Q2" },
  { doc: "Uptime history (90d)", updated: "live" }, { doc: "Pen-test summary (redacted)", updated: "Dec 2025" },
];

// ── Engineering substrate (Section J) ──────────────────────────────────────
export const ENVIRONMENTS = [
  { name: "local", shape: "docker compose · one command · seeded demo tenant", db: "container PG 16", note: "never shared" },
  { name: "ci", shape: "ephemeral per-PR · prod-shaped schema", db: "temp instance", note: "isolation suite runs here" },
  { name: "staging", shape: "sandbox provider creds · prod data volumes (synthetic)", db: "weekly clone of prod", note: "DR target" },
  { name: "production", shape: "3 AZs · eu-central + ap-southeast read paths", db: "PG 16 + 2 replicas", note: "RLS enforced" },
];

export const CI_STAGES = [
  { stage: "lint + typecheck", gate: "merge", dur: "38s" }, { stage: "unit (pricing · tax · payout)", gate: "merge", dur: "1m 12s" },
  { stage: "contract — per OTA adapter (recorded fixtures)", gate: "merge", dur: "2m 40s" }, { stage: "cross-tenant isolation — all routes", gate: "merge", dur: "1m 55s" },
  { stage: "E2E — money path + message path", gate: "merge", dur: "6m 10s" }, { stage: "a11y (WCAG 2.2 AA) + bundle size", gate: "merge", dur: "1m 30s" },
  { stage: "canary 5% → ring 25% → full", gate: "auto-rollback on SLO breach", dur: "progressive" },
];

export const MIGRATION_RULES = [
  "expand → backfill → contract: never drop a column in the release that stops reading it",
  "online index builds (CONCURRENTLY) on tables >1M rows",
  "dry-run every migration against a prod-sized clone first",
  "calendar hot path: materialised night-availability rollups, read replicas for reporting",
  "tenancy model: shared schema + RLS — isolation suite is non-negotiable on every PR",
];

export const JOB_PLATFORM = [
  { queue: "channel-sync", partition: "per tenant + connection", priority: "high", dlq: 3, fairness: "weighted · noisy-tenant cap 20%" },
  { queue: "outbound-messages", partition: "per tenant", priority: "high", dlq: 0, fairness: "token bucket per BSP" },
  { queue: "webhooks-out", partition: "per endpoint", priority: "medium", dlq: 1, fairness: "exponential backoff ×5" },
  { queue: "reports-rollup", partition: "cron hourly", priority: "low", dlq: 0, fairness: "off-peak window" },
  { queue: "imports", partition: "per job · resumable", priority: "low", dlq: 0, fairness: "1 concurrent per tenant" },
];

export const SLO_BUDGETS = [
  { sub: "API availability", slo: "99.9%", window: "30d", budgetLeft: 82, p95: "184ms" },
  { sub: "Calendar grid p95", slo: "<500ms", window: "30d", budgetLeft: 71, p95: "312ms" },
  { sub: "Sync freshness", slo: "push <60s", window: "30d", budgetLeft: 44, p95: "38s" },
  { sub: "Message delivery latency", slo: "<10s", window: "30d", budgetLeft: 90, p95: "3.1s" },
  { sub: "AI response latency", slo: "<4s", window: "30d", budgetLeft: 66, p95: "1.9s" },
  { sub: "Guest checkout success", slo: ">99%", window: "30d", budgetLeft: 95, p95: "99.6%" },
];

export const DR_DRILLS = [
  { id: "dr-12", what: "Per-tenant point-in-time restore (Kite & Palm)", when: "Jan 28 2026", rto: "41m", rpo: "4m", result: "pass · report filed", next: "Apr 28 2026" },
  { id: "dr-11", what: "Full region failover ap-southeast → eu-central", when: "Dec 10 2025", rto: "1h 06m", rpo: "5m", result: "pass · 2 action items closed", next: "Jun 2026" },
];

export const CHAOS_RUNS = [
  { scenario: "VRBO provider timeout ×100 concurrent pushes", result: "no dupes · backoff honoured · DLQ 0", when: "9d ago" },
  { scenario: "DB failover mid bulk-edit", result: "edit rejected cleanly · retried idempotently", when: "9d ago" },
  { scenario: "Queue backpressure — noisy tenant at 10× rate", result: "fairness cap held · others unaffected", when: "23d ago" },
];

export const CLOUD_COSTS = [
  { service: "Inference (AI)", cost: 412, delta: "+18% MoM", flag: "watch — concierge-v2 adoption" },
  { service: "Postgres + replicas", cost: 388, delta: "+2%", flag: "ok" },
  { service: "Egress (OTA pulls)", cost: 174, delta: "+9%", flag: "watch — full-state reconciliation weekly" },
  { service: "Blob storage (photos)", cost: 96, delta: "+4%", flag: "ok" },
  { service: "Queues + workers", cost: 71, delta: "−3%", flag: "ok" },
];

// ── Security & compliance (Section K) ──────────────────────────────────────
export const THREAT_MODEL = [
  { threat: "Cross-tenant data access", surface: "all OLTP + search + cache", controls: "RLS predicate · isolation suite on every PR · cache keys namespaced", status: "tested weekly" },
  { threat: "Credential theft from channel vault", surface: "integrations", controls: "KMS envelope encryption · scoped decrypt at point of use · never in logs", status: "rotation drill Q1" },
  { threat: "Guest PII via guidebooks / websites", surface: "guest surfaces", controls: "access codes behind reservation token · CSP sandboxed rendering", status: "covered" },
  { threat: "Prompt injection via guest messages", surface: "AI platform", controls: "grounded retrieval only · blocklist · eval suite regression gate", status: "eval-114 green" },
  { threat: "Webhook forgery", surface: "public API", controls: "HMAC(ts+body) · 5-min replay window · rotating secrets", status: "covered" },
  { threat: "SSRF via builder / KB URLs", surface: "websites · knowledge", controls: "egress proxy allowlist · private-range block", status: "covered" },
  { threat: "Stored XSS in tenant content", surface: "websites · guidebooks", controls: "sanitiser + separate origin for custom domains", status: "covered" },
  { threat: "IDOR on resource-ID routes", surface: "tenant API", controls: "tenant-scoped lookups · fuzz suite", status: "tested weekly" },
];

export const COMPLIANCE = [
  { item: "GDPR / UK GDPR", state: "in force", detail: "DSAR tooling · 72h breach clock · retention schedules" },
  { item: "CCPA", state: "in force", detail: "opt-out + deletion per guest" },
  { item: "SOC 2 Type II", state: "under audit", detail: "enterprise unlock · ETA Q2 2026" },
  { item: "Guest registration / police reporting", state: "per-jurisdiction module", detail: "IT/HR-style local forms · Bali in pilot" },
  { item: "Tourist tax collection", state: "module on", detail: "levy pass-through on direct invoices" },
  { item: "Licence numbers on listings", state: "enforced at publish", detail: "publish blocked without permit field where required" },
];

export const FRAUD_QUEUE = [
  { id: "fq-1", kind: "Card testing", detail: "14 checkout attempts · 6 countries · same device fp", tenant: "direct checkout", action: "payments frozen · gateway challenge on" },
  { id: "fq-2", kind: "Trial farming", detail: "5 signups · same card BIN · disposable domains", tenant: "signup", action: "merged + flagged for review" },
];

// ── Developer ecosystem (Section L) ────────────────────────────────────────
export const API_SURFACE = [
  { item: "Current version", value: "/v1 — OpenAPI generated from implementation", status: "ga" },
  { item: "Deprecation policy", value: "sunset headers · ≥6 months notice", status: "policy" },
  { item: "Idempotency", value: "required on writes · 24h dedupe", status: "enforced" },
  { item: "Rate limits", value: "per-key · 429 + Retry-After + budget headers", status: "live" },
];

export const OAUTH_APPS = [
  { app: "Ownerly Accounting Sync", dev: "Ownerly Inc.", scopes: "invoices:read · payouts:read", installs: 41, status: "listed" },
  { app: "StayMetrics BI", dev: "StayMetrics", scopes: "reports:read", installs: 17, status: "in review" },
];

export const WEBHOOK_INFRA = [
  { metric: "Endpoints registered", value: "118" }, { metric: "Deliveries 30d", value: "4.1M" },
  { metric: "First-attempt success", value: "99.2%" }, { metric: "Dead-letter", value: "2 · both alerted" },
];

export const SDKS = [
  { sdk: "Node / TypeScript", generated: "from OpenAPI", version: "3.2.0", status: "ga" },
  { sdk: "Python", generated: "from OpenAPI", version: "2.8.1", status: "ga" },
  { sdk: "Postman collection", generated: "nightly", version: "auto", status: "ga" },
  { sdk: "Sandbox tenant", generated: "self-serve · fake channel provider", version: "—", status: "ga" },
];

// ── Release & quality (Section M) ──────────────────────────────────────────
export const RELEASE_TRAIN = {
  current: "0.78",
  cadence: "weekly train · trunk-based · short-lived branches",
  ring: "canary 5% (2h) → ring 25% (12h) → full",
  entries: [
    { v: "0.78", when: "this week", notes: "reconciliation engine GA · quote→invoice line mapping", flag: "behind flag:recon_v2" },
    { v: "0.77", when: "last week", notes: "AI eval gating in CI · KB coverage reports", flag: "rolled back once · re-shipped" },
    { v: "0.76", when: "2w ago", notes: "record/replay cert harness · 4 OTA sandboxes", flag: "stable" },
  ],
};

export const DOD = [
  "tests (unit + contract where applicable)", "docs updated in the same PR", "telemetry + alerts wired",
  "feature flag with owner + expiry", "rollback plan written", "changelog entry linked to the in-app version",
];

export const RUNBOOKS = [
  { sub: "Channel sync orchestrator", author: "integrations eng", testedBy: "on-call (non-author)", lastDrill: "Jan 2026" },
  { sub: "Outbound messaging + emergency stop", author: "messaging eng", testedBy: "support lead", lastDrill: "Dec 2025" },
  { sub: "Tenant restore (PITR)", author: "platform eng", testedBy: "SRE rotation", lastDrill: "Jan 28 2026" },
  { sub: "AI kill switch + fallback", author: "AI squad", testedBy: "on-call", lastDrill: "Nov 2025" },
];

// ── Internal access control (Section N) ────────────────────────────────────
export const STAFF_ROLES = [
  { role: "support", can: "read-only + consented impersonation", cannot: "config · billing · flags" },
  { role: "success", can: "tenant config · trials · plan changes", cannot: "sync actions · keys" },
  { role: "integrations eng", can: "sync actions · mapping · replay", cannot: "billing · role grants" },
  { role: "finance", can: "billing · credits · invoices · refunds", cannot: "tenant data reads beyond billing" },
  { role: "platform eng", can: "jobs · flags · migrations", cannot: "billing · impersonation" },
  { role: "security", can: "audit access · incident actions", cannot: "self-granting elevation" },
  { role: "admin", can: "role grants · two-person approvals", cannot: "unlogged anything — nothing is unlogged" },
];

export const INTERNAL_AUDIT = [
  { ts: now - 8 * 60_000, staff: "Mira K.", action: "impersonation started (read-only, consent verified)", tenant: "Sanggraha", anomaly: false },
  { ts: now - 42 * 60_000, staff: "platform-ci", action: "flag autopilot_v3 → ring 25%", tenant: "—", anomaly: false },
  { ts: now - 3 * h, staff: "finance-bot", action: "invoice INV-2026-042 re-sent (dunning step 2)", tenant: "Kite & Palm", anomaly: false },
  { ts: now - 7 * h, staff: "unknown", action: "3 failed MFA attempts on admin role", tenant: "—", anomaly: true },
];

// ── Build order & acceptance criteria ──────────────────────────────────────
export const PHASES = [
  { id: 0, name: "Foundation", state: "shipped", items: ["tenancy + isolation suite", "environments + CI/CD", "migrations discipline", "job platform", "logging + tracing", "secrets", "backups w/ tested restore", "flags", "entitlements", "audit log", "tenant directory"] },
  { id: 1, name: "Design partners", state: "shipped", items: ["commercial engine", "onboarding orchestration", "diagnostic bundles", "consented impersonation", "sync health + failure queues", "status page"] },
  { id: 2, name: "Scale integrations", state: "shipped", items: ["adapter SDK + capability matrix", "credential vault", "cert / record-replay harness", "reconciliation engine", "replay/backfill", "provider change mgmt"] },
  { id: 3, name: "Scale the AI", state: "in progress", items: ["prompt/model registry", "eval harness in CI", "guardrails + HITL", "KB ingestion + coverage", "cost metering per tenant"] },
  { id: 4, name: "Scale the business", state: "next", items: ["data platform + warehouse", "internal analytics + health scores", "agency hierarchy", "public API + webhooks v2", "SDKs + docs"] },
  { id: 5, name: "Enterprise readiness", state: "planned", items: ["SOC 2", "data residency + multi-region", "SSO/SCIM", "DR exercises on schedule", "marketplace", "contract SLAs"] },
];

export const ACCEPTANCE = [
  { text: "Provision → onboard → bill → suspend → restore → purge, zero manual DB access", state: "pass" },
  { text: "Any bug report answerable from the console: raw payload, record, history, actor", state: "pass" },
  { text: "New OTA adapter: no core changes, cert harness green in CI, per-tenant flag", state: "pass" },
  { text: "Kill any worker/queue/region/provider: no lost bookings, no dupes, reconciliation catches drift", state: "pass · chaos 9d ago" },
  { text: "Isolation suite green on 100% of routes, jobs, queries, indexes, cache keys — every PR", state: "pass · 214/214" },
  { text: "No prompt ships without an eval diff; every AI message reproducible from metadata", state: "pass · eval-114" },
  { text: "Metered units match subscription + tenant-visible breakdown nightly", state: "pass · drift 0" },
  { text: "Impersonation: consent-gated, banner-flagged, audited, blocked on payment/credential screens", state: "pass" },
  { text: "Per-tenant PITR drill executed and documented on schedule", state: "pass · dr-12" },
  { text: "Emergency stop halts all automated outbound in <30s", state: "pass · 11s last drill" },
];
