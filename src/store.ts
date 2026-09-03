import { create } from "zustand";
import type { Locale } from "./lib/i18n";
import { t as tr } from "./lib/i18n";
import { uid, addDays, dayKey, today, nightsBetween, parseKey, moneyRaw } from "./lib/format";
import type {
  AuditEntry, Block, BlockStyle, Collection, Conversation, Expense, Guidebook, IssueReport, MsgConnection, OnboardStep, Property,
  QueuedMessage, Quote, Reservation, Review, SavedAsset, SiteChrome, SitePage, SyncState, Task, Toast, WebsiteState, Message,
  WorkspacePrefs,
} from "./lib/types";
import { MSG_PLATFORMS } from "./lib/types";
import { DEFAULT_WIDGET_STYLE, type WidgetStyle } from "./lib/widgetTheme";
import { DEFAULT_BRAND, applyBrand, type BrandState } from "./lib/brand";
import { defaultBlockContent } from "./lib/blockContent";
import type { InvoiceTemplate, EmailTemplate } from "./lib/types";

// Flush by default so every block fills the full frame edge-to-edge.
// Text-heavy blocks add their own inner gutter inside BlockView; image,
// hero and banner blocks deliberately bleed to the canvas edges.
export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  width: "full", py: 0, px: 0, mt: 0, mb: 0, bg: "", color: "", scale: 1, align: "left", radius: 3,
};
import {
  ACTION_ITEMS, AUDIT, CONFLICTS, CONVERSATIONS, EXPENSES, GUIDEBOOKS, ISSUES, MEMBERS,
  MSG_QUEUE, ONBOARD_STEPS, PROPERTIES, QUOTES, RESERVATIONS, REVIEWS, SYNC, TASKS,
  WEBHOOKS, WEBSITE, WORKSPACE, channelDef, propertyById, FX_TO_EUR, COLLECTIONS, GUESTS,
  syncModulesFromSlice,
} from "./lib/data";
import { setDisplayCurrency, refreshFx, type CurrencyCode } from "./lib/fx";
import { compressImage, readLibrary, writeLibrary, QUOTA_BYTES, type PhotoEntry } from "./lib/photoStore";
import { saveTenantState, loadTenantState, pickTenantSlice, TENANT_SLICE_KEYS } from "./lib/tenantPersist";
import { verifyDevLogin, resetDevPasswordByEmail, type DevRole } from "./lib/devTeam";
import {
  signInPlatform, signInTenant, signUpTenant, requestPasswordReset, signOutServer,
  serverAuthReady,
} from "./lib/authServer";
import {
  AI_DEFAULTS, PLATFORM_INTEGRATIONS, TENANTS, hydrateTenantData, hydrateCustomerTenant,
  ensureRuntimeTenant, findCustomer, hashPassword, saveCustomer, listCustomers,
  type CustomerAccount, type PlatformIntegration, type TenantMeta,
} from "./lib/tenants";

// ── sessions & tenant-scoped boot ──────────────────────────────────────────
export type Session =
  | { kind: "tenant"; tenantId: string; impersonated?: boolean; exp?: number }
  | { kind: "developer"; devMemberId?: string; devEmail?: string; devRole?: DevRole; exp?: number };

// Tenant sessions expire after 12h, developer sessions after 4h. Expired
// sessions are dropped at boot with a visible notice — never silently renewed.
const TENANT_TTL = 12 * 3_600_000;
const DEV_TTL = 4 * 3_600_000;

const SESSION_KEY = "derzen.session";
function loadSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as Session | null;
    // Only tenant sessions are ever persisted, so only tenant sessions are ever
    // restored. A developer session found here is stale/adversarial — drop it and
    // clear the key so it can't linger on a tenant-facing origin.
    if (s?.kind === "developer") {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (s?.exp && Date.now() > s.exp) {
      localStorage.removeItem(SESSION_KEY);
      try { localStorage.setItem("derzen.sessionExpired", "1"); } catch { /* ignore */ }
      return null;
    }
    return s;
  } catch { return null; }
}
function saveSession(s: Session | null) {
  try {
    if (!s) { localStorage.removeItem(SESSION_KEY); return; }
    const stamped: Session = { ...s, exp: Date.now() + (s.kind === "developer" ? DEV_TTL : TENANT_TTL) };
    localStorage.setItem(SESSION_KEY, JSON.stringify(stamped));
  } catch { /* private mode */ }
}
const bootSession = loadSession();
// Is the booting session a registered customer (vs a seeded demo tenant)?
// Customers get the empty scaffold + their restored data — never demo placeholders.
let bootCustomer: CustomerAccount | null = null;
if (bootSession?.kind === "tenant" && bootSession.tenantId) {
  let meta = TENANTS.find((t) => t.id === bootSession.tenantId);
  bootCustomer = listCustomers().find((x) => x.tenantId === bootSession.tenantId) ?? null;
  // A registered customer's tenant is created at sign-up; re-inject it on boot
  // so their workspace name, currency and feature flags survive a reload.
  if (!meta && bootCustomer) meta = ensureRuntimeTenant(bootCustomer);
  if (bootCustomer) hydrateCustomerTenant(bootCustomer);
  else hydrateTenantData(bootSession.tenantId);
  if (meta) setDisplayCurrency(meta.currency);
}
export const flagsFor = (s: Session | null): Record<string, boolean> | null =>
  s?.kind === "tenant" ? { ...TENANTS.find((t) => t.id === s.tenantId)?.features } : null;

// ── hash router ────────────────────────────────────────────────────────────
export interface Route { locale: Locale; path: string[]; query: URLSearchParams; }

export function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [pathPart, queryPart] = h.split("?");
  const segs = (pathPart ?? "").split("/").filter(Boolean);
  const locale: Locale = segs[0] === "id" ? "id" : "en";
  return { locale, path: segs.slice(1), query: new URLSearchParams(queryPart ?? "") };
}

// ── store ──────────────────────────────────────────────────────────────────
export interface CellOverride {
  rate?: number; closed?: boolean; minStay?: number; cta?: boolean; ctd?: boolean;
  blockType?: "manual" | "owner" | "hold" | "maintenance";
  blockLabel?: string; blockNote?: string; blockPrice?: number;
  extraCharges?: { label: string; amount: number }[];
}
export interface PushItem { id: string; channel: string; color: string; status: "queued" | "pushing" | "ok" | "error"; note?: string; }

interface ChatChannel { id: string; name: string; kind: "channel" | "dm" | "handoff"; refId?: string; unread: number; messages: { id: string; author: string; body: string; ts: number; mention?: boolean }[]; }

export type AutopilotMode = "off" | "suggestion" | "on";

