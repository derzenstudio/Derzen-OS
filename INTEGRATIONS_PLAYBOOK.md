# DERZEN — Platform Owner's Integration Playbook

> **Audience: you, the platform owner/developer — not your customers.**
> Everything below is what *you* must obtain, configure and maintain so that every
> "Connect" button inside a customer's workspace actually works. Customer-facing
> steps (mapping listings, OAuth consent clicks) are already built into the UI;
> this file covers the upstream agreements, accounts, keys and review processes
> that make those flows possible.
>
> Every credential you provision lands in an environment variable. The Developer
> Console (`Sign in → Developer` account) reads those variables, shows which
> providers are **missing / sandbox / live**, runs health checks, and is the only
> place you should ever need to touch integration state — no file edits required.

---

## 0. Ground rules (do these once, before anything else)

| # | Action | Why |
|---|--------|-----|
| 1 | Register a legal entity + business bank account in the markets you'll settle in (Indonesia + US/EU recommended). | Every partner program below requires KYB (Know-Your-Business). |
| 2 | Buy the production domains: `trellis.site`, `api.trellis.site`, `stay.trellis.site` (guest pages), `mail.trellis.site`. | OAuth redirect URIs, webhook hosts and DNS verification all need stable domains with automatic TLS. |
| 3 | Provision a secrets manager (Doppler / AWS Secrets Manager / Vault). **Never** commit keys. Map each to the `TRELLIS_*` env var named below. | The Developer Console masks these and shows "configured / missing" per tenant environment. |
| 4 | Stand up one sandbox tenant and one production tenant per provider where offered. All CI contract tests run against sandboxes. | A provider changing a field shape must fail CI, not production. |
| 5 | Enable structured logging with `tenant_id`, `actor_id`, `correlation_id` on the sync workers, and trace the channel-sync path end-to-end (OTel). | This is where debugging is hardest; never ship a provider without it. |
| 6 | PCI: **never** touch raw card data. Every gateway below must be used in hosted-fields / redirect / tokenized mode only. | Keeps you out of PCI-DSS SAQ-A scope. |

---

## 1. Channel distribution (OTAs)

The channel layer is a **swappable adapter interface** (`packages/channels/*` behind
`ChannelAdapter`). You can run everything through one aggregator today and add
direct OTA connections later without touching product code.

### 1a. Aggregator-first (fastest path to multi-channel)

**Channex.io** *(or Nuvho / Cubilis — same shape)*
- **What you get:** one API that pushes availability/rates/restrictions and pulls
  reservations/messages for Booking.com, Expedia group, Agoda, Trip.com, MMT, Traveloka, etc.
- **Requirements:** company KYB; signed Connectivity Provider agreement; per-listing fee model (~$1-2/listing/mo).
- **Steps:**
  1. Apply at channex.io → "Become a connectivity partner". Expect 1–3 weeks review.
  2. Get `CHANNEX_API_KEY` + property-level tokens. Store under `TRELLIS_CHANNEX_API_KEY`.
  3. Implement/enable the `channex` adapter (already scaffolded). Contract-test against their sandbox.
  4. In Developer Console → Integrations → Channex: flip *sandbox → live* once the first
     round-trip (push rate → pull reservation) succeeds for a test listing.
- **Go-live check:** round-trip a rate push + a sandbox reservation pull; verify idempotency key dedupe.

### 1b. Direct OTA programs (do these incrementally; each unlocks better margins/features)

**Airbnb**
- **Reality check:** there is no open self-serve API. Access comes via the
  **Airbnb Connectivity Partner Program** (application, business review, security
  questionnaire) — or you route Airbnb through your aggregator (Channex covers it).
- **Requirements:** registered business; proof of PMS/connectivity product; passing their
  API review; OAuth client issued per partnership.
- **Steps:** apply via the Airbnb partner portal → integration review (weeks to months) →
  receive `AIRBNB_CLIENT_ID/SECRET` → implement OAuth (redirect to `https://api.trellis.site/channels/airbnb/callback`)
  → pass certification tests (listing import, rate/availability push, message pull) → production keys.
