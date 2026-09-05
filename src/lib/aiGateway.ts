// ── AI gateway ───────────────────────────────────────────────────────────
// One path, and it is the server one. Every AI feature in the product -
// inbox drafts, review replies, the concierge sandbox, the embedded guest
// chatbot - calls aiChat(), which posts to the ai-proxy Edge Function. That
// function holds the provider keys and walks the free chain
// Groq -> OpenRouter -> Gemini, asking each provider at runtime which models
// it currently serves. Anthropic joins the chain only when the server-side
// ENABLE_ANTHROPIC toggle is on; until then its key is never read, not even
// to list models.
//
// The second, direct-from-browser chain that used to live here is gone. It
// kept billable API keys in localStorage, it pointed at a provider order the
// deployment does not use, and it printed "requests & latency are real,
// nothing is mocked" beneath a screen that could not reflect production. The
// developer console reads the real deployment through the status op instead.

import { supabase, isServerAuthConfigured } from "./supabase";
import { SURFACE } from "./surface";

export type AiProviderId = "groq" | "openrouter" | "gemini" | "anthropic";

export interface ProviderMeta {
  name: string;
  role: string;
  /** Edge Function secret holding the key. Never behind a VITE_ prefix. */
  secret: string;
  modelSecret: string;
  docs: string;
}

export const PROVIDER_META: Record<AiProviderId, ProviderMeta> = {
  groq: { name: "Groq", role: "Primary", secret: "GROQ_API_KEY", modelSecret: "GROQ_MODEL", docs: "console.groq.com/keys" },
  openrouter: { name: "OpenRouter", role: "Fallback 1", secret: "OPENROUTER_API_KEY", modelSecret: "OPENROUTER_MODEL", docs: "openrouter.ai/settings/keys" },
  gemini: { name: "Gemini", role: "Fallback 2", secret: "GEMINI_API_KEY", modelSecret: "GEMINI_MODEL", docs: "aistudio.google.com/app/apikey" },
  anthropic: { name: "Anthropic", role: "Held back", secret: "ANTHROPIC_API_KEY", modelSecret: "ANTHROPIC_MODEL", docs: "console.anthropic.com/settings/keys" },
};

/** Order shown before the deployment answers for itself. The authoritative
 *  chain is whatever fetchGatewayStatus() reports, because that is live. */
export const CHAIN: AiProviderId[] = ["groq", "openrouter", "gemini"];

/** The proxy is the only path, so this is exactly "is a Supabase project
 *  compiled into this bundle". */
export const isAiConfigured = (): boolean => isServerAuthConfigured();

/** Said out loud on the platform screen. There is one answer now. */
export const aiKeyLocation = (): "server" => "server";

// ── results ──────────────────────────────────────────────────────────────
export interface AiUsage { prompt: number; completion: number; total: number }
export interface AiTokens { scope: string; plan: string; used: number; quota: number }

export interface AiResult {
  text: string;
  provider: AiProviderId | string;
  model: string;
  ms: number;
  chain: string[];
  tier?: "trusted" | "untrusted";
  limiter?: "enforced" | "not-installed" | "n/a";
  ledger?: "enforced" | "not-installed";
  usage?: AiUsage;
  tokens?: AiTokens;
}

export interface AiOpts {
  maxTokens?: number;
  /** Workspace to bill. The server ignores it unless the caller is a member
   *  of that workspace; a member of exactly one is billed to it regardless. */
  scope?: string;
}

// The accounting the proxy reported on the last completion, so a screen can
// show real spend without spending again to find out.
let lastTokens: AiTokens | null = null;
export const lastAiTokens = (): AiTokens | null => lastTokens;

interface ProxyError { error?: string }

async function invokeProxy<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke("ai-proxy", { body });
  if (error) {
    // supabase-js collapses every non-2xx into "Edge Function returned a
    // non-2xx status code" and throws the body away. That is how a plain
    // {"error":"unauthenticated"} 401 read as a generic gateway outage for
    // as long as it did. Dig the real message back out of the response.
    let detail = "AI gateway unavailable: " + error.message;
    const res = (error as { context?: Response }).context;
    if (res && typeof res.text === "function") {
      try {
        const parsed = JSON.parse(await res.text()) as ProxyError;
        if (parsed?.error) detail = parsed.error;
      } catch {
        /* body was not JSON - keep the generic message */
      }
    }
    throw new Error(detail);
  }
  return data as T;
}