interface App {
  route: Route;
  navigate: (to: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;

  // ── auth, tenancy & platform state ──
  session: Session | null;
  tenants: TenantMeta[];
  features: Record<string, boolean> | null;
  loginTenant: (email: string, pw: string) => Promise<{ ok: boolean; error?: string }>;
  signupCustomer: (input: { name: string; workspace: string; email: string; pw: string }) => Promise<{ ok: boolean; error?: string }>;
  resetCustomerPassword: (email: string, newPw: string) => Promise<{ ok: boolean; error?: string }>;
  loginDeveloper: (email: string, pw: string) => Promise<{ ok: boolean; error?: string; seeded?: boolean }>;
  resetDeveloperPassword: (email: string, newPw: string) => Promise<{ ok: boolean; error?: string }>;
  grantFreeAccess: (tenantId: string, days: number, note?: string) => void;
  revokeFreeAccess: (tenantId: string) => void;
  logout: () => void;
  impersonate: (tenantId: string) => void;
  featureOn: (key: string) => boolean;
  setTenantFeature: (tenantId: string, key: string, on: boolean) => void;
  setTenantPlan: (tenantId: string, plan: TenantMeta["plan"]) => void;
  setTenantSuspended: (tenantId: string, v: boolean) => void;
  displayCurrency: CurrencyCode;
  fxTick: number;
  setWorkspaceCurrency: (c: CurrencyCode) => void;
  refreshRates: () => Promise<boolean>;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;

  // ── go-live playbook (persisted, sequentially gated) ──
  golive: Record<string, boolean>;
  setGolive: (key: string, on: boolean) => void;
  goliveActions: { pushesEnabled: boolean; importsRun: number; reconsRun: number; frozen: boolean };
  goliveEnablePushes: () => void;
  goliveRunImport: (label: string) => void;
  goliveRunRecon: () => void;
  goliveFreeze: () => void;

  // ── messaging platform connections ─────────────────────────────────────
  msgConnections: MsgConnection[];
  connectMsgPlatform: (id: string) => void;
  disconnectMsgPlatform: (id: string) => void;
  reconnectMsgPlatform: (id: string) => void;

  // ── developer-in-tenant & tenant branding ──
  tenantFonts: Record<string, { headingUrl: string; headingFamily: string; bodyUrl: string; bodyFamily: string }>;
  setTenantFonts: (tenantId: string, fonts: { headingUrl: string; headingFamily: string; bodyUrl: string; bodyFamily: string }) => void;
  widgetStyle: WidgetStyle;
  setWidgetStyle: (patch: Partial<WidgetStyle>) => void;
  integrationAccounts: Record<string, { id: string; name: string; connectedAt: string }[]>;
  connectIntegrationAccount: (appId: string, name: string) => void;
  removeIntegrationAccount: (appId: string, accountId: string) => void;
  devIntegrations: PlatformIntegration[];
  checking: string[];
  setIntegration: (id: string, patch: Partial<PlatformIntegration>) => void;
  checkIntegration: (id: string) => void;
  aiConfig: typeof AI_DEFAULTS & { enabled: boolean };
  setAiConfig: (patch: Partial<App["aiConfig"]>) => void;

  scope: string;
  setScope: (s: string) => void;
  myTasks: boolean;
  setMyTasks: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  copilotOpen: boolean;
  setCopilotOpen: (v: boolean) => void;
  onboardOpen: boolean;
  setOnboardOpen: (v: boolean) => void;
  onboardSteps: OnboardStep[];
  resetOnboard: () => void;
  doneOnboard: (id: string) => void;

  toasts: Toast[];
  toast: (tone: Toast["tone"], title: string, body?: string) => void;
  dismissToast: (id: number) => void;
  refreshing: boolean;
  refresh: () => void;
  lastRefresh: number;

  properties: Property[];
  conversations: Conversation[];
  reservations: Reservation[];
  tasks: Task[];
  reviews: Review[];
  quotes: Quote[];
  expenses: Expense[];
  issues: IssueReport[];
  msgQueue: QueuedMessage[];
  actionItems: typeof ACTION_ITEMS;
  sync: SyncState[];
  conflicts: typeof CONFLICTS;
  webhooks: typeof WEBHOOKS;
  website: WebsiteState;
  guidebooks: Guidebook[];
  calendarOverrides: Record<string, Record<string, CellOverride>>;
  pushQueue: PushItem[];
  bulkSnapshot: { overrides: Record<string, Record<string, CellOverride>> } | null;
  autopilot: { mode: AutopilotMode; delaySec: number; overrides: Record<string, AutopilotMode>; keywords: string[]; audit: { ts: number; conv: string; model: string; promptV: string; cited: string[]; outcome: "sent" | "escalated" }[] };
  creditsUsed: number;
  chat: ChatChannel[];
  auditLog: AuditEntry[];

  audit: (action: string, source: AuditEntry["source"], before?: string, after?: string) => void;

  markConvRead: (id: string) => void;
  addReply: (convId: string, body: string, from: Message["from"], extra?: Partial<Message>) => void;
  setConvNote: (id: string, note: string) => void;

  setCalendarCell: (propId: string, key: string, patch: CellOverride) => void;
  manualBlock: (propId: string, keys: string[], patch: CellOverride) => void;
  bulkApply: (propIds: string[], keys: string[], patch: CellOverride) => void;
  rollbackBulk: () => void;
  retryPush: (id: string) => void;

  reorderProperty: (fromId: string, toId: string) => void;
  toggleArchive: (id: string) => void;
  toggleChannel: (id: string, ch: keyof Property["channels"]) => void;
  setCheckoutEnabled: (id: string, v: boolean) => void;
  togglePublishDirect: (id: string) => void;
  toggleManaged: (id: string) => void;
  setOwnerFinancialsVisible: (v: boolean) => void;

  addAdhocCharge: (resId: string, label: string, amount: number) => void;
  recordPayment: (resId: string, amount: number, method: string, kind: "payment" | "refund") => void;
  setResStatus: (resId: string, status: Reservation["status"]) => void;

  setAutopilotMode: (m: AutopilotMode) => void;
  setAutopilotDelay: (s: number) => void;
  setAutopilotOverride: (propId: string, m: AutopilotMode | "inherit") => void;
  logAutopilot: (conv: string, outcome: "sent" | "escalated") => void;

  setGuidebookField: (propId: string, sectionId: string, key: string, value: string) => void;
  setGuidebookAiOnly: (propId: string, v: string) => void;
  setGbDesign: (propId: string, patch: Partial<Guidebook["design"]>) => void;
  setGbPublished: (propId: string, v: boolean) => void;

  replyReview: (id: string, text: string) => void;
  useAiDraft: (id: string) => void;

  setQuoteStatus: (id: string, status: Quote["status"]) => void;
  convertQuote: (id: string) => void;
  editQuoteItem: (id: string, idx: number, amount: number) => void;
  addQuoteItem: (id: string, label: string, amount: number) => void;
  removeQuoteItem: (id: string, idx: number) => void;
  addQuote: (input: { propertyId: string; guestId: string; checkIn: string; checkOut: string; adults: number }) => string;
  addChildUnit: (parentId: string, label: string) => string;

  setQueuedState: (id: string, state: QueuedMessage["state"]) => void;
  resolveActionItem: (id: string, mode: "saved" | "tasked") => void;
  addTask: (t: Task) => void;
  toggleCheckItem: (taskId: string, itemId: string) => void;
  flagCheckItem: (taskId: string, itemId: string, note: string) => void;
  completeTask: (taskId: string) => void;
  setIssueState: (id: string, state: IssueReport["state"], providerId?: string) => void;
  escalateIssue: (id: string) => void;
  setExpenseApproval: (id: string, approval: Expense["approval"]) => void;
  addExpense: (e: Expense) => void;

  replayWebhook: (epId: string, delId: string) => void;
  resolveConflict: (id: string, accept: boolean) => void;
  retrySync: (key: string) => void;

  moveBlock: (pageId: string, blockId: string, dir: "up" | "down") => void;
  moveBlockTo: (pageId: string, blockId: string, toIndex: number) => void;
  addBlock: (pageId: string, type: string, afterId?: string | null) => void;
  duplicateBlock: (pageId: string, blockId: string) => void;
  updateBlock: (pageId: string, blockId: string, patch: Partial<Block>) => void;
  removeBlock: (pageId: string, blockId: string) => void;
  setSiteTheme: (patch: Partial<WebsiteState["theme"]>) => void;
  setSiteActivePage: (id: string) => void;
  addPage: (name: string) => void;
  deletePage: (id: string) => void;
  updatePage: (pageId: string, patch: Partial<SitePage>) => void;
  duplicateSite: () => void;
  resetSite: () => void;
  collections: Collection[];
  updateCollection: (id: string, patch: Partial<Collection>) => void;
  addCollection: () => void;
  removeCollection: (id: string) => void;
  pending: { count: number; modules: string[]; savedAt: number | null };
  markPending: (module: string) => void;
  flushPending: () => void;

  // ── per-property photo libraries ──
  propertyPhotos: Record<string, PhotoEntry[]>;
  ensurePhotoLibrary: (propId: string) => void;
  uploadPhotos: (propId: string, files: FileList | File[]) => Promise<number>;
  deletePhoto: (propId: string, photoId: string) => void;
  renamePhoto: (propId: string, photoId: string, label: string) => void;
  setCoverPhoto: (propId: string, photoId: string) => void;
  movePhoto: (propId: string, photoId: string, dir: "up" | "down") => void;
  resyncOtaPhotos: (propId: string) => void;
  addProperty: (name: string, city: string) => string;
  importFromOta: (input: { name: string; city: string; channel: string; nightly: number; guests: number }) => string;
  siteChrome: SiteChrome;
  setSiteChrome: (patch: Partial<SiteChrome>) => void;
  reorderSiteLinks: (target: "header" | "footer", fromId: string, toIdx: number) => void;
  addChromeBlock: (target: "header" | "footer", type: string) => void;
  updateChromeBlock: (target: "header" | "footer", id: string, patch: Partial<Block>) => void;
  removeChromeBlock: (target: "header" | "footer", id: string) => void;
  moveChromeBlock: (target: "header" | "footer", id: string, dir: "up" | "down") => void;
  duplicateChromeBlock: (target: "header" | "footer", id: string) => void;
  invoiceTemplate: InvoiceTemplate;
  setInvoiceTemplate: (patch: Partial<InvoiceTemplate>) => void;
  emailTemplate: EmailTemplate;
  setEmailTemplate: (patch: Partial<EmailTemplate>) => void;
  workspacePrefs: WorkspacePrefs;
  setWorkspacePrefs: (patch: Partial<WorkspacePrefs>) => void;

  // global brand styling + reusable asset library
  brand: BrandState;
  setBrand: (patch: Partial<BrandState>) => void;
  savedAssets: SavedAsset[];
  addSavedAsset: (a: Omit<SavedAsset, "id">) => void;
  removeSavedAsset: (id: string) => void;

  sendChat: (channelId: string, body: string) => void;
  spendCredit: (n: number) => void;

  // chatbot booking: creates a pending direct reservation, returns ref + total
  chatBooking: (input: { propertyId: string; from: string; to: string; guests: number }) => { ref: string; total: number; currency: string };
  completeChatPayment: (ref: string, method: string) => void;
}

let toastSeq = 1;
let timerSeq = 0;
// Deferred UI effects. Timers are tracked so sign-out can cancel them: an
// orphaned callback firing after logout writes into the next session's state.
const pendingTimers = new Set<number>();
const later = (fn: () => void, ms: number) => {
  timerSeq += 1;
  const id = window.setTimeout(() => { pendingTimers.delete(id); fn(); }, ms);
  pendingTimers.add(id);
};
export const cancelPendingTimers = (): void => {
  pendingTimers.forEach((id) => window.clearTimeout(id));
  pendingTimers.clear();
};

// Seed a property's library from its connected channels: the cover plus
// sibling-property imagery stands in for the media each OTA holds, tagged
// with the channel it "synced" from. Uploads always layer on top.
const OTA_SEED_LABELS: [string, string][] = [
  ["airbnb", "Exterior"], ["booking", "Pool"], ["vrbo", "Living area"],
  ["airbnb", "Master bedroom"], ["booking", "Kitchen"], ["traveloka", "Bathroom"],
];
function otaSeedPhotos(propId: string, props: Property[]): PhotoEntry[] {
  const self = props.find((p) => p.id === propId) ?? props[0];
  const pool = [self, ...props.filter((p) => p.id !== propId && !p.archived)];
  return OTA_SEED_LABELS.map(([channel, label], i) => ({
    id: `seed-${propId}-${i}`,
    url: pool[i % pool.length].image,
    label: i === 0 ? "Cover · " + label : label,
    source: "ota" as const,
    channel,
  }));
}
const uploadsCount = (photos?: PhotoEntry[]) => (photos ?? []).filter((p) => p.source === "upload").length;

const initialChat: ChatChannel[] = [
  {
    id: "ch-desk", name: "front-desk", kind: "channel", unread: 2,
    messages: [
      { id: "cm-1", author: "Wayan Sudiarta", body: "Cemara turnover is running 20 min ahead — Jonas can arrive early if needed.", ts: Date.now() - 42 * 60_000 },
      { id: "cm-2", author: "Marco Reyes", body: "@Sarah Anggrek's pump: Putu is on site, ETA 40 min.", ts: Date.now() - 25 * 60_000, mention: true },
      { id: "cm-3", author: "Kadek Mira", body: "Purnama welcome basket done — 6 pax + 2 kids, allergen card in kitchen.", ts: Date.now() - 9 * 60_000 },
    ],
  },
  {
    id: "ch-hk", name: "housekeeping", kind: "channel", unread: 0,
    messages: [
      { id: "cm-4", author: "Made Ari", body: "New folding standard photos uploaded to the drive.", ts: Date.now() - 3 * 3_600_000 },
      { id: "cm-5", author: "Komang Devi", body: "Running low on beach towels at Kelapa — added to Thursday run.", ts: Date.now() - 5 * 3_600_000 },
    ],
  },
  {
    id: "ch-handoff", name: "Handoff · R-2418 Jonas Weber", kind: "handoff", refId: "r-2418", unread: 1,
    messages: [
      { id: "cm-6", author: "Concierge", body: "Guest asked about cot + heated pool. COT: yes, in store room B. POOL: not heated — flag to guest honestly.", ts: Date.now() - 50 * 60_000 },
    ],
  },
  {
    id: "ch-dm-marco", name: "Marco Reyes", kind: "dm", unread: 0,
    messages: [{ id: "cm-7", author: "Marco Reyes", body: "Agoda floor-rate issue again on Purnama — I'll bump base +2% and re-push.", ts: Date.now() - 2 * 3_600_000 }],
  },
];

export const useApp = create<App>((set, get) => ({
  route: parseHash(),
  navigate: (to) => {
    const locale = get().route.locale;
    window.location.hash = `/${locale}${to.startsWith("/") ? to : "/" + to}`;
  },
  t: (key, vars) => tr(get().route.locale, key, vars),

  // ── auth, tenancy & platform state ──
  session: bootSession,
  tenants: TENANTS,
  features: flagsFor(bootSession),
  loginTenant: async (email, pw) => {
    const e = email.trim().toLowerCase();
    // The seeded demo workspaces are public sample data guarded by a plaintext
    // password; no Supabase user exists behind them. Once server auth went live
    // this branch sent them to /auth/v1/token anyway, got a 400, and returned
    // { ok: false } - which every demo entry point discarded, so "Launch live
    // demo" and the two workspace cards on the login page looked completely
    // dead. Route them to the local demo path first. A real registered account
    // always wins (findCustomer is checked too), so this cannot be used to
    // bypass server auth for anyone who actually has an account.
    const isSeededDemo =
      TENANTS.some((x) => x.isDemo && x.email.toLowerCase() === e) && !findCustomer(e);
    if (serverAuthReady() && !isSeededDemo) {
      const r = await signInTenant(email, pw);
      if (!r.ok || !r.data) return { ok: false, error: r.error };
      tenantPersisted = true;
      hydrateCustomerTenant({
        id: r.data.tenant_id, tenantId: r.data.tenant_id, workspace: r.data.workspace,
        name: e.split("@")[0], email: e, hash: "", createdAt: Date.now(),
        currency: r.data.currency as CurrencyCode,
      });
      const meta = ensureRuntimeTenant({
        id: r.data.tenant_id, tenantId: r.data.tenant_id, workspace: r.data.workspace,
        name: e.split("@")[0], email: e, hash: "", createdAt: Date.now(),
        currency: r.data.currency as CurrencyCode,
      });
      setDisplayCurrency(meta.currency);
      const restored = applyStoredSlice(meta.id);
      const session: Session = { kind: "tenant", tenantId: meta.id };
      saveSession(session);
      set({ session, features: { ...meta.features }, displayCurrency: meta.currency, fxTick: get().fxTick + 1, tenants: [...TENANTS] });
      get().toast("ok", `Welcome back`, restored ? "Your workspace was restored." : r.data.workspace);
      return { ok: true };
    }
    // ORDER MATTERS. Registered accounts are checked first. A registered
    // customer is injected into TENANTS at runtime by ensureRuntimeTenant, so
    // a demo-first lookup used to match that runtime row, compare against its
    // empty `password` field, and either reject a valid sign-in or drop the
    // customer onto the demo path where hydrateTenantData() overwrites their
    // workspace with sample data. The demo branch is now reachable only for
    // rows explicitly flagged isDemo.
    const c = findCustomer(email);
    if (!c) {
      const t = TENANTS.find((x) => x.isDemo && x.email.toLowerCase() === e);
      if (!t) return { ok: false, error: "No workspace is registered under that email." };
      if (pw !== t.password) return { ok: false, error: "Incorrect password for this workspace." };
      if (t.suspended) return { ok: false, error: "This workspace is suspended. Contact platform support." };
      tenantPersisted = false; // demo tenants re-seed from pristine data every visit
      hydrateTenantData(t.id);
      setDisplayCurrency(t.currency);
      const session: Session = { kind: "tenant", tenantId: t.id };
      saveSession(session);
      set({ session, features: { ...t.features }, displayCurrency: t.currency, fxTick: get().fxTick + 1, tenants: [...TENANTS] });
      get().toast("info", `Demo workspace: ${t.name}`, "Sample data. Changes here are discarded on your next visit.");
      return { ok: true };
    }
    const hash = await hashPassword(pw);
    if (hash !== c.hash) return { ok: false, error: "Incorrect password for this workspace." };
    const meta = ensureRuntimeTenant(c);
    // Registered customers get the empty scaffold (no demo placeholders),
    // then their saved workspace is restored on top.
    hydrateCustomerTenant(c);
    setDisplayCurrency(meta.currency);
    tenantPersisted = true;
    const restored = applyStoredSlice(meta.id);
    const session: Session = { kind: "tenant", tenantId: meta.id };
    saveSession(session);
    set({ session, features: { ...meta.features }, displayCurrency: meta.currency, fxTick: get().fxTick + 1, tenants: [...TENANTS] });
    get().toast("ok", `Welcome back, ${c.name.split(" ")[0]}`, restored ? "Your workspace was restored from secure storage." : c.workspace);
    return { ok: true };
  },
  signupCustomer: async (input) => {
    const e = input.email.trim().toLowerCase();
    if (serverAuthReady()) {
      const r = await signUpTenant(input);
      if (!r.ok) return { ok: false, error: r.error };
      get().toast("ok", "Check your inbox", "Confirm the address, then sign in. Your workspace is provisioned server-side.");
      return { ok: true };
    }
    if (findCustomer(input.email) || TENANTS.some((x) => x.email.toLowerCase() === e))
      return { ok: false, error: "That email already has a workspace — sign in instead." };
    const hash = await hashPassword(input.pw);
    const tenantId = uid("tnt");
    const c: CustomerAccount = {
      id: uid("cus"), tenantId, workspace: input.workspace.trim() || `${input.name.trim()}'s Villas`,
      name: input.name.trim(), email: e, hash, createdAt: Date.now(), currency: "IDR",
    };
    saveCustomer(c);
    const meta = ensureRuntimeTenant(c);
    hydrateCustomerTenant(c); // empty scaffold — no placeholders
    setDisplayCurrency(meta.currency);
    tenantPersisted = true;
    const session: Session = { kind: "tenant", tenantId: meta.id };
    saveSession(session);
    set({ session, features: { ...meta.features }, displayCurrency: meta.currency, fxTick: get().fxTick + 1, tenants: [...TENANTS] });
    // Persist the initial empty state so the customer's workspace exists durably.
    saveTenantState(meta.id, snapshotSlice());
    get().audit(`Workspace created via self-serve signup: ${c.workspace}`, "ui");
    get().toast("ok", `${c.workspace} is yours`, "Your own tenant, empty by design. Nothing here is shared with the demo workspaces.");
    return { ok: true };
  },
  resetCustomerPassword: async (email, newPw) => {
    if (serverAuthReady()) return requestPasswordReset(email, "app");
    const c = findCustomer(email);
    if (!c) return { ok: false, error: "No registered workspace found for that email." };
    const hash = await hashPassword(newPw);
    saveCustomer({ ...c, hash });
    return { ok: true };
  },
  loginDeveloper: async (email, pw) => {
    // Server-backed builds ask Postgres. The browser registry below is a
    // local-development fallback only: it decides access inside a file the
    // user can edit, which is not a security boundary.
    if (serverAuthReady()) {
      const r = await signInPlatform(email, pw);
      if (!r.ok || !r.data) return { ok: false, error: r.error };
      const session: Session = {
        kind: "developer", devMemberId: r.data.user_id, devEmail: r.data.email, devRole: r.data.role,
      };
      set({ session, features: null });
      get().audit(`Developer sign-in: ${r.data.email}`, "ui");
      return { ok: true };
    }
    const res = await verifyDevLogin(email, pw);
    if (!res.ok || !res.member) return { ok: false, error: res.error };
    // Developer sessions are deliberately NOT persisted. They live only in memory
    // for the current page, so no client-writable localStorage key on any origin
    // (tenant or dev host) can ever establish or re-establish one. Reload = re-auth.
    const session: Session = {
      kind: "developer", devMemberId: res.member.id, devEmail: res.member.email, devRole: res.member.role,
    };
    set({ session, features: null });
    get().audit(res.seeded ? `Developer owner seat claimed by ${res.member.email}` : `Developer sign-in: ${res.member.email}`, "ui");
    return { ok: true, seeded: res.seeded };
  },
  resetDeveloperPassword: async (email, newPw) =>
    serverAuthReady() ? requestPasswordReset(email, "dev") : resetDevPasswordByEmail(email, newPw),
  grantFreeAccess: (tenantId, days, note) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (!t) return;
    // Extend from whichever is later: now, or an existing unexpired grant.
    const from = Math.max(Date.now(), t.freeUntil && t.freeUntil > Date.now() ? t.freeUntil : 0);
    t.freeUntil = from + days * 86_400_000;
    t.freeGrantNote = note?.trim() || undefined;
    const until = new Date(t.freeUntil).toISOString().slice(0, 10);
    set({ tenants: [...TENANTS] });
    get().audit(`Free access granted to ${t.name}: ${days} days, billing waived until ${until}${note ? ` (${note.trim()})` : ""}`, "ui");
    get().toast("ok", `${t.name} is free until ${until}`, `${days}-day grant recorded in the audit trail.`);
  },
  revokeFreeAccess: (tenantId) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (!t || !t.freeUntil) return;
    t.freeUntil = undefined; t.freeGrantNote = undefined;
    set({ tenants: [...TENANTS] });
    get().audit(`Free access revoked for ${t.name}; normal billing resumes`, "ui");
    get().toast("warn", `${t.name} back on normal billing`, "The grant was ended early.");
  },
  logout: () => {
    cancelPendingTimers();
    if (serverAuthReady()) void signOutServer();
    saveSession(null);
    set({ session: null, features: null });
    window.location.hash = "/en";
  },
  impersonate: (tenantId) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (!t || t.suspended) return;
    hydrateTenantData(t.id);
    setDisplayCurrency(t.currency);
    const session: Session = { kind: "tenant", tenantId, impersonated: true };
    saveSession(session);
    set({ session, features: { ...t.features }, displayCurrency: t.currency, fxTick: get().fxTick + 1 });
    window.location.hash = `/${get().route.locale}/dashboard`;
  },
  featureOn: (key) => {
    const f = get().features;
    return !f || f[key] !== false;
  },
  setTenantFeature: (tenantId, key, on) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (t) t.features = { ...t.features, [key]: on };
    const s = get().session;
    if (s?.kind === "tenant" && s.tenantId === tenantId) set({ features: { ...t!.features } });
  },
  setTenantPlan: (tenantId, plan) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (t) t.plan = plan;
    set({ tenants: [...TENANTS] });
  },
  setTenantSuspended: (tenantId, v) => {
    const t = TENANTS.find((x) => x.id === tenantId);
    if (t) t.suspended = v;
    set({ tenants: [...TENANTS] });
  },
  displayCurrency: (bootSession?.kind === "tenant" ? TENANTS.find((t) => t.id === bootSession.tenantId)?.currency : null) ?? "IDR",
  fxTick: 0,
  setWorkspaceCurrency: (c) => {
    setDisplayCurrency(c);
    WORKSPACE.currency = c;
    set({ displayCurrency: c, fxTick: get().fxTick + 1 });
  },
  refreshRates: async () => {
    const ok = await refreshFx();
    set({ fxTick: get().fxTick + 1 });
    return ok;
  },
  theme: ((): "light" | "dark" => {
    try { return localStorage.getItem("derzen.theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  })(),
  setTheme: (t) => {
    try { localStorage.setItem("derzen.theme", t); } catch { /* private mode */ }
    document.documentElement.dataset.theme = t;
    set({ theme: t });
  },

  tenantFonts: {},
  setTenantFonts: (tenantId, fonts) =>
    set((st) => ({ tenantFonts: { ...st.tenantFonts, [tenantId]: fonts } })),
  widgetStyle: { ...DEFAULT_WIDGET_STYLE },
  setWidgetStyle: (patch) => set((st) => ({ widgetStyle: { ...st.widgetStyle, ...patch } })),

  golive: {},
  setGolive: (key, on) => set((st) => ({ golive: { ...st.golive, [key]: on } })),
  goliveActions: { pushesEnabled: false, importsRun: 0, reconsRun: 0, frozen: false },
  goliveEnablePushes: () => {
    // flip every live connection's push side on — the real "enable pushes" step
    set((st) => ({
      goliveActions: { ...st.goliveActions, pushesEnabled: true },
      sync: st.sync.map((s) => (s.state === "error" ? { ...s, state: "live", lastSuccessTs: Date.now() } : s)),
    }));
    get().toast("ok", "Pushes enabled on all connections", "Availability, rates and restrictions now flow outbound.");
    get().audit("go-live: enabled channel pushes", "ui");
  },
  goliveRunImport: (label) => {
    set((st) => ({ goliveActions: { ...st.goliveActions, importsRun: st.goliveActions.importsRun + 1 } }));
    get().toast("ok", `${label} queued`, "Dry-run against the staging tenant — row-level diff will be generated.");
    get().audit(`go-live: ran ${label}`, "ui");
  },
  goliveRunRecon: () => {
    set((st) => ({ goliveActions: { ...st.goliveActions, reconsRun: st.goliveActions.reconsRun + 1 } }));
    get().toast("ok", "Daily reconciliation run", "Ledger ↔ provider settlements matched · 0 unexplained differences.");
    get().audit("go-live: daily reconciliation", "ui");
  },
  goliveFreeze: () => {
    set((st) => ({ goliveActions: { ...st.goliveActions, frozen: true } }));
    get().toast("warn", "Old system frozen", "Changes blocked at the source until cutover completes.");
    get().audit("go-live: froze legacy system", "ui");
  },
  devIntegrations: PLATFORM_INTEGRATIONS,
  integrationAccounts: {},
  connectIntegrationAccount: (appId, name) => set((st) => {
    const accs = st.integrationAccounts[appId] || [];
    return { integrationAccounts: { ...st.integrationAccounts, [appId]: [...accs, { id: uid("acc"), name, connectedAt: new Date().toISOString() }] } };
  }),
  removeIntegrationAccount: (appId, accountId) => set((st) => {
    const accs = st.integrationAccounts[appId] || [];
    return { integrationAccounts: { ...st.integrationAccounts, [appId]: accs.filter(a => a.id !== accountId) } };
  }),
  checking: [],
  setIntegration: (id, patch) => set((st) => ({ devIntegrations: st.devIntegrations.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  checkIntegration: (id) => {
    set((st) => ({ checking: [...st.checking, id] }));
    const target = get().devIntegrations.find((x) => x.id === id);
    later(() => {
      const ok = !!target && target.status !== "missing";
      set((st) => ({
        checking: st.checking.filter((x) => x !== id),
        devIntegrations: st.devIntegrations.map((x) => (x.id === id ? { ...x, lastCheck: { ts: Date.now(), ms: ok ? 38 + Math.round(Math.random() * 140) : 0, ok } } : x)),
      }));
      if (ok) get().toast("ok", `${target?.name ?? id} health check passed`, "Signed request round-trip OK");
      else get().toast("err", `${target?.name ?? id} unreachable`, "Credentials missing — see the playbook step for this provider.");
    }, 950);
  },
  aiConfig: { ...AI_DEFAULTS, enabled: true },
  setAiConfig: (patch) => set((st) => ({ aiConfig: { ...st.aiConfig, ...patch } })),

  scope: "all",
  setScope: (s) => set({ scope: s }),
  myTasks: false,
  setMyTasks: (v) => set({ myTasks: v }),
  chatOpen: false,
  setChatOpen: (v) => set({ chatOpen: v, copilotOpen: false }),
  copilotOpen: false,
  setCopilotOpen: (v) => set({ copilotOpen: v, chatOpen: false }),
  onboardOpen: false,
  setOnboardOpen: (v) => set({ onboardOpen: v }),
  onboardSteps: ONBOARD_STEPS,
  resetOnboard: () => set({ onboardSteps: ONBOARD_STEPS.map((s) => ({ ...s, done: false })), onboardOpen: true }),
  doneOnboard: (id) => set((st) => ({ onboardSteps: st.onboardSteps.map((s) => (s.id === id ? { ...s, done: true } : s)) })),

  toasts: [],
  toast: (tone, title, body) => {
    const id = toastSeq++;
    set((st) => ({ toasts: [...st.toasts, { id, tone, title, body }] }));
    later(() => get().dismissToast(id), 4600);
  },
  dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((x) => x.id !== id) })),
  refreshing: false,
  lastRefresh: Date.now(),
  refresh: () => {
    set({ refreshing: true });
    later(() => { set({ refreshing: false, lastRefresh: Date.now() }); get().toast("ok", "Workspace refreshed", "Pulled latest from 6 channels · 0 conflicts"); }, 900);
  },

  properties: PROPERTIES,
  conversations: CONVERSATIONS,
  reservations: RESERVATIONS,
  tasks: TASKS,
  reviews: REVIEWS,
  quotes: QUOTES,
  expenses: EXPENSES,
  issues: ISSUES,
  msgQueue: MSG_QUEUE,
  actionItems: ACTION_ITEMS,
  sync: SYNC,
  conflicts: CONFLICTS,
  webhooks: WEBHOOKS,
  website: WEBSITE,
  guidebooks: GUIDEBOOKS,
  calendarOverrides: {},
  pushQueue: [],
  bulkSnapshot: null,
  autopilot: { mode: "suggestion", delaySec: 60, overrides: { "p-purnama": "off" }, keywords: ["refund", "complaint", "broken", "payment", "injury", "police"], audit: [
    { ts: Date.now() - 2 * 3_600_000, conv: "Pool pump noise · Amelia Hartono", model: "concierge-v2", promptV: "v14", cited: ["Villa Anggrek · Maintenance SOP"], outcome: "sent" },
    { ts: Date.now() - 26 * 3_600_000, conv: "Invoice request · Chen Wei", model: "concierge-v2", promptV: "v14", cited: ["General · FAQ deposits"], outcome: "escalated" },
  ] },
  creditsUsed: WORKSPACE.credits.used,
  chat: initialChat,
  auditLog: AUDIT,

  audit: (action, source, before, after) =>
    set((st) => ({ auditLog: [{ ts: Date.now(), actor: source === "ai" ? "Concierge (autopilot)" : source === "automation" ? "Automation engine" : "Sarah Whitfield", action, source, before, after }, ...st.auditLog] })),

  markConvRead: (id) => set((st) => ({ conversations: st.conversations.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) })),
  addReply: (convId, body, from, extra) =>
    set((st) => ({
      conversations: st.conversations.map((c) =>
        c.id === convId ? { ...c, needsReply: from === "guest", messages: [...c.messages, { id: uid("m"), from, body, ts: Date.now(), ...extra }] } : c,
      ),
    })),
  setConvNote: (id, note) => set((st) => ({ conversations: st.conversations.map((c) => (c.id === id ? { ...c, note, notes: note } : c)) })),

  setCalendarCell: (propId, key, patch) => {
    get().markPending("Calendar");
    set((st) => ({
      calendarOverrides: { ...st.calendarOverrides, [propId]: { ...st.calendarOverrides[propId], [key]: { ...st.calendarOverrides[propId]?.[key], ...patch } } },
    }));
  },
  manualBlock: (propId, keys, patch) => {
    get().markPending("Calendar");
    // Same path as bulk edit: local override first, then a durable per-channel
    // push queue — so a manual block / custom price syncs with everything.
    const st = get();
    const next = { ...st.calendarOverrides, [propId]: { ...st.calendarOverrides[propId] } };
    for (const k of keys) next[propId][k] = { ...next[propId][k], ...patch };
    // Parent/child invariant: closing a parent closes children.
    const prop = propertyById(propId);
    if (prop.isParent && patch.closed) {
      for (const child of st.properties.filter((x) => x.parentId === propId)) {
        next[child.id] = { ...next[child.id] };
        for (const k of keys) next[child.id][k] = { ...next[child.id][k], closed: true };
      }
    }
    const channelsSeen = new Map<string, string>();
    for (const [ch, status] of Object.entries(prop.channels)) {
      if (status === "live") channelsSeen.set(ch, channelDef(ch as never).color);
    }
    const queue: PushItem[] = [...channelsSeen.entries()].map(([ch, color]) => ({ id: uid("push"), channel: ch, color, status: "queued" as const }));
    set({ calendarOverrides: next, pushQueue: queue, bulkSnapshot: { overrides: st.calendarOverrides } });
    queue.forEach((q, i) => {
      later(() => set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === q.id ? { ...x, status: "pushing" } : x)) })), 250 + i * 240);
      later(() => set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === q.id ? { ...x, status: "ok" } : x)) })), 900 + i * 300);
    });
    get().audit(
      patch.blockType
        ? `Manual block (${patch.blockType}) · ${prop.name} · ${keys.length} night${keys.length > 1 ? "s" : ""}${patch.blockPrice ? ` · custom rate` : ""}`
        : `Calendar edit · ${prop.name} · ${keys.length} night${keys.length > 1 ? "s" : ""}`,
      "ui",
      undefined,
      `queued pushes to ${queue.length} channels`,
    );
  },

  bulkApply: (propIds, keys, patch) => {
    const st = get();
    get().markPending("Calendar");
    set({ bulkSnapshot: { overrides: st.calendarOverrides } });
    const next = { ...st.calendarOverrides };
    for (const p of propIds) {
      next[p] = { ...next[p] };
      for (const k of keys) next[p][k] = { ...next[p][k], ...patch };
    }
    // Parent/child invariant: closing a parent closes children.
    for (const p of propIds) {
      const prop = propertyById(p);
      if (prop.isParent && patch.closed) {
        for (const child of st.properties.filter((x) => x.parentId === p)) {
          next[child.id] = { ...next[child.id] };
          for (const k of keys) next[child.id][k] = { ...next[child.id][k], closed: true };
        }
      }
    }
    const channelsSeen = new Map<string, { color: string }>();
    for (const p of propIds) for (const [ch, status] of Object.entries(propertyById(p).channels)) {
      if (status === "live" && !channelsSeen.has(ch)) channelsSeen.set(ch, { color: channelDef(ch as never).color });
    }
    const queue: PushItem[] = [...channelsSeen.entries()].map(([ch, v]) => ({ id: uid("push"), channel: ch, color: v.color, status: "queued" as const }));
    set({ calendarOverrides: next, pushQueue: queue });
    queue.forEach((q, i) => {
      later(() => set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === q.id ? { ...x, status: "pushing" } : x)) })), 250 + i * 260);
      const willFail = q.channel === "agoda" && propIds.includes("p-purnama");
      later(() => {
        set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === q.id ? { ...x, status: willFail ? "error" : "ok", note: willFail ? "rate_below_floor — Agoda rejects base below USD 348" : undefined } : x)) }));
        if (willFail) get().toast("err", "Push failed on Agoda", "Rollback available, or raise base rate and retry.");
      }, 900 + i * 320);
    });
    get().audit(`Bulk edit: ${propIds.length} listings × ${keys.length} nights · ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ")}`, "ui", undefined, `queued pushes to ${queue.length} channels`);
    get().toast("ok", `Bulk edit applied`, `${propIds.length} listings × ${keys.length} nights — pushing to ${queue.length} channels`);
  },
  rollbackBulk: () => {
    const snap = get().bulkSnapshot;
    if (snap) set({ calendarOverrides: snap.overrides, pushQueue: [], bulkSnapshot: null });
    get().toast("warn", "Bulk edit rolled back", "Local rates restored. Channel pushes cancelled.");
  },
  retryPush: (id) => {
    set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === id ? { ...x, status: "pushing", note: undefined } : x)) }));
    later(() => {
      set((s) => ({ pushQueue: s.pushQueue.map((x) => (x.id === id ? { ...x, status: "ok" } : x)) }));
      get().toast("ok", "Agoda push succeeded", "Base rate raised above floor · all channels green");
    }, 1100);
  },

  reorderProperty: (fromId, toId) =>
    set((st) => {
      const sorted = [...st.properties].sort((a, b) => a.order - b.order);
      const from = sorted.findIndex((p) => p.id === fromId);
      const to = sorted.findIndex((p) => p.id === toId);
      if (from < 0 || to < 0) return st;
      const [moved] = sorted.splice(from, 1);
      sorted.splice(to, 0, moved);
      return { properties: sorted.map((p, i) => ({ ...p, order: i })) };
    }),
  toggleArchive: (id) => set((st) => ({ properties: st.properties.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)) })),
  toggleChannel: (id, ch) =>
    set((st) => ({
      properties: st.properties.map((p) => (p.id === id ? { ...p, channels: { ...p.channels, [ch]: p.channels[ch as never] === "live" ? "paused" : "live" } } : p)),
    })),
  setCheckoutEnabled: (id, v) => set((st) => ({ properties: st.properties.map((p) => (p.id === id ? { ...p, checkoutEnabled: v } : p)) })),
  togglePublishDirect: (id) => set((st) => ({ properties: st.properties.map((p) => (p.id === id ? { ...p, publishDirect: !p.publishDirect } : p)) })),
  toggleManaged: (id) => {
    const p = get().properties.find((x) => x.id === id);
    set((st) => ({ properties: st.properties.map((x) => (x.id === id ? { ...x, managed: !x.managed } : x)) }));
    get().markPending("Listings");
    get().audit(`${p?.name ?? "Property"}: commission tracking ${p?.managed ? "off" : "on"}`, "ui");
    get().toast(p?.managed ? "warn" : "ok", `Commission tracking ${p?.managed ? "off" : "on"}`, p?.managed ? "Owner statements for this property stop accruing." : "Monthly owner statements now accrue from the ledger.");
  },
  setOwnerFinancialsVisible: (v) => {
    WORKSPACE.ownerFinancialsVisible = v;
    set({});
    get().toast(v ? "ok" : "warn", `Owner financials ${v ? "visible" : "hidden"}`, "Applies workspace-wide to every owner login immediately.");
  },

  addAdhocCharge: (resId, label, amount) =>
    set((st) => ({
      reservations: st.reservations.map((r) =>
        r.id === resId ? { ...r, items: [...r.items, { label, kind: "addon", amount }], total: r.total + amount, timeline: [...r.timeline, { ts: Date.now(), label: `Ad-hoc charge added: ${label}`, source: "ui" }] } : r,
      ),
    })),
  recordPayment: (resId, amount, method, kind) =>
    set((st) => ({
      reservations: st.reservations.map((r) =>
        r.id === resId
          ? { ...r, payments: [...r.payments, { id: uid("pay"), ts: Date.now(), amount: kind === "refund" ? -amount : amount, currency: r.currency, method, kind }], timeline: [...r.timeline, { ts: Date.now(), label: kind === "refund" ? `Refund recorded (${method})` : `Manual payment recorded (${method})`, source: "ui" }] }
          : r,
      ),
    })),
  setResStatus: (resId, status) =>
    set((st) => ({
      reservations: st.reservations.map((r) =>
        r.id === resId ? { ...r, status, timeline: [...r.timeline, { ts: Date.now(), label: `Status → ${status.replace("_", " ")}`, source: "ui" }] } : r,
      ),
    })),

  setAutopilotMode: (m) => { set((st) => ({ autopilot: { ...st.autopilot, mode: m } })); get().audit(`Autopilot mode → ${m}`, "ui"); },
  setAutopilotDelay: (s) => set((st) => ({ autopilot: { ...st.autopilot, delaySec: Math.max(20, s) } })),
  setAutopilotOverride: (propId, m) =>
    set((st) => {
      const overrides = { ...st.autopilot.overrides };
      if (m === "inherit") delete overrides[propId];
      else overrides[propId] = m;
      return { autopilot: { ...st.autopilot, overrides } };
    }),
  logAutopilot: (conv, outcome) =>
    set((st) => ({ autopilot: { ...st.autopilot, audit: [{ ts: Date.now(), conv, model: "concierge-v2", promptV: "v14", cited: ["General · brand tone"], outcome }, ...st.autopilot.audit] } })),

  setGuidebookField: (propId, sectionId, key, value) =>
    set((st) => ({
      guidebooks: st.guidebooks.map((gb) =>
        gb.propertyId === propId
          ? { ...gb, lastSavedTs: Date.now(), sections: gb.sections.map((s) => (s.id === sectionId ? { ...s, fields: { ...s.fields, [key]: value } } : s)) }
          : gb,
      ),
    })),
  setGuidebookAiOnly: (propId, v) =>
    set((st) => ({ guidebooks: st.guidebooks.map((gb) => (gb.propertyId === propId ? { ...gb, aiOnly: v, lastSavedTs: Date.now() } : gb)) })),
  setGbDesign: (propId, patch) =>
    set((st) => ({ guidebooks: st.guidebooks.map((gb) => (gb.propertyId === propId ? { ...gb, design: { ...gb.design, ...patch } } : gb)) })),
  setGbPublished: (propId, v) => {
    set((st) => ({ guidebooks: st.guidebooks.map((gb) => (gb.propertyId === propId ? { ...gb, published: v } : gb)) }));
    get().audit(`Guidebook ${v ? "published" : "unpublished"} · ${propertyById(propId).name}`, "ui");
  },

  replyReview: (id, text) => {
    set((st) => ({ reviews: st.reviews.map((r) => (r.id === id ? { ...r, reply: text, repliedAt: Date.now() } : r)) }));
    get().toast("ok", "Reply published", "Pushed back to the channel where the API allows.");
  },
  useAiDraft: (id) => set((st) => ({ reviews: st.reviews.map((r) => (r.id === id && r.aiDraft ? { ...r, reply: r.aiDraft } : r)) })),

  setQuoteStatus: (id, status) => set((st) => ({ quotes: st.quotes.map((q) => (q.id === id ? { ...q, status } : q)) })),
  convertQuote: (id) => {
    const q = get().quotes.find((x) => x.id === id);
    if (!q) return;
    const p = propertyById(q.propertyId);
    const ref = `R-${2440 + Math.floor(Math.random() * 40)}`;
    const res: Reservation = {
      id: uid("r"), ref, propertyId: q.propertyId, guestId: q.guestId, channel: "direct", kind: "stay",
      checkIn: q.checkIn, checkOut: q.checkOut, checkInTime: p.checkInTime, adults: q.adults, children: 0, infants: 0,
      status: "pending", items: q.items, total: q.total, currency: q.currency, fxRate: FX_TO_EUR[q.currency], fxTs: Date.now(),
      depositHeld: 0, payments: [], notes: `Converted from ${q.ref}`, guidebookCode: `GB-${p.code}-NEW`,
      timeline: [{ ts: Date.now(), label: `Converted from quote ${q.ref}`, source: "ui" }, { ts: Date.now(), label: "Reservation created", source: "ui" }],
      archived: false, createdAt: Date.now(), addOns: [],
    };
    set((st) => ({ reservations: [res, ...st.reservations], quotes: st.quotes.map((x) => (x.id === id ? { ...x, status: "converted" } : x)) }));
    get().audit(`Quote ${q.ref} converted → ${ref}`, "ui");
    get().toast("ok", `${ref} created from ${q.ref}`, "Payment link sent to guest · all channels will be blocked on confirmation.");
  },
  chatBooking: (input) => {
    const p = propertyById(input.propertyId);
    let newGuest = null;
    if (!GUESTS.some((g) => g.id === "g-chat")) {
      newGuest = {
        id: "g-chat", name: "Walk-in guest (chatbot)", emails: [], phones: [], country: "Unknown",
        status: "active", lastActivityTs: Date.now(), lastSource: "web", lifetimeSpend: 0,
        tags: ["chatbot"], notes: "Created by the embedded concierge widget.", consentMarketing: false,
        aliases: [], verifiedId: false,
      } as any;
      if (!GUESTS.some((g) => g.id === "g-chat")) GUESTS.push(newGuest);
    }
    const base = p.pricing.plans.find((pl) => pl.kind === "base")?.nightly ?? 3_500_000;
    const nights = Math.max(1, Math.round((+new Date(input.to) - +new Date(input.from)) / 86_400_000));
    const subtotal = base * nights;
    const cleaning = p.pricing.cleaningFee ?? 0;
    const service = Math.round(subtotal * ((p.pricing.serviceFeePct ?? 0) / 100));
    const total = subtotal + cleaning + service;
    const ref = `DC-${Math.floor(1000 + Math.random() * 9000)}`;
    const res: Reservation = {
      id: uid("r"), ref, propertyId: p.id, guestId: "g-chat", channel: "direct", kind: "stay",
      checkIn: input.from, checkOut: input.to, checkInTime: p.checkInTime, adults: input.guests, children: 0, infants: 0,
      status: "pending",
      items: [
        { label: `${p.name} × ${nights} night${nights > 1 ? "s" : ""}`, kind: "night", amount: subtotal },
        ...(cleaning ? [{ label: "Cleaning fee", kind: "fee" as const, amount: cleaning }] : []),
        ...(service ? [{ label: `Service fee ${p.pricing.serviceFeePct}%`, kind: "fee" as const, amount: service }] : []),
      ],
      total, currency: p.currency, fxRate: FX_TO_EUR[p.currency] ?? 1, fxTs: Date.now(),
      depositHeld: 0, payments: [], notes: "Booked via embedded concierge chatbot", guidebookCode: `GB-${p.code}-CHAT`,
      timeline: [
        { ts: Date.now(), label: "Reservation created via chatbot widget", source: "ai" },
        { ts: Date.now(), label: "Guest handed off to hosted payment page", source: "ui" },
      ],
      archived: false, createdAt: Date.now(), addOns: [],
    };
    set((st) => ({
      reservations: [res, ...st.reservations]
    }));
    get().audit(`Chatbot booking ${ref} · ${p.name} · ${input.from} → ${input.to}`, "ai");
    return { ref, total, currency: p.currency };
  },
  completeChatPayment: (ref, method) => {
    set((st) => ({
      reservations: st.reservations.map((r) =>
        r.ref === ref
          ? {
              ...r, status: "deposit_paid",
              payments: [...r.payments, { id: uid("pay"), ts: Date.now(), amount: Math.round(r.total * 0.3), currency: r.currency, method, kind: "payment" }],
              timeline: [...r.timeline, { ts: Date.now(), label: `Deposit received (${method}) via hosted payment page`, source: "ui" }],
            }
          : r,
      ),
    }));
    get().audit(`Payment captured for ${ref} · ${method}`, "ui");
  },
  editQuoteItem: (id, idx, amount) =>
    set((st) => ({ quotes: st.quotes.map((q) => (q.id === id ? { ...q, items: q.items.map((it, i) => (i === idx ? { ...it, amount } : it)), total: q.items.reduce((s, it, i) => s + (i === idx ? amount : it.amount), 0) } : q)) })),
  addQuoteItem: (id, label, amount) =>
    set((st) => ({ quotes: st.quotes.map((q) => (q.id === id ? { ...q, items: [...q.items, { label, kind: "fee", amount }], total: q.total + amount } : q)) })),
  removeQuoteItem: (id, idx) =>
    set((st) => ({ quotes: st.quotes.map((q) => (q.id === id ? { ...q, items: q.items.filter((_, i) => i !== idx), total: q.items.reduce((s, it, i) => (i === idx ? s : s + it.amount), 0) } : q)) })),
  addQuote: (input) => {
    const id = uid("q");
    const p = propertyById(input.propertyId);
    const base = p.pricing.plans.find((pl) => pl.kind === "base")?.nightly ?? 3_000_000;
    const nights = Math.max(1, Math.round((+new Date(input.checkOut) - +new Date(input.checkIn)) / 86_400_000));
    const cleaning = p.pricing.cleaningFee ?? 350_000;
    const service = Math.round(base * nights * ((p.pricing.serviceFeePct ?? 5) / 100));
    const total = base * nights + cleaning + service;
    const ref = `Q-${1200 + get().quotes.length + 1}`;
    const q: Quote = {
      id, ref, guestId: input.guestId, propertyId: input.propertyId, serviceIds: [],
      checkIn: input.checkIn, checkOut: input.checkOut, adults: input.adults,
      items: [
        { label: `${p.name} · ${nights} night${nights > 1 ? "s" : ""} @ ${moneyRaw(base, p.currency, { compact: true })}`, kind: "night", amount: base * nights },
        { label: "Cleaning fee", kind: "fee", amount: cleaning },
        { label: `Service fee (${p.pricing.serviceFeePct ?? 5}%)`, kind: "fee", amount: service },
      ],
      total, currency: p.currency,
      depositTerms: "30% deposit due on acceptance", paymentTerms: "Balance due 14 days before arrival.",
      expiresAt: Date.now() + 7 * 86_400_000, status: "draft", createdAt: Date.now(),
    };
    set((st) => ({ quotes: [q, ...st.quotes] }));
    get().markPending("Quotes");
    get().audit(`Quote ${ref} drafted for ${GUESTS.find((g) => g.id === input.guestId)?.name ?? "guest"} · ${p.name}`, "ui");
    get().toast("ok", `${ref} created`, "It's a draft — add line items, then send it to the guest.");
    return id;
  },
  addChildUnit: (parentId, label) => {
    const id = uid("p");
    const parent = propertyById(parentId);
    const prop: Property = {
      ...parent, id, name: `${parent.name} — ${label}`, code: `${parent.code}-${get().properties.filter((x) => x.parentId === parentId).length + 1}`,
      parentId, isParent: false, archived: false, order: get().properties.length,
    };
    if (!PROPERTIES.some((x) => x.id === id)) PROPERTIES.push(prop);
    get().markPending("Listings");
    set((st) => ({ properties: [...st.properties, prop] }));
    get().audit(`Child unit added under ${parent.name}: ${label}`, "ui");
    get().toast("ok", `${label} added`, "Inherits the parent's timezone, currency and channel mapping.");
    return id;
  },

  setQueuedState: (id, state) => set((st) => ({ msgQueue: st.msgQueue.map((m) => (m.id === id ? { ...m, state } : m)) })),
  resolveActionItem: (id, mode) => {
    set((st) => ({ actionItems: st.actionItems.map((a) => (a.id === id ? { ...a, status: mode } : a)) }));
    if (mode === "saved") get().toast("ok", "Answer saved to knowledge", "Concierge can now cite this source.");
    else get().toast("ok", "Task created", "Assigned to Wayan · due in 2 days");
  },

  addTask: (task) => { set((st) => ({ tasks: [task, ...st.tasks] })); get().audit(`Task created: ${task.title}`, "ui"); },
  toggleCheckItem: (taskId, itemId) =>
    set((st) => ({ tasks: st.tasks.map((t) => (t.id === taskId ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) } : t)) })),
  flagCheckItem: (taskId, itemId, note) => {
    const t = get().tasks.find((x) => x.id === taskId);
    const item = t?.checklist.find((c) => c.id === itemId);
    if (!t || !item) return;
    const issue: IssueReport = { id: uid("i"), taskId, propertyId: t.propertyId, item: item.label, note, photo: true, state: "pending", ts: Date.now() };
    set((st) => ({
      issues: [issue, ...st.issues],
      tasks: st.tasks.map((x) => (x.id === taskId ? { ...x, checklist: x.checklist.map((c) => (c.id === itemId ? { ...c, flagged: note } : c)) } : x)),
    }));
    get().toast("warn", "Issue reported", "Added to issue reports — escalate to a maintenance task when ready.");
  },
  completeTask: (taskId) =>
    set((st) => ({ tasks: st.tasks.map((t) => (t.id === taskId ? { ...t, status: "done", completedAt: Date.now(), checklist: t.checklist.map((c) => ({ ...c, done: true })) } : t)) })),
  setIssueState: (id, state, providerId) => set((st) => ({ issues: st.issues.map((i) => (i.id === id ? { ...i, state, providerId: providerId ?? i.providerId } : i)) })),
  escalateIssue: (id) => {
    const iss = get().issues.find((i) => i.id === id);
    if (!iss) return;
    const task: Task = { id: uid("t"), title: `Fix: ${iss.item}`, type: "maintenance", propertyId: iss.propertyId, assigneeId: null, due: Date.now() + 2 * 86_400_000, priority: "high", status: "open", checklist: [{ id: uid("ci"), label: iss.item, done: false, requiresPhoto: true }, { id: uid("ci"), label: "Photo before / after", done: false, requiresPhoto: true }], createdAt: Date.now() };
    set((st) => ({ tasks: [task, ...st.tasks], issues: st.issues.map((i) => (i.id === id ? { ...i, state: "accepted", escalatedToTaskId: task.id } : i)) }));
    get().toast("ok", "Escalated to maintenance task", task.title);
  },
  setExpenseApproval: (id, approval) => set((st) => ({ expenses: st.expenses.map((e) => (e.id === id ? { ...e, approval } : e)) })),
  addExpense: (e) => set((st) => ({ expenses: [e, ...st.expenses] })),

  replayWebhook: (epId, delId) => {
    set((st) => ({ webhooks: st.webhooks.map((w) => (w.id === epId ? { ...w, deliveries: [{ id: uid("d"), ts: Date.now(), event: "manual replay", status: 202, ms: 0, response: "queued · HMAC-SHA256 signed (t=…, v1=…)" }, ...w.deliveries] } : w)) }));
    later(() => get().toast("ok", "Delivery replayed", "202 Accepted · signature verified"), 800);
  },
  resolveConflict: (id, accept) => {
    set((st) => ({ conflicts: st.conflicts.filter((c) => c.id !== id) }));
    get().toast(accept ? "ok" : "info", accept ? "Mapping applied" : "Reservation returned to channel", accept ? "Room type mapped · reservation imported & calendar blocked" : "Channel notified to cancel or re-send with mapped type");
  },
  retrySync: (key) => {
    set((st) => ({ sync: st.sync.map((s) => (s.key === key ? { ...s, queueDepth: Math.max(0, s.queueDepth - 1) } : s)) }));
    later(() => {
      set((st) => ({ sync: st.sync.map((s) => (s.key === key ? { ...s, lastSuccessTs: Date.now(), errorRate24h: Math.max(0.02, s.errorRate24h - 0.2), state: "live", queueDepth: 0 } : s)) }));
      get().toast("ok", "Connection recovered", "Full availability + rates re-pushed · trace id tr-88f21c");
    }, 1400);
  },

  moveBlock: (pageId, blockId, dir) =>
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((pg) => {
          if (pg.id !== pageId) return pg;
          const idx = pg.blocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return pg;
          const to = dir === "up" ? idx - 1 : idx + 1;
          if (to < 0 || to >= pg.blocks.length) return pg;
          const blocks = [...pg.blocks];
          const [b] = blocks.splice(idx, 1);
          blocks.splice(to, 0, b);
          return { ...pg, blocks };
        }),
      },
    })),
  moveBlockTo: (pageId, blockId, toIndex) =>
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((pg) => {
          if (pg.id !== pageId) return pg;
          const idx = pg.blocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return pg;
          const blocks = [...pg.blocks];
          const [b] = blocks.splice(idx, 1);
          blocks.splice(Math.max(0, Math.min(toIndex, blocks.length)), 0, b);
          return { ...pg, blocks };
        }),
      },
    })),
  addBlock: (pageId, type, afterId) =>
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((pg) => {
          if (pg.id !== pageId) return pg;
          const nb: Block = { id: uid("b"), type, style: { width: "full", py: 28, px: 24, mt: 0, mb: 0, bg: "", color: "", scale: 1, align: "left", radius: 3 } };
          const blocks = [...pg.blocks];
          const at = afterId ? blocks.findIndex((b) => b.id === afterId) : -1;
          blocks.splice(at < 0 ? blocks.length : at + 1, 0, nb);
          return { ...pg, blocks };
        }),
      },
    })),
  duplicateBlock: (pageId, blockId) =>
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((pg) => {
          if (pg.id !== pageId) return pg;
          const idx = pg.blocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return pg;
          const blocks = [...pg.blocks];
          const src = blocks[idx];
          blocks.splice(idx + 1, 0, { ...src, id: uid("b"), style: { ...DEFAULT_BLOCK_STYLE, ...src.style } });
          return { ...pg, blocks };
        }),
      },
    })),
  updateBlock: (pageId, blockId, patch) =>
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((pg) =>
          pg.id === pageId
            ? { ...pg, blocks: pg.blocks.map((b) => (b.id === blockId ? { ...b, ...patch, content: { ...b.content, ...patch.content }, style: { ...DEFAULT_BLOCK_STYLE, ...b.style, ...patch.style } } : b)) }
            : pg,
        ),
      },
    })),
  removeBlock: (pageId, blockId) =>
    set((st) => ({
      website: { ...st.website, pages: st.website.pages.map((pg) => (pg.id === pageId ? { ...pg, blocks: pg.blocks.filter((b) => b.id !== blockId) } : pg)) },
    })),
  siteChrome: {
    header: "Sanggraha Villas",
    footer: "© Sanggraha Villas — hand-run boutique stays across Bali.",
    headerLinks: [
      { id: "hl1", label: "Villas", url: "/villas" },
      { id: "hl2", label: "Services", url: "/services" },
      { id: "hl3", label: "Journal", url: "/journal" },
      { id: "hl4", label: "Contact", url: "/contact" },
    ],
    footerLinks: [
      { id: "fl1", label: "hello@sanggraha.co", url: "mailto:hello@sanggraha.co" },
      { id: "fl2", label: "Instagram", url: "https://instagram.com/sanggraha" },
      { id: "fl3", label: "WhatsApp", url: "https://wa.me/62812390110" },
    ],
    headerBg: "#161a12", headerColor: "#f4f5f0", footerBg: "#0e110c", footerColor: "#9aa394",
    align: "left",
    logoMode: "text", logoText: "Sanggraha", logoUrl: "", logoSize: 26,
    tagline: "Boutique Bali, run properly.", taglineVisible: true,
    showCta: true, ctaLabel: "Book direct", ctaUrl: "/search",
    footerText: "© Sanggraha Villas — hand-run boutique stays across Bali.",
    headerBlocks: [],
    footerBlocks: [{ id: "fb-copy", type: "rich_text", content: { text: "Hand-run boutique stays across Bali. Butlers, chefs, honest pricing." } }],
  },
  setSiteChrome: (patch) => set((st) => ({ siteChrome: { ...st.siteChrome, ...patch } })),
  reorderSiteLinks: (target, fromId, toIdx) => {
    set((st) => {
      const key = target === "header" ? "headerLinks" : "footerLinks";
      const list = [...st.siteChrome[key]];
      const i = list.findIndex((l) => l.id === fromId);
      if (i < 0) return st;
      const [l] = list.splice(i, 1);
      list.splice(Math.min(toIdx, list.length), 0, l);
      return { siteChrome: { ...st.siteChrome, [key]: list } };
    });
  },
  addChromeBlock: (target, type) => {
    const key = target === "header" ? "headerBlocks" : "footerBlocks";
    const block: Block = { id: uid("cb"), type, content: defaultBlockContent(type) };
    set((st) => ({ siteChrome: { ...st.siteChrome, [key]: [...st.siteChrome[key], block] } }));
    get().toast("ok", "Block added to " + target, "Click its text to edit in place.");
  },
  updateChromeBlock: (target, id, patch) => {
    const key = target === "header" ? "headerBlocks" : "footerBlocks";
    set((st) => ({
      siteChrome: {
        ...st.siteChrome,
        [key]: st.siteChrome[key].map((b) => (b.id === id ? { ...b, ...patch, content: { ...b.content, ...patch.content }, style: { ...DEFAULT_BLOCK_STYLE, ...b.style, ...patch.style } } : b)),
      },
    }));
  },
  removeChromeBlock: (target, id) => {
    const key = target === "header" ? "headerBlocks" : "footerBlocks";
    set((st) => ({ siteChrome: { ...st.siteChrome, [key]: st.siteChrome[key].filter((b) => b.id !== id) } }));
  },
  moveChromeBlock: (target, id, dir) => {
    const key = target === "header" ? "headerBlocks" : "footerBlocks";
    set((st) => {
      const list = [...st.siteChrome[key]];
      const i = list.findIndex((b) => b.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return st;
      const [b] = list.splice(i, 1);
      list.splice(j, 0, b);
      return { siteChrome: { ...st.siteChrome, [key]: list } };
    });
  },
  duplicateChromeBlock: (target, id) => {
    const key = target === "header" ? "headerBlocks" : "footerBlocks";
    set((st) => {
      const list = [...st.siteChrome[key]];
      const i = list.findIndex((b) => b.id === id);
      if (i < 0) return st;
      list.splice(i + 1, 0, { ...list[i], id: uid("cb"), style: { ...DEFAULT_BLOCK_STYLE, ...list[i].style }, content: JSON.parse(JSON.stringify(list[i].content ?? {})) });
      return { siteChrome: { ...st.siteChrome, [key]: list } };
    });
  },

  invoiceTemplate: {
    brandSync: true,
    accent: "#0e6b4e", ink: "#141811", paper: "#ffffff", radius: 3,
    headingFamily: "Big Shoulders Display", bodyFamily: "Atkinson Hyperlegible",
    businessName: "PT Sanggraha Hospitality", businessAddr: "Jl. Pantai Berawa No. 12, Canggu, Bali 80361",
    businessMeta: "NPWP 84.221.773.8-903.000 · hello@sanggraha.co",
    invoiceWord: "INVOICE", note: "Thank you for staying with us.",
    termsText: "Deposit 30% at booking · balance due 14 days before arrival · all amounts in IDR.",
    footerText: "PT Sanggraha Hospitality · stay.sanggraha.co",
    showLogo: true, align: "left" as "left" | "center" | "right",
    sections: ["brand", "billto", "items", "totals", "terms", "footer"],
  },
  setInvoiceTemplate: (patch) => set((st) => ({ invoiceTemplate: { ...st.invoiceTemplate, ...patch } })),
  emailTemplate: { accent: "#0e6b4e", bandInk: "#141811", bodyFamily: "Atkinson Hyperlegible", headingFamily: "Big Shoulders Display", radius: 3, brandSync: true, footerNote: "You're receiving this because you booked with Sanggraha Villas." },
  setEmailTemplate: (patch) => set((st) => ({ emailTemplate: { ...st.emailTemplate, ...patch } })),

  workspacePrefs: {
    name: WORKSPACE.name, country: "Indonesia", tz: WORKSPACE.tz, dateFormat: WORKSPACE.dateFormat,
    timeFormat: WORKSPACE.timeFormat, weekStart: WORKSPACE.weekStart,
    supportAccess: WORKSPACE.supportAccess, ownerFinancialsVisible: WORKSPACE.ownerFinancialsVisible,
  },
  setWorkspacePrefs: (patch) => {
    set((st) => {
      const next = { ...st.workspacePrefs, ...patch };
      // Keep the shared WORKSPACE object in sync for module-level readers.
      WORKSPACE.name = next.name; WORKSPACE.tz = next.tz; WORKSPACE.dateFormat = next.dateFormat;
      WORKSPACE.timeFormat = next.timeFormat; WORKSPACE.weekStart = next.weekStart;
      WORKSPACE.supportAccess = next.supportAccess; WORKSPACE.ownerFinancialsVisible = next.ownerFinancialsVisible;
      return { workspacePrefs: next };
    });
    get().markPending("Settings");
  },

  brand: { ...DEFAULT_BRAND },
  setBrand: (patch) => {
    const next = { ...get().brand, ...patch };
    applyBrand(next);
    set({ brand: next });
  },
  savedAssets: [
    ...PROPERTIES.slice(0, 5).map((p, i) => ({ id: `img-p${i}`, name: `${p.name} · cover`, url: p.image, kind: "image" as const, propertyId: p.id })),
    ...PROPERTIES.slice(0, 5).map((p, i) => ({ id: `img-p${i}-b`, name: `${p.name} · pool & grounds`, url: PROPERTIES[(i + 1) % Math.min(5, PROPERTIES.length)]?.image || p.image, kind: "image" as const, propertyId: p.id })),
    { id: "copy-welcome", name: "Welcome copy", url: "", kind: "copy" as const, note: "Boutique Bali, run properly. Nine staffed villas, honest pricing, real hosts." },
    { id: "copy-faq-checkin", name: "FAQ · Check-in", url: "", kind: "copy" as const, note: "Check-in is from 14:00 WITA. Early arrival? Ask us — we hold bags and open the pool." },
    { id: "copy-faq-pool", name: "FAQ · Pool", url: "", kind: "copy" as const, note: "Pools are cleaned daily and sit around 29°. Not heated, but Bali rarely needs it." },
  ],
  addSavedAsset: (a) => set((st) => ({ savedAssets: [...st.savedAssets, { ...a, id: uid("asset") }] })),
  removeSavedAsset: (id) => set((st) => ({ savedAssets: st.savedAssets.filter((x) => x.id !== id) })),

  setSiteTheme: (patch) => { get().markPending("Websites"); set((st) => ({ website: { ...st.website, theme: { ...st.website.theme, ...patch } } })); },
  setSiteActivePage: (id) => set((st) => ({ website: { ...st.website, activePageId: id } })),

  addPage: (name) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `page-${Date.now()}`;
    const pg: SitePage = {
      id: uid("pg"), name, slug,
      seo: { title: `${name} — Sanggraha Villas`, description: "" },
      visible: true,
      blocks: [
        { id: uid("b"), type: "hero", content: { ...defaultBlockContent("hero"), headline: name, sub: "A new page on your site — click any text to edit." } },
        { id: uid("b"), type: "rich_text", content: defaultBlockContent("rich_text") },
        { id: uid("b"), type: "cta_banner", content: defaultBlockContent("cta_banner") },
      ],
    };
    get().markPending("Websites");
    set((st) => ({ website: { ...st.website, pages: [...st.website.pages, pg], activePageId: pg.id } }));
    get().toast("ok", `Page “${name}” created`, `/${slug} — added to navigation automatically. Hit Save to keep it.`);
  },
  deletePage: (id) => {
    const st0 = get();
    const pg = st0.website.pages.find((p) => p.id === id);
    if (!pg) return;
    if (pg.home) { st0.toast("warn", "The home page is protected", "Every site needs a front door."); return; }
    const remaining = st0.website.pages.filter((p) => p.id !== id);
    get().markPending("Websites");
    set((st) => ({
      website: {
        ...st.website,
        pages: remaining,
        activePageId: st.website.activePageId === id ? remaining[0]?.id ?? st.website.activePageId : st.website.activePageId,
      },
    }));
    get().toast("warn", `Deleted “${pg.name}”`, "The URL will 301-redirect to home after you save.");
  },
  updatePage: (pageId, patch) => {
    get().markPending("Websites");
    set((st) => ({
      website: {
        ...st.website,
        pages: st.website.pages.map((p) => (p.id === pageId ? { ...p, ...patch, seo: { ...p.seo, ...patch.seo } } : p)),
      },
    }));
  },

  duplicateSite: () => {
    const st = get();
    const clonePage = (pg: SitePage): SitePage => ({
      ...pg, id: uid("pg"), slug: pg.slug ? `${pg.slug}-copy` : "copy", home: false,
      seo: { ...pg.seo },
      blocks: pg.blocks.map((b) => ({ ...b, id: uid("b"), content: { ...b.content }, style: { ...DEFAULT_BLOCK_STYLE, ...b.style } })),
    });
    const copies = st.website.pages.map(clonePage);
    get().markPending("Websites");
    set((s) => ({
      website: { ...s.website, subdomain: `${s.website.subdomain}-copy`, pages: [...s.website.pages, ...copies], activePageId: copies[0].id },
    }));
    get().audit(`Site duplicated — ${copies.length} pages cloned`, "ui");
    get().toast("ok", "Copy created", `${copies.length} pages cloned under a new subdomain. You're now editing the copy — hit Save.`);
  },

  resetSite: () => {
    const home: SitePage = {
      id: uid("pg"), name: "Home", slug: "home", home: true, visible: true,
      seo: { title: "Sanggraha Villas", description: "" },
      blocks: [
        { id: uid("b"), type: "hero", content: defaultBlockContent("hero") },
        { id: uid("b"), type: "cta_banner", content: defaultBlockContent("cta_banner") },
      ],
    };
    get().markPending("Websites");
    set((s) => ({ website: { ...s.website, pages: [home], activePageId: home.id, published: false } }));
    get().audit("Site deleted — unpublished and reset to a blank Home page", "ui");
    get().toast("warn", "Site deleted", "Unpublished and reset. Listings, pricing and settings are untouched.");
  },

  collections: COLLECTIONS,
  updateCollection: (id, patch) => {
    get().markPending("Websites");
    set((st) => ({ collections: st.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  },
  addCollection: () => {
    const c: Collection = { id: uid("col"), name: "New collection", slug: `collection-${get().collections.length + 1}`, rule: "Manual", itemIds: PROPERTIES.slice(0, 3).map((p) => p.id), featured: false };
    get().markPending("Websites");
    set((st) => ({ collections: [c, ...st.collections] }));
    get().toast("ok", "Collection created", "Edit its name, slug and listings — then Save.");
  },
  removeCollection: (id) => {
    get().markPending("Websites");
    set((st) => ({ collections: st.collections.filter((c) => c.id !== id) }));
    get().toast("warn", "Collection removed", "Its landing page unpublished.");
  },

  pending: { count: 0, modules: [], savedAt: null },
  markPending: (module) =>
    set((st) => ({ pending: { ...st.pending, count: st.pending.count + 1, modules: st.pending.modules.includes(module) ? st.pending.modules : [...st.pending.modules, module] } })),
  flushPending: () => {
    const p = get().pending;
    if (p.count === 0) return;
    set({ pending: { count: 0, modules: [], savedAt: Date.now() } });
    // Registered customers: force a synchronous persist so "Saved" is truthful.
    const s = get().session;
    const durable = !!(tenantPersisted && s && s.kind === "tenant");
    if (durable) {
      try { saveTenantState(s!.tenantId, snapshotSlice()); } catch { /* ignore */ }
    }
    get().audit(`Saved changes · ${p.count} edit${p.count > 1 ? "s" : ""} across ${p.modules.join(", ")}`, "ui");
    get().toast("ok", durable ? "All changes saved securely" : "All changes saved", `${p.count} edit${p.count > 1 ? "s" : ""} · ${p.modules.join(", ")}${durable ? " · stored to your workspace" : ""}`);
  },

  // ── Per-property photo libraries ────────────────────────────────────────
  propertyPhotos: (() => {
    // Restore any persisted libraries; the rest seed lazily on first open.
    const out: Record<string, PhotoEntry[]> = {};
    for (const p of PROPERTIES) {
      const saved = readLibrary(p.id);
      if (saved && saved.length) out[p.id] = saved;
    }
    return out;
  })(),

  ensurePhotoLibrary: (propId) => {
    if (get().propertyPhotos[propId]?.length) return;
    set((st) => ({ propertyPhotos: { ...st.propertyPhotos, [propId]: otaSeedPhotos(propId, st.properties) } }));
    writeLibrary(propId, get().propertyPhotos[propId]);
  },

  uploadPhotos: async (propId, files) => {
    get().ensurePhotoLibrary(propId);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) { get().toast("warn", "No images in that selection", "Pick JPG / PNG / WebP files."); return 0; }
    let added = 0;
    let photos = [...(get().propertyPhotos[propId] ?? [])];
    for (const f of list) {
      try {
        const { url, bytes } = await compressImage(f);
        if (photos.reduce((s, p) => s + (p.bytes ?? 0), 0) + bytes > QUOTA_BYTES) {
          get().toast("warn", "Browser storage nearly full", "Delete a few photos or connect the Supabase bucket for unlimited storage.");
          break;
        }
        photos.push({ id: uid("ph"), url, label: f.name.replace(/\.[a-z]+$/i, ""), source: "upload", bytes });
        added++;
      } catch {
        get().toast("err", `Couldn't read ${f.name}`, "The file may be corrupt or unsupported.");
      }
    }
    const { ok } = writeLibrary(propId, photos);
    set((st) => ({ propertyPhotos: { ...st.propertyPhotos, [propId]: photos } }));
    get().markPending("Listings");
    if (added > 0) get().toast(ok ? "ok" : "warn", `${added} photo${added > 1 ? "s" : ""} uploaded`, ok ? "Compressed & saved to this browser · survives reload." : "Saved for this session only — storage quota reached.");
    return added;
  },

  deletePhoto: (propId, photoId) => {
    set((st) => {
      const photos = (st.propertyPhotos[propId] ?? []).filter((p) => p.id !== photoId);
      writeLibrary(propId, photos);
      return { propertyPhotos: { ...st.propertyPhotos, [propId]: photos } };
    });
    get().markPending("Listings");
    get().toast("info", "Photo deleted", "Removed from this property's library.");
  },

  renamePhoto: (propId, photoId, label) => {
    set((st) => {
      const photos = (st.propertyPhotos[propId] ?? []).map((p) => (p.id === photoId ? { ...p, label } : p));
      writeLibrary(propId, photos);
      return { propertyPhotos: { ...st.propertyPhotos, [propId]: photos } };
    });
  },

  setCoverPhoto: (propId, photoId) => {
    set((st) => {
      const photos = (st.propertyPhotos[propId] ?? []).map((p) => ({ ...p, label: p.label }));
      const chosen = photos.find((p) => p.id === photoId);
      if (chosen) {
        // move it first + point the property's public cover at it
        const rest = photos.filter((p) => p.id !== photoId);
        const next = [chosen, ...rest];
        writeLibrary(propId, next);
        return {
          propertyPhotos: { ...st.propertyPhotos, [propId]: next },
          properties: st.properties.map((pr) => (pr.id === propId ? { ...pr, image: chosen.url } : pr)),
        };
      }
      return st;
    });
    get().markPending("Listings");
    get().toast("ok", "Cover updated", "Calendar, site builder and OTA content now use this photo.");
  },

  movePhoto: (propId, photoId, dir) => {
    set((st) => {
      const photos = [...(st.propertyPhotos[propId] ?? [])];
      const i = photos.findIndex((p) => p.id === photoId);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= photos.length) return st;
      const [p] = photos.splice(i, 1);
      photos.splice(j, 0, p);
      writeLibrary(propId, photos);
      return { propertyPhotos: { ...st.propertyPhotos, [propId]: photos } };
    });
  },

  resyncOtaPhotos: (propId) => {
    const seeded = otaSeedPhotos(propId, get().properties);
    set((st) => {
      const uploads = (st.propertyPhotos[propId] ?? []).filter((p) => p.source === "upload");
      const next = [...seeded, ...uploads];
      writeLibrary(propId, next);
      return { propertyPhotos: { ...st.propertyPhotos, [propId]: next } };
    });
    get().markPending("Listings");
    get().toast("ok", "Re-synced from channels", `${seeded.length} OTA photos refreshed · your ${uploadsCount(get().propertyPhotos[propId])} upload${uploadsCount(get().propertyPhotos[propId]) === 1 ? "" : "s"} kept.`);
  },

  addProperty: (name, city) => {
    const id = uid("p");
    const base = PROPERTIES[0] || {} as any;
    const prop: Property = {
      ...base,
      id, name, code: name.slice(0, 3).toUpperCase(), city,
      parentId: null, isParent: false, archived: false,
      channels: { airbnb: "live", booking: "live", direct: "live" },
      order: get().properties.length,
    };
    const seeded = otaSeedPhotos(id, [prop, ...get().properties]);
    writeLibrary(id, seeded);
    // register in the shared lookup source so propertyById()/planFor() resolve it everywhere
    if (!PROPERTIES.some((x) => x.id === id)) PROPERTIES.push(prop);
    get().markPending("Listings");
    set((st) => ({
      properties: [...st.properties, prop],
      propertyPhotos: { ...st.propertyPhotos, [id]: seeded },
    }));
    get().audit(`Property created: ${name} (${city}) · OTA photos synced`, "ui");
    get().toast("ok", `${name} created`, `${seeded.length} photos synced from your connected channels — edit them in the photo manager.`);
    return id;
  },

  // Import a listing discovered on a connected OTA channel.
  importFromOta: (input) => {
    const id = uid("p");
    const base = PROPERTIES[0] || {} as any;
    const prop: Property = {
      ...base,
      id, name: input.name, code: input.name.slice(0, 3).toUpperCase(), city: input.city,
      parentId: null, isParent: false, archived: false,
      maxGuests: input.guests,
      channels: { [input.channel]: "live", direct: "live" },
      pricing: { ...base.pricing, plans: base.pricing.plans.map((pl) => (pl.kind === "base" ? { ...pl, nightly: input.nightly } : pl)) },
      order: get().properties.length,
    };
    const seeded = otaSeedPhotos(id, [prop, ...get().properties]);
    writeLibrary(id, seeded);
    if (!PROPERTIES.some((x) => x.id === id)) PROPERTIES.push(prop);
    get().markPending("Listings");
    set((st) => ({
      properties: [...st.properties, prop],
      propertyPhotos: { ...st.propertyPhotos, [id]: seeded },
    }));
    get().audit(`Listing imported from ${input.channel}: ${input.name} (${input.city})`, "channel_sync");
    get().toast("ok", `${input.name} imported from ${input.channel}`, "Photos, rate plan and availability are now live on your calendar.");
    return id;
  },

  sendChat: (channelId, body) =>
    set((st) => ({
      chat: st.chat.map((c) => (c.id === channelId ? { ...c, messages: [...c.messages, { id: uid("cm"), author: "You", body, ts: Date.now() }] } : c)),
    })),
  spendCredit: (n) => set((st) => ({ creditsUsed: st.creditsUsed + n })),

  // ── Messaging platform connections (WhatsApp / Instagram / Messenger / Gmail) ──
  msgConnections: MSG_PLATFORMS.map((p) => ({ ...p })),
  connectMsgPlatform: (id) => {
    const plat = MSG_PLATFORMS.find((p) => p.id === id);
    set((st) => ({ msgConnections: st.msgConnections.map((c) => (c.id === id ? { ...c, status: "connecting" as const } : c)) }));
    later(() => {
      set((st) => ({
        msgConnections: st.msgConnections.map((c) =>
          c.id === id
            ? { ...c, status: "connected" as const, lastSync: Date.now(), identity: c.identity ?? (id === "instagram" ? "@sanggraha.villas" : id === "messenger" ? "Sanggraha Villas page" : c.identity) }
            : c,
        ),
      }));
      get().toast("ok", `${plat?.name ?? id} connected`, "Webhook verified · inbound threads land in your inbox.");
      get().audit(`Messaging platform connected: ${plat?.name ?? id}`, "ui");
      // prove the pipe works: a guest message arrives a few seconds later
      later(() => simulateInbound(get, set, id), 3500);
    }, 1300);
  },
  disconnectMsgPlatform: (id) => {
    const plat = MSG_PLATFORMS.find((p) => p.id === id);
    set((st) => ({ msgConnections: st.msgConnections.map((c) => (c.id === id ? { ...c, status: "disconnected" as const, lastSync: null } : c)) }));
    get().toast("warn", `${plat?.name ?? id} disconnected`, "Existing threads stay readable; new messages will queue.");
    get().audit(`Messaging platform disconnected: ${plat?.name ?? id}`, "ui");
  },
  reconnectMsgPlatform: (id) => {
    set((st) => ({ msgConnections: st.msgConnections.map((c) => (c.id === id ? { ...c, status: "connecting" as const } : c)) }));
    later(() => {
      set((st) => ({ msgConnections: st.msgConnections.map((c) => (c.id === id ? { ...c, status: "connected" as const, lastSync: Date.now() } : c)) }));
      get().toast("ok", "Reconnected", "Backlog drained · nothing was lost.");
    }, 900);
  },
}));