- **Env:** `TRELLIS_AIRBNB_CLIENT_ID`, `TRELLIS_AIRBNB_CLIENT_SECRET`.
- **Customer UX already built:** one-click OAuth sign-in with automatic listing import.

**Booking.com**
- **Path:** **Booking.com Connectivity Partner Program** (connectivity partners get the
  Property API + Reservations, Rates & Availability (R&A) API and messaging).
- **Requirements:** KYB; accepted partner application; per-property consent via the
  extranet (property owners grant your app access with property ID + consent).
- **Steps:** apply → get client credentials → customer supplies **extranet property ID**
  (wizard step 2 already collects this) → you exchange it for property-level tokens →
  subscribe to the R&A push feed.
- **Env:** `TRELLIS_BOOKING_CLIENT_ID`, `TRELLIS_BOOKING_CLIENT_SECRET`.

**Expedia Group (Expedia, VRBO/HomeAway, Hotels.com)**
- **Path:** **Expedia Partner Solutions (EPS) Rapid API** for distribution +
  **VRBO Connectivity** (part of Expedia Group) for vacation rentals.
- **Requirements:** EPS account + API key approval; VRBO connectivity application for
  the vacation-rental flow (login + emailed verification code pattern — already modeled in the wizard).
- **Steps:** register EPS → receive API key/secret → implement EPS Rapid content/booking
  endpoints → for VRBO, apply for the VRBO Software Partner program → OAuth + email-code step.
- **Env:** `TRELLIS_EPS_API_KEY`, `TRELLIS_EPS_SHARED_SECRET`, `TRELLIS_VRBO_CLIENT_ID/SECRET`.

**Agoda**
- **Path:** Agoda **Connectivity / YCS partner** program.
- **Requirements:** KYB + partner agreement; Agoda issues per-hotel credentials.
- **Steps:** apply via Agoda partner hub → receive `AGODA_API_USER/PASSWORD` per property
  group → customer pastes **property ID** in the wizard (already built) → you store
  credentials scoped per tenant in the secrets manager.
- **Env:** `TRELLIS_AGODA_USER`, `TRELLIS_AGODA_KEY` (plus per-tenant property mappings in DB).

**Trip.com**
- **Path:** Trip.com Group connectivity (RatePlan/Order push APIs).
- **Requirements:** partner contract; they provision an app key + secret.
- **Steps:** BD contact → sandbox keys → pass order-flow certification → production keys.
- **Env:** `TRELLIS_TRIP_APP_KEY`, `TRELLIS_TRIP_SECRET`.

