// ── Technical reference · Sections 5–13 ────────────────────────────────────
// Engineering contracts rendered as live, inspectable artefacts in the
// backoffice. These are the shapes the codebase is held to in CI.

// ── §5 Channel adapter contract ────────────────────────────────────────────
export const ADAPTER_METHOD_GROUPS: { group: string; optional?: boolean; methods: { sig: string; note: string }[] }[] = [
  {
    group: "identity", methods: [
      { sig: "readonly provider: ProviderId", note: "stable, declared — never inferred" },
      { sig: "capabilities(): CapabilityMatrix", note: "declared flags drive UI degradation" },
    ],
  },
  {
    group: "credentials", methods: [
      { sig: "beginAuth(ctx, input): AuthChallenge | Credential", note: "OAuth, extranet, email-code or API-key flows" },
      { sig: "completeAuth(ctx, challenge): Credential", note: "stored envelope-encrypted, tenant-keyed" },
      { sig: "verify(ctx): VerifyResult", note: "health probe for the Sync Health page" },
    ],
  },
  {
    group: "mapping", methods: [
      { sig: "listRemoteInventory(ctx): RemoteNode[]", note: "rooms or listings, per structure" },
      { sig: "suggestMappings(ctx, local): MappingSuggestion[]", note: "confidence-scored · operator approves" },
    ],
  },
  {
    group: "push", methods: [
      { sig: "pushAvailability(ctx, delta[]): PushResult", note: "coalesced minimal change sets" },
      { sig: "pushRates(ctx, delta[]): PushResult", note: "channel currency + markup applied" },
      { sig: "pushRestrictions(ctx, delta[]): PushResult", note: "conservative equivalents per capability" },
      { sig: "pushContent?(ctx, content): PushResult", note: "optional capability" },
    ],
  },
  {
    group: "pull", methods: [
      { sig: "pullReservations(ctx, since): NormalisedReservation[]", note: "idempotent on external id + version" },
      { sig: "pullFullState(ctx): StateSnapshot", note: "feeds the reconciliation engine" },
    ],
  },
  {
    group: "messaging", optional: true, methods: [
      { sig: "sendMessage?(ctx, threadRef, msg): SendResult", note: "optional capability" },
      { sig: "pullMessages?(ctx, since): NormalisedMessage[]", note: "threads to the reservation" },
    ],
  },
  {
    group: "inbound", methods: [
      { sig: "verifyWebhook(ctx, req): VerificationResult", note: "signature + replay window" },
      { sig: "parseWebhook(ctx, req): DomainEvent[]", note: "unmapped input → quarantine, never drop" },
    ],
  },
];

export const CAPABILITY_FLAGS = [
  "losPricing", "derivedRates", "ctaCtd", "minMaxStay", "stopSell", "childRates",
  "occupancyPricing", "cancellationPolicies", "contentPush", "messaging", "virtualCards",
  "taxBreakdown", "instantBooking", "multiCurrency", "webhooks", "fullStatePull",
] as const;

export const CAPABILITY_MATRIX: Record<string, boolean[]> = {
  //                 los  deriv cta  min  stop child occp canc  cont msg  vcc  tax  inst multi webh full
  airbnb:         [true, false, true, true, true, false, true, true, true, true, true, false, true, false, true, true],
  "booking.com":  [true, true, true, true, true, true, true, true, true, true, true, true, false, true, true, true],
  "vrbo":         [false, false, true, true, true, false, false, true, true, true, false, false, true, false, true, false],
  agoda:          [false, false, false, true, true, false, false, true, false, false, true, false, true, true, true, true],
  traveloka:      [false, false, false, false, true, false, false, true, false, false, false, false, true, true, true, false],
  direct:         [true, true, true, true, true, true, true, true, true, true, false, true, true, true, true, true],
};

