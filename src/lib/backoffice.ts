// ── Trellis Backoffice seed data ────────────────────────────────────────────
// The operator backoffice is a SEPARATE application: own hostname, own auth,
// own audit stream. None of this is visible to tenants. Data here is shaped
// for internal teams — support, success, finance, integrations, on-call.

import { TENANTS, type TenantMeta } from "./tenants";

const now = Date.now();
const H = 3_600_000;
const D = 24 * H;

// ── Directory tenants (real + synthetic, varied lifecycle states) ─────────
export interface BoTenant extends TenantMeta {
  state: "trialing" | "active" | "past_due" | "suspended" | "cancelled" | "purged";
  unitsBillable: number;
  unitsArchived: number;
  serviceUnits: number;
  users: number;
  lastActivity: number;
  health: number; // 0-100
  region: "eu-central" | "ap-southeast" | "us-east";
  trialEnds?: number;
  addons: string[];
}

export const BO_TENANTS: BoTenant[] = [
  { ...TENANTS[0], state: "active", unitsBillable: 9, unitsArchived: 1, serviceUnits: 5, users: 14, lastActivity: now - 9 * 60_000, health: 94, region: "ap-southeast", addons: ["autopilot", "owner-portal"] },
  { ...TENANTS[1], state: "trialing", unitsBillable: 4, unitsArchived: 0, serviceUnits: 2, users: 3, lastActivity: now - 2 * H, health: 81, region: "ap-southeast", trialEnds: now + 6 * D, addons: [] },
  { id: "t-kite", name: "Kite & Palm Co.", legal: "Kite Palm Ltd", subdomain: "kitepalm", email: "ops@kitepalm.co", password: "demo123", plan: "Scale", currency: "USD", suspended: false, storageMB: 233, credits: { used: 2900, limit: 5000 }, mrr: 118, created: "2025-03-14", features: {}, state: "active", unitsBillable: 12, unitsArchived: 2, serviceUnits: 4, users: 9, lastActivity: now - 41 * 60_000, health: 88, region: "eu-central", addons: ["autopilot"] },
  { id: "t-azure", name: "Azure Coast Rentals", legal: "Azure Coast SARL", subdomain: "azurecoast", email: "hello@azurecoast.fr", password: "demo123", plan: "Enterprise", currency: "EUR", suspended: false, storageMB: 1204, credits: { used: 8100, limit: 20000 }, mrr: 480, created: "2024-06-02", features: {}, state: "active", unitsBillable: 38, unitsArchived: 5, serviceUnits: 11, users: 31, lastActivity: now - 14 * 60_000, health: 91, region: "eu-central", addons: ["autopilot", "owner-portal", "dynamic-pricing"] },
  { id: "t-salto", name: "Salto Verde Stays", legal: "Salto Verde Ltda", subdomain: "saltoverde", email: "team@saltoverde.br", password: "demo123", plan: "Starter", currency: "USD", suspended: true, storageMB: 58, credits: { used: 410, limit: 1000 }, mrr: 49, created: "2025-08-21", features: {}, state: "past_due", unitsBillable: 3, unitsArchived: 0, serviceUnits: 1, users: 2, lastActivity: now - 11 * D, health: 37, region: "us-east", addons: [] },
  { id: "t-nord", name: "Nordlys Hytter", legal: "Nordlys AS", subdomain: "nordlys", email: "post@nordlys.no", password: "demo123", plan: "Scale", currency: "EUR", suspended: true, storageMB: 301, credits: { used: 1100, limit: 5000 }, mrr: 0, created: "2024-12-10", features: {}, state: "suspended", unitsBillable: 7, unitsArchived: 1, serviceUnits: 0, users: 5, lastActivity: now - 32 * D, health: 12, region: "eu-central", addons: [] },
];

// ── Section A · Global operational queues ─────────────────────────────────
export const FAILING_CONNECTIONS = [
  { id: "fc1", tenant: "Nordlys Hytter", channel: "booking", property: "Fjordhytte 2", error: "AUTH_EXPIRED — refresh token rejected", since: now - 11 * D, retries: 41, state: "circuit-open" },
  { id: "fc2", tenant: "Azure Coast Rentals", channel: "vrbo", property: "Villa Mistral", error: "RATE_LIMIT — 429 on availability push", since: now - 5 * H, retries: 7, state: "backoff" },
  { id: "fc3", tenant: "Kite & Palm Co.", channel: "airbnb", property: "Palm Loft", error: "MAPPING_DRIFT — external id changed upstream", since: now - 2 * H, retries: 3, state: "needs-review" },
];

export const QUARANTINED_RESERVATIONS = [
  { id: "qr1", tenant: "Kite & Palm Co.", channel: "expedia", ref: "EXP-88213", guest: "J. Moreau", issue: "Unmapped room type 'STD-QUEEN-NR'", nights: 4, arrived: now - 40 * 60_000 },
  { id: "qr2", tenant: "Azure Coast Rentals", channel: "booking", ref: "BDC-55910", guest: "A. Silva", issue: "Rate plan not found for dates", nights: 2, arrived: now - 3 * H },
];

export const STUCK_JOBS = [
  { id: "sj1", queue: "channel-sync", job: "push_availability", tenant: "Nordlys Hytter", stuckFor: 11 * D, attempts: 41 },
  { id: "sj2", queue: "reports-rollup", job: "monthly_revenue", tenant: "Azure Coast Rentals", stuckFor: 2 * H, attempts: 4 },
  { id: "sj3", queue: "imports", job: "ical_pull", tenant: "Salto Verde Stays", stuckFor: 5 * H, attempts: 9 },
];

export const FAILING_WEBHOOKS = [
  { id: "fw1", tenant: "Kite & Palm Co.", endpoint: "https://hooks.kitepalm.co/trellis", status: 500, failingSince: now - 6 * H, consecutive: 18 },
  { id: "fw2", tenant: "Azure Coast Rentals", endpoint: "https://api.azurecoast.fr/in", status: 0, failingSince: now - 90 * 60_000, consecutive: 4 },
];

export const AI_ESCALATIONS = [
  { id: "ae1", tenant: "Azure Coast Rentals", topic: "Refund dispute — guest cites cancellation policy", waiting: 6 * H, autopilot: "on" },
  { id: "ae2", tenant: "Kite & Palm Co.", topic: "Keyword 'injury' flagged — needs human", waiting: 2 * H, autopilot: "on" },
];

export const FAILED_PAYMENTS = [
  { id: "fp1", tenant: "Salto Verde Stays", invoice: "INV-2481", amount: 49, attempts: 3, lastError: "card_declined", nextDunning: now + 2 * D },
  { id: "fp2", tenant: "Nordlys Hytter", invoice: "INV-2390", amount: 118, attempts: 4, lastError: "insufficient_funds", nextDunning: now + 1 * D },
];

