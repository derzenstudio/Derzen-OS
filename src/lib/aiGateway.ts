// ── AI gateway — live provider routing, no placeholders ───────────────────
// Chain: Groq (primary) → OpenRouter (fallback 1) → Gemini (fallback 2).
// Keys + selected models persist in dev-scoped storage; every AI feature in
// the tenant app (copilot, inbox drafts, review replies, sandbox, chatbot)
// routes through aiChat(), which fails over down the chain and reports which
// provider actually answered.

import { supabase, isServerAuthConfigured } from "./supabase";

export type AiProviderId = "groq" | "openrouter" | "gemini";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
  lastCheck?: { ok: boolean; ms: number; ts: number; models?: number };
}

export interface AiProviderState {
  groq: ProviderConfig;
  openrouter: ProviderConfig;
  gemini: ProviderConfig;
}

const STORE_KEY = "derzen.ai.providers.v1";
const CHAIN: { id: AiProviderId; role: string }[] = [
  { id: "groq", role: "Primary" },
  { id: "openrouter", role: "Fallback 1" },
  { id: "gemini", role: "Fallback 2" },
];

export const PROVIDER_META: Record<AiProviderId, { name: string; role: string; modelsUrl: string; keyHint: string; docs: string }> = {
  groq: {
    name: "Groq", role: "Primary",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    keyHint: "gsk_…",
    docs: "console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter", role: "Fallback 1",
    modelsUrl: "https://openrouter.ai/api/v1/models",
    keyHint: "sk-or-v1-…",
    docs: "openrouter.ai/keys",
  },
  gemini: {
    name: "Google Gemini", role: "Fallback 2",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    keyHint: "AIza…",
    docs: "aistudio.google.com/apikey",
  },
};

export const DEFAULT_PROVIDERS: AiProviderState = {
  groq: { apiKey: "", model: "", enabled: true },
  openrouter: { apiKey: "", model: "", enabled: true },
  gemini: { apiKey: "", model: "", enabled: true },
};

export function loadProviders(): AiProviderState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROVIDERS);
    const p = JSON.parse(raw) as Partial<AiProviderState>;
    return {
      groq: { ...DEFAULT_PROVIDERS.groq, ...p.groq },
      openrouter: { ...DEFAULT_PROVIDERS.openrouter, ...p.openrouter },
      gemini: { ...DEFAULT_PROVIDERS.gemini, ...p.gemini },
    };
  } catch {
    return structuredClone(DEFAULT_PROVIDERS);
  }
}

export function saveProviders(state: AiProviderState): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
}

export function isAiConfigured(state: AiProviderState): boolean {
  // A server-backed build is always configured: the keys live in the Edge
  // Function, so there is nothing for an operator to paste in.
  if (isServerAuthConfigured()) return true;
  return CHAIN.some(({ id }) => state[id].enabled && state[id].apiKey.trim().length > 0);
}

/** Where the keys currently live. Drives the warning on the providers screen. */
export const aiKeyLocation = (): "server" | "browser" => (isServerAuthConfigured() ? "server" : "browser");

// Model families worth surfacing first. An alphabetical list buries the models
// anyone actually picks under several hundred community and preview entries.
const FAMILY_ORDER = [
  "anthropic/", "openai/", "google/", "meta-llama/", "mistralai/",
  "deepseek/", "qwen/", "x-ai/", "cohere/", "nvidia/",
];
const familyRank = (id: string): number => {
  const i = FAMILY_ORDER.findIndex((f) => id.startsWith(f));
  return i === -1 ? FAMILY_ORDER.length : i;
};
/** Popular families first, then alphabetical inside each family. Free and
 *  preview variants sink below their paid siblings. */
export const sortByFamily = (ids: string[]): string[] =>
  [...ids].sort((a, b) => {
    const fr = familyRank(a) - familyRank(b);
    if (fr !== 0) return fr;
    const sideRank = (s: string) => (/:free$/.test(s) ? 2 : /preview|beta|alpha|experimental/i.test(s) ? 1 : 0);
    const sr = sideRank(a) - sideRank(b);
    if (sr !== 0) return sr;
    return a.localeCompare(b);
  });

