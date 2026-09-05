// Public pricing, in one place.
// The landing page, the tenant billing screen and the platform plan table
// each carried their own numbers, and they had already drifted: the landing
// page advertised 1,000 AI credits a month for Starter while ai-proxy was
// enforcing 250,000 tokens. Prices live here now, so a change lands in one
// file and every surface moves with it.

import { supabase, isServerAuthConfigured } from "./supabase";
import { SURFACE } from "./surface";

export type PlanId = "starter" | "scale" | "enterprise";
export type CheckoutCycle = "monthly" | "annual";

export interface PlanTier {
  id: PlanId;
  name: string;
  /** Whole currency units per month when billed monthly. */
  monthly: number;
  /** Per month when billed a year at a time. */
  annual: number;
  units: number;
  services: number;
  /** The monthly allowance ai-proxy enforces for this account type. Keep in
   * step with PLAN_TOKENS in supabase/functions/ai-proxy/index.ts. */
  aiTokens: number;
  overageUnit: number;
  unitsLabel: string;
  summary: string;
  includes: string[];
  /** Quoted rather than bought from the page. */
  quoteOnly?: boolean;
}

export const CURRENCY = "USD";

const CORE = [
  "Multi-calendar with the iCal fast path",
  "Unified inbox and Command Center",
  "AI concierge grounded in your own knowledge base",
  "Quotes, guidebooks and the guest store",
];

export const PLAN_TIERS: PlanTier[] = [
  {
    id: "starter", name: "Starter",
    monthly: 49, annual: 39,
    units: 3, services: 0, aiTokens: 250_000, overageUnit: 14,
    unitsLabel: "3 property units",
    summary: "One or two houses, direct bookings, and the channels that actually send you guests.",
    includes: CORE,
  },
  {
    id: "scale", name: "Scale",
    monthly: 118, annual: 94,
    units: 15, services: 5, aiTokens: 1_000_000, overageUnit: 9,
    unitsLabel: "15 property units and 5 service units",
    summary: "A portfolio across several channels, with owners who expect a statement.",
    includes: [...CORE, "Channel manager with per-listing mapping", "Owner portal and statements", "Websites and embeddable widgets"],
  },
  {
    id: "enterprise", name: "Enterprise",
    monthly: 480, annual: 384,
    units: 100, services: 25, aiTokens: 5_000_000, overageUnit: 6,
    unitsLabel: "100 property units and 25 service units",
    summary: "Multi-brand estates, custom contracts, and a migration you do not run alone.",
    includes: [...CORE, "Channel manager with per-listing mapping", "Owner portal and statements", "Websites and embeddable widgets", "SSO, audit export and a DR-tested restore", "Named migration support"],
    quoteOnly: true,
  },
];

export const planById = (id: PlanId): PlanTier =>
  PLAN_TIERS.find((p) => p.id === id) ?? PLAN_TIERS[0];

export const priceFor = (p: PlanTier, cycle: CheckoutCycle): number =>
  (cycle === "annual" ? p.annual : p.monthly);

export const formatPrice = (p: PlanTier, cycle: CheckoutCycle): string =>
  `$${priceFor(p, cycle)}`;

export const annualSaving = (p: PlanTier): number =>
  Math.max(0, Math.round((1 - p.annual / p.monthly) * 100));

/** The rate card behind a plan, as label and value pairs. */
export const planRows = (p: PlanTier, cycle: CheckoutCycle): { label: string; value: string }[] => [
  { label: "Billed", value: cycle === "annual" ? `$${p.annual * 12} once a year` : `$${p.monthly} every month` },
  { label: "Property units included", value: String(p.units) },
  { label: "Service units included", value: p.services > 0 ? String(p.services) : "none" },
  { label: "Each extra property unit", value: `$${p.overageUnit} per month` },
  { label: "AI tokens per month", value: p.aiTokens.toLocaleString() },
  { label: "Team seats", value: "unlimited, and free" },
  { label: "Trial", value: "14 days, no card" },
];

export interface CheckoutStart {
  /** Hosted payment page to send the buyer to. */
  url?: string;
  reference?: string;
  error?: string;
}

/**
 * Open a checkout for a plan.
 *
 * There is no gateway wired to this project yet, and this function does not
 * pretend otherwise: it asks a "checkout" Edge Function for a hosted payment
 * page and reports plainly when there is nothing to ask. That keeps the page
 * honest today and means connecting Stripe or Xendit later is a deploy, not a
 * rewrite of this screen.
 *
 * Only the plan and the cycle are sent. The amount is deliberately not sent:
 * a price that arrives from a public bundle is a price a buyer can edit, so
 * the function must price the plan itself. No card detail passes through this
 * app at any point.
 */
export async function startCheckout(
  plan: PlanId,
  cycle: CheckoutCycle,
  email?: string,
): Promise<CheckoutStart> {
  const tier = planById(plan);
  if (tier.quoteOnly) {
    return { error: `${tier.name} is quoted rather than bought from this page. Tell us the portfolio size and we will price it.` };
  }
  if (!isServerAuthConfigured()) {
    return { error: "This build has no Supabase project compiled in, so there is no checkout function to call." };
  }
  try {
    const { data, error } = await supabase().functions.invoke("checkout", {
      body: { plan, cycle, currency: CURRENCY, email, surface: SURFACE },
    });
    if (error) {
      return { error: `Checkout is not answering yet: ${error.message}` };
    }
    const res = data as CheckoutStart | null;
    if (res?.error) return { error: res.error };
    if (res?.url) return { url: res.url, reference: res.reference };
    return { error: "The checkout function answered without a payment page, so nothing was charged." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Checkout could not be reached." };
  }
}
