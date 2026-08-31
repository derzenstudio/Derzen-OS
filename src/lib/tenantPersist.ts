// Per-tenant durable storage. A registered customer's workspace — every
// setting and every change made after sign-in — is serialized to a private,
// tenant-scoped key and restored on the next sign-in. Demo tenants are never
// persisted (they re-seed on every visit) so their placeholder data can't leak
// into a real workspace.
//
// Keys are namespaced by tenant id, so two workspaces on the same browser can
// never read or overwrite each other.

const NS = "derzen.tenant";
const VERSION = 1;

/** The tenant-scoped store fields that are saved and restored. */
export const TENANT_SLICE_KEYS = [
  // core records
  "properties", "conversations", "reservations", "tasks", "reviews", "quotes",
  "expenses", "issues", "msgQueue", "actionItems", "sync", "conflicts",
  "webhooks", "guidebooks", "chat", "collections",
  // site & content
  "website", "siteChrome", "calendarOverrides",
  // automations & messaging
  "autopilot", "msgConnections",
  // branding & assets
  "brand", "savedAssets", "propertyPhotos", "invoiceTemplate", "emailTemplate",
  // workspace prefs & progress
  "tenantFonts", "onboardSteps", "golive", "goliveActions",
  "creditsUsed", "displayCurrency", "widgetStyle", "workspacePrefs",
] as const;

export type TenantSliceKey = (typeof TENANT_SLICE_KEYS)[number];
export type TenantSlice = Partial<Record<TenantSliceKey, unknown>>;

const keyFor = (tenantId: string) => `${NS}.${tenantId}.v${VERSION}`;

export function saveTenantState(tenantId: string, slice: TenantSlice): void {
  try {
    localStorage.setItem(keyFor(tenantId), JSON.stringify({ savedAt: Date.now(), slice }));
  } catch {
    /* quota exceeded or private mode — changes stay in memory for the session */
  }
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

export function clearTenantState(tenantId: string): void {
  try {
    localStorage.removeItem(keyFor(tenantId));
  } catch {
    /* ignore */
  }
}

/** Pick only the persistable keys out of a full store-state object. */
export function pickTenantSlice<S extends Record<string, unknown>>(state: S): TenantSlice {
  const out: Record<string, unknown> = {};
  for (const k of TENANT_SLICE_KEYS) {
    if (k in state) out[k] = state[k];
  }
  return out as TenantSlice;
}
