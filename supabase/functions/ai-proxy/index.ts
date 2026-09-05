// ── ai-proxy ─────────────────────────────────────────────
// Provider keys live here, never in the bundle and never behind a VITE_ var.
// The browser sends a prompt; this function picks a model and answers.
//
// Deployed by .github/workflows/deploy-functions.yml. Do not hand-deploy: a
// manual push is exactly how the live copy drifted away from this file.
//
// Secrets (Project Settings > Edge Functions > Secrets), entered by hand:
//   GROQ_API_KEY  OPENROUTER_API_KEY  GEMINI_API_KEY  ANTHROPIC_API_KEY
//   optional per-provider overrides: GROQ_MODEL / OPENROUTER_MODEL /
//   GEMINI_MODEL / ANTHROPIC_MODEL - a preference, not a pin: an override
//   is tried first and then falls through like any other candidate.
//   ENABLE_ANTHROPIC=true is the only thing that lets Anthropic into the
//   chain. While it is unset Anthropic is never called, never probed, and
//   its model list is never fetched.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.alvianpermana.art",
  "https://dev.alvianpermana.art",
];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

// ── tiers ─────────────────────────────────────────────────
// A demo tenant is seeded in the browser and has no Supabase user, so
// supabase-js sends the anon key as the bearer. Rejecting that is why every
// AI action in a demo workspace 401d. Those callers are now accepted on
// purpose - visitors should be able to try the thing - which makes this an
// open endpoint on my own free keys. Hence the caps below: they are the only
// thing standing between "visitors can try it" and "the keys get farmed".
type Tier = "trusted" | "untrusted";

const CAPS: Record<Tier, { maxTokens: number; promptChars: number }> = {
  trusted: { maxTokens: 1_500, promptChars: 24_000 },
  untrusted: { maxTokens: 320, promptChars: 2_000 },
};

const TRUSTED_DAILY_TOKENS = 200_000;

// Sliding window, counted in Postgres so it survives a cold start.
const ANON_WINDOW_MINUTES = 10;
const ANON_PER_WINDOW = 6;
const ANON_PER_DAY = 40;
// Whole-endpoint ceiling, so rotating IPs cannot multiply the per-IP limit.
const ANON_GLOBAL_PER_DAY = 500;
const ANON_PRUNE_HOURS = 48;

// ── providers ───────────────────────────────────────────
type Provider = "groq" | "openrouter" | "gemini" | "anthropic";

const ENV: Record<Provider, { key: string; model: string }> = {
  groq: { key: "GROQ_API_KEY", model: "GROQ_MODEL" },
  openrouter: { key: "OPENROUTER_API_KEY", model: "OPENROUTER_MODEL" },
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
};

const FREE_CHAIN: Provider[] = ["groq", "openrouter", "gemini"];
const anthropicOn = () => Deno.env.get("ENABLE_ANTHROPIC") === "true";
const chain = (): Provider[] => (anthropicOn() ? [...FREE_CHAIN, "anthropic"] : FREE_CHAIN);

// Trying every listed model would turn one slow provider into a 60s request.
const MAX_CANDIDATES_PER_PROVIDER = 4;
const MODEL_TTL_MS = 60 * 60 * 1000;
const modelCache = new Map<Provider, { at: number; ids: string[] }>();

class ProviderError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`${status}`);
    this.status = status;
    this.body = body;
  }
}

// Model ids that are not chat completions at all.
const NOT_CHAT = /whisper|tts|embed|guard|moderat|imagen|veo|aqa|rerank|audio|image-gen/i;