// ── Section B · Lifecycle ─────────────────────────────────────────────────
export const LIFECYCLE = ["trialing", "active", "past_due", "suspended", "cancelled", "purged"] as const;
export const LIFECYCLE_RULES: Record<string, string> = {
  trialing: "Full feature access, no payment method required. Day 10/12/14 warnings. Ends → past_due unless card added.",
  active: "Normal operation. Metered billing. All channels live.",
  past_due: "Grace: inbound reservations + guest-facing guidebooks/checkout keep serving. Outbound pushes degrade after 7d.",
  suspended: "Read-only for staff. Guest-facing surfaces served 30d grace. No new bookings. Reactivate on payment.",
  cancelled: "Export generated, retention window opens (90d), then hard delete scheduled.",
  purged: "Verifiable deletion across primary, replicas, backups, indexes, blobs, warehouse, subprocessors.",
};

// ── Section C · Commercial engine ─────────────────────────────────────────
export const PLANS = [
  { id: "starter", name: "Starter", version: 4, monthly: 49, annual: 39, units: 3, services: 0, credits: 1000, grandfathered: 12 },
  { id: "scale", name: "Scale", version: 7, monthly: 118, annual: 94, units: 15, services: 5, credits: 5000, grandfathered: 31 },
  { id: "enterprise", name: "Enterprise", version: 3, monthly: 480, annual: 384, units: 100, services: 25, credits: 20000, grandfathered: 4 },
];

export const METERING = [
  { tenant: "Azure Coast Rentals", listingsActive: 38, listingsArchived: 5, childListings: 9, services: 11, peakThisPeriod: 38, billedUnits: 38, serviceUnits: 11, drift: 0 },
  { tenant: "Kite & Palm Co.", listingsActive: 12, listingsArchived: 2, childListings: 0, services: 4, peakThisPeriod: 12, billedUnits: 12, serviceUnits: 4, drift: 0 },
  { tenant: "Sanggraha Villas", listingsActive: 9, listingsArchived: 1, childListings: 2, services: 5, peakThisPeriod: 9, billedUnits: 9, serviceUnits: 5, drift: 0 },
];

export const DUNNING = [
  { tenant: "Salto Verde Stays", invoice: "INV-2481", amount: 49, step: 3, sequence: "card retry → email → final notice", next: now + 2 * D, willSuspend: true },
  { tenant: "Nordlys Hytter", invoice: "INV-2390", amount: 118, step: 4, sequence: "final notice sent", next: now + 1 * D, willSuspend: true },
];

export const MRR_MOVEMENT = [
  { label: "Beginning MRR", value: 1732 },
  { label: "New", value: 118 },
  { label: "Expansion", value: 96 },
  { label: "Contraction", value: -40 },
  { label: "Churn", value: -118 },
  { label: "Reactivation", value: 49 },
  { label: "Ending MRR", value: 1837 },
];

export const COHORTS = [
  { month: "Sep", size: 14, m1: 100, m2: 92, m3: 85, m4: 85 },
  { month: "Oct", size: 22, m1: 100, m2: 90, m3: 86, m4: null },
  { month: "Nov", size: 19, m1: 100, m2: 89, m3: null, m4: null },
  { month: "Dec", size: 27, m1: 100, m2: 91, m3: null, m4: null },
];

// ── Section D · Entitlements, flags, coming soon ─────────────────────────
export const FLAGS = [
  { key: "autopilot_v2", name: "Autopilot v2 (auto-send)", targeting: "ring:beta", owners: ["mira", "dev"], expiry: "2026-05-01", on: true, kill: false, tenants: 2 },
  { key: "dynamic_pricing", name: "Dynamic pricing connector", targeting: "tenant:azure,kite", owners: ["dev"], expiry: "2026-04-15", on: true, kill: false, tenants: 2 },
  { key: "page_builder_v3", name: "Website builder v3", targeting: "pct:25", owners: ["lena"], expiry: "2026-03-30", on: true, kill: false, tenants: 3 },
  { key: "new_pricing_engine", name: "Pricing engine rewrite", targeting: "off", owners: ["dev"], expiry: "2026-06-01", on: false, kill: false, tenants: 0 },
  { key: "airbnb_adapter", name: "Airbnb direct adapter", targeting: "on", owners: ["integrations"], expiry: null, on: true, kill: false, tenants: 6 },
];

export const QUOTAS = [
  { tenant: "Azure Coast Rentals", metric: "AI messages / mo", used: 8100, limit: 20000, kind: "hard" },
  { tenant: "Azure Coast Rentals", metric: "Storage MB", used: 1204, limit: 5000, kind: "soft" },
  { tenant: "Kite & Palm Co.", metric: "API requests / day", used: 11200, limit: 12000, kind: "hard" },
  { tenant: "Sanggraha Villas", metric: "Webhook endpoints", used: 3, limit: 5, kind: "hard" },
];

export const COMING_SOON = [
  { capability: "Wheelhouse pricing sync", status: "beta", waitlist: 14, expectation: "Beta for 2 design partners, GA in ~6 weeks" },
  { capability: "Xero two-way sync", status: "alpha", waitlist: 22, expectation: "Internal alpha; read-only push today" },
  { capability: "August smart-lock", status: "planned", waitlist: 9, expectation: "Design phase; no date committed" },
  { capability: "Legacy iCal v1 importer", status: "deprecated", waitlist: 0, expectation: "Removed 2026-01; use v2 importer" },
];

// ── Section E · Integration engineering platform ─────────────────────────
export const CAPABILITY_MATRIX = [
  { channel: "airbnb", minStay: true, ctaCtd: false, losPricing: true, derived: false, messaging: true, virtualCard: false },
  { channel: "booking", minStay: true, ctaCtd: true, losPricing: true, derived: true, messaging: true, virtualCard: true },
  { channel: "vrbo", minStay: true, ctaCtd: false, losPricing: false, derived: false, messaging: true, virtualCard: false },
  { channel: "expedia", minStay: true, ctaCtd: true, losPricing: true, derived: true, messaging: true, virtualCard: true },
  { channel: "agoda", minStay: true, ctaCtd: false, losPricing: false, derived: false, messaging: false, virtualCard: true },
  { channel: "trip", minStay: false, ctaCtd: false, losPricing: false, derived: false, messaging: false, virtualCard: true },
  { channel: "ical", minStay: false, ctaCtd: false, losPricing: false, derived: false, messaging: false, virtualCard: false },
];

export const VAULT = [
  { connection: "booking · Azure Coast", type: "oauth", rotated: now - 12 * D, expires: now + 48 * D, status: "healthy" },
  { connection: "airbnb · Kite & Palm", type: "oauth", rotated: now - 30 * D, expires: now + 5 * D, status: "rotate-soon" },
  { connection: "mmt · Azure Coast", type: "api-key", rotated: now - 90 * D, expires: null, status: "healthy" },
  { connection: "vrbo · Sanggraha", type: "oauth+email-code", rotated: now - 2 * D, expires: now + 88 * D, status: "healthy" },
];