**MakeMyTrip**
- **Path:** MMT partner/connectivity program (India market).
- **Requirements:** Indian business presence or partnership; API credential approval
  (API-key auth — the wizard's "API credentials" pattern).
- **Steps:** apply → receive key/secret pair → customer pastes them in the wizard (already built).
- **Env:** `TRELLIS_MMT_API_KEY`, `TRELLIS_MMT_API_SECRET`.

**Traveloka**
- **Path:** Traveloka Partner/Connectivity (SE Asia — high value for Bali operators).
- **Requirements:** KYB; connectivity agreement; per-property activation.
- **Steps:** partner application → sandbox → certification → production.
- **Env:** `TRELLIS_TRAVELOKA_CLIENT_ID`, `TRELLIS_TRAVELOKA_CLIENT_SECRET`.

**iCal (import/export)** — *no approval needed; ship in week 1*
- Generate per-listing `.ics` feeds at `https://stay.trellis.site/ical/{listing}/{token}.ics`
  and poll customer-subscribed URLs every 15 min. This is the
  **10-minute fast path**: a new workspace can block dates before any OTA approves them.

**Direct channel** — *your own; nothing to apply for.*

---

## 2. Payments — ship the two that work; be honest about the rest

**Stripe** *(launch gateway #1)*
- **Requirements:** platform account (Stripe Connect if you split payouts to owners);
  KYB; verified business domain; webhook endpoint over HTTPS.
- **Steps:**
  1. Create account → Developers → API keys → `TRELLIS_STRIPE_SECRET_KEY`, `TRELLIS_STRIPE_WEBHOOK_SECRET`, publishable key for hosted fields.
  2. Enable Payment Links or Checkout for deposit/balance schedules; enable Refunds API.
  3. Register webhook at `https://api.trellis.site/webhooks/stripe` — verify signatures on every event.
  4. For owner payouts: Stripe Connect onboarding links (owners complete KYB with Stripe directly — you never see bank details).
- **Status rule:** mark **Live** in the Developer Console only after a real $1 charge + refund round-trip.

**Razorpay** *(launch gateway #2 — India/INR guests)*
- **Requirements:** Indian entity (or Razorpay's international entity where available); KYB with PAN/GST.
- **Steps:** sign up → KYB (2–5 days) → get `key_id`/`key_secret` → enable UPI + cards →
  configure webhook with signature secret → store `TRELLIS_RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`.
- **Honest UI:** HitPay, Xendit, DOKU are shown as *waitlist* in-app until **you**
  complete each partnership — do not flip them to "available" before keys exist.

**Offline / bank transfer** — *no integration; you write the instructions template once
(Company settings → rendered verbatim on quotes & PDFs).*

---

## 3. Messaging & social

**WhatsApp Business Cloud API** (Meta)
- **Requirements:** a Meta Business account with **business verification** (legal entity
  documents — 1–3 weeks); a clean phone number not registered on the consumer app;
  a Meta app with the WhatsApp product added.
- **Steps:**
  1. business.facebook.com → verify the business.
  2. developers.facebook.com → create app → add WhatsApp → get `TRELLIS_META_APP_ID/SECRET` + a permanent access token (`TRELLIS_WHATSAPP_TOKEN`) + phone-number ID + WABA ID.
  3. **Submit message templates** for review (reservation confirmations, reminders, task alerts) — pre-arrival/check-out templates usually approve in hours; marketing templates take longer and need opt-in.
  4. Point the webhook at `https://api.trellis.site/webhooks/whatsapp`, verify the hub challenge, store `TRELLIS_WHATSAPP_VERIFY_TOKEN`.
  5. Respect the 24-hour session window; outside it you may only send approved templates.
- **Test:** send yourself a template from the sandbox number; the inbox must thread it.

**Gmail / IMAP-SMTP (email in the inbox)**
- **Requirements:** Google Cloud project with OAuth consent screen (external type is fine
  while in testing mode; verification needed to go broad).
- **Steps:** enable Gmail API → OAuth client (`TRELLIS_GOOGLE_CLIENT_ID/SECRET`) with scopes
  `gmail.modify` → Pub/Sub push notifications for real-time inbound (watch → `https://api.trellis.site/webhooks/gmail`) → SMTP via the same OAuth token for outbound.
- **Alt:** any IMAP/SMTP host works via per-tenant credentials — no Google dependency.

**Instagram Direct + Facebook Messenger** (Meta Graph API)
- **Requirements:** the same verified Meta Business as WhatsApp; customer's IG **Professional**
  / FB Page connected to it; app review for `instagram_manage_messages`,
  `pages_messaging` (submit a screencast of the flow — 1–2 review rounds is normal).
- **Steps:** add Instagram Graph + Messenger products to the Meta app → webhooks for
  `messages`, `messaging_postbacks` → implement the 24h standard messaging window →
  `TRELLIS_META_*` shared with WhatsApp.
- **Reality:** review is the long pole — start it in month 1.

**Google (Places + OAuth + reviews)**
- **Places API (New)** for guidebook recommendations & geocoding: enable on the same GCP
  project, billable — set budgets/alerts. `TRELLIS_GOOGLE_MAPS_KEY` (restrict by HTTP referrer + API).
- **Business Profile API** if you later want Google review pull-in: requires location-verified Business Profiles.

---

## 4. Guest identity & access

**ID verification / web check-in** (e.g. Stripe Identity, Jumio, Onfido, or regional: VIDA)
- **Requirements:** KYB with the vendor; privacy policy URL; a data-processing agreement.
- **Steps:** enable product → `TRELLIS_IDV_API_KEY` → implement session create + webhook →
  store **only** status / provider ref / expiry (raw documents auto-purge per retention window — this is enforced in code, verify it in the vendor dashboard too).
- **Gate:** access codes release only when verification = passed (already wired to DoorFlow below).

**Smart locks — DoorFlow abstraction** (Nuki, TTLock, August, Igloohome)
- Each vendor has a partner/developer program; apply to all four but start with **TTLock**
  (openest API, common in SEA villas) and **Nuki** (EU).
- **Steps per vendor:** developer account → OAuth app or API key → webhook for lock events →
  store per-tenant tokens scoped per lock. Codes are issued for `[checkIn 12:00 → checkOut 11:00]`
  in **property timezone** and revoked on early checkout/cancellation.
- **Env:** `TRELLIS_TTLOCK_APP_ID/KEY`, `TRELLIS_NUKI_TOKEN`, etc.

---

## 5. Revenue & back office

**Dynamic pricing — RatePilot connector** (PriceLabs / Beyond / Wheelhouse)
- **Requirements:** partner API agreement with your chosen engine (PriceLabs has a
  connectivity/partner API; Wheelhouse similar) — or run the built-in rules engine only.
- **Steps:** partner application → API token → nightly pull of recommended rates →
  suggestions queue for operator review (never auto-applied; correctness over automation).
- **Env:** `TRELLIS_PRICING_API_TOKEN`.

**Accounting sync — LedgerSync** (Xero, QuickBooks)
- **Xero:** register an OAuth 2.0 app at developer.xero.com (free) → `TRELLIS_XERO_CLIENT_ID/SECRET`
  → customers connect per-organisation via OAuth (consent screen is built) → map the chart of
  accounts once per tenant (UI exists) → nightly push of invoices/bills/payouts.
- **QuickBooks Online:** developer.intuit.com app → OAuth 2.0 → same flow.
- **Reconciliation:** payout-to-invoice matching runs monthly; unmatched items surface in Expenses.

**Provider invoice inbox** — parse attachments into draft expenses:
- Point `invoices@{tenant}.mail.trellis.site` (inbound-parse, e.g. via your mail provider's
  inbound webhook) at `https://api.trellis.site/webhooks/inbound-mail`. No external account needed.

---

## 6. Platform infrastructure you must operate

| System | Requirement |
|---|---|
| **Webhooks out** | HTTPS endpoints customers register; HMAC-SHA256 over `timestamp.body`; 5-min replay window; 5 retries with exponential backoff; dead-letter + alert. (Built — you operate the queue.) |
| **Durable queues** | BullMQ/Redis for every push, message send, webhook. Alert when any connection has no successful sync in 2h, any push fails >3×, any inbound reservation can't map to a unit, any endpoint fails consistently. |
| **Tenancy** | Postgres RLS with `tenant_id` on **every** table; the cross-tenant isolation suite must pass for 100% of routes — it runs against new routes automatically so coverage can't rot. |
| **FX** | Daily rate snapshot stored with a timestamp; converted amounts persist rate + `fx_ts`. (Built into the money engine.) |
| **PII** | Field-level encryption for ID docs; tokenized payments only; purge after checkout + N days; GDPR export/erase per guest; redact PII from logs and AI prompts. |

---

## 7. Rollout checklist (definition of "ready to use")

A provider counts as **ready** in the Developer Console only when:

- [ ] Agreement signed, account approved, keys in the secrets manager
- [ ] Sandbox round-trip test passes in CI (contract test recorded)
- [ ] Webhook/callback verified end-to-end in staging
- [ ] Health check returns < 2s from the Developer Console
- [ ] Failure-mode tested: kill the worker mid-push → no duplicates, no lost updates
- [ ] Alert wired for its sync gap threshold
- [ ] Status flipped *sandbox → live* in the Developer Console — the **only** switch that matters

> **Rule of thumb:** ship nothing that can silently lose a booking, mis-state a payout,
> or send a guest a message the host didn't intend. If a provider can't meet that bar
> yet, leave it on *waitlist* in the UI — an unusable integration is worse than an absent one.
