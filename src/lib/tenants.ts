// ── Multi-tenant registry & per-tenant data isolation ─────────────────────
// Production maps this onto PostgreSQL with row-level security keyed on
// tenant_id; in this build each tenant's collections are hydrated in place so
// every module — store-backed or not — reads only the signed-in tenant's rows.

import {
  PROPERTIES, GUESTS, RESERVATIONS, BLOCKS, SERVICES, SERVICE_BOOKINGS, CONVERSATIONS,
  MEMBERS, TASKS, TASK_TEMPLATES, PROVIDERS, REVIEWS, EXPENSES, QUOTES, UPSELLS,
  KNOWLEDGE, ACTION_ITEMS, VARIABLES, MSG_TEMPLATES, MSG_QUEUE, AUTOMATIONS, ISSUES,
  SYNC, CONFLICTS, WEBHOOKS, GUIDEBOOKS, STORE_ITEMS, STORE_TXNS, COLLECTIONS,
  WEBSITE, WORKSPACE, AUDIT,
} from "./data";
import type { CurrencyCode } from "./fx";
import type { LineItem } from "./types";

export interface TenantMeta {
  id: string;
  name: string;
  legal: string;
  subdomain: string;
  email: string;
  password: string;
  plan: "Starter" | "Scale" | "Enterprise";
  currency: CurrencyCode;
  suspended: boolean;
  storageMB: number;
  credits: { used: number; limit: number };
  mrr: number;
  created: string;
  features: Record<string, boolean>;
}

export const MODULE_FLAGS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Multi-calendar" },
  { key: "inbox", label: "Unified inbox" },
  { key: "reservations", label: "Reservations" },
  { key: "ops", label: "Command Center" },
  { key: "sync", label: "Sync Health" },
  { key: "concierge", label: "AI Concierge" },
  { key: "reviews", label: "Reviews" },
  { key: "customers", label: "Customers (CRM)" },
  { key: "quotes", label: "Quotes" },
  { key: "listings", label: "Listings & Services" },
  { key: "channels", label: "Channel Manager" },
  { key: "websites", label: "Websites & Widgets" },
  { key: "guidebooks", label: "Guidebooks" },
  { key: "reports", label: "Reports" },
  { key: "integrations", label: "Integrations & API" },
  { key: "settings", label: "Settings" },
];

const ALL_ON = Object.fromEntries(MODULE_FLAGS.map((m) => [m.key, true]));

export const TENANTS: TenantMeta[] = [
  {
    id: "t-sanggraha",
    name: "Sanggraha Villas",
    legal: "PT Sanggraha Hospitality",
    subdomain: "sanggraha",
    email: "sarah@sanggraha.co",
    password: "demo123",
    plan: "Scale",
    currency: "IDR",
    suspended: false,
    storageMB: 412,
    credits: { used: 1240, limit: 5000 },
    mrr: 118,
    created: "2024-11-02",
    features: { ...ALL_ON },
  },
  {
    id: "t-ambara",
    name: "Ambara Island Co.",
    legal: "CV Ambara Lombok",
    subdomain: "ambara",
    email: "owner@ambara.co",
    password: "demo123",
    plan: "Starter",
    currency: "USD",
    suspended: false,
    storageMB: 96,
    credits: { used: 210, limit: 1000 },
    mrr: 49,
    created: "2026-01-18",
    features: { ...ALL_ON, websites: false, guidebooks: false, sync: false },
  },
];

export const DEVELOPER = { email: "dev@derzen.site", password: "derzen-dev", name: "Platform Developer" };

// ── pristine capture (before any hydration mutates the live arrays) ────────
const snapshotAll = () =>
  structuredClone({
    properties: PROPERTIES, guests: GUESTS, reservations: RESERVATIONS, blocks: BLOCKS,
    services: SERVICES, serviceBookings: SERVICE_BOOKINGS, conversations: CONVERSATIONS,
    members: MEMBERS, tasks: TASKS, templates: TASK_TEMPLATES, providers: PROVIDERS,
    reviews: REVIEWS, expenses: EXPENSES, quotes: QUOTES, upsells: UPSELLS,
    knowledge: KNOWLEDGE, actionItems: ACTION_ITEMS, variables: VARIABLES,
    msgTemplates: MSG_TEMPLATES, msgQueue: MSG_QUEUE, automations: AUTOMATIONS,
    issues: ISSUES, sync: SYNC, conflicts: CONFLICTS, webhooks: WEBHOOKS,
    guidebooks: GUIDEBOOKS, storeItems: STORE_ITEMS, storeTxns: STORE_TXNS,
    collections: COLLECTIONS, website: WEBSITE, workspace: WORKSPACE, audit: AUDIT,
  });