export const ERROR_TAXONOMY = [
  { cls: "AuthExpired", retry: "re-auth flow", ui: "banner: “reconnect {channel}”", tone: "warn" },
  { cls: "AuthInvalid", retry: "stop · notify tenant", ui: "connection suspended", tone: "danger" },
  { cls: "RateLimited", retry: "backoff · provider hint", ui: "silent", tone: "warn" },
  { cls: "Transient", retry: "retry + jitter", ui: "silent", tone: "ok" },
  { cls: "ValidationRejected", retry: "never retry", ui: "surface the rejected field", tone: "danger" },
  { cls: "MappingMissing", retry: "quarantine", ui: "operator queue + suggestion", tone: "warn" },
  { cls: "CapabilityUnsupported", retry: "log · degrade", ui: "conservative equivalent", tone: "ok" },
  { cls: "ProviderOutage", retry: "circuit-break", ui: "status page entry", tone: "warn" },
  { cls: "Unknown", retry: "dead-letter + alert", ui: "paged — treat as defect", tone: "danger" },
];

// ── §6 Event catalogue & envelope ──────────────────────────────────────────
export const EVENT_ENVELOPE = `{
  "id": "01HXYZ…",            "type": "reservation.confirmed",
  "version": 1,               "tenant_id": "t-…",
  "occurred_at": "RFC3339",   "actor": { "type": "channel", "id": "…" },
  "correlation_id": "…",      "resource": { "type": "reservation", "id": "…" },
  "data": { },
  "schema": "https://derzen.site/events/reservation.confirmed/v1"
}`;

export const EVENT_CATALOGUE: { resource: string; events: { name: string; v: number }[] }[] = [
  { resource: "tenant", events: [{ name: "tenant.provisioned", v: 1 }, { name: "tenant.suspended", v: 1 }, { name: "subscription.changed", v: 2 }, { name: "usage.metered", v: 1 }] },
  { resource: "property", events: [{ name: "property.created", v: 1 }, { name: "property.updated", v: 1 }, { name: "listing.content_incomplete", v: 1 }] },
  { resource: "availability", events: [{ name: "availability.changed", v: 1 }, { name: "rate.changed", v: 1 }, { name: "restriction.changed", v: 1 }] },
  { resource: "reservation", events: [{ name: "reservation.created", v: 1 }, { name: "reservation.confirmed", v: 1 }, { name: "reservation.modified", v: 2 }, { name: "reservation.cancelled", v: 1 }, { name: "reservation.no_show", v: 1 }, { name: "reservation.checked_in", v: 1 }, { name: "reservation.checked_out", v: 1 }, { name: "reservation.quarantined", v: 1 }, { name: "reservation.overbooking_detected", v: 1 }] },
  { resource: "payment", events: [{ name: "payment.authorised", v: 1 }, { name: "payment.captured", v: 1 }, { name: "payment.failed", v: 1 }, { name: "payment.refunded", v: 1 }, { name: "payment.disputed", v: 1 }] },
  { resource: "conversation", events: [{ name: "conversation.message_received", v: 1 }, { name: "conversation.message_sent", v: 1 }, { name: "conversation.escalated", v: 1 }, { name: "conversation.assigned", v: 1 }] },
  { resource: "ai", events: [{ name: "ai.draft_generated", v: 1 }, { name: "ai.auto_sent", v: 1 }, { name: "ai.refused", v: 1 }, { name: "ai.knowledge_gap_detected", v: 1 }] },
  { resource: "task", events: [{ name: "task.created", v: 1 }, { name: "task.assigned", v: 1 }, { name: "task.completed", v: 1 }, { name: "task.overdue", v: 1 }, { name: "task.template_mismatch", v: 1 }] },
  { resource: "channel", events: [{ name: "channel.connected", v: 1 }, { name: "channel.sync_succeeded", v: 1 }, { name: "channel.sync_failed", v: 1 }, { name: "channel.degraded", v: 1 }, { name: "channel.drift_detected", v: 1 }] },
  { resource: "review", events: [{ name: "review.received", v: 1 }, { name: "review.responded", v: 1 }] },
  { resource: "quote", events: [{ name: "quote.sent", v: 1 }, { name: "quote.accepted", v: 1 }, { name: "quote.expired", v: 1 }] },
  { resource: "store", events: [{ name: "store.order_placed", v: 1 }, { name: "store.order_fulfilled", v: 1 }] },
  { resource: "website", events: [{ name: "website.published", v: 1 }, { name: "domain.verified", v: 1 }] },
  { resource: "webhook", events: [{ name: "webhook.delivery_failed", v: 1 }] },
];
export const ALL_EVENT_NAMES = EVENT_CATALOGUE.flatMap((g) => g.events.map((e) => e.name));
export const EVENT_RULES = ["naming: resource.past_tense", "emitted via transactional outbox — analytics can never disagree with OLTP", "additive-only within a version · breaking change = new version + schema URL"];