export const CERTIFICATION = [
  { channel: "booking", scenarios: 42, passing: 42, lastRun: now - 6 * H, sandbox: true },
  { channel: "airbnb", scenarios: 38, passing: 37, lastRun: now - 1 * D, sandbox: true },
  { channel: "expedia", scenarios: 30, passing: 30, lastRun: now - 2 * D, sandbox: true },
  { channel: "agoda", scenarios: 24, passing: 22, lastRun: now - 3 * D, sandbox: true },
];

export const ORCHESTRATOR = [
  { tenant: "Azure Coast", connection: "booking", depth: 12, ratePerMin: 40, cap: 60, circuit: "closed", dlq: 0, coalesced: 8 },
  { tenant: "Nordlys", connection: "booking", depth: 340, ratePerMin: 0, cap: 60, circuit: "open", dlq: 41, coalesced: 0 },
  { tenant: "Kite & Palm", connection: "airbnb", depth: 3, ratePerMin: 20, cap: 30, circuit: "closed", dlq: 0, coalesced: 1 },
];

export const RECONCILIATION = [
  { channel: "booking", lastRun: now - 30 * 60_000, drift: 0, autoHealed: 2, escalated: 0 },
  { channel: "airbnb", lastRun: now - 45 * 60_000, drift: 1, autoHealed: 0, escalated: 1 },
  { channel: "expedia", lastRun: now - 1 * H, drift: 0, autoHealed: 0, escalated: 0 },
];

// ── Section F · Messaging infrastructure ─────────────────────────────────
export const TRANSPORTS = [
  { channel: "WhatsApp", provider: "Official BSP (Cloud API)", status: "healthy", fallback: "SMS", sessionWindow: "24h", templates: 14 },
  { channel: "Email", provider: "Dedicated IP pool", status: "healthy", fallback: "shared pool", sessionWindow: "—", templates: 22 },
  { channel: "SMS", provider: "Twilio", status: "degraded", fallback: "—", sessionWindow: "—", templates: 3 },
  { channel: "Push", provider: "FCM/APNs", status: "healthy", fallback: "—", sessionWindow: "—", templates: 6 },
];

export const DELIVERABILITY = [
  { domain: "mail.sanggraha.co", spf: true, dkim: true, dmarc: "reject", reputation: 98, bounce: 0.4 },
  { domain: "mail.azurecoast.fr", spf: true, dkim: true, dmarc: "quarantine", reputation: 95, bounce: 1.1 },
  { domain: "mail.kitepalm.co", spf: true, dkim: false, dmarc: "none", reputation: 82, bounce: 3.2 },
];

export const TEMPLATE_GOVERNANCE = [
  { template: "pre_arrival_checkin", version: 12, vars: 8, lint: "pass", locales: ["en", "id", "fr"], unresolved: 0 },
  { template: "booking_confirmed", version: 9, vars: 11, lint: "pass", locales: ["en", "id"], unresolved: 0 },
  { template: "review_request", version: 5, vars: 4, lint: "warn", locales: ["en"], unresolved: 1 },
];

export const THROTTLE = [
  { tenant: "Azure Coast Rentals", capPerDay: 500, sentToday: 212, spike: false },
  { tenant: "Kite & Palm Co.", capPerDay: 300, sentToday: 41, spike: false },
];

// ── Section G · AI platform ──────────────────────────────────────────────
export const PROMPT_REGISTRY = [
  { prompt: "concierge_answer", version: 23, owner: "mira", status: "live", rollout: "100%", changelog: "Grounding strictness raised; refusal copy softened" },
  { prompt: "reply_draft", version: 14, owner: "dev", status: "live", rollout: "100%", changelog: "Length cap 140 words" },
  { prompt: "review_response", version: 8, owner: "lena", status: "staged", rollout: "25%", changelog: "No compensation language" },
  { prompt: "guidebook_assist", version: 3, owner: "dev", status: "canary", rollout: "5%", changelog: "Section-aware suggestions" },
];

export const MODEL_ROUTER = [
  { task: "concierge answer", model: "flagship-a", fallback: "flagship-b", streaming: true, structured: true, avgLatency: 1450 },
  { task: "reply draft", model: "flagship-a", fallback: "mid-b", streaming: true, structured: false, avgLatency: 1120 },
  { task: "intent routing", model: "mid-b", fallback: "cheap-c", streaming: false, structured: true, avgLatency: 210 },
  { task: "sentiment", model: "cheap-c", fallback: "rule-based", streaming: false, structured: true, avgLatency: 90 },
];

export const EVALS = [
  { run: "#218", dataset: "golden-v9 (412 conv)", accuracy: 96.1, refusal: 99.2, tone: 4.6, policy: 100, diff: "+0.3 acc vs #217" },
  { run: "#217", dataset: "golden-v9 (412 conv)", accuracy: 95.8, refusal: 99.0, tone: 4.5, policy: 100, diff: "baseline" },
  { run: "#216", dataset: "golden-v8 (380 conv)", accuracy: 94.9, refusal: 98.4, tone: 4.5, policy: 100, diff: "-0.2 acc (reverted)" },
];

export const BLOCKLIST = ["price changes", "refunds", "late-checkout guarantees", "legal advice", "medical advice", "sharing other guests' data"];

export const KB_COVERAGE = [
  { tenant: "Azure Coast Rentals", coverage: 87, gaps: ["pool heating schedule", "boat transfer pricing"], conflicts: 1, stale: 3 },
  { tenant: "Kite & Palm Co.", coverage: 74, gaps: ["parking permit", "early check-in fee", "pet policy"], conflicts: 0, stale: 7 },
];

export const AI_COST = [
  { tenant: "Azure Coast Rentals", tokens: 4_120_000, cost: 182, mrr: 480, margin: 62 },
  { tenant: "Kite & Palm Co.", tokens: 1_980_000, cost: 87, mrr: 118, margin: 26 },
  { tenant: "Sanggraha Villas", tokens: 1_240_000, cost: 54, mrr: 118, margin: 54 },
];

// ── Section H · Data platform ────────────────────────────────────────────
export const EVENT_CATALOGUE = [
  { event: "reservation.created", version: 3, schema: "ReservationV3", outbox: true, consumers: 6 },
  { event: "reservation.modified", version: 3, schema: "ReservationV3", outbox: true, consumers: 5 },
  { event: "payment.captured", version: 2, schema: "PaymentV2", outbox: true, consumers: 4 },
  { event: "message.sent", version: 4, schema: "MessageV4", outbox: true, consumers: 3 },
  { event: "calendar.bulk_edit", version: 1, schema: "CalendarEditV1", outbox: true, consumers: 2 },
];

export const WAREHOUSE = [
  { model: "fct_reservations", layer: "mart", freshness: "12m", tests: "uniqueness, fk", status: "fresh" },
  { model: "fct_revenue_daily", layer: "mart", freshness: "1h", tests: "sum-to-ledger", status: "fresh" },
  { model: "dim_listings", layer: "core", freshness: "15m", tests: "scd2", status: "fresh" },
  { model: "fct_messages", layer: "mart", freshness: "3h", tests: "pii-scrub", status: "stale" },
];