const PRISTINE = snapshotAll();
export type TenantData = ReturnType<typeof snapshotAll>;

const NAME_SWAPS: Record<string, string> = {
  "Villa Anggrek": "Ambara Tanjung",
  "Cemara Cottage": "Ambara Senggigi",
  "Senja Loft": "Ambara Hill Loft",
  "Villa Purnama": "Ambara Purnama Estate",
  "Samudra House": "Ambara Kuta House",
  "Samudra Two": "Ambara Kuta Two",
  "Samudra Three": "Ambara Kuta Three",
  "Kelapa Beach House": "Ambara Beach House",
};
const GUEST_FIRST = ["Dewi", "Raka", "Mia", "Tom", "Anya", "Luca", "Nina", "Omar", "Suki", "Ben", "Tara", "Ivan"];

/** Build a tenant's dataset. Sanggraha = the seed workspace; Ambara = an
 *  independent operator with rebranded listings, guests and scaled figures. */
export function buildTenantData(tenantId: string): TenantData {
  const base = structuredClone(PRISTINE) as TenantData;
  if (tenantId === "t-sanggraha") return base;

  // Ambara: rebrand + rescale (figures ×0.62, Lombok geography)
  base.properties = base.properties.map((p) => ({
    ...p,
    name: NAME_SWAPS[p.name] ?? p.name,
    city: "Lombok",
    region: "West Nusa Tenggara",
    pricing: {
      ...p.pricing,
      plans: p.pricing.plans.map((pl) => ({ ...pl, nightly: Math.round((pl.nightly * 0.62) / 1000) * 1000 })),
      cleaningFee: Math.round(p.pricing.cleaningFee * 0.6),
    },
  }));
  base.guests = base.guests.map((g, i) => {
    const last = g.name.split(" ").slice(1).join(" ");
    return { ...g, name: `${GUEST_FIRST[i % GUEST_FIRST.length]} ${last || "Guest"}`, lifetimeSpend: Math.round(g.lifetimeSpend * 0.55) };
  });
  const scaleItems = (items: LineItem[]): LineItem[] => items.map((it) => ({ ...it, amount: Math.round(it.amount * 0.62) }));
  base.reservations = base.reservations.map((r) => ({
    ...r, items: scaleItems(r.items), total: Math.round(r.total * 0.62),
    payments: r.payments.map((p) => ({ ...p, amount: Math.round(p.amount * 0.62) })),
  }));
  base.quotes = base.quotes.map((q) => ({ ...q, items: scaleItems(q.items), total: Math.round(q.total * 0.62) }));
  base.expenses = base.expenses.map((e) => ({ ...e, amount: Math.round(e.amount * 0.6) }));
  base.website = { ...base.website, subdomain: "ambara", customDomain: "ambara.co" };
  base.workspace = { ...base.workspace, name: "Ambara Island Co.", tenantId: "t-ambara", inboundEmail: "invoices@ambara.mail.derzen.site" };
  base.sync = base.sync.filter((s, i) => i < 4).map((s) => ({ ...s, state: "live" as const, errorRate24h: 0, queueDepth: 0, lastSuccessTs: Date.now() - 10 * 60_000 }));
  base.conflicts = [];
  base.members = base.members.map((m, i) => (i === 0 ? { ...m, name: "Dewi Ambara", email: "owner@ambara.co" } : m));
  return base;
}

/** Hydrate the live data module + return the dataset for the store. */
export function hydrateTenantData(tenantId: string): TenantData {
  const d = buildTenantData(tenantId);
  const into = <T,>(target: T[], next: T[]) => { target.length = 0; target.push(...next); };
  into(PROPERTIES, d.properties); into(GUESTS, d.guests); into(RESERVATIONS, d.reservations);
  into(BLOCKS, d.blocks); into(SERVICES, d.services); into(SERVICE_BOOKINGS, d.serviceBookings);
  into(CONVERSATIONS, d.conversations); into(MEMBERS, d.members); into(TASKS, d.tasks);
  into(TASK_TEMPLATES, d.templates); into(PROVIDERS, d.providers); into(REVIEWS, d.reviews);
  into(EXPENSES, d.expenses); into(QUOTES, d.quotes); into(UPSELLS, d.upsells);
  into(KNOWLEDGE, d.knowledge); into(ACTION_ITEMS, d.actionItems); into(VARIABLES, d.variables);
  into(MSG_TEMPLATES, d.msgTemplates); into(MSG_QUEUE, d.msgQueue); into(AUTOMATIONS, d.automations);
  into(ISSUES, d.issues); into(SYNC, d.sync); into(CONFLICTS, d.conflicts); into(WEBHOOKS, d.webhooks);
  into(GUIDEBOOKS, d.guidebooks); into(STORE_ITEMS, d.storeItems); into(STORE_TXNS, d.storeTxns);
  into(COLLECTIONS, d.collections); into(AUDIT, d.audit);
  Object.assign(WEBSITE, d.website);
  Object.assign(WORKSPACE, d.workspace);
  return d;
}