// ── §7 Public API surface ──────────────────────────────────────────────────
export const API_CONVENTIONS = [
  { rule: "/v1 · cursor pagination", detail: "?cursor=&limit= · stable under inserts" },
  { rule: "Sparse fieldsets + filter[…]", detail: "pay for what you read" },
  { rule: "Idempotency-Key required", detail: "on POST/PATCH with money or inventory effects" },
  { rule: "RFC 7807 problem details", detail: "machine-readable errors" },
  { rule: "Retry-After + X-RateLimit-*", detail: "per-key tiers with headers" },
  { rule: "ETags on reads", detail: "optimistic concurrency on writes" },
  { rule: "Tenant + property scope", detail: "every response scoped to the key" },
];
export const API_ENDPOINTS: { group: string; endpoints: { method: string; path: string; note?: string }[] }[] = [
  { group: "Inventory", endpoints: [
    { method: "GET|POST", path: "/v1/properties" }, { method: "GET|PATCH", path: "/v1/properties/{id}" },
    { method: "GET|POST", path: "/v1/properties/{id}/unit-types" },
    { method: "GET|POST", path: "/v1/rate-plans" }, { method: "PATCH", path: "/v1/rate-plans/{id}" },
    { method: "GET", path: "/v1/availability?unit_type_id&from&to" },
    { method: "PUT", path: "/v1/availability", note: "bulk upsert · array of deltas" },
    { method: "PUT", path: "/v1/rates" }, { method: "PUT", path: "/v1/restrictions" },
    { method: "POST", path: "/v1/availability/search", note: "resolve() → bookable + priced" },
  ]},
  { group: "Reservations & quotes", endpoints: [
    { method: "GET|POST", path: "/v1/reservations" }, { method: "GET|PATCH", path: "/v1/reservations/{id}" },
    { method: "POST", path: "/v1/reservations/{id}/cancel | /modify | /check-in | /check-out" },
    { method: "GET|POST", path: "/v1/quotes" }, { method: "POST", path: "/v1/quotes/{id}/accept" },
  ]},
  { group: "People & threads", endpoints: [
    { method: "GET|POST", path: "/v1/guests" }, { method: "POST", path: "/v1/guests/{id}/merge" },
    { method: "GET|POST", path: "/v1/conversations" }, { method: "POST", path: "/v1/conversations/{id}/messages" },
  ]},
  { group: "Operations", endpoints: [
    { method: "GET|POST", path: "/v1/tasks" }, { method: "POST", path: "/v1/tasks/{id}/complete" },
    { method: "GET|POST", path: "/v1/providers" }, { method: "GET|POST", path: "/v1/expenses" },
    { method: "GET|POST", path: "/v1/store-items" }, { method: "GET|POST", path: "/v1/store-orders" },
  ]},
  { group: "Reputation & reports", endpoints: [
    { method: "GET|POST", path: "/v1/reviews" }, { method: "POST", path: "/v1/reviews/{id}/response" },
    { method: "GET", path: "/v1/reports/{revenue|occupancy|adr|revpar|payouts}?from&to&group_by" },
  ]},
  { group: "Channels & events", endpoints: [
    { method: "GET|POST", path: "/v1/channel-connections" }, { method: "POST", path: "/v1/channel-connections/{id}/sync" },
    { method: "GET|PUT", path: "/v1/channel-connections/{id}/mappings" },
    { method: "GET|POST", path: "/v1/webhook-endpoints" }, { method: "POST", path: "/v1/webhook-endpoints/{id}/replay" },
    { method: "GET", path: "/v1/events", note: "cursor-based event log for pull integrators" },
  ]},
];
export const GUEST_SURFACE = { origin: "stay.derzen.site", unauthenticated: true, rateLimited: "heavily — separate tier", endpoints: "search · quote · checkout intent · confirmation lookup by token · guidebook fetch · store order" };

