import { supabase } from "./supabase";

const NS = "derzen.tenant";
const VERSION = 1;

export const TENANT_SLICE_KEYS = [
  "properties", "guests", "conversations", "reservations", "tasks", "reviews", "quotes",
  "expenses", "issues", "msgQueue", "actionItems", "sync", "conflicts",
  "webhooks", "guidebooks", "chat", "collections",
  "website", "siteChrome", "calendarOverrides",
  "autopilot", "msgConnections",
  "brand", "savedAssets", "propertyPhotos", "invoiceTemplate", "emailTemplate",
  "tenantFonts", "onboardSteps", "golive", "goliveActions",
  "creditsUsed", "displayCurrency", "widgetStyle", "workspacePrefs",
] as const;

export type TenantSliceKey = (typeof TENANT_SLICE_KEYS)[number];
export type TenantSlice = Partial<Record<TenantSliceKey, unknown>>;

const keyFor = (tenantId: string) => `${NS}.${tenantId}.v${VERSION}`;

// tenant_states.tenant_id is a uuid with a foreign key onto tenants(id). The
// seeded demo workspaces use slugs ("t-sanggraha") and have no row in tenants
// at all, so a server write for one of them is not a flaky network call to be
// retried - it is a 22P02 cast error that can never succeed. Demo workspaces
// stay local-only and are labelled as such, which is what ends the silent
// half-saved state the old code produced.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isServerBackedTenant = (tenantId: string): boolean => UUID.test(tenantId);

// Every write used to sit inside `catch {}`. supabase-js *returns* its errors
// rather than throwing them, so that catch never ran: an upsert rejected by
// RLS or by a type cast looked exactly like a success and the workspace
// appeared saved while the table stayed empty. Failures now go through this
// sink so a lost write is visible instead of assumed.
type PersistSink = (message: string) => void;
let sink: PersistSink | null = null;
export function onPersistFailure(fn: PersistSink | null): void {
  sink = fn;
}
function report(what: string, detail: string): void {
  const msg = `${what} failed: ${detail}`;
  console.error("[tenantPersist]", msg);
  if (sink) sink(msg);
}

export function saveTenantState(tenantId: string, slice: TenantSlice): void {
  const ts = Date.now();
  const payload = { savedAt: ts, slice };
  try {
    localStorage.setItem(keyFor(tenantId), JSON.stringify(payload));
  } catch (e) {
    report("local save", e instanceof Error ? e.message : String(e));
  }
  if (!isServerBackedTenant(tenantId)) return;
  void pushTenantState(tenantId, payload);
}

async function pushTenantState(tenantId: string, payload: { savedAt: number; slice: TenantSlice }): Promise<boolean> {
  try {
    const { error } = await supabase()
      .from("tenant_states")
      .upsert(
        { tenant_id: tenantId, state: payload, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id" },
      );
    if (error) {
      report("server save", `${error.code ?? "?"} ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    report("server save", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/** Awaitable write, for the paths that must know whether the server took it. */
export async function saveTenantStateNow(tenantId: string, slice: TenantSlice): Promise<boolean> {
  const payload = { savedAt: Date.now(), slice };
  try {
    localStorage.setItem(keyFor(tenantId), JSON.stringify(payload));
  } catch { /* quota or private mode - the server copy is the durable one */ }
  if (!isServerBackedTenant(tenantId)) return false;
  return await pushTenantState(tenantId, payload);
}

export function loadTenantState(tenantId: string): TenantSlice | null {
  try {
    const raw = localStorage.getItem(keyFor(tenantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; slice?: TenantSlice };
    return parsed.slice ?? null;
  } catch {
    return null;
  }
}

export async function pullTenantState(tenantId: string): Promise<{ slice: TenantSlice; savedAt: number } | null> {
  if (!isServerBackedTenant(tenantId)) return null;
  try {
    const { data, error } = await supabase().from("tenant_states").select("state").eq("tenant_id", tenantId).maybeSingle();
    if (error) {
      report("server load", `${error.code ?? "?"} ${error.message}`);
      return null;
    }
    if (!data?.state) return null;
    const st = data.state as { savedAt?: number; slice?: TenantSlice };
    if (!st.slice || !st.savedAt) return null;
    try {
      localStorage.setItem(keyFor(tenantId), JSON.stringify(st));
    } catch { /* ignore */ }
    return { slice: st.slice, savedAt: st.savedAt };
  } catch (e) {
    report("server load", e instanceof Error ? e.message : String(e));
    return null;
  }
}

/**
 * Live tail on one workspace row. This is the app side of the two-way sync:
 * a change the developer console writes for this tenant arrives here without
 * a reload, and a change the tenant makes arrives in the console the same way.
 * Returns an unsubscribe function.
 */
export function subscribeTenantState(
  tenantId: string,
  onRemote: (payload: { slice: TenantSlice; savedAt: number }) => void,
): () => void {
  if (!isServerBackedTenant(tenantId)) return () => {};
  const ch = supabase()
    .channel(`tenant_states:${tenantId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tenant_states", filter: `tenant_id=eq.${tenantId}` },
      (msg: { new?: { state?: unknown } }) => {
        const st = msg.new?.state as { savedAt?: number; slice?: TenantSlice } | undefined;
        if (!st?.slice || !st.savedAt) return;
        try {
          localStorage.setItem(keyFor(tenantId), JSON.stringify(st));
        } catch { /* ignore */ }
        onRemote({ slice: st.slice, savedAt: st.savedAt });
      },
    )
    .subscribe();
  return () => {
    void supabase().removeChannel(ch);
  };
}

export function clearTenantState(tenantId: string): void {
  try {
    localStorage.removeItem(keyFor(tenantId));
  } catch {
    /* ignore */
  }
}

export function pickTenantSlice<S extends Record<string, unknown>>(state: S): TenantSlice {
  const out: Record<string, unknown> = {};
  for (const k of TENANT_SLICE_KEYS) {
    if (k in state) out[k] = state[k];
  }
  return out as TenantSlice;
}

// ── developer console state ───────────────────────────────────
// One row, id 1, readable and writable only by a platform_admins seat. It is
// the counterpart to tenant_states: what the console changes about itself
// survives a logout, and what it changes about a tenant lands in that
// tenant's row and is pushed to the tenant's open tab by realtime.
const PLATFORM_KEY = "derzen.platform.v1";

export async function savePlatformState(state: Record<string, unknown>): Promise<boolean> {
  const payload = { savedAt: Date.now(), state };
  try {
    localStorage.setItem(PLATFORM_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
  try {
    const { error } = await supabase()
      .from("platform_state")
      .upsert({ id: 1, state: payload, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) {
      report("console save", `${error.code ?? "?"} ${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    report("console save", e instanceof Error ? e.message : String(e));
    return false;
  }
}

export async function pullPlatformState(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase().from("platform_state").select("state").eq("id", 1).maybeSingle();
    if (error) {
      report("console load", `${error.code ?? "?"} ${error.message}`);
      return null;
    }
    const st = data?.state as { state?: Record<string, unknown> } | undefined;
    return st?.state ?? null;
  } catch (e) {
    report("console load", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export function subscribePlatformState(onRemote: (state: Record<string, unknown>) => void): () => void {
  const ch = supabase()
    .channel("platform_state:1")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "platform_state" },
      (msg: { new?: { state?: unknown } }) => {
        const st = msg.new?.state as { state?: Record<string, unknown> } | undefined;
        if (st?.state) onRemote(st.state);
      },
    )
    .subscribe();
  return () => {
    void supabase().removeChannel(ch);
  };
}