// ── failure reporting ────────────────────────────────────────────────────
// Every AI call site catches and renders a fallback state so the product
// never dead-ends. That was also hiding real outages, so the gateway
// announces its own failures through this sink - App.tsx wires it to a
// toast - and a fallback is always visibly a fallback.
type AiFailureSink = (message: string) => void;
let failureSink: AiFailureSink | null = null;

export function onAiFailure(fn: AiFailureSink | null): void {
  failureSink = fn;
}

export function reportAiFailure(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  try {
    failureSink?.(message);
  } catch {
    /* reporting must never break the call site that is already failing */
  }
}

interface ProxyCompletion extends ProxyError {
  text?: string;
  provider?: string;
  model?: string;
  ms?: number;
  chain?: string[];
  tier?: "trusted" | "untrusted";
  limiter?: "enforced" | "not-installed" | "n/a";
  ledger?: "enforced" | "not-installed";
  usage?: AiUsage;
  tokens?: AiTokens;
}

async function aiChatRun(system: string, user: string, opts?: AiOpts): Promise<AiResult> {
  if (!isServerAuthConfigured()) {
    throw new Error("This build has no Supabase project compiled in, so there is no AI gateway to call.");
  }
  const t0 = performance.now();
  const r = await invokeProxy<ProxyCompletion>({
    system,
    user,
    maxTokens: opts?.maxTokens ?? 600,
    scope: opts?.scope,
    // Recorded on the ledger row, so the console can tell an app draft from
    // a console probe instead of guessing which surface spent the tokens.
    surface: SURFACE,
  });
  // The proxy answers with real model text or with an error - never filler.
  // Anything without text is a failure and is raised as one, so no call site
  // can mistake an outage for a completion.
  if (r.error || !r.text) throw new Error(r.error ?? "The AI gateway returned nothing.");
  if (r.tokens) lastTokens = r.tokens;
  return {
    text: r.text,
    provider: r.provider ?? "unknown",
    model: r.model ?? "server-selected",
    ms: r.ms ?? Math.round(performance.now() - t0),
    chain: r.chain ?? [],
    tier: r.tier,
    limiter: r.limiter,
    ledger: r.ledger,
    usage: r.usage,
    tokens: r.tokens,
  };
}

/** Public entry point. Reports every failure before rethrowing it. */
export async function aiChat(system: string, user: string, opts?: AiOpts): Promise<AiResult> {
  try {
    return await aiChatRun(system, user, opts);
  } catch (err) {
    reportAiFailure(err);
    throw err;
  }
}

// ── gateway status ───────────────────────────────────────────────────────
export type ProviderState =
  | "ready" | "no-key" | "held-back" | "no-free-models"
  | "key-rejected" | "throttled" | "list-failed";

export interface GatewayProvider {
  provider: AiProviderId;
  secret: string;
  override: string | null;
  inChain: boolean;
  configured: boolean;
  state: ProviderState;
  status?: number;
  models: number;
  candidates: string[];
  ms: number;
}

export interface GatewayStatus {
  anthropicEnabled: boolean;
  chain: AiProviderId[];
  caps: Record<"trusted" | "untrusted", { maxTokens: number; promptChars: number }>;
  maxCandidates: number;
  modelTtlMs: number;
  limits: {
    anonPerWindow: number;
    anonWindowMinutes: number;
    anonPerDay: number;
    anonGlobalPerDay: number;
    trustedDailyTokens: number;
  };
  planTokens: Record<string, number>;
  providers: GatewayProvider[];
}

/**
 * Ask the deployed function what it can actually reach: which secrets are
 * present, how many free models each provider is serving right now, and the
 * candidates it would try in order. No completion is generated, so this
 * costs no tokens and writes no ledger row. Trusted callers only - a
 * visitor must not be able to enumerate which keys are live.
 */
export async function fetchGatewayStatus(): Promise<GatewayStatus> {
  if (!isServerAuthConfigured()) throw new Error("No Supabase project is compiled into this build.");
  const r = await invokeProxy<GatewayStatus & ProxyError>({ op: "status" });
  if (r.error) throw new Error(r.error);
  return r;
}