// Cheap, fast, high-quota variants first; previews and dated snapshots last,
// since those are the ones that get decommissioned out from under you.
const rankModels = (ids: string[]): string[] => {
  const score = (id: string): number => {
    let s = 0;
    if (/:free$/.test(id)) s -= 6;
    // General instruction-tuned families, which answer an English concierge
    // prompt sensibly. Ranking on size alone picked allam-2-7b on Groq - a
    // genuine model returning genuine text, just an Arabic-specialised one,
    // which is the wrong tool for a guest reply.
    if (/llama|gemma|qwen|mistral|mixtral|deepseek|gpt-oss|phi-|command/i.test(id)) s -= 5;
    if (/instant|instruct|versatile|flash|lite|mini/i.test(id)) s -= 2;
    // Narrow or special-purpose variants sink below the generalists.
    if (/allam|saba|compound|specdec|coder|math|vision|thinking|reasoning/i.test(id)) s += 4;
    // Reasoning-first families narrate their scratchpad in the answer body,
    // with or without <think> tags: genuine output, wrong shape for a guest
    // reply. They sit behind the plain chat models rather than being dropped,
    // so they are still a real fallback when nothing else answers.
    if (/qwen3|qwq|deepseek-r1|magistral|-r1\b/i.test(id)) s += 8;
    if (/preview|experimental|-exp|alpha|beta/i.test(id)) s += 3;
    if (/\d{4}-\d{2}-\d{2}|\d{8}/.test(id)) s += 1;
    return s;
  };
  return [...ids].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
};