export const ACTIVATION_FUNNEL = [
  { step: "Signup", users: 214, pct: 100 },
  { step: "First property", users: 178, pct: 83 },
  { step: "Calendar imported", users: 149, pct: 70 },
  { step: "First channel live", users: 118, pct: 55 },
  { step: "Payment method", users: 96, pct: 45 },
  { step: "First direct booking", users: 61, pct: 29 },
];

export const HEALTH_SCORES = [
  { tenant: "Azure Coast Rentals", score: 91, drivers: ["sync 100%", "AI resolution 82%", "0 tickets"] },
  { tenant: "Kite & Palm Co.", score: 88, drivers: ["sync 99%", "support-contact rate low"] },
  { tenant: "Salto Verde Stays", score: 37, drivers: ["past_due", "no login 11d"] },
];

export const SEARCH_INDEXES = [
  { index: "reservations", docs: 1_240_000, isolation: "per-tenant alias", retention: "PII-aware", lastReindex: now - 2 * D },
  { index: "conversations", docs: 3_910_000, isolation: "per-tenant alias", retention: "PII-aware", lastReindex: now - 2 * D },
  { index: "guests", docs: 486_000, isolation: "per-tenant alias", retention: "purge on erase", lastReindex: now - 2 * D },
];

// ── Section I · Support & success ────────────────────────────────────────
export const IMPERSONATION_LOG = [
  { staff: "mira@trellis", tenant: "Kite & Palm Co.", consent: true, mode: "read-only", started: now - 3 * H, duration: "22m", actions: 14 },
  { staff: "jon@trellis", tenant: "Azure Coast Rentals", consent: true, mode: "elevated (justified)", started: now - 1 * D, duration: "8m", actions: 3 },
];

export const TICKETS = [
  { id: "T-1041", tenant: "Kite & Palm Co.", subject: "Expedia quarantine not clearing", severity: "S2", status: "open", linked: true },
  { id: "T-1040", tenant: "Azure Coast Rentals", subject: "Owner statement rounding", severity: "S3", status: "waiting", linked: true },
  { id: "T-1038", tenant: "Salto Verde Stays", subject: "Cannot add payment method", severity: "S1", status: "escalated", linked: true },
];

export const STATUS_PAGE = [
  { component: "Tenant app", status: "operational" },
  { component: "Channel sync", status: "degraded", note: "Nordlys/booking circuit open" },
  { component: "Guest checkout", status: "operational" },
  { component: "AI concierge", status: "operational" },
  { component: "Public API", status: "operational" },
];

// ── Section J · Engineering substrate ────────────────────────────────────
export const ENVIRONMENTS = [
  { env: "local", shape: "docker compose, seeded", deploy: "1 command", data: "fixtures" },
  { env: "ci", shape: "ephemeral per-PR", deploy: "auto", data: "synthetic" },
  { env: "staging", shape: "prod-shaped volume", deploy: "auto", data: "sandbox creds" },
  { env: "production", shape: "multi-AZ", deploy: "progressive", data: "live" },
];

export const CICD_STAGES = [
  { stage: "lint + typecheck", gate: true, secs: 40 },
  { stage: "unit", gate: true, secs: 95 },
  { stage: "integration", gate: true, secs: 210 },
  { stage: "channel contract", gate: true, secs: 180 },
  { stage: "cross-tenant isolation", gate: true, secs: 130 },
  { stage: "e2e (money + message paths)", gate: true, secs: 420 },
  { stage: "a11y + bundle size", gate: true, secs: 75 },
];

export const MIGRATIONS = [
  { id: "20260212_add_lock_provider", type: "expand", status: "applied", dryRun: true, reversible: true },
  { id: "20260205_backfill_fx_ts", type: "backfill", status: "applied", dryRun: true, reversible: true },
  { id: "20260128_drop_legacy_rate_col", type: "contract", status: "pending-next-release", dryRun: true, reversible: false },
];

export const JOB_QUEUES = [
  { queue: "channel-sync", depth: 355, priority: "high", dlq: 41, fairness: "per-tenant round-robin" },
  { queue: "message-send", depth: 12, priority: "high", dlq: 0, fairness: "token bucket" },
  { queue: "reports-rollup", depth: 4, priority: "normal", dlq: 1, fairness: "fifo" },
  { queue: "imports", depth: 2, priority: "low", dlq: 0, fairness: "per-tenant cap 1" },
];

export const SLOS = [
  { subsystem: "API availability", slo: "99.9%", budget: 43.2, consumed: 11.8, p95: "180ms" },
  { subsystem: "Calendar grid", slo: "<500ms p95", budget: 100, consumed: 22.0, p95: "340ms" },
  { subsystem: "Sync freshness", slo: "<60s", budget: 100, consumed: 41.5, p95: "38s" },
  { subsystem: "Message delivery", slo: "<10s", budget: 100, consumed: 8.1, p95: "3.4s" },
  { subsystem: "Guest checkout success", slo: ">99%", budget: 100, consumed: 12.9, p95: "99.6%" },
];

export const DR_DRILLS = [
  { drill: "Per-tenant PITR restore", date: now - 14 * D, target: "Kite & Palm Co.", rpo: "5m", rto: "38m", result: "pass" },
  { drill: "Full-region failover", date: now - 45 * D, target: "eu-central", rpo: "0", rto: "6m", result: "pass" },
];

export const CLOUD_COST = [
  { service: "Inference (AI)", cost: 1480, pct: 34, trend: "+12%" },
  { service: "Postgres + replicas", cost: 940, pct: 21, trend: "+2%" },
  { service: "Channel API egress", cost: 620, pct: 14, trend: "+6%" },
  { service: "Blob storage", cost: 510, pct: 12, trend: "+4%" },
  { service: "Compute + queues", cost: 830, pct: 19, trend: "-3%" },
];

// ── Section K · Security & compliance ────────────────────────────────────
export const THREAT_MODEL = [
  { threat: "Cross-tenant read via IDOR", surface: "resource-ID routes", likelihood: "med", impact: "critical", controls: ["RLS", "isolation suite per PR", "scoped lookups"] },
  { threat: "Channel vault credential theft", surface: "integrations", likelihood: "low", impact: "critical", controls: ["KMS envelope", "scoped decrypt", "rotation"] },
  { threat: "Guest PII via guidebook/public site", surface: "guest surfaces", likelihood: "med", impact: "high", controls: ["field redaction", "sanitizer", "sandboxed render"] },
  { threat: "Prompt injection via guest message", surface: "AI", likelihood: "high", impact: "med", controls: ["grounding", "blocklist", "eval gate"] },
  { threat: "Webhook forgery", surface: "public API", likelihood: "med", impact: "high", controls: ["HMAC + replay window", "rotating secrets"] },
  { threat: "SSRF via builder/KB URLs", surface: "websites, KB", likelihood: "med", impact: "high", controls: ["allowlist", "no internal ranges", "timeout"] },
];

