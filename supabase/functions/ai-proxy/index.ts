// ── ai-proxy ───────────────────────────────────────────────────────────────
// The browser used to hold Groq, OpenRouter and Gemini keys in localStorage
// and call the providers directly. Any XSS on the origin drained live billable
// keys, and every operator's device carried a copy. This function moves the
// keys server-side: the browser sends a prompt and a JWT, never a key.
//
// Deploy:  supabase functions deploy ai-proxy
// Secrets: supabase secrets set GROQ_API_KEY=... OPENROUTER_API_KEY=... GEMINI_API_KEY=...
//
// These are function secrets, not VITE_ variables. Anything prefixed VITE_ is
// compiled into the static bundle and served to the public.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.alvianpermana.art",
  "https://dev.alvianpermana.art",
];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

// Per-user token budget, held in Postgres so it survives a cold start and
// cannot be reset by clearing the browser.
const DAILY_TOKEN_CAP = 200_000;
const MAX_TOKENS_PER_CALL = 1_500;
const MAX_PROMPT_CHARS = 24_000;

type Provider = "groq" | "openrouter" | "gemini";

const CHAIN: { id: Provider; env: string; model: string }[] = [
  { id: "groq", env: "GROQ_API_KEY", model: Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile" },
  { id: "openrouter", env: "OPENROUTER_API_KEY", model: Deno.env.get("OPENROUTER_MODEL") ?? "anthropic/claude-3.5-haiku" },
  { id: "gemini", env: "GEMINI_API_KEY", model: Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash" },
];

async function callProvider(p: Provider, key: string, model: string, system: string, user: string, maxTokens: number): Promise<string> {
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
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const j = await res.json();
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? "").join("").trim();
    if (!text) throw new Error("gemini empty");
    return text;
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
  if (!res.ok) throw new Error(`${p} ${res.status}`);
  const j = await res.json();
  const text = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${p} empty`);
  return text;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers });

  // 1. Authenticate. An unauthenticated caller must never reach a provider,
  //    or this function is just the old leak with an extra hop.
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  // 2. Validate input before spending anyone's money.
  let body: { system?: string; user?: string; maxTokens?: number };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "bad json" }), { status: 400, headers }); }
  const system = String(body.system ?? "").slice(0, MAX_PROMPT_CHARS);
  const prompt = String(body.user ?? "").slice(0, MAX_PROMPT_CHARS);
  const maxTokens = Math.min(Math.max(1, Number(body.maxTokens) || 600), MAX_TOKENS_PER_CALL);
  if (!prompt) return new Response(JSON.stringify({ error: "empty prompt" }), { status: 400, headers });

  // 3. Quota. Without this, one compromised account can burn the whole budget.
  const day = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin
    .from("ai_usage").select("tokens").eq("user_id", user.id).eq("day", day).maybeSingle();
  const used = (usage as { tokens?: number } | null)?.tokens ?? 0;
  if (used >= DAILY_TOKEN_CAP) {
    return new Response(JSON.stringify({ error: "daily AI quota reached" }), { status: 429, headers });
  }

  // 4. Fail down the chain. The response names the provider but never the key.
  const tried: string[] = [];
  for (const { id, env, model } of CHAIN) {
    const key = Deno.env.get(env);
    if (!key) { tried.push(`${id}: not configured`); continue; }
    const t0 = performance.now();
    try {
      const text = await callProvider(id, key, model, system, prompt, maxTokens);
      const spend = used + Math.ceil((system.length + prompt.length) / 4) + maxTokens;
      await admin.from("ai_usage").upsert(
        { user_id: user.id, day, tokens: spend },
        { onConflict: "user_id,day" },
      );
      return new Response(
        JSON.stringify({ text, provider: id, model, ms: Math.round(performance.now() - t0), chain: tried }),
        { headers },
      );
    } catch (e) {
      tried.push(`${id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return new Response(JSON.stringify({ error: "all providers unavailable", chain: tried }), { status: 502, headers });
});
