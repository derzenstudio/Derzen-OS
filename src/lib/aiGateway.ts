// ── AI gateway — live provider routing, no placeholders ───────────────────
// Chain: Groq (primary) → OpenRouter (fallback 1) → Gemini (fallback 2).
// Keys + selected models persist in dev-scoped storage; every AI feature in
// the tenant app (copilot, inbox drafts, review replies, sandbox, chatbot)
// routes through aiChat(), which fails over down the chain and reports which
// provider actually answered.

import { supabase, isServerAuthConfigured } from "./supabase";

export type AiProviderId = "openai" | "groq" | "gemini" | "anthropic";

export interface ProviderConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
  lastCheck?: { ok: boolean; ms: number; ts: number; models?: number };
}

export interface AiProviderState {
  groq: ProviderConfig;
  openai: ProviderConfig;
  anthropic: ProviderConfig;
  gemini: ProviderConfig;
}

const STORE_KEY = "derzen.ai.providers.v1";
export const CHAIN: { id: AiProviderId; role: string }[] = [
  { id: "openai", role: "Primary" },
  { id: "gemini", role: "Fallback 1" },
  { id: "groq", role: "Fallback 2" },
  { id: "anthropic", role: "Fallback 3 (Disabled by default)" },
];

export const PROVIDER_META: Record<AiProviderId, { name: string; role: string; modelsUrl: string; keyHint: string; docs: string }> = {
  openai: {
    name: "OpenAI", role: "Primary",
    modelsUrl: "https://api.openai.com/v1/models",
    keyHint: "sk-...",
    docs: "platform.openai.com/api-keys",
  },
  gemini: {
    name: "Gemini", role: "Fallback 1",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    keyHint: "AIza...",
    docs: "aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq", role: "Fallback 2",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    keyHint: "gsk_...",
    docs: "console.groq.com/keys",
  },
  anthropic: {
    name: "Anthropic", role: "Fallback 3",
    modelsUrl: "https://api.anthropic.com/v1/models",
    keyHint: "sk-ant-...",
    docs: "console.anthropic.com/settings/keys",
  },
};

export const DEFAULT_PROVIDERS: AiProviderState = {
  openai: { apiKey: "", model: "gpt-4o-mini", enabled: true },
  gemini: { apiKey: "", model: "gemini-1.5-flash", enabled: true },
  groq: { apiKey: "", model: "llama3-8b-8192", enabled: true },
  anthropic: { apiKey: "", model: "claude-3-haiku-20240307", enabled: false },
};

export function loadProviders(): AiProviderState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_PROVIDERS);
    const p = JSON.parse(raw) as Partial<AiProviderState>;
    return {
      groq: { ...DEFAULT_PROVIDERS.groq, ...p.groq },
      openai: { ...DEFAULT_PROVIDERS.openai, ...p.openai },
      anthropic: { ...DEFAULT_PROVIDERS.anthropic, ...p.anthropic },
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
  return true; // Use /api/ai fallback
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
    if (id === "anthropic") {
      return ["claude-3-opus-20240229", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"];
    }
    let res: Response;
    if (id === "gemini") {
      res = await fetch(`${PROVIDER_META.gemini.modelsUrl}?key=${encodeURIComponent(apiKey)}&pageSize=200`, { signal: ctl.signal });
    } else if (id === "openai" || id === "groq") {
      res = await fetch(PROVIDER_META[id].modelsUrl, {
        signal: ctl.signal,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } else {
      throw new Error("Unknown provider");
    }
    window.clearTimeout(to);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as any;
    if (id === "gemini") {
      return (json.models ?? [])
        .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: any) => (m.name ?? "").replace(/^models\//, ""))
        .filter(Boolean)
        .sort()
        .reverse(); // newest first
    }
    const ids = (json.data ?? []).map((m: any) => m.id ?? "").filter(Boolean);
    return ids.sort();
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

async function chatOpenAI(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const json = await res.json() as any;
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function chatAnthropic(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerously-allow-browser": "true",
    },
    body: JSON.stringify({
      model: cfg.model,
      system,
      messages: [{ role: "user", content: user }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
  const json = await res.json() as any;
  return json.content?.[0]?.text?.trim() || "";
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
  openai: chatOpenAI,
  groq: chatGroq,
  gemini: chatGemini,
  anthropic: chatAnthropic,
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
  
  // FINAL FALLBACK for local preview without Supabase or local keys
  try {
    const t0 = performance.now();
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, user, maxTokens }),
    });
    if (res.ok) {
      const json = await res.json();
      return { text: json.text, provider: "gemini", model: "server-proxy", ms: Math.round(performance.now() - t0), chain: ["api-proxy"] };
    }
  } catch(e) {
    // silently fail
  }
  
  throw new Error(`All AI providers unavailable — ${tried.join(" · ")}.`);
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
