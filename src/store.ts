import { create } from "zustand";
import type { Locale } from "./lib/i18n";
import { t as tr } from "./lib/i18n";
import { uid, addDays, dayKey, today, nightsBetween, parseKey } from "./lib/format";
import type {
  AuditEntry, Block, BlockStyle, Conversation, Expense, Guidebook, IssueReport, OnboardStep, Property,
  QueuedMessage, Quote, Reservation, Review, SavedAsset, SiteChrome, SyncState, Task, Toast, WebsiteState, Message,
} from "./lib/types";
import { DEFAULT_WIDGET_STYLE, type WidgetStyle } from "./lib/widgetTheme";
import { DEFAULT_BRAND, applyBrand, type BrandState } from "./lib/brand";
import { defaultBlockContent } from "./lib/blockContent";
import type { InvoiceTemplate, EmailTemplate } from "./lib/types";

export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  width: "full", py: 28, px: 24, mt: 0, mb: 0, bg: "", color: "", scale: 1, align: "left", radius: 3,
};
import {
  ACTION_ITEMS, AUDIT, CONFLICTS, CONVERSATIONS, EXPENSES, GUIDEBOOKS, ISSUES, MEMBERS,
  MSG_QUEUE, ONBOARD_STEPS, PROPERTIES, QUOTES, RESERVATIONS, REVIEWS, SYNC, TASKS,
  WEBHOOKS, WEBSITE, WORKSPACE, channelDef, propertyById, FX_TO_EUR,
} from "./lib/data";
import { setDisplayCurrency, refreshFx, type CurrencyCode } from "./lib/fx";
import {
  AI_DEFAULTS, DEVELOPER, PLATFORM_INTEGRATIONS, TENANTS, hydrateTenantData,
  type PlatformIntegration, type TenantMeta,
} from "./lib/tenants";

// ── sessions & tenant-scoped boot ──────────────────────────────────────────
export type Session =
  | { kind: "tenant"; tenantId: string; impersonated?: boolean }
  | { kind: "developer" };

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
    return s;
  } catch { return null; }
}
function saveSession(s: Session | null) {
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
}
const bootSession = loadSession();
if (bootSession?.kind === "tenant" && bootSession.tenantId) {
  const meta = TENANTS.find((t) => t.id === bootSession.tenantId);
  hydrateTenantData(bootSession.tenantId);
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
  loginTenant: (email: string, pw: string) => { ok: boolean; error?: string };
  loginDeveloper: (email: string, pw: string) => { ok: boolean; error?: string };
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

  // ── developer-in-tenant & tenant branding ──
  tenantFonts: Record<string, { headingUrl: string; headingFamily: string; bodyUrl: string; bodyFamily: string }>;
  setTenantFonts: (tenantId: string, fonts: { headingUrl: string; headingFamily: string; bodyUrl: string; bodyFamily: string }) => void;
  widgetStyle: WidgetStyle;
  setWidgetStyle: (patch: Partial<WidgetStyle>) => void;
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
const later = (fn: () => void, ms: number) => { timerSeq += 1; window.setTimeout(fn, ms); };

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
  loginTenant: (email, pw) => {
    const t = TENANTS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!t) return { ok: false, error: "No workspace is registered under that email." };
    if (pw !== t.password) return { ok: false, error: "Incorrect password for this workspace." };
    if (t.suspended) return { ok: false, error: "This workspace is suspended — contact platform support." };
    hydrateTenantData(t.id);
    setDisplayCurrency(t.currency);
    const session: Session = { kind: "tenant", tenantId: t.id };
    saveSession(session);
    set({ session, features: { ...t.features }, displayCurrency: t.currency, fxTick: get().fxTick + 1 });
    return { ok: true };
  },
  loginDeveloper: (email, pw) => {
    if (email.trim().toLowerCase() !== DEVELOPER.email || pw !== DEVELOPER.password)
      return { ok: false, error: "Developer credentials not recognised." };
    // Developer sessions are deliberately NOT persisted. They live only in memory
    // for the current page, so no client-writable localStorage key on any origin
    // (tenant or dev host) can ever establish or re-establish one. Reload = re-auth.
    const session: Session = { kind: "developer" };
    set({ session, features: null });
    return { ok: true };
  },
  logout: () => {
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

  setCalendarCell: (propId, key, patch) =>
    set((st) => ({
      calendarOverrides: { ...st.calendarOverrides, [propId]: { ...st.calendarOverrides[propId], [key]: { ...st.calendarOverrides[propId]?.[key], ...patch } } },
    })),
  manualBlock: (propId, keys, patch) => {
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
    set((st) => ({ reservations: [res, ...st.reservations] }));
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

  brand: { ...DEFAULT_BRAND },
  setBrand: (patch) => {
    const next = { ...get().brand, ...patch };
    applyBrand(next);
    set({ brand: next });
  },
  savedAssets: [
    ...PROPERTIES.slice(0, 5).map((p, i) => ({ id: `img-p${i}`, name: `${p.name} · cover`, url: p.image, kind: "image" as const, propertyId: p.id })),
    ...PROPERTIES.slice(0, 5).map((p, i) => ({ id: `img-p${i}-b`, name: `${p.name} · pool & grounds`, url: PROPERTIES[(i + 1) % 5].image, kind: "image" as const, propertyId: p.id })),
    { id: "copy-welcome", name: "Welcome copy", url: "", kind: "copy" as const, note: "Boutique Bali, run properly. Nine staffed villas, honest pricing, real hosts." },
    { id: "copy-faq-checkin", name: "FAQ · Check-in", url: "", kind: "copy" as const, note: "Check-in is from 14:00 WITA. Early arrival? Ask us — we hold bags and open the pool." },
    { id: "copy-faq-pool", name: "FAQ · Pool", url: "", kind: "copy" as const, note: "Pools are cleaned daily and sit around 29°. Not heated, but Bali rarely needs it." },
  ],
  addSavedAsset: (a) => set((st) => ({ savedAssets: [...st.savedAssets, { ...a, id: uid("asset") }] })),
  removeSavedAsset: (id) => set((st) => ({ savedAssets: st.savedAssets.filter((x) => x.id !== id) })),

  setSiteTheme: (patch) => set((st) => ({ website: { ...st.website, theme: { ...st.website.theme, ...patch } } })),
  setSiteActivePage: (id) => set((st) => ({ website: { ...st.website, activePageId: id } })),

  sendChat: (channelId, body) =>
    set((st) => ({
      chat: st.chat.map((c) => (c.id === channelId ? { ...c, messages: [...c.messages, { id: uid("cm"), author: "You", body, ts: Date.now() }] } : c)),
    })),
  spendCredit: (n) => set((st) => ({ creditsUsed: st.creditsUsed + n })),
}));

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