// ── §8 Roles & permissions ─────────────────────────────────────────────────
export const TENANT_ROLES = ["Owner / Admin", "Manager", "Front desk", "Ops lead", "Field staff", "Property owner", "Accountant", "Agency"] as const;
export type PermCell = "full" | "scoped" | "read" | "gated" | "none";
export const PERMISSION_ROWS: { res: string; action: string; cls?: "pii" | "credentials" | "payments"; cells: PermCell[] }[] = [
  { res: "reservations", action: "read / write", cells: ["full", "full", "full", "read", "scoped", "scoped", "read", "scoped"] },
  { res: "calendar", action: "rates & restrictions", cells: ["full", "full", "full", "read", "none", "none", "none", "scoped"] },
  { res: "inbox", action: "guest messaging", cells: ["full", "full", "full", "none", "none", "none", "none", "scoped"] },
  { res: "tasks", action: "assign / execute", cells: ["full", "full", "read", "full", "scoped", "none", "none", "none"] },
  { res: "expenses", action: "record / approve", cells: ["full", "full", "none", "full", "scoped", "none", "full", "none"] },
  { res: "reports", action: "financial", cells: ["full", "full", "none", "read", "none", "gated", "full", "scoped"] },
  { res: "statements", action: "owner payouts", cells: ["full", "read", "none", "none", "none", "gated", "full", "none"] },
  { res: "channels", action: "connect / sync", cells: ["full", "full", "none", "none", "none", "none", "none", "none"] },
  { res: "billing", action: "plan & payment method", cells: ["full", "none", "none", "none", "none", "none", "none", "full"] },
  { res: "team", action: "invite / roles", cells: ["full", "none", "none", "none", "none", "none", "none", "scoped"] },
  { res: "guest PII", action: "contact details", cls: "pii", cells: ["full", "full", "full", "none", "scoped", "none", "none", "none"] },
  { res: "channel credentials", action: "vault access", cls: "credentials", cells: ["scoped", "none", "none", "none", "none", "none", "none", "none"] },
  { res: "payment data", action: "tokens & refunds", cls: "payments", cells: ["full", "full", "none", "none", "none", "none", "read", "none"] },
];
export const PERM_LEGEND: Record<PermCell, { label: string; tone: string }> = {
  full: { label: "granted", tone: "ok" }, scoped: { label: "scoped", tone: "info" }, read: { label: "read-only", tone: "mute" },
  gated: { label: "gated by toggle", tone: "warn" }, none: { label: "denied", tone: "danger" },
};
export const PERM_NOTES = [
  "permissions are resource:action triples with optional property scope — every route and job asserts exactly one",
  "guest PII, channel credentials and payment data are separate permission classes, withholdable from otherwise-privileged roles",
  "the matrix lives in a test fixture; CI asserts it on every change — role drift is a silent security regression",
];