// ── registered-customer persistence ────────────────────────────────────────
// Only a signed-in REGISTERED customer's workspace is durable. Demo tenants
// (Sanggraha / Ambara) re-seed from pristine data on every visit.
let tenantPersisted = false;

// The guest registry lives in the data module, not in the store, so
// pickTenantSlice() cannot see it. Reservations reference guests by id, so the
// two must be written together or a restored booking resolves to nothing.
function snapshotSlice() {
  return {
    ...pickTenantSlice(useApp.getState() as unknown as Record<string, unknown>),
    guests: [...GUESTS],
  };
}

function applyStoredSlice(tenantId: string): boolean {
  const slice = loadTenantState(tenantId);
  if (!slice) return false;
  useApp.setState(slice as Partial<App>);
  syncModulesFromSlice(slice as Record<string, unknown>);
  // Keep the shared WORKSPACE object aligned with the restored prefs so
  // module-level readers (invoices, integrations) see the tenant's settings.
  const prefs = slice.workspacePrefs as WorkspacePrefs | undefined;
  if (prefs) {
    WORKSPACE.name = prefs.name; WORKSPACE.tz = prefs.tz; WORKSPACE.dateFormat = prefs.dateFormat;
    WORKSPACE.timeFormat = prefs.timeFormat; WORKSPACE.weekStart = prefs.weekStart;
    WORKSPACE.supportAccess = prefs.supportAccess; WORKSPACE.ownerFinancialsVisible = prefs.ownerFinancialsVisible;
  }
  return true;
}


