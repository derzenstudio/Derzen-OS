// ── checkout ─────────────────────────────────────────────────────────────
// Starts a hosted checkout for a DERZEN plan.
//
// The landing page used to open a modal that asked for a card number and then
// resolved itself with a setTimeout. No money moved and the card detail went
// nowhere, which is worse than having no checkout at all. This function is the
// real thing in the sense that matters: it prices the plan on the server, asks
// whichever provider is configured for a hosted payment page, and says plainly
// when no provider is connected. Connecting Stripe or Xendit is then a matter
// of adding secrets, not of editing a screen.
//
// No card detail ever touches DERZEN. The buyer is redirected to the
// provider's own page and comes back with a reference.
//
// Edge Function secrets (Project Settings > Edge Functions > Secrets):
//   PAYMENT_PROVIDER   "stripe" or "xendit". Optional: when exactly one
//                      provider key is present it is inferred.
//   STRIPE_SECRET_KEY  and a Price id per plan and cycle, named
//                      STRIPE_PRICE_<PLAN>_<CYCLE>, because a Stripe
//                      subscription bills against a Price rather than an
//                      amount. Example: STRIPE_PRICE_SCALE_ANNUAL.
//   XENDIT_SECRET_KEY  a secret API key. Xendit is billed the amount below.
//   PUBLIC_APP_ORIGIN  where to send the buyer back to if the request carries
//                      no usable Origin header.
//   CHECKOUT_ORIGINS   optional comma separated allowlist of origins that may
//                      be used as a return address.
//
// Nothing above is committed and nothing is read from a VITE_ variable: a key
// in the bundle is a key in every visitor's browser.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const env = (k: string): string => (Deno.env.get(k) || "").trim();

// The rate card, server side. src/lib/pricing.ts carries the same numbers so
// the page can render them, but this copy is the one that decides what is
// charged: a price that arrives from a public bundle is a price a buyer can
// edit before it is sent.
interface Tier { name: string; monthly: number; annual: number; quoteOnly?: boolean }
const PLANS: Record<string, Tier> = {
  starter:    { name: "Starter",    monthly: 49,  annual: 39 },
  scale:      { name: "Scale",      monthly: 118, annual: 94 },
  enterprise: { name: "Enterprise", monthly: 480, annual: 384, quoteOnly: true },
};

/**
 * Where the buyer is sent after paying.
 *
 * Read from the request headers and never from the body. A redirect target
 * that arrives in a payload is an open redirect, and an open redirect on a
 * payment flow is a phishing kit.
 */
function returnOrigin(req: Request): string {
  const fallback = env("PUBLIC_APP_ORIGIN");
  const origin = req.headers.get("origin") || "";
  if (!origin.startsWith("https://")) return fallback;
  const allow = env("CHECKOUT_ORIGINS");
  if (allow) {
    const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.includes(origin)) return fallback;
  }
  return origin;
}

/** A short reference the buyer can quote and the webhook can match on. */
function newReference(plan: string): string {
  const rand = crypto.randomUUID().split("-")[0].toUpperCase();
  return "DZ-" + plan.slice(0, 2).toUpperCase() + "-" + rand;
}

interface Started { url?: string; reference?: string; error?: string }

async function stripeCheckout(
  plan: string, cycle: string, email: string, origin: string, ref: string,
): Promise<Started> {
  const priceVar = "STRIPE_PRICE_" + plan.toUpperCase() + "_" + cycle.toUpperCase();
  const price = env(priceVar);
  if (!price) {
    return { error: "Stripe is connected but this plan has no Price id yet. Add " + priceVar + " and the button works." };
  }
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("line_items[0][price]", price);
  form.set("line_items[0][quantity]", "1");
  form.set("client_reference_id", ref);
  form.set("success_url", origin + "/#/en/settings?checkout=done&ref=" + ref);
  form.set("cancel_url", origin + "/#/en?checkout=cancelled");
  if (email) form.set("customer_email", email);
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env("STRIPE_SECRET_KEY"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const body = await res.json().catch(() => null) as { url?: string; error?: { message?: string } } | null;
  if (!res.ok || !body?.url) {
    return { error: "Stripe did not open a checkout: " + (body?.error?.message || ("HTTP " + res.status)) };
  }
  return { url: body.url, reference: ref };
}

async function xenditCheckout(
  amount: number, cycle: string, plan: Tier, email: string, origin: string, ref: string,
): Promise<Started> {
  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(env("XENDIT_SECRET_KEY") + ":"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: ref,
      amount,
      currency: "USD",
      description: "DERZEN " + plan.name + ", billed " + cycle,
      payer_email: email || undefined,
      success_redirect_url: origin + "/#/en/settings?checkout=done&ref=" + ref,
      failure_redirect_url: origin + "/#/en?checkout=cancelled",
    }),
  });
  const body = await res.json().catch(() => null) as { invoice_url?: string; message?: string } | null;
  if (!res.ok || !body?.invoice_url) {
    return { error: "Xendit did not open a checkout: " + (body?.message || ("HTTP " + res.status)) };
  }
  return { url: body.invoice_url, reference: ref };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* an empty body fails validation below */ }

  const planId = String(body.plan || "").toLowerCase();
  const cycle = String(body.cycle || "monthly").toLowerCase();
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";

  const tier = PLANS[planId];
  if (!tier) return json({ error: "There is no plan by that name." }, 400);
  if (cycle !== "monthly" && cycle !== "annual") {
    return json({ error: "A plan is billed monthly or annually." }, 400);
  }
  if (tier.quoteOnly) {
    return json({ error: tier.name + " is quoted rather than bought from the page. Tell us the portfolio size and we will price it." });
  }

  // Priced here, from the table above, not from anything the caller sent.
  const perMonth = cycle === "annual" ? tier.annual : tier.monthly;
  const amount = cycle === "annual" ? perMonth * 12 : perMonth;

  const origin = returnOrigin(req);
  if (!origin) {
    return json({ error: "No return address is configured, so a buyer could not be sent back after paying. Set PUBLIC_APP_ORIGIN." });
  }

  const hasStripe = !!env("STRIPE_SECRET_KEY");
  const hasXendit = !!env("XENDIT_SECRET_KEY");
  const named = env("PAYMENT_PROVIDER").toLowerCase();
  const provider = named || (hasStripe && !hasXendit ? "stripe" : (!hasStripe && hasXendit ? "xendit" : ""));

  if (!provider) {
    const billed = cycle === "annual"
      ? ("$" + perMonth + " a month, billed $" + amount + " once a year")
      : ("$" + perMonth + " a month");
    return json({
      error: "No payment provider is connected to this project yet, so nothing was charged. " + tier.name + " is " + billed + ". Add a provider key in Supabase and this button starts working with no code change.",
    });
  }
  if (provider === "stripe" && !hasStripe) {
    return json({ error: "PAYMENT_PROVIDER names Stripe but STRIPE_SECRET_KEY is not set." });
  }
  if (provider === "xendit" && !hasXendit) {
    return json({ error: "PAYMENT_PROVIDER names Xendit but XENDIT_SECRET_KEY is not set." });
  }

  const ref = newReference(planId);
  try {
    if (provider === "stripe") return json(await stripeCheckout(planId, cycle, email, origin, ref));
    if (provider === "xendit") return json(await xenditCheckout(amount, cycle, tier, email, origin, ref));
    return json({ error: "PAYMENT_PROVIDER names " + provider + ", which this function does not know how to talk to." });
  } catch (e) {
    return json({ error: "The provider could not be reached: " + (e instanceof Error ? e.message : String(e)) });
  }
});