// ── live model lists ───────────────────────────────────────────────────────
export async function fetchModels(id: AiProviderId, apiKey: string): Promise<string[]> {
  const ctl = new AbortController();
  const to = window.setTimeout(() => ctl.abort(), 9000);
  try {
    let res: Response;
    if (id === "gemini") {
      res = await fetch(`${PROVIDER_META.gemini.modelsUrl}?key=${encodeURIComponent(apiKey)}&pageSize=200`, { signal: ctl.signal });
    } else {
      // OpenRouter's model list is public, but anonymous callers share one
      // low rate-limit bucket, so a sync from a busy office returns 429. Send
      // the key and the attribution headers and the call is billed to, and
      // limited by, this account instead.
      res = await fetch(PROVIDER_META[id].modelsUrl, {
        signal: ctl.signal,
        headers: id === "openrouter"
          ? {
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": window.location.origin,
              "X-Title": "DERZEN Hospitality OS",
            }
          : { Authorization: `Bearer ${apiKey}` },
      });
    }
    window.clearTimeout(to);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: { id?: string }[]; models?: { name?: string; supportedGenerationMethods?: string[] }[] };
    if (id === "gemini") {
      return (json.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean)
        .sort()
        .reverse(); // newest first
    }
    const ids = (json.data ?? []).map((m) => m.id ?? "").filter(Boolean);
    return id === "openrouter" ? sortByFamily(ids) : ids.sort();
  } finally {
    window.clearTimeout(to);
  }
}

// ── chat completions per provider ─────────────────────────────────────────
async function chatGroq(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty completion");
  return text;
}

async function chatOpenRouter(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "DERZEN Hospitality OS",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty completion");
  return text;
}

async function chatGemini(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
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
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty completion");
  return text;
}

const CHAT: Record<AiProviderId, (cfg: ProviderConfig, s: string, u: string, m: number) => Promise<string>> = {
  groq: chatGroq,
  openrouter: chatOpenRouter,
  gemini: chatGemini,
};

export interface AiResult { text: string; provider: AiProviderId; model: string; ms: number; chain: string[]; }

/**
 * Server-side routing through the ai-proxy Edge Function. The direct-from-
 * browser path below is kept only for local development against a build with
 * no backend; it puts provider keys in localStorage and must not be used in
 * production. `isAiConfigured` reports which path is live.
 */
async function aiChatViaProxy(system: string, user: string, maxTokens: number): Promise<AiResult> {
  const t0 = performance.now();
  const { data, error } = await supabase().functions.invoke("ai-proxy", {
    body: { system, user, maxTokens },
  });
  if (error) throw new Error(`AI gateway unavailable: ${error.message}`);
  const r = data as { text?: string; provider?: AiProviderId; model?: string; chain?: string[]; error?: string };
  if (r.error || !r.text) throw new Error(r.error ?? "The AI gateway returned nothing.");
  return {
    text: r.text, provider: r.provider ?? "groq", model: r.model ?? "server-selected",
    ms: Math.round(performance.now() - t0), chain: r.chain ?? [],
  };
}

/**
 * Route a prompt down the chain: Groq → OpenRouter → Gemini.
 * Throws only if every configured provider fails; the error names the chain.
 */
export async function aiChat(system: string, user: string, opts?: { maxTokens?: number }): Promise<AiResult> {
  // Preferred path: the browser sends a prompt and a JWT, the Edge Function
  // holds the keys. Nothing billable is ever in this bundle or in any
  // operator's localStorage.
  if (isServerAuthConfigured()) return aiChatViaProxy(system, user, opts?.maxTokens ?? 600);
  const state = loadProviders();
  const maxTokens = opts?.maxTokens ?? 600;
  const tried: string[] = [];
  let lastErr: unknown = null;
  for (const { id } of CHAIN) {
    const cfg = state[id];
    if (!cfg.enabled || !cfg.apiKey.trim() || !cfg.model) {
      tried.push(`${id}: skipped (${!cfg.apiKey.trim() ? "no key" : !cfg.model ? "no model" : "disabled"})`);
      continue;
    }
    const t0 = performance.now();
    try {
      const text = await CHAT[id](cfg, system, user, maxTokens);
      return { text, provider: id, model: cfg.model, ms: Math.round(performance.now() - t0), chain: tried };
    } catch (e) {
      lastErr = e;
      tried.push(`${id}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }
  throw new Error(`All AI providers unavailable — ${tried.join(" · ") || "no providers configured"}. ${lastErr instanceof Error ? lastErr.message : ""}`);
}

/** Small ping used by the dev console's Test button. */
export async function testProvider(id: AiProviderId, apiKey: string, model: string): Promise<{ ok: boolean; ms: number; reply?: string; error?: string }> {
  const cfg: ProviderConfig = { apiKey, model, enabled: true };
  const t0 = performance.now();
  try {
    const reply = await CHAT[id](cfg, "Reply with the single word: pong", "ping", 8);
    return { ok: true, ms: Math.round(performance.now() - t0), reply };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), error: e instanceof Error ? e.message : String(e) };
  }
}

export const maskKey = (k: string): string => (k.length <= 8 ? "•".repeat(k.length) : `${k.slice(0, 5)}…${k.slice(-4)}`);