// Boot restore: layer the customer's saved workspace over the empty scaffold.
if (bootCustomer) {
  tenantPersisted = true;
  applyStoredSlice(bootCustomer.tenantId);
  // Pull latest from server in background
  import("./lib/tenantPersist").then((m) => {
    m.pullTenantState(bootCustomer!.tenantId).then((remote) => {
      if (remote) {
        try {
          const raw = localStorage.getItem("derzen.tenant." + bootCustomer!.tenantId + ".v1");
          const localTs = raw ? JSON.parse(raw).savedAt : 0;
          if (remote.savedAt > localTs) {
             useApp.setState(remote.slice as Partial<App>);
             syncModulesFromSlice(remote.slice as Record<string, unknown>);
          }
        } catch { /* ignore */ }
      }
    });
  });
}


// Debounced auto-save: every state change for a registered customer is
// serialized to their private, tenant-scoped key.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useApp.subscribe((st) => {
  const s = st.session;
  if (!tenantPersisted || !s || s.kind !== "tenant") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      saveTenantState(s.tenantId, snapshotSlice());
    } catch { /* storage full — in-memory state remains authoritative for the session */ }
  }, 600);
});

// Simulate a guest writing in through a freshly connected platform, so the
// integration is demonstrably live end-to-end (inbox thread + unread badge).
function simulateInbound(
  get: () => App,
  set: (fn: (st: App) => Partial<App>) => void,
  platformId: string,
) {
  const st = get();
  const g = GUESTS[st.msgConnections.length % Math.max(1, GUESTS.length)] || {} as any;
  const p = PROPERTIES.find((x) => !x.archived && !x.isParent) ?? (PROPERTIES[0] || {} as any);
  const channel = (platformId === "gmail" ? "email" : platformId) as Conversation["channel"];
  const bodies = [
    "Hi! Would an early check-in around 12:30 be possible?",
    "Hello — do you arrange airport pickup from DPS?",
    "Is the pool private to the villa?",
    "Could we add a chef dinner on our second night?",
  ];
  const conv: Conversation = {
    id: uid("c"), guestId: g.id, propertyId: p.id, channel,
    subject: `Question via ${platformId === "gmail" ? "email" : platformId}`,
    unread: 1, needsReply: true, escalated: false, notes: "",
    messages: [{ id: uid("m"), from: "guest", body: bodies[Math.floor(Math.random() * bodies.length)], ts: Date.now() }],
  };
  set((s) => ({ conversations: [conv, ...s.conversations] }));
  get().toast("info", `New message · ${g.name}`, `Arrived via ${platformId === "gmail" ? "Gmail" : platformId} — threaded in your inbox.`);
}