// ── §9 AI task inventory ───────────────────────────────────────────────────
export const AI_TASKS = [
  { task: "guest_reply_draft", context: "conversation · reservation · property KB · policies", output: "{reply, citations[], confidence, intent, needs_human}", guardrail: "must cite · refuse-and-escalate if uncited", fallback: "escalate to human", golden: 240 },
  { task: "guest_reply_autosend", context: "+ autopilot config", output: "+ send_decision", guardrail: "confidence threshold · blocked-commitment list · per-tenant caps", fallback: "suggestion mode", golden: 240 },
  { task: "knowledge_gap_detect", context: "unanswered questions · KB coverage", output: "{gaps[{question, frequency, suggested_answer}]}", guardrail: "advisory", fallback: "skip", golden: 96 },
  { task: "review_response_draft", context: "review · reservation · tone settings", output: "{response, tone_check}", guardrail: "no policy commitments · no PII", fallback: "manual", golden: 180 },
  { task: "listing_content_generate", context: "property facts · amenities · channel rules", output: "{title, summary, sections[]}", guardrail: "channel content rules validated post-hoc", fallback: "manual", golden: 60 },
  { task: "guidebook_assist", context: "property · local recommendations", output: "{sections[]}", guardrail: "no fabricated venues — grounded in places data", fallback: "manual", golden: 48 },
  { task: "message_translate", context: "source string · target locale", output: "{text, confidence}", guardrail: "low confidence flagged for review", fallback: "untranslated + notice", golden: 320 },
  { task: "task_triage", context: "task · SOP · photos", output: "{verdict, issues[], severity}", guardrail: "never auto-close a task", fallback: "human verify", golden: 84 },
  { task: "anomaly_explain", context: "metrics window", output: "{summary, drivers[]}", guardrail: "advisory · no actions", fallback: "hide widget", golden: 40 },
  { task: "upsell_suggest", context: "reservation · store items · stay context", output: "{offers[], rationale}", guardrail: "respect consent · no pressure tactics", fallback: "none", golden: 110 },
];
export const AI_RULES = [
  "no free-form prompting in application code — every capability is a registered task with a fixed contract",
  "every invocation writes an ai_generations row (prompt version, model, context refs, verdict, cost)",
  "retrieved content is untrusted input: guest messages, guidebook text, descriptions and reviews can never change instructions",
];

// ── §10 Background job inventory ───────────────────────────────────────────
export const JOB_INVENTORY = [
  { job: "channel.push.delta", cadence: "on change · coalesced 5–15s", idem: "payload hash + connection", prio: "high", depth: 3 },
  { job: "channel.pull.reservations", cadence: "1–5 min or webhook-driven", idem: "external id + version", prio: "high", depth: 0 },
  { job: "channel.reconcile.full", cadence: "nightly per connection", idem: "snapshot diff", prio: "low", depth: 0 },
  { job: "message.scheduled.dispatch", cadence: "every minute · property-local", idem: "template + reservation + occurrence", prio: "high", depth: 2 },
  { job: "automation.evaluate", cadence: "on event + 15 min sweep", idem: "rule + trigger instance", prio: "medium", depth: 1 },
  { job: "task.generate_from_template", cadence: "on reservation events + daily sweep", idem: "template version + reservation", prio: "medium", depth: 0 },
  { job: "ai.draft_pending_conversations", cadence: "on inbound message", idem: "conversation + last message id", prio: "high", depth: 1 },
  { job: "kb.reindex", cadence: "on content change · debounced", idem: "content hash", prio: "low", depth: 0 },
  { job: "meter.compute", cadence: "hourly + nightly close", idem: "tenant + period", prio: "medium", depth: 0 },
  { job: "invoice.generate", cadence: "daily", idem: "subscription + period", prio: "medium", depth: 0 },
  { job: "dunning.step", cadence: "daily", idem: "subscription + period", prio: "medium", depth: 1 },
  { job: "report.materialise", cadence: "nightly + on demand", idem: "tenant + report + period", prio: "low", depth: 0 },
  { job: "payout.statement.build", cadence: "monthly + on demand", idem: "owner + period", prio: "medium", depth: 0 },
  { job: "webhook.deliver", cadence: "on event · retry backoff", idem: "event id + endpoint", prio: "high", depth: 4 },
  { job: "import.run", cadence: "on demand · resumable", idem: "batch + row", prio: "low", depth: 0 },
  { job: "retention.purge", cadence: "daily", idem: "tenant + policy + cutoff", prio: "low", depth: 0 },
  { job: "health.score.compute", cadence: "daily", idem: "tenant + date", prio: "low", depth: 0 },
];
export const JOB_RULES = "every job: tenant-fair queueing · max attempts · dead-letter with operator requeue · queue depth + age metrics";

