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

export function saveTenantState(tenantId: string, slice: TenantSlice): void {
  const ts = Date.now();
  try {
    localStorage.setItem(keyFor(tenantId), JSON.stringify({ savedAt: ts, slice }));
  } catch {
    /* quota exceeded or private mode */
  }
  // Fire and forget server sync
  void (async () => {
    try {
      await supabase().from("tenant_states").upsert(
        { tenant_id: tenantId, state: { savedAt: ts, slice }, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id" }
      );
    } catch { /* network fail */ }
  })();
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
  try {
    const { data, error } = await supabase().from("tenant_states").select("state").eq("tenant_id", tenantId).maybeSingle();
    if (error || !data?.state) return null;
    const st = data.state as { savedAt?: number; slice?: TenantSlice };
    if (!st.slice || !st.savedAt) return null;
    
    // update local cache
    try {
      localStorage.setItem(keyFor(tenantId), JSON.stringify(st));
    } catch { /* ignore */ }
    
    return { slice: st.slice, savedAt: st.savedAt };
  } catch {
    return null;
  }
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