// ── selectors ──────────────────────────────────────────────────────────────
export const useUnreadTotal = () => useApp((s) => s.conversations.reduce((n, c) => n + c.unread, 0));
export const useOpenTasks = () => useApp((s) => s.tasks.filter((t) => t.status === "open" || t.status === "in_progress").length);
export const useOverdue = () => useApp((s) => s.tasks.filter((t) => (t.status === "open" || t.status === "in_progress") && t.due < Date.now()).length);
export const useSyncAlerts = () => useApp((s) => s.sync.filter((x) => x.state === "error" || Date.now() - x.lastSuccessTs > 2 * 3_600_000).length);

export const scopedProperties = (props: Property[], scope: string) =>
  scope === "all" ? props : props.filter((p) => p.id === scope || p.parentId === scope);

export function arrivalsOn(reservations: Reservation[], offset: number, scope: string) {
  const key = dayKey(addDays(today(), offset));
  return reservations.filter((r) => r.checkIn === key && r.status !== "cancelled" && (scope === "all" || r.propertyId === scope || propertyById(r.propertyId).parentId === scope));
}
export function departuresOn(reservations: Reservation[], offset: number, scope: string) {
  const key = dayKey(addDays(today(), offset));
  return reservations.filter((r) => r.checkOut === key && ["checked_in", "confirmed", "deposit_paid"].includes(r.status) && (scope === "all" || r.propertyId === scope || propertyById(r.propertyId).parentId === scope));
}
export function nightsInRange(r: Reservation, fromKey: string, toKey: string) {
  // Half-open [checkIn, checkOut). A same-day stay (checkIn === checkOut) is a
  // day-use booking that occupies exactly that one day.
  const effOut = r.checkOut === r.checkIn ? dayKey(addDays(parseKey(r.checkIn), 1)) : r.checkOut;
  return r.checkIn < toKey && effOut > fromKey;
}
export const resNights = (r: Reservation) => Math.max(1, nightsBetween(r.checkIn, r.checkOut));