// ── §11 Configuration & secrets ────────────────────────────────────────────
export const CONFIG_ENVS: { env: string; db: string; queue: string; origins: string; locales: string; retention: string }[] = [
  { env: "local", db: "docker-compose · seeded", queue: "redis:6379", origins: "localhost:*", locales: "en, id", retention: "∞ (dev)" },
  { env: "ci", db: "ephemeral per-PR", queue: "in-test", origins: "preview-*.derzen.dev", locales: "en (pseudo-localised)", retention: "run-scoped" },
  { env: "staging", db: "prod-shaped volume", queue: "redis-ha", origins: "staging.derzen.site", locales: "en, id", retention: "prod policy" },
  { env: "production", db: "primary + 2 replicas", queue: "redis-ha · 4 workers", origins: "app / stay / api / admin", locales: "en, id (+ pipeline)", retention: "per data class" },
];
export const SECRET_CLASSES = [
  { secret: "Per-tenant channel credentials", storage: "KMS envelope · tenant-keyed", rotation: "on revoke + 90d", scope: "scoped decrypt at point of use" },
  { secret: "Aggregator API keys", storage: "KMS", rotation: "180d", scope: "sync workers only" },
  { secret: "Payment provider keys + webhook secrets", storage: "KMS", rotation: "90d", scope: "billing worker" },
  { secret: "Model provider keys", storage: "KMS", rotation: "90d", scope: "ai worker" },
  { secret: "BSP / email / SMS credentials", storage: "KMS", rotation: "90d", scope: "messaging worker" },
  { secret: "Webhook signing keys", storage: "KMS · current + previous", rotation: "overlap window on rotate", scope: "api" },
  { secret: "JWT / session signing keys", storage: "KMS", rotation: "30d", scope: "api" },
  { secret: "Field-encryption keys (guest documents)", storage: "KMS · per-tenant KEK", rotation: "365d + re-wrap", scope: "scoped read" },
  { secret: "Admin SSO client secret", storage: "KMS", rotation: "90d", scope: "web-admin" },
];
export const SECRET_NEVER = ["logs", "error payloads", "admin console", "AI prompts"];

// ── §12 Derived calculations — the precise definitions ────────────────────
export const CALC_DEFS = {
  meter: "billable_property_units = count(properties WHERE status='active' AND parent_property_id IS NULL) at period close · + active services · inputs stored with every usage.metered event · proration by day-in-period, both directions",
  statement: "gross nights (kind='night', inventory-consuming) + collected extras − channel commission − management fee per agreement − attributed expenses (billable_to='owner') − host-remit tax · opening & closing balance · every line traces to a journal entry",
  occupancy: "denominator = available unit-nights EXCLUDING owner & maintenance blocks, INCLUDING channel stop-sells — published in the UI because every operator computes it differently",
  taskgen: "on confirmed + amendment: match templates → due_at_local from anchor in PROPERTY tz → convert UTC → dedupe (template_version, reservation, occurrence) → stamp version so template edits raise a mismatch, never silent divergence",
};

// ── §13 Ready-to-code checklist ────────────────────────────────────────────
export const READINESS = [
  { artefact: "Tenancy isolation decision + RLS policy + test suite", status: "in repo", where: "infra/rls · isolation suite on every PR" },
  { artefact: "Migration policy (expand/contract, online index builds)", status: "in repo", where: "infra/migrations/README" },
  { artefact: "Event catalogue with JSON schemas", status: "in repo", where: "packages/events/schemas · versioned" },
  { artefact: "Adapter contract + mock provider implementing every capability", status: "in repo", where: "packages/channels/mock-provider" },
  { artefact: "Permission matrix fixture asserted in CI", status: "in repo", where: "packages/entitlements/fixtures/matrix.test" },
  { artefact: "Plan catalogue seed — 2 plans + 1 grandfathered version", status: "in repo", where: "seeds/plans.sql · v1 locked" },
  { artefact: "Chart of accounts", status: "in repo", where: "packages/ledger/coa.sql" },
  { artefact: "Demo-tenant generator", status: "in repo", where: "scripts/demo-tenant · 12 months seasonal data" },
  { artefact: "Eval golden set — guest_reply_draft", status: "in review", where: "packages/ai/evals/golden · 240 graded conversations" },
  { artefact: "Eval golden set — remaining 9 AI tasks", status: "partial", where: "6 of 9 complete · upsell + anomaly in progress" },
];
