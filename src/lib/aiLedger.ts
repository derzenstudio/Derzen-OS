// ── AI ledger reads ──────────────────────────────────────────────────────
// Every AI number the developer console shows comes from here, and here only
// reads Postgres. ai_token_usage is written by ai-proxy on the service role
// and, per its RLS policy, is readable only by a platform_admins seat - so an
// operator sees the whole platform and a tenant sees none of it.
//
// The aggregation runs in the browser deliberately. These tables are small,
// and reporting the row count a total was computed from - and saying so when
// the read was capped - is what makes the figure auditable rather than a
// number to be taken on trust.

import { supabase } from "./supabase";

export interface LedgerRow {
  id: number;
  scope: string;
  tenant_id: string | null;
  user_id: string | null;
  tier: string;
  surface: string | null;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number;
  ok: boolean;
  created_at: string;
}

export interface QuotaRow {
  scope: string;
  plan: string;
  monthly_tokens: number;
  updated_at: string | null;
}

export interface TenantRow {
  id: string;
  workspace: string;
  subdomain: string | null;
  plan: string;
  suspended: boolean;
  created_at: string;
}

export interface ScopeTotal {
  scope: string;
  calls: number;
  tokens: number;
  prompt: number;
  completion: number;
  p50: number;
  lastAt: string;
  tiers: string[];
  surfaces: string[];
}

export interface ProviderTotal {
  key: string;
  provider: string;
  model: string;
  calls: number;
  tokens: number;
  p50: number;
  lastAt: string;
}

export interface AnonPressure {
  available: boolean;
  reason?: string;
  windowMinutes: number;
  inWindow: number;
  inDay: number;
  ips: number;
}

export interface LedgerSnapshot {
  available: boolean;
  /** Why there is nothing to show. Never dressed up as a zero. */
  reason?: string;
  readAt: number;
  monthStart: string;
  /** Exact count for the month, counted by Postgres, not by the sample. */
  monthCalls: number;
  /** Newest first, capped at the requested limit. */
  rows: LedgerRow[];
  capped: boolean;
  scopes: ScopeTotal[];
  providers: ProviderTotal[];
  totals: { calls: number; tokens: number; prompt: number; completion: number; p50: number };
  quotas: QuotaRow[];
  anon: AnonPressure;
}

const monthStartIso = (): string => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString();
};

// PostgREST reports a missing table as one of these. It is the difference
// between "nothing has happened yet" and "nothing is being recorded", and the
// console has to say which.
const tableMissing = (code?: string): boolean =>
  code === "42P01" || code === "PGRST205" || code === "PGRST204";

const describe = (code: string | undefined, message: string): string =>
  tableMissing(code)
    ? "this table is not installed on the project, so nothing is being recorded"
    : (code ?? "error") + " - " + message;

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const uniq = (xs: (string | null)[]): string[] =>
  [...new Set(xs.filter((x): x is string => !!x))].sort();

/**
 * Untrusted traffic actually seen by the limiter. ai-proxy writes one row per
 * accepted call under a hashed per-IP bucket and one under "global", so the
 * global count is the real number of demo calls and the distinct buckets are
 * the real number of callers - with no address stored anywhere.
 */
async function readAnon(windowMinutes: number): Promise<AnonPressure> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data, error } = await supabase()
    .from("ai_anon_usage")
    .select("bucket, created_at")
    .gte("created_at", dayAgo)
    .limit(5000);
  if (error) {
    return { available: false, reason: describe(error.code, error.message), windowMinutes, inWindow: 0, inDay: 0, ips: 0 };
  }
  const rows = (data ?? []) as { bucket: string; created_at: string }[];
  const global = rows.filter((r) => r.bucket === "global");
  return {
    available: true,
    windowMinutes,
    inWindow: global.filter((r) => r.created_at >= since).length,
    inDay: global.length,
    ips: new Set(rows.filter((r) => r.bucket !== "global").map((r) => r.bucket)).size,
  };
}

export async function loadQuotas(): Promise<{ rows: QuotaRow[]; error: string | null }> {
  const { data, error } = await supabase()
    .from("ai_token_quota")
    .select("scope, plan, monthly_tokens, updated_at")
    .order("scope");
  if (error) return { rows: [], error: describe(error.code, error.message) };
  return { rows: (data ?? []) as QuotaRow[], error: null };
}