export const COMPLIANCE = [
  { item: "GDPR / UK GDPR", status: "in-force", evidence: "DPA, DSAR tooling, retention schedules" },
  { item: "CCPA", status: "in-force", evidence: "opt-out + erase endpoints" },
  { item: "SOC 2 Type II", status: "in-audit", evidence: "fieldwork Q1 2026" },
  { item: "Subprocessor register", status: "published", evidence: "14 subprocessors, notified on change" },
  { item: "Guest registration (local law)", status: "per-region", evidence: "police-report export in guidebook" },
];

export const FRAUD_QUEUE = [
  { id: "F-22", tenant: "(signup)", type: "Trial farming — 6 accounts, same card", status: "review", frozen: false },
  { id: "F-21", tenant: "Kite & Palm Co.", type: "Card testing on checkout", status: "contained", frozen: true },
];

// ── Section L · Developer ecosystem ──────────────────────────────────────
export const API_VERSIONS = [
  { version: "/v1", status: "current", sunset: null, keys: 31 },
  { version: "/v0", status: "deprecated", sunset: "2026-06-30", keys: 4 },
];

export const OAUTH_APPS = [
  { app: "Ownerly Accounting", developer: "Ownerly Ltd", scopes: "invoices:read, payouts:read", installs: 18, status: "listed" },
  { app: "StayMetrics BI", developer: "StayMetrics", scopes: "reports:read", installs: 7, status: "in-review" },
];

export const WEBHOOK_EVENTS = ["reservation.created", "reservation.modified", "reservation.cancelled", "payment.captured", "review.created", "message.received"];

export const SDKS = [
  { lang: "TypeScript", version: "2.4.1", generated: true },
  { lang: "Python", version: "1.9.0", generated: true },
  { lang: "Go", version: "0.7.2", generated: true },
];

export const MARKETPLACE = [
  { partner: "Ownerly", category: "Accounting", status: "listed", installs: 18 },
  { partner: "KeyFlow", category: "Smart locks", status: "in-review", installs: 0 },
  { partner: "RateSense", category: "Dynamic pricing", status: "listed", installs: 11 },
];

// ── Section M · Release & process ────────────────────────────────────────
export const RELEASE_TRAIN = { version: "2.14.0", cadence: "weekly", ring: "canary → 10% → 50% → full", lastDeploy: now - 2 * D, rolledBack: 0 };
export const CHANGELOG = [
  { v: "2.14.0", date: now - 2 * D, note: "Reconciliation auto-heal for safe drift; webhook endpoint health alerts" },
  { v: "2.13.2", date: now - 9 * D, note: "Fix: bulk edit coalescing dropped CTA on child listings" },
  { v: "2.13.0", date: now - 16 * D, note: "Dynamic pricing connector (PriceLabs/Wheelhouse) behind flag" },
];
export const RUNBOOKS = [
  { subsystem: "Channel sync", owner: "integrations", testedBy: "on-call (non-author)", lastDrill: now - 20 * D },
  { subsystem: "Payment capture", owner: "payments", testedBy: "on-call (non-author)", lastDrill: now - 34 * D },
  { subsystem: "AI escalation path", owner: "ai-platform", testedBy: "support lead", lastDrill: now - 12 * D },
];

// ── Section N · Internal access control ──────────────────────────────────
export const STAFF_ROLES = [
  { role: "support", perms: ["read-only", "consented impersonation"], sep: "cannot grant access" },
  { role: "success", perms: ["tenant config", "trials", "plan changes"], sep: "no sync actions" },
  { role: "integrations", perms: ["sync actions", "mapping", "replay"], sep: "no billing" },
  { role: "finance", perms: ["billing", "credits", "refunds"], sep: "no tenant data" },
  { role: "platform", perms: ["jobs", "flags", "migrations"], sep: "no billing" },
  { role: "security", perms: ["audit", "incident actions"], sep: "no self-elevation" },
  { role: "admin", perms: ["role grants", "two-person approvals"], sep: "all actions logged" },
];

// ── Console guardrails (preamble) — enforced in code, not culture ─────────
export const GUARDRAILS = [
  { rule: "No bulk guest-PII display or export", detail: "Guest fields render masked outside single-record contexts; exports require an approved bulk-access grant.", enforced: true, probe: "PII-bULK" },
  { rule: "No channel or payment credential reveal", detail: "Vault values are never returned to any console surface — only metadata and last-4 of provider references.", enforced: true, probe: "VAULT-LEAK" },
  { rule: "No direct SQL / arbitrary code execution", detail: "There is no query console. Data access is via typed, scoped read APIs.", enforced: true, probe: "SQL-EXEC" },
  { rule: "No impersonation without consent + audit", detail: "Consent switch is checked at session start; every keystroke-class action is attributed to the staff identity.", enforced: true, probe: "IMP-NOCONSENT" },
  { rule: "No self-audit-disable", detail: "Audit suspension is not an available mutation for any role, including admin.", enforced: true, probe: "AUDIT-OFF" },
];
export const BULK_ACCESS_GRANTS = [
  { id: "BA-19", requester: "finance@trellis", scope: "Payout ledger rows · Q1 · 2 tenants", approver: "admin (2-person)", windowMin: 60, status: "approved", remainingMin: 34 },
  { id: "BA-20", requester: "mira@trellis", scope: "Conversation bodies · fraud case F-21", approver: "pending second approver", windowMin: 30, status: "pending", remainingMin: 0 },
];