// ── dynamic model discovery ────────────────────────────────────
// Nothing is pinned. Each provider is asked what it currently serves, the
// zero-cost entries are kept, and the answer is cached for an hour. A model
// being decommissioned stops being a deploy-blocking outage and becomes one
// skipped candidate.
async function listFreeModels(p: Provider, key: string): Promise<string[]> {
  const hit = modelCache.get(p);
  if (hit && Date.now() - hit.at < MODEL_TTL_MS) return hit.ids;

  let ids: string[] = [];

  if (p === "groq") {
    // Groq serves one free tier; the catalogue it returns for a free key IS
    // the free list, so there is no price field to filter on.
    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) throw new ProviderError(r.status, await r.text());
    const j = await r.json();
    ids = (j.data ?? [])
      .filter((m: { id?: string; active?: boolean }) => m.active !== false && !NOT_CHAT.test(String(m.id ?? "")))
      .map((m: { id?: string }) => String(m.id ?? ""))
      .filter(Boolean);
  } else if (p === "openrouter") {
    // OpenRouter publishes per-token pricing, so zero-cost is measurable
    // rather than guessed. Prompt, completion and per-request must all be 0.
    const r = await fetch("https://openrouter.ai/api/v1/models");
    if (!r.ok) throw new ProviderError(r.status, await r.text());
    const j = await r.json();
    ids = (j.data ?? [])
      .filter((m: { id?: string; pricing?: Record<string, string> }) => {
        const pr = m.pricing ?? {};
        const free = ["prompt", "completion", "request"].every((k) => Number(pr[k] ?? 0) === 0);
        return free && !NOT_CHAT.test(String(m.id ?? ""));
      })
      .map((m: { id?: string }) => String(m.id ?? ""))
      .filter(Boolean);
  } else if (p === "gemini") {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=200`,
    );
    if (!r.ok) throw new ProviderError(r.status, await r.text());
    const j = await r.json();
    ids = (j.models ?? [])
      .filter((m: { name?: string; supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: { name?: string }) => String(m.name ?? "").replace(/^models\//, ""))
      // The Gemini free tier is the flash family; pro carries a real bill.
      .filter((id: string) => /flash/i.test(id) && !NOT_CHAT.test(id));
  } else {
    // Anthropic. chain() never yields it unless ENABLE_ANTHROPIC is true, so
    // while the toggle is off the key is not touched at all - not to chat and
    // not to list. Once it is on, the lineup is discovered like any other.
    const r = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (!r.ok) throw new ProviderError(r.status, await r.text());
    const j = await r.json();
    ids = (j.data ?? [])
      .map((m: { id?: string }) => String(m.id ?? ""))
      .filter((id: string) => id && !NOT_CHAT.test(id));
  }

  const ranked = rankModels(ids);
  modelCache.set(p, { at: Date.now(), ids: ranked });
  return ranked;
}

const forgetModel = (p: Provider, model: string): void => {
  const hit = modelCache.get(p);
  if (hit) modelCache.set(p, { at: hit.at, ids: hit.ids.filter((m) => m !== model) });
};

// ── completions ──────────────────────────────────────────
type Usage = { prompt: number; completion: number; total: number };
type Completion = { text: string; usage: Usage };

// Real counts when the provider reports them. When it does not, four
// characters to a token is the usual rule of thumb, and it is used only as a
// floor so a call that was actually served is never recorded as free.
// Some free models (qwen3, deepseek-r1) emit their scratchpad in <think>
// tags. That is not an answer and must never reach a guest-facing draft, so
// it is removed and a completion that was nothing but scratchpad counts as a
// failure and falls through to the next model.
const stripReasoning = (s: string): string =>
  s.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think>/gi, "").trim();
const tokNum = (n: unknown): number => (typeof n === "number" && n > 0 ? Math.round(n) : 0);
const estUsage = (system: string, user: string, out: string): Usage => {
  const prompt = Math.ceil((system.length + user.length) / 4);
  const completion = Math.ceil(out.length / 4);
  return { prompt, completion, total: prompt + completion };
};
const pickUsage = (prompt: number, completion: number, system: string, user: string, out: string): Usage =>
  prompt > 0 || completion > 0
    ? { prompt, completion, total: prompt + completion }
    : estUsage(system, user, out);

async function callProvider(
  p: Provider, key: string, model: string,
  system: string, user: string, maxTokens: number,
): Promise<Completion> {
  if (p === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
        }),
      },
    );
    if (!res.ok) throw new ProviderError(res.status, await res.text());
    const j = await res.json();
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? "").join("").trim();
    if (!text) throw new ProviderError(200, "empty completion");
    return { text, usage: pickUsage(tokNum(j.usageMetadata?.promptTokenCount), tokNum(j.usageMetadata?.candidatesTokenCount), system, user, text) };
  }

  if (p === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, system, messages: [{ role: "user", content: user }], max_tokens: maxTokens, temperature: 0.4 }),
    });
    if (!res.ok) throw new ProviderError(res.status, await res.text());
    const j = await res.json();
    const text = (j.content ?? []).map((x: { text?: string }) => x.text ?? "").join("").trim();
    if (!text) throw new ProviderError(200, "empty completion");
    return { text, usage: pickUsage(tokNum(j.usage?.input_tokens), tokNum(j.usage?.output_tokens), system, user, text) };
  }

  const url = p === "groq"
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
  if (p === "openrouter") {
    headers["HTTP-Referer"] = "https://app.alvianpermana.art";
    headers["X-Title"] = "DERZEN Hospitality OS";
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new ProviderError(res.status, await res.text());
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new ProviderError(200, "empty completion");
  return { text, usage: pickUsage(tokNum(j.usage?.prompt_tokens), tokNum(j.usage?.completion_tokens), system, user, text) };
}

// Which failures mean "try the next model" versus "this provider is out".
const modelGone = (s: number, b: string) => s === 404 || (s === 400 && /model|decommission|deprecat|not.?found|unsupported|invalid/i.test(b));
const throttled = (s: number, b: string) => s === 429 || s === 503 || s === 529 || /rate.?limit|quota|overloaded|capacity|too many/i.test(b);
const keyRejected = (s: number) => s === 401 || s === 403 || s === 402;

// ── identity ─────────────────────────────────────────────
// The platform gateway already verifies that the bearer is a JWT signed by
// this project, so anything arriving here is the anon key, the service key,
// or a real user token. That check stays on - it is what keeps strangers
// with no key out - and this function only decides what each one may do.
const jwtRole = (jwt: string): string => {
  try {
    const payload = jwt.split(".")[1] ?? "";
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return String(json.role ?? "");
  } catch {
    return "";
  }
};

const sha256Hex = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

// ── sliding window ─────────────────────────────────────────
// One row per accepted untrusted call, counted over a moving window. A
// module-level counter would reset on every cold start, which on edge is
// often enough to be no limit at all.
type Admin = ReturnType<typeof createClient>;

class LimiterError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// head:true sends a HEAD request, and a HEAD reply has no body for
// supabase-js to parse an error out of, so a missing table came back as
// "count 0, no error" - a limiter that silently permitted everything.
// Caught by probing the deployed function: eight untrusted calls in a row
// all passed a cap of six. Ask for a row back so failures are real failures.
async function countSince(admin: Admin, bucket: string, sinceIso: string): Promise<number> {
  const { count, error } = await admin
    .from("ai_anon_usage")
    .select("id", { count: "exact" })
    .eq("bucket", bucket)
    .gte("created_at", sinceIso)
    .limit(1);
  if (error) throw new LimiterError(String(error.code ?? ""), error.message);
  return count ?? 0;
}

async function anonGate(admin: Admin, bucket: string): Promise<string | null> {
  const now = Date.now();
  const windowIso = new Date(now - ANON_WINDOW_MINUTES * 60_000).toISOString();
  const dayIso = new Date(now - 24 * 60 * 60_000).toISOString();

  if (await countSince(admin, bucket, windowIso) >= ANON_PER_WINDOW) {
    return `Free-tier limit: ${ANON_PER_WINDOW} AI requests per ${ANON_WINDOW_MINUTES} minutes. Try again shortly.`;
  }
  if (await countSince(admin, bucket, dayIso) >= ANON_PER_DAY) {
    return `Free-tier limit: ${ANON_PER_DAY} AI requests per day. Sign in to a real workspace for the full quota.`;
  }
  if (await countSince(admin, "global", dayIso) >= ANON_GLOBAL_PER_DAY) {
    return "The shared demo AI budget for today is used up. Try again tomorrow.";
  }
  return null;
}

async function recordAnon(admin: Admin, bucket: string): Promise<void> {
  const { error } = await admin.from("ai_anon_usage").insert([{ bucket }, { bucket: "global" }]);
  if (error) throw new LimiterError(String(error.code ?? ""), error.message);
  // Opportunistic prune - no cron on this project, and the table is tiny.
  if (Math.random() < 0.05) {
    await admin.from("ai_anon_usage").delete()
      .lt("created_at", new Date(Date.now() - ANON_PRUNE_HOURS * 60 * 60_000).toISOString());
  }
}

// ── handler ────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // supabase-js only sends an Authorization header when it actually has a
  // token to send. With the new-style publishable key (sb_publishable_...)
  // a session-less browser sends `apikey` on its own, so demanding a bearer
  // here 401d every visitor - the exact failure this rewrite exists to fix.
  // Accept either credential; the bearer, when present, is still the only
  // thing that can promote a caller to the trusted tier below.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  const apiKey = req.headers.get("apikey")?.trim() ?? "";
  if (!bearer && !apiKey) return json({ error: "unauthenticated" }, 401);
  const jwt = bearer;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Tier the caller. A real user token takes the normal path; the anon key
  // is accepted but untrusted. Note this changes nothing about who may read
  // data - RLS is still the only thing deciding that, and this function
  // never reads tenant rows on the caller behalf.
  const role = jwtRole(jwt);
  let tier: Tier = "untrusted";
  let userId: string | null = null;
  if (role !== "anon") {
    const { data, error } = await admin.auth.getUser(jwt);
    if (!error && data?.user) {
      tier = "trusted";
      userId = data.user.id;
    }
  }

  let body: { system?: string; user?: string; maxTokens?: number; scope?: string; surface?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const caps = CAPS[tier];
  const system = String(body.system ?? "").slice(0, caps.promptChars);
  const prompt = String(body.user ?? "").slice(0, caps.promptChars);
  const maxTokens = Math.min(Math.max(1, Number(body.maxTokens) || 600), caps.maxTokens);
  if (!prompt) return json({ error: "empty prompt" }, 400);

  // Reported back to the caller so a limiter that is not actually running is
  // visible instead of assumed.
  let limiter: "enforced" | "not-installed" | "n/a" = tier === "untrusted" ? "enforced" : "n/a";
  let bucket = "";
  if (tier === "untrusted") {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    // Hashed with a server-side salt: the limiter needs to tell callers
    // apart, it does not need to store anyone address.
    bucket = await sha256Hex(`${ip}|${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`);
    try {
      const blocked = await anonGate(admin, bucket);
      if (blocked) return json({ error: blocked, code: "rate_limited" });
      await recordAnon(admin, bucket);
    } catch (e) {
      const code = e instanceof LimiterError ? e.code : "";
      if (code === "42P01" || code === "PGRST205" || code === "PGRST204") {
        // 0005_ai_anon_usage.sql has not been applied yet. Serve the request
        // rather than dead-ending the demo, but say plainly in the response
        // that nothing is capping it. Applying the migration switches
        // enforcement on by itself, with no code change and no redeploy.
        console.error("ai_anon_usage missing - untrusted rate limit is NOT enforced");
        limiter = "not-installed";
      } else {
        // Any other ledger failure fails closed: an unenforceable cap on an
        // open endpoint is no cap at all.
        console.error("anon rate-limit check failed", e);
        return json({ error: "AI is temporarily unavailable for demo sessions.", code: "limiter_unavailable" });
      }
    }
  }

  // ── token accounting ────────────────────────────────
  // Scope is the bucket a call is billed to. Untrusted callers - demo
  // workspaces, the dev console, any visitor - all draw on one shared "demo"
  // pool, which is what makes the figure the dev console shows a real one.
  // A trusted caller may only bill a tenant it actually belongs to, and that
  // membership is checked here on the service role, never in the client.
  const wanted = String(body.scope ?? "").trim().slice(0, 64);
  const surface = String(body.surface ?? "").trim().slice(0, 32) || null;
  let scope = "demo";
  let tenantId: string | null = null;
  if (tier === "trusted" && userId) {
    const { data: mine } = await admin.from("tenant_members").select("tenant_id").eq("user_id", userId);
    const owned = ((mine as { tenant_id: string }[] | null) ?? []).map((r) => r.tenant_id);
    if (wanted && owned.includes(wanted)) {
      scope = wanted;
      tenantId = wanted;
    } else {
      scope = `user:${userId}`;
    }
  }

  // Same honesty rule as the rate limiter: when the ledger is not installed,
  // say so in the response rather than imply a quota was checked.
  let ledger: "enforced" | "not-installed" = "enforced";
  let plan = tier === "trusted" ? "tenant" : "demo";
  let quota = tier === "trusted" ? 1_000_000 : 200_000;
  let monthUsed = 0;
  const nowTs = new Date();
  const monthStart = new Date(Date.UTC(nowTs.getUTCFullYear(), nowTs.getUTCMonth(), 1)).toISOString();
  const tableMissing = (c?: string) => c === "42P01" || c === "PGRST205" || c === "PGRST204";

  const qRow = await admin.from("ai_token_quota").select("plan, monthly_tokens").eq("scope", scope).maybeSingle();
  if (qRow.error && tableMissing(qRow.error.code)) {
    console.error("ai_token_quota missing - the AI token quota is NOT enforced");
    ledger = "not-installed";
  } else if (qRow.data) {
    const row = qRow.data as { plan: string; monthly_tokens: number };
    plan = row.plan || plan;
    quota = Number(row.monthly_tokens) || quota;
  }

  if (ledger === "enforced") {
    const uRows = await admin.from("ai_token_usage").select("total_tokens").eq("scope", scope).gte("created_at", monthStart);
    if (uRows.error) {
      if (tableMissing(uRows.error.code)) {
        console.error("ai_token_usage missing - the AI token quota is NOT enforced");
        ledger = "not-installed";
      } else {
        console.error("token ledger read failed", uRows.error.code, uRows.error.message);
        return json({ error: "AI usage accounting is unavailable, so the request was not run.", code: "ledger_unavailable" });
      }
    } else {
      monthUsed = ((uRows.data as { total_tokens: number }[] | null) ?? []).reduce((a, r) => a + (Number(r.total_tokens) || 0), 0);
    }
  }

  if (ledger === "enforced" && monthUsed >= quota) {
    return json({
      error: tier === "trusted"
        ? "This workspace has used its monthly AI token allowance."
        : "The shared demo AI allowance for this month is used up.",
      code: "token_quota",
      tier, limiter, ledger,
      tokens: { scope, plan, used: monthUsed, quota },
    });
  }

  const day = new Date().toISOString().slice(0, 10);
  let used = 0;
  if (tier === "trusted" && userId) {
    const { data: usage } = await admin.from("ai_usage").select("tokens").eq("user_id", userId).eq("day", day).maybeSingle();
    used = (usage as { tokens?: number } | null)?.tokens ?? 0;
    if (used >= TRUSTED_DAILY_TOKENS) return json({ error: "Daily AI quota reached.", code: "quota" }, 429);
  }

  // ── walk providers, then models inside each provider ───────────────
  const tried: string[] = [];
  let sawThrottle = false;
  const t0 = performance.now();

  for (const p of chain()) {
    const key = Deno.env.get(ENV[p].key);
    if (!key || key.startsWith("PLACEHOLDER")) {
      tried.push(`${p}: not configured`);
      continue;
    }

    let candidates: string[];
    try {
      candidates = await listFreeModels(p, key);
    } catch (e) {
      const st = e instanceof ProviderError ? e.status : 0;
      tried.push(`${p}: model list failed (${st || "network"})`);
      continue;
    }

    // An override is a preference, not a pin: it is tried first and then
    // falls through like anything else the moment it stops existing.
    const override = Deno.env.get(ENV[p].model);
    if (override) candidates = [override, ...candidates.filter((m) => m !== override)];

    if (!candidates.length) {
      tried.push(`${p}: no free models listed`);
      continue;
    }

    let providerDead = false;
    for (const model of candidates.slice(0, MAX_CANDIDATES_PER_PROVIDER)) {
      try {
        const done = await callProvider(p, key, model, system, prompt, maxTokens);
        const text = stripReasoning(done.text);
        if (!text) throw new ProviderError(200, "reasoning-only completion");
        const ms = Math.round(performance.now() - t0);
        if (tier === "trusted" && userId) {
          const spend = used + done.usage.total;
          await admin.from("ai_usage").upsert({ user_id: userId, day, tokens: spend }, { onConflict: "user_id,day" });
        }
        if (ledger === "enforced") {
          // supabase-js returns its errors, it does not throw them. Logging
          // the real one is the whole difference between a ledger and a no-op.
          const { error: ledErr } = await admin.from("ai_token_usage").insert({
            scope, tenant_id: tenantId, user_id: userId, tier, surface,
            provider: p, model,
            prompt_tokens: done.usage.prompt,
            completion_tokens: done.usage.completion,
            total_tokens: done.usage.total,
            latency_ms: ms, ok: true,
          });
          if (ledErr) console.error("ai_token_usage insert failed", ledErr.code, ledErr.message);
        }
        return json({
          text, provider: p, model, tier, limiter, ledger, ms, chain: tried,
          usage: done.usage,
          tokens: { scope, plan, used: monthUsed + done.usage.total, quota },
        });
      } catch (e) {
        const st = e instanceof ProviderError ? e.status : 0;
        const bd = e instanceof ProviderError ? e.body : String(e);
        if (keyRejected(st)) {
          tried.push(`${p}: key rejected (${st})`);
          providerDead = true;
          break;
        }
        if (modelGone(st, bd)) {
          tried.push(`${p}/${model}: gone (${st})`);
          forgetModel(p, model);
          continue;
        }
        if (throttled(st, bd)) {
          sawThrottle = true;
          tried.push(`${p}/${model}: rate-limited (${st})`);
          continue;
        }
        tried.push(`${p}/${model}: failed (${st || "network"})`);
      }
    }
    if (providerDead) continue;
  }

  // Nothing answered. This function returns no text in that case, ever.
  // A canned sentence here would be indistinguishable from a real draft, and
  // the whole point of moving off the old client fallback was that a silent
  // fake reply reads exactly like model output. The caller gets an explicit
  // state to render instead.
  //
  // These come back as HTTP 200 with an error field on purpose: supabase-js
  // collapses a non-2xx into "Edge Function returned a non-2xx status code"
  // and throws the body away, which is how the original 401 stayed invisible
  // for so long.
  if (sawThrottle) {
    return json({
      error: "All free models are rate-limited right now. Try again in a few minutes.",
      code: "all_models_rate_limited",
      chain: tried,
    });
  }
  return json({
    error: "No AI provider is available right now.",
    code: "no_provider_available",
    chain: tried,
  });
});