// ── Developer Console: platform integration board ─────────────────────────
export interface PlatformIntegration {
  id: string;
  name: string;
  category: "channels" | "payments" | "messaging" | "identity" | "backoffice";
  auth: string;
  envKeys: string[];
  status: "live" | "sandbox" | "missing";
  credentials: boolean;
  version: string;
  lastCheck?: { ts: number; ms: number; ok: boolean };
  playbookAnchor: string;
}

export const PLATFORM_INTEGRATIONS: PlatformIntegration[] = [
  { id: "channex", name: "Channex (aggregator)", category: "channels", auth: "API key", envKeys: ["DERZEN_CHANNEX_API_KEY"], status: "live", credentials: true, version: "v1.7.2", playbookAnchor: "1a-aggregator-first" },
  { id: "airbnb", name: "Airbnb", category: "channels", auth: "OAuth (partner program)", envKeys: ["DERZEN_AIRBNB_CLIENT_ID", "DERZEN_AIRBNB_CLIENT_SECRET"], status: "sandbox", credentials: true, version: "v3", playbookAnchor: "airbnb" },
  { id: "booking", name: "Booking.com", category: "channels", auth: "Extranet + property ID", envKeys: ["DERZEN_BOOKING_CLIENT_ID", "DERZEN_BOOKING_CLIENT_SECRET"], status: "live", credentials: true, version: "R&A 2.0", playbookAnchor: "bookingcom" },
  { id: "eps", name: "Expedia Group / VRBO", category: "channels", auth: "EPS Rapid + OAuth", envKeys: ["DERZEN_EPS_API_KEY", "DERZEN_VRBO_CLIENT_ID"], status: "live", credentials: true, version: "Rapid 3.1", playbookAnchor: "expedia-group" },
  { id: "agoda", name: "Agoda", category: "channels", auth: "YCS partner credentials", envKeys: ["DERZEN_AGODA_USER", "DERZEN_AGODA_KEY"], status: "sandbox", credentials: true, version: "v2", playbookAnchor: "agoda" },
  { id: "trip", name: "Trip.com", category: "channels", auth: "App key + secret", envKeys: ["DERZEN_TRIP_APP_KEY", "DERZEN_TRIP_SECRET"], status: "live", credentials: true, version: "v1.4", playbookAnchor: "tripcom" },
  { id: "mmt", name: "MakeMyTrip", category: "channels", auth: "API key", envKeys: ["DERZEN_MMT_API_KEY"], status: "missing", credentials: false, version: "—", playbookAnchor: "makemytrip" },
  { id: "traveloka", name: "Traveloka", category: "channels", auth: "OAuth client", envKeys: ["DERZEN_TRAVELOKA_CLIENT_ID"], status: "live", credentials: true, version: "v1.1", playbookAnchor: "traveloka" },
  { id: "ical", name: "iCal in/out", category: "channels", auth: "Open standard", envKeys: [], status: "live", credentials: true, version: "RFC 5545", playbookAnchor: "ical" },
  { id: "stripe", name: "Stripe", category: "payments", auth: "Secret key + webhooks", envKeys: ["DERZEN_STRIPE_SECRET_KEY", "DERZEN_STRIPE_WEBHOOK_SECRET"], status: "live", credentials: true, version: "2025-12-15", playbookAnchor: "stripe" },
  { id: "razorpay", name: "Razorpay", category: "payments", auth: "Key + webhook secret", envKeys: ["DERZEN_RAZORPAY_KEY_ID", "DERZEN_RAZORPAY_SECRET"], status: "sandbox", credentials: true, version: "v2", playbookAnchor: "razorpay" },
  { id: "whatsapp", name: "WhatsApp Cloud API", category: "messaging", auth: "Meta app + WABA token", envKeys: ["DERZEN_META_APP_ID", "DERZEN_WHATSAPP_TOKEN"], status: "live", credentials: true, version: "v21.0", playbookAnchor: "whatsapp-business-cloud-api" },
  { id: "meta", name: "Instagram + Messenger", category: "messaging", auth: "Meta Graph OAuth", envKeys: ["DERZEN_META_APP_ID", "DERZEN_META_APP_SECRET"], status: "sandbox", credentials: true, version: "Graph v21", playbookAnchor: "instagram-direct--facebook-messenger" },
  { id: "google", name: "Google OAuth + Places", category: "messaging", auth: "OAuth client + API key", envKeys: ["DERZEN_GOOGLE_CLIENT_ID", "DERZEN_GOOGLE_MAPS_KEY"], status: "live", credentials: true, version: "Places (New)", playbookAnchor: "google" },
  { id: "idv", name: "ID verification", category: "identity", auth: "API key + webhook", envKeys: ["DERZEN_IDV_API_KEY"], status: "live", credentials: true, version: "v3", playbookAnchor: "4-guest-identity--access" },
  { id: "ttlock", name: "TTLock", category: "identity", auth: "App ID + API key", envKeys: ["DERZEN_TTLOCK_APP_ID", "DERZEN_TTLOCK_KEY"], status: "live", credentials: true, version: "v3.2", playbookAnchor: "smart-locks" },
  { id: "nuki", name: "Nuki", category: "identity", auth: "Bearer token", envKeys: ["DERZEN_NUKI_TOKEN"], status: "sandbox", credentials: true, version: "v1.13", playbookAnchor: "smart-locks" },
  { id: "pricelabs", name: "PriceLabs (RatePilot)", category: "backoffice", auth: "Partner token", envKeys: ["DERZEN_PRICING_API_TOKEN"], status: "live", credentials: true, version: "v1", playbookAnchor: "dynamic-pricing" },
  { id: "xero", name: "Xero (LedgerSync)", category: "backoffice", auth: "OAuth 2.0 app", envKeys: ["DERZEN_XERO_CLIENT_ID", "DERZEN_XERO_CLIENT_SECRET"], status: "live", credentials: true, version: "2.0", playbookAnchor: "accounting-sync" },
  { id: "qbo", name: "QuickBooks (LedgerSync)", category: "backoffice", auth: "OAuth 2.0 app", envKeys: ["DERZEN_QBO_CLIENT_ID"], status: "missing", credentials: false, version: "—", playbookAnchor: "accounting-sync" },
];