// ── Section O · OTA commercial & legal prerequisites ──────────────────────
export const PARTNER_PROGRAMS = [
  { ota: "Airbnb", program: "Connectivity Partner", status: "application in review", owner: "integrations + legal", appliedMonthsAgo: 4, blocked: ["direct adapter", "messaging pull"], note: "Security questionnaire round 2 · volume commitments submitted" },
  { ota: "Booking.com", program: "Connectivity Partner · Tier 2", status: "certified", owner: "integrations", appliedMonthsAgo: 9, blocked: ["rates:LOS pricing (Tier 3)"], note: "Tier 3 gates LOS endpoints; upgrade review in Q2" },
  { ota: "Expedia Group", program: "EPS Rapid + Vrbo Connectivity", status: "sandbox approved", owner: "integrations", appliedMonthsAgo: 3, blocked: ["production push"], note: "Certification scenarios 8/11 green" },
  { ota: "Agoda", program: "Connectivity Partner", status: "contract negotiation", owner: "legal", appliedMonthsAgo: 2, blocked: ["all"], note: "Data-use clause §7 under review" },
  { ota: "Trip.com", program: "Partner API", status: "not started", owner: "—", appliedMonthsAgo: 0, blocked: ["all"], note: "Queued behind Expedia production cert" },
];
export const CERT_TEST_LISTINGS = [
  { provider: "Booking.com", listing: "CERT-BDC-01 (sandbox unit)", owner: "integrations", lastRun: now - 2 * D, state: "green" },
  { provider: "Expedia/Vrbo", listing: "CERT-EPS-04", owner: "integrations", lastRun: now - 5 * D, state: "amber" },
  { provider: "Airbnb (via aggregator)", listing: "CERT-AGG-02", owner: "aggregator TAM", lastRun: now - 1 * D, state: "green" },
];
export const COMMERCIAL_TERMS = [
  { ota: "Booking.com", term: "Per-booking commission", value: "15% · virtual-card settlement", constraint: "Rate-parity clause in force" },
  { ota: "Expedia", term: "Revenue share", value: "18% standard", constraint: "Logo usage restricted to partner badge set" },
  { ota: "Agoda (draft)", term: "Per-booking fee", value: "TBD · min-volume clause", constraint: "May not store guest email > stay +30d" },
];
export const PARITY_WATCH = [
  { tenant: "Azure Coast Rentals", channel: "booking.com", listing: "Azure One", direct: "€214", channelPrice: "€229", status: "compliant" },
  { tenant: "Kite & Palm Co.", channel: "booking.com", listing: "Palm Suite", direct: "€168", channelPrice: "€168", status: "compliant" },
  { tenant: "Sanggraha Villas", channel: "agoda", listing: "Villa Purnama", direct: "Rp 5.4M", channelPrice: "Rp 5.1M", status: "breach-risk" },
];
export const CONTENT_CHECKS = [
  { channel: "Airbnb", rule: "≥ 5 photos · cover landscape · amenities mapped", failures: 2, listings: 41 },
  { channel: "Booking.com", rule: "Description ≥ 200 chars · facilities list", failures: 0, listings: 38 },
  { channel: "Expedia", rule: "Cancellation policy code present", failures: 5, listings: 29 },
];
export const DEPRECATION_RISK = [
  { provider: "Airbnb (aggregator path)", risk: "Aggregator deprecation would cut Airbnb+3 OTAs", contingency: "Direct-application track · 6-month bridge", exposure: "high" },
  { provider: "Booking.com R&A v2", risk: "Forced migration announced · sunset 2026-11", contingency: "Adapter v3 in CI against sandbox", exposure: "med" },
];

// ── Section P · Money movement & accounting engine ────────────────────────
export const CHART_OF_ACCOUNTS = ["1000 Cash & clearing", "2000 Guest prepayments (liability)", "2100 VAT payable", "2200 Tourist tax payable", "4000 Lodging revenue", "4100 Ancillary revenue", "5000 OTA commissions", "6000 Owner payouts (clearing)", "8000 Refunds & chargebacks"];
export const JOURNAL = [
  { id: "JE-88412", ts: now - 12 * 60_000, memo: "Booking captured · R-2418", lines: [{ acct: "1000", dr: 612_00, cr: 0 }, { acct: "4000", dr: 0, cr: 519_96 }, { acct: "5000", dr: 0, cr: 92_04 }], status: "posted" },
  { id: "JE-88411", ts: now - 41 * 60_000, memo: "Tourist tax collected · Sanggraha", lines: [{ acct: "1000", dr: 31_50 }, { acct: "2200", dr: 0, cr: 31_50 }].map((l) => ({ acct: l.acct, dr: l.dr ?? 0, cr: l.cr ?? 0 })), status: "posted" },
  { id: "JE-88407", ts: now - 3 * H, memo: "Refund reversal · R-2432 (cancellation)", lines: [{ acct: "8000", dr: 355_00, cr: 0 }, { acct: "1000", dr: 0, cr: 355_00 }], status: "posted" },
  { id: "JE-88399", ts: now - 9 * H, memo: "Correction: reverse JE-88201 (wrong rate plan)", lines: [{ acct: "4000", dr: 40_00, cr: 0 }, { acct: "2000", dr: 0, cr: 40_00 }], status: "reversal" },
];
export const OWNER_FUNDS_POLICY = { custody: "none", model: "Money flows to the tenant's own connected payment account. Owner payouts are calculated statements, not funds we move.", trustAccount: "not required (no custody)", reviewGate: "Legal appetite review before any custody model" };
export const KYC_QUEUE = [
  { tenant: "Ambara Island Co.", provider: "Stripe connected account", state: "documents submitted", ageDays: 2, nudged: true },
  { tenant: "Kite & Palm Co.", provider: "Stripe connected account", state: "identity verification", ageDays: 5, nudged: true },
  { tenant: "Nordlys Stays", provider: "Stripe connected account", state: "restricted — bank account mismatch", ageDays: 9, nudged: false },
];
export const VCC_FLOWS = [
  { ota: "Booking.com", vcc: "•••• 4412", reservation: "R-2418", amount: "€519.96", activatesIn: "2d (check-in − 24h)", persisted: false },
  { ota: "Expedia", vcc: "•••• 9030", reservation: "R-2425", amount: "$1,204.00", activatesIn: "active now", persisted: false },
];
export const FX_POLICY = { provider: "open.er-api (SLA 99.9%)", snapshot: "rate + timestamp + source stored on every conversion", rateOfRecord: "booking date", rule: "Historical figures are never recomputed with today's rate" };
export const TAX_COLLECTED_BY = [
  { jurisdiction: "Bali, Indonesia", tax: "Tourism levy 10%", collectedBy: "host on direct · OTA-collected on channels", remitsTo: "Bapenda" },
  { jurisdiction: "Lisbon, Portugal", tax: "City tax €2/pax/night", collectedBy: "OTA-collected (Booking/Airbnb) · host on direct", remitsTo: "Câmara Municipal" },
];
export const RECON_JOBS = [
  { job: "Provider settlements ↔ ledger", lastRun: now - 6 * H, matched: 1240, unmatched: 2, status: "alert" },
  { job: "Channel bookings ↔ reservations", lastRun: now - 2 * H, matched: 987, unmatched: 0, status: "clean" },
  { job: "Meter ↔ subscription", lastRun: now - 8 * H, matched: 96, unmatched: 0, status: "clean" },
];

// ── Section Q · Mobile & release pipeline ─────────────────────────────────
export const MOBILE_DECISION = { choice: "Staff: PWA (offline-first) · Guest: responsive web", stores: "Owner app planned native (React Native) — not before v3", rationale: "Field staff need offline + cheap-Android baseline today; store review latency is incompatible with sync hotfixes" };
export const APP_MATRIX = [
  { client: "Staff PWA", minApi: "/v1", offline: "today + tomorrow cache", push: "Web Push (FCM)", status: "live" },
  { client: "Owner app (iOS)", minApi: "/v1", offline: "statements cache", push: "APNs", status: "testflight" },
  { client: "Owner app (Android)", minApi: "/v1", offline: "statements cache", push: "FCM", status: "internal track" },
];
export const STORE_TRACK = [
  { item: "Apple developer account + certificates", state: "done" },
  { item: "Google Play console + signing keys", state: "done" },
  { item: "TestFlight / internal track builds", state: "live" },
  { item: "Store listings · screenshots per locale (en, id)", state: "in review" },
  { item: "Privacy nutrition labels + data-safety forms", state: "filed" },
  { item: "Universal links → reservation/task deep links", state: "in review" },
  { item: "Forced-upgrade min-version flag", state: "done" },
];
export const CRASH_FREE = [
  { build: "staff-pwa 2.14.0", rate: "99.7%", platform: "web" },
  { build: "owner-ios 0.9.2 (TF)", rate: "98.9%", platform: "iOS" },
  { build: "owner-android 0.9.1", rate: "97.8%", platform: "Android (low-end 62%)" },
];

