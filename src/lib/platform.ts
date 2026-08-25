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
  { label: "Churn", value: -540, color: "#D92B2B" },
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