export const AI_DEFAULTS = {
  model: "concierge-v2",
  temperature: 0.3,
  promptVersion: "v14",
  autopilotMinDelaySec: 20,
  guardrails: { citationRequired: true, paymentEscalation: true, complaintEscalation: true, piiRedaction: true },
  evals: [
    { name: "Unanswerable-fixture set (40 questions)", pass: "40/40", note: "no invented answers" },
    { name: "Tone & brand voice (25 cases)", pass: "25/25", note: "" },
    { name: "Variable resolution (18 cases)", pass: "18/18", note: "incl. per-property overrides" },
    { name: "DST local-time scheduling (6 cases)", pass: "6/6", note: "WITA ↔ CET boundary" },
  ],
};

export const PLATFORM_ENV = [
  { key: "DATABASE_URL", value: "postgres://derzen:••••••••@db-1.internal:5432/derzen", masked: true, note: "RLS enforced · tenant_id on every table" },
  { key: "REDIS_URL", value: "redis://cache-1.internal:6379", masked: true, note: "BullMQ queues + cache" },
  { key: "S3_ENDPOINT", value: "https://objects.derzen.site", masked: false, note: "photos, receipts, documents" },
  { key: "OTEL_EXPORTER", value: "https://otel.derzen.site:4318", masked: false, note: "traces across the sync path" },
  { key: "STRIPE_SECRET_KEY", value: "sk_live_••••••••••••4f2k", masked: true, note: "rotate quarterly" },
  { key: "META_APP_SECRET", value: "••••••••••••••••", masked: true, note: "WhatsApp + IG + Messenger" },
  { key: "JWT_SIGNING_KEY", value: "••••••••••••••••", masked: true, note: "session + API keys" },
  { key: "PII_RETENTION_DAYS", value: "90", masked: false, note: "purge after checkout + N" },
];