// ── Section R · Design system & content design ────────────────────────────
export const DS_TOKENS = [
  { set: "Console (internal)", base: "60/30/10 white·black·red", radius: "6px", motion: "150–300ms", contrast: "AA verified" },
  { set: "Tenant app", base: "same family, density-tuned", radius: "8px", motion: "200–350ms", contrast: "AA verified" },
  { set: "Guest surfaces (per-tenant theme)", base: "tenant palette, clamped", radius: "tenant-set (clamped 0–16px)", motion: "respect reduced-motion", contrast: "auto-clamped to 4.5:1" },
];
export const DS_STATES = ["default", "hover", "focus-visible", "active", "disabled", "loading", "error", "empty", "offline"];
export const EMAIL_TEMPLATES = [
  { template: "Reservation confirmed", clients: "Gmail · Outlook · Apple Mail · Yahoo", tested: now - 6 * D, pass: true },
  { template: "Invoice PDF", clients: "weasyprint → PDF/A", tested: now - 6 * D, pass: true },
  { template: "Owner statement PDF", clients: "weasyprint → PDF/A", tested: now - 13 * D, pass: true },
];
export const CONTENT_PATTERNS = { voice: "Plain, operational, never cute in error paths", emptyRule: "Every empty state teaches the next action", errorRule: "Say what happened, what it means, what to do", iconPolicy: "In-house stroke set · OTA/payment marks per brand guidelines only" };

// ── Section S · Localisation operations ───────────────────────────────────
export const LOCALE_COVERAGE = [
  { locale: "en", app: 100, guestContent: 100, reviewer: "—" },
  { locale: "id", app: 82, guestContent: 64, reviewer: "Kadek M." },
  { locale: "fr", app: 41, guestContent: 12, reviewer: "unassigned" },
];
export const TMS_PIPELINE = [
  { step: "Extraction (keys + screenshots + context)", state: "automated · nightly" },
  { step: "Machine first-pass", state: "automated" },
  { step: "Human review — guest-facing copy mandatory", state: "reviewer workflow" },
  { step: "Pseudo-localisation in CI", state: "gates merge" },
  { step: "Hardcoded-string lint", state: "gates merge" },
  { step: "Staleness detection on source change", state: "flags guest content" },
];

// ── Section T · Go-to-market platform ─────────────────────────────────────
export const GTM_LIFECYCLE = [
  { trigger: "Onboarding: property created", send: "Calendar-import nudge", channel: "email", consentGated: true },
  { trigger: "Trial day 10 / 12 / 14", send: "Expiry sequence + payment-method prompt", channel: "email", consentGated: true },
  { trigger: "7d inactive after activation", send: "Win-back: what's blocking you?", channel: "email", consentGated: true },
  { trigger: "Approaching plan limit (units ≥ 90%)", send: "Expansion prompt with live meter", channel: "in-app", consentGated: false },
];
export const GTM_METRICS = [
  { metric: "Published price ↔ charged price drift", value: "0 (same catalogue)", status: "clean" },
  { metric: "Demo → trial conversion (30d)", value: "31%", status: "info" },
  { metric: "Trial → paid (60d)", value: "24%", status: "info" },
  { metric: "Cookie consent gating", value: "trackers blocked pre-consent", status: "clean" },
];

// ── Section U · Product operations ────────────────────────────────────────
export const FEEDBACK_TAXONOMY = [
  { theme: "Bulk-edit speed at 50+ listings", count: 34, sources: "tickets 19 · in-app 11 · calls 4", priority: "P1" },
  { theme: "Owner statement PDF layout", count: 21, sources: "tickets 17 · in-app 4", priority: "P2" },
  { theme: "WhatsApp template approval latency", count: 12, sources: "calls 12", priority: "P2" },
];
export const BETA_PROGRAM = { cohort: "dynamic-pricing connector", size: 9, optIn: "flag-gated", graduationBar: "≥ 7 cohorts active 4 weeks, zero pricing disputes, parity-watch clean" };
export const NPS_READS = [{ when: now - 12 * D, nps: 47, csat: 4.4, moment: "post-first-sync" }, { when: now - 42 * D, nps: 39, csat: 4.1, moment: "post-first-sync" }];
export const DEPRECATIONS = [
  { feature: "Legacy iCal-only pricing (per-listing)", usage: "3 tenants", plan: "90-day notice → migrate to rate plans", state: "notice sent" },
  { feature: "v0 API", usage: "4 keys", plan: "Sunset 2026-06-30 · sunset headers live", state: "in sunset" },
];

// ── Section V · Vendor & third-party risk ─────────────────────────────────
export const VENDOR_RISK = [
  { vendor: "Channel aggregator", role: "multi-OTA distribution", sla: "99.9%", residency: "EU", cost10x: "linear · renegotiate at tier", exit: "Direct-OTA track · 6–9 mo", concentration: "high" },
  { vendor: "Model provider (concierge)", role: "AI inference", sla: "99.95%", residency: "US", cost10x: "superlinear — cache + cheap router", exit: "Model router abstraction · 2 wk", concentration: "high" },
  { vendor: "Stripe", role: "payments + billing", sla: "99.99%", residency: "US/EU", cost10x: "linear", exit: "Razorpay adapter ready · 1 mo", concentration: "med" },
  { vendor: "WhatsApp BSP (Meta)", role: "messaging", sla: "99.9%", residency: "US", cost10x: "per-conversation", exit: "email/SMS fallback chains", concentration: "med" },
  { vendor: "Postgres host", role: "system of record", sla: "99.99%", residency: "tenant-selected", cost10x: "sublinear w/ replicas", exit: "PITR + logical replication · 2 wk", concentration: "low" },
];

// ── Section W · Hospitality regulatory surface ────────────────────────────
export const GUEST_REGISTRATION = [
  { country: "Indonesia", obligation: "Guest register + police report", capture: "ID via web check-in vendor", submission: "batch export, daily", status: "shipped" },
  { country: "Portugal", obligation: "SEF border declaration", capture: "structured passport fields", submission: "API (planned)", status: "planned" },
];
export const LICENCE_NUMBERS = [
  { tenant: "Azure Coast Rentals", city: "Lisbon", licence: "AL-4471/2024", expires: now + 210 * D, onListing: true },
  { tenant: "Sanggraha Villas", city: "Badung", licence: "PON-2019-88", expires: now + 340 * D, onListing: true },
  { tenant: "Kite & Palm Co.", city: "Palma", licence: "VT-10293", expires: now + 41 * D, onListing: false },
];
export const NIGHT_CAPS = [
  { market: "Amsterdam", cap: "30 nights/property/yr", expression: "per-listing annual counter · hard block at cap", status: "enforced" },
  { market: "Barcelona", cap: "zoning: no new licences", expression: "listing eligibility flag", status: "enforced" },
];
export const CONSENT_MATRIX = [
  { channel: "Email marketing", law: "GDPR · CAN-SPAM", capture: "double opt-in, timestamped", perGuest: true },
  { channel: "WhatsApp", law: "GDPR · WhatsApp policy", capture: "opt-in keyword + template window", perGuest: true },
  { channel: "SMS", law: "TCPA", capture: "explicit written consent", perGuest: true },
];

