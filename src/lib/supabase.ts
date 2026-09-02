// ── Supabase client ────────────────────────────────────────────────────────
// The app is a static bundle on Hostinger. There is no server of our own, so
// every security decision has to be enforced by something that is not the
// browser. Supabase is that something: Postgres row-level security decides
// what a JWT can read, and Edge Functions hold the secrets the browser must
// never see.
//
// Only the anon key belongs here. It is designed to be public: on its own it
// grants nothing, because every table is RLS-denied by default. The service
// role key must NEVER appear in this repo or in any VITE_ variable, because
// anything prefixed VITE_ is compiled into the bundle and served to the world.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** True when this build was given a backend to talk to. */
export const isServerAuthConfigured = (): boolean =>
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isServerAuthConfigured()) {
    console.warn("Supabase is not configured for this build. Returning a mock proxy.");
    const noOp = {
      select: () => noOp,
      insert: () => noOp,
      update: () => noOp,
      delete: () => noOp,
      eq: () => noOp,
      in: () => noOp,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      order: () => noOp,
      then: (res: any) => res({ data: [], error: null })
    };
    if (!client) {
      client = new Proxy({} as any, {
        get: (target, prop) => {
          if (prop === 'auth') {
            return {
              getUser: async () => ({ data: { user: null }, error: null }),
              signOut: async () => ({ error: null }),
              onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
              getSession: async () => ({ data: { session: null }, error: null })
            };
          }
          if (prop === 'functions') {
            return { invoke: async () => ({ data: null, error: null }) };
          }
          if (prop === 'rpc') {
            return async () => ({ data: null, error: null });
          }
          if (prop === 'from') {
            return () => noOp;
          }
          return () => ({});
        }
      });
    }
    return client as SupabaseClient;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Sessions are refreshed by the SDK and stored under its own key.
        // Nothing about the session is trusted by the client for authorisation:
        // the JWT is only useful because Postgres validates it on every query.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "derzen.sb.auth",
      },
    });
  }
  return client as SupabaseClient;
}

/** Base URL for Edge Functions, used by the AI proxy. */
export const functionsUrl = (name: string): string =>
  `${SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co")}/${name}`;