/** Set one workspace allowance. Writing is gated by RLS to a platform seat. */
export async function saveQuota(scope: string, plan: string, monthlyTokens: number): Promise<string | null> {
  const { error } = await supabase()
    .from("ai_token_quota")
    .upsert(
      { scope, plan, monthly_tokens: Math.max(0, Math.round(monthlyTokens)), updated_at: new Date().toISOString() },
      { onConflict: "scope" },
    );
  return error ? describe(error.code, error.message) : null;
}

/** The workspaces that exist on the server, as opposed to the ones seeded in
 *  this browser. A platform seat sees them all; anybody else sees their own. */
export async function loadTenantRows(): Promise<{ rows: TenantRow[]; error: string | null }> {
  const { data, error } = await supabase()
    .from("tenants")
    .select("id, workspace, subdomain, plan, suspended, created_at")
    .order("created_at", { ascending: false });
  if (error) return { rows: [], error: describe(error.code, error.message) };
  return { rows: (data ?? []) as TenantRow[], error: null };
}

export async function loadLedger(opts?: { limit?: number; anonWindowMinutes?: number }): Promise<LedgerSnapshot> {
  const limit = opts?.limit ?? 600;
  const monthStart = monthStartIso();
  const readAt = Date.now();
  const anon = await readAnon(opts?.anonWindowMinutes ?? 10);
  const quotaRead = await loadQuotas();

  const { data, error, count } = await supabase()
    .from("ai_token_usage")
    .select(
      "id, scope, tenant_id, user_id, tier, surface, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, ok, created_at",
      { count: "exact" },
    )
    .gte("created_at", monthStart)
    .order("id", { ascending: false })
    .limit(limit);

  const base = {
    readAt,
    monthStart,
    rows: [] as LedgerRow[],
    capped: false,
    scopes: [] as ScopeTotal[],
    providers: [] as ProviderTotal[],
    totals: { calls: 0, tokens: 0, prompt: 0, completion: 0, p50: 0 },
    quotas: quotaRead.rows,
    anon,
  };

  if (error) {
    return { ...base, available: false, reason: describe(error.code, error.message), monthCalls: 0 };
  }

  const rows = (data ?? []) as LedgerRow[];
  const byScope = new Map<string, ScopeTotal & { lat: number[] }>();
  const byModel = new Map<string, ProviderTotal & { lat: number[] }>();

  for (const r of rows) {
    const s = byScope.get(r.scope) ?? {
      scope: r.scope, calls: 0, tokens: 0, prompt: 0, completion: 0, p50: 0,
      lastAt: r.created_at, tiers: [], surfaces: [], lat: [],
    };
    s.calls += 1;
    s.tokens += Number(r.total_tokens) || 0;
    s.prompt += Number(r.prompt_tokens) || 0;
    s.completion += Number(r.completion_tokens) || 0;
    s.lat.push(Number(r.latency_ms) || 0);
    if (r.created_at > s.lastAt) s.lastAt = r.created_at;
    s.tiers = uniq([...s.tiers, r.tier]);
    s.surfaces = uniq([...s.surfaces, r.surface]);
    byScope.set(r.scope, s);

    const key = r.provider + "/" + r.model;
    const m = byModel.get(key) ?? {
      key, provider: r.provider, model: r.model, calls: 0, tokens: 0, p50: 0,
      lastAt: r.created_at, lat: [],
    };
    m.calls += 1;
    m.tokens += Number(r.total_tokens) || 0;
    m.lat.push(Number(r.latency_ms) || 0);
    if (r.created_at > m.lastAt) m.lastAt = r.created_at;
    byModel.set(key, m);
  }

  const scopes = [...byScope.values()]
    .map(({ lat, ...s }) => ({ ...s, p50: median(lat) }))
    .sort((a, b) => b.tokens - a.tokens);
  const providers = [...byModel.values()]
    .map(({ lat, ...m }) => ({ ...m, p50: median(lat) }))
    .sort((a, b) => b.calls - a.calls);

  return {
    available: true,
    readAt,
    monthStart,
    monthCalls: count ?? rows.length,
    rows,
    capped: rows.length >= limit,
    scopes,
    providers,
    totals: {
      calls: rows.length,
      tokens: rows.reduce((a, r) => a + (Number(r.total_tokens) || 0), 0),
      prompt: rows.reduce((a, r) => a + (Number(r.prompt_tokens) || 0), 0),
      completion: rows.reduce((a, r) => a + (Number(r.completion_tokens) || 0), 0),
      p50: median(rows.map((r) => Number(r.latency_ms) || 0)),
    },
    quotas: quotaRead.rows,
    anon,
  };
}