// ── Section X · Engineering organisation practices ────────────────────────
export const ADRS = [
  { id: "ADR-014", title: "Shared schema + RLS tenancy", status: "accepted", decided: now - 380 * D, owner: "platform" },
  { id: "ADR-021", title: "Double-entry ledger as money core", status: "accepted", decided: now - 340 * D, owner: "finance-eng" },
  { id: "ADR-027", title: "Adapter interface over aggregator-first", status: "accepted", decided: now - 200 * D, owner: "integrations" },
];
export const SERVICE_CATALOG = [
  { service: "calendar-api", team: "availability", oncall: "rotation A", slo: "p95 500ms", deps: "postgres · redis" },
  { service: "sync-worker", team: "integrations", oncall: "rotation B", slo: "freshness < 15m", deps: "aggregator · vault" },
  { service: "concierge-ai", team: "ai-platform", oncall: "rotation C", slo: "p95 4s", deps: "model provider · KB" },
];
export const CAPACITY_MODEL = [
  { component: "Calendar hot path", breaksAt: "~900 active listings", fix: "read replicas + materialised night grid", horizon: "Q3" },
  { component: "Inbox thread load", breaksAt: "~80k conversations", fix: "partition by tenant + cursor pagination", horizon: "Q4" },
  { component: "Sync queue throughput", breaksAt: "~40 tenants · full-matrix OTAs", fix: "per-tenant partition + coalescing", horizon: "Q3" },
];
export const MAINTENANCE = [
  { item: "tzdata update", cadence: "quarterly + on release", next: now + 24 * D, owner: "platform" },
  { item: "Certificate + domain renewals", cadence: "auto · 30d alert", next: now + 61 * D, owner: "platform" },
  { item: "Credential rotation drill", cadence: "quarterly", next: now + 12 * D, owner: "security" },
  { item: "Calendar-table index maintenance", cadence: "monthly", next: now + 6 * D, owner: "availability" },
];

// ── Section Y · Domain edge cases (acceptance suite) ──────────────────────
export const EDGE_CASES = [
  { id: "EC-01", case: "DST transition moves local check-in/out times", expectation: "local time preserved; UTC shifts; scheduled messages fire at local wall time", suite: "availability", state: "pass" },
  { id: "EC-02", case: "Booking spans a rate-plan / tax-rate change", expectation: "nights price at the rate in force per night; tax split at effective date", suite: "money", state: "pass" },
  { id: "EC-03", case: "Long-stay monthly rate with different tax treatment", expectation: "monthly nights taxed at long-stay rule; breakdown itemised", suite: "money", state: "pass" },
  { id: "EC-04", case: "Group booking across units, one payer", expectation: "single folio, per-unit availability, one payment intent", suite: "availability", state: "wip" },
  { id: "EC-05", case: "Overbooking despite guards (channel race)", expectation: "second booking rejected + alert + relocation workflow", suite: "availability", state: "pass" },
  { id: "EC-06", case: "No-show / early departure", expectation: "policy-driven refund arithmetic; nights released per policy", suite: "money", state: "pass" },
  { id: "EC-07", case: "Mid-stay channel-initiated amendment", expectation: "diff applied to ledger as reversing + new entries; calendar re-blocked", suite: "sync", state: "wip" },
  { id: "EC-08", case: "Currency change on an existing reservation", expectation: "rate-of-record frozen; display-only conversion", suite: "money", state: "pass" },
  { id: "EC-09", case: "Guest books on one channel, messages on another", expectation: "guest graph merges on email/phone; thread attaches to reservation", suite: "crm", state: "pass" },
  { id: "EC-10", case: "Unit offline for maintenance mid-reservation", expectation: "relocation workflow + owner notification + ledger adjustment", suite: "ops", state: "planned" },
];

// ── Section Z · Deliberately not built ────────────────────────────────────
export const NOT_BUILT = [
  { capability: "Payment processing", buy: "Stripe / Razorpay behind gateway adapter", exit: "adapter swap" },
  { capability: "Tax determination", buy: "tax provider + jurisdiction tables", exit: "adapter swap" },
  { capability: "KYC / KYB", buy: "Stripe Identity / connected-account onboarding", exit: "vendor swap" },
  { capability: "Billing engine", buy: "billing provider (metering feeds it)", exit: "re-export usage events" },
  { capability: "Email sending", buy: "ESP with custom-domain tooling", exit: "SMTP fallback" },
  { capability: "Model hosting", buy: "model provider + router abstraction", exit: "router swap" },
  { capability: "Search engine", buy: "managed search with tenant indexes", exit: "reindex job" },
  { capability: "Feature-flag service", buy: "managed flags behind entitlement service", exit: "export flag state" },
  { capability: "Revenue management", buy: "PriceLabs/Wheelhouse connector", exit: "rules-engine fallback" },
  { capability: "Long-tail direct OTA adapters", buy: "aggregator (adapter interface preserves optionality)", exit: "incremental direct adapters" },
];
export const DEFENSIBLE = ["Calendar & availability engine", "Operations automation", "AI concierge quality", "Sync-layer reliability"];

export interface AuditEvent { id: string; ts: number; actor: string; action: string; target: string; severity: "info" | "sensitive" | "destructive"; }
export const AUDIT_STREAM: AuditEvent[] = [
  { id: "a1", ts: now - 4 * 60_000, actor: "mira@trellis", action: "read tenant snapshot", target: "Kite & Palm Co.", severity: "info" },
  { id: "a2", ts: now - 18 * 60_000, actor: "finance-bot", action: "invoice retry scheduled", target: "INV-2481", severity: "info" },
  { id: "a3", ts: now - 52 * 60_000, actor: "dev@trellis", action: "flag autopilot_v2 rollout 100%", target: "flags", severity: "sensitive" },
  { id: "a4", ts: now - 3 * H, actor: "jon@trellis", action: "impersonation (elevated, justified)", target: "Azure Coast Rentals", severity: "sensitive" },
  { id: "a5", ts: now - 7 * H, actor: "integrations-ci", action: "requeue dead-letter pushes (41)", target: "Nordlys/booking", severity: "info" },
  { id: "a6", ts: now - 26 * H, actor: "dev@trellis", action: "rotate channel vault credential", target: "vrbo · Sanggraha", severity: "destructive" },
];
