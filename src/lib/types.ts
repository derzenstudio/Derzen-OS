// ── Trellis domain model (every entity is tenant-scoped server-side) ──────

export type ChannelId =
  | "airbnb" | "booking" | "vrbo" | "expedia" | "agoda" | "trip"
  | "mmt" | "traveloka" | "ical" | "direct";

export type ChannelStatus = "live" | "paused" | "error" | "off";
export type MapState = "unmapped" | "mapping" | "live" | "paused" | "error";

export interface ChannelDef {
  id: ChannelId;
  name: string;
  short: string;
  color: string;
  structure: "unit" | "hotel";
  auth: "oauth" | "extranet" | "email_code" | "api_key";
  currency: string; // channel settlement currency
  markupPct: number;
  replyWindowH: number | null; // public reply deadline, hours
}

export interface RatePlan {
  id: string;
  name: string;
  kind: "base" | "season";
  season?: "high" | "low" | "mid" | "peak";
  nightly: number; // minor units, listing currency
  months?: number[]; // 0-11, for seasonal plans
}

export interface Pricing {
  plans: RatePlan[];
  extraGuestAfter: number;   // guests included in base
  extraGuestFee: number;     // per additional guest / night
  childDiscountPct: number;  // age band below
  childAgeMax: number;       // e.g. 12 → children ≤12 get discount; infants free
  cleaningFee: number;
  serviceFeePct: number;     // platform/direct service fee
  vatPct: number;
  weeklyPct: number;         // length-of-stay discount
  monthlyPct: number;
}

export interface Property {
  id: string;
  name: string;
  code: string;
  city: string;
  region: string;
  tz: string;           // IANA, e.g. Asia/Makassar
  tzShort: string;      // e.g. WITA
  currency: string;     // listing currency
  pricing: Pricing;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  parentId: string | null;  // multi-unit child
  isParent: boolean;
  image: string;
  channels: Partial<Record<ChannelId, ChannelStatus>>;
  archived: boolean;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  maxNights: number;
  maxAdvanceDays: number;
  publishDirect: boolean;
  checkoutEnabled: boolean;
  managed: boolean;
  commissionPct: number;
  amenities: string[];
  order: number;
  map: { x: number; y: number }; // schematic map position
}

export type ResStatus =
  | "enquiry" | "pending" | "confirmed" | "deposit_paid" | "checked_in"
  | "checked_out" | "cancelled" | "no_show";

export interface LineItem { label: string; kind: "night" | "fee" | "tax" | "addon" | "discount" | "extra_guest"; amount: number; }
export interface Payment { id: string; ts: number; amount: number; currency: string; method: string; kind: "payment" | "refund"; note?: string; }
export interface TimelineEvent { ts: number; label: string; source: "ui" | "api" | "automation" | "channel_sync" | "ai"; detail?: string; }

export interface Reservation {
  id: string;
  ref: string;
  propertyId: string;
  guestId: string;
  channel: ChannelId;
  kind: "stay" | "service";
  serviceId?: string;
  checkIn: string; // dayKey, property-local
  checkOut: string;
  checkInTime: string; // "14:00" or "FLEXIBLE"
  adults: number;
  children: number;
  infants: number;
  status: ResStatus;
  items: LineItem[];
  total: number;           // minor units, channel currency
  currency: string;        // channel currency
  fxRate: number;          // channel → reporting currency
  fxTs: number;
  depositHeld: number;
  payments: Payment[];
  externalRef?: string;
  notes: string;
  guidebookCode: string;
  timeline: TimelineEvent[];
  archived: boolean;
  createdAt: number;
  addOns: string[];
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  propertyId: string;
  staffId: string;
  date: string; // dayKey
  start: string; // "16:00"
  guests: number;
  status: "scheduled" | "done" | "cancelled";
  value: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  capacity: number;
  price: number;
  currency: string;
  deposit: number;
  location: string;
  leadTimeH: number;
  image: string;
  active: boolean;
  checkoutEnabled: boolean;
}

export interface Guest {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  country: string;
  status: "active" | "vip" | "blocked";
  lastActivityTs: number;
  lastSource: ChannelId | "email" | "whatsapp" | "web";
  lifetimeSpend: number; // reporting currency minor
  tags: string[];
  notes: string;
  consentMarketing: boolean;
  aliases: string[]; // OTA alias emails deduped into this record
  verifiedId: boolean;
}

export interface Message {
  id: string;
  from: "guest" | "operator" | "ai";
  authorName?: string;
  body: string;
  ts: number;
  kind?: "text" | "attachment" | "system";
  attachmentName?: string;
  model?: string;
  citedSources?: string[];
}

export interface Conversation {
  id: string;
  guestId: string;
  propertyId: string;
  reservationId?: string;
  channel: ChannelId | "email" | "whatsapp";
  subject?: string;
  unread: number;
  needsReply: boolean;
  escalated: boolean;
  notes: string;
  messages: Message[];
}

export type Priority = "low" | "medium" | "high" | "urgent" | "emergency";
export type TaskStatus = "open" | "in_progress" | "done" | "expired";
export type TaskType = "cleaning" | "maintenance" | "inspection" | "custom";

export interface ChecklistItem { id: string; label: string; done: boolean; requiresPhoto: boolean; flagged?: string; }

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  propertyId: string;
  assigneeId: string | null;
  due: number; // ts
  priority: Priority;
  status: TaskStatus;
  checklist: ChecklistItem[];
  templateId?: string;
  templateVersion?: number;
  linkedReservationId?: string;
  createdAt: number;
  completedAt?: number;
  offlineQueued?: number; // items waiting to upload (staff mobile)
}

export interface TaskTemplate {
  id: string;
  name: string;
  type: TaskType;
  estMinutes: number;
  version: number;
  defaultRole: string;
  items: { label: string; requiresPhoto: boolean }[];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "admin" | "manager" | "coordinator" | "property_owner" | "staff";
  duty: "task" | "service" | "task_service" | "none";
  propertyIds: string[]; // scoping; empty = all
  pending?: boolean;
  color: string;
  isYou?: boolean;
  offline?: boolean;
}

export type ProviderSpec =
  | "plumbing" | "electrical" | "hvac" | "appliances" | "cleaning" | "structural"
  | "exterior" | "landscaping" | "pest_control" | "security" | "handyman";

export interface Provider {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  specialties: ProviderSpec[];
  hourlyRate: number;
  currency: string;
  status: "active" | "inactive" | "suspended";
  hasAppAccess: boolean;
  jobsDone: number;
}

export interface Review {
  id: string;
  guestName: string;
  propertyId: string;
  platform: ChannelId | "google" | "direct";
  nativeRating: number;
  nativeScale: 5 | 10;
  normalized: number; // /10
  date: number;
  body: string;
  reply?: string;
  repliedAt?: number;
  replyDeadline?: number;
  aiDraft?: string;
}

export type ExpenseCategory =
  | "cleaning" | "maintenance" | "salaries" | "software" | "subscriptions"
  | "supplies" | "taxes" | "utilities" | "custom";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  customLabel?: string;
  amount: number;
  currency: string;
  note: string;
  propertyId?: string;
  taskId?: string;
  receipt?: string;
  taxDeductible: boolean;
  recurring: boolean;
  approval: "pending" | "approved" | "rejected";
  vendor: string;
}

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "expired" | "converted" | "declined";
export interface Quote {
  id: string;
  ref: string;
  guestId: string;
  propertyId: string;
  serviceIds: string[];
  checkIn: string;
  checkOut: string;
  adults: number;
  items: LineItem[];
  total: number;
  currency: string;
  depositTerms: string;
  paymentTerms: string;
  expiresAt: number;
  status: QuoteStatus;
  createdAt: number;
}

export interface Upsell {
  id: string;
  name: string;
  price: number;
  currency: string;
  window: string;
  eligibility: string;
  prompt: string;
  offered: number;
  accepted: number;
  revenue: number;
  active: boolean;
}

export interface KnowledgeSource { id: string; kind: "document" | "text" | "url" | "auto"; name: string; ts: number; }
export interface KnowledgeScope {
  id: string;
  name: string;
  scope: "general" | "property" | "service";
  refId?: string;
  sources: KnowledgeSource[];
  rules: { id: string; kind: "hard" | "tone"; text: string }[];
}

export interface VariableDef {
  key: string;
  label: string;
  auto: boolean;
  value?: string;
  overrides?: Partial<Record<string, string>>; // propertyId → value
}

export interface MsgTemplate {
  id: string;
  name: string;
  lifecycle: "new_reservation" | "pre_arrival" | "check_in" | "during_stay" | "checkout" | "post_stay";
  version: number;
  channels: string[];
  targeting: string;
  state: "active" | "paused" | "archived";
  offsetLabel: string;
  body: string;
}

export interface QueuedMessage {
  id: string;
  templateId: string;
  guestName: string;
  propertyId: string;
  channel: string;
  sendAt: number;
  state: "upcoming" | "paused" | "sent" | "failed" | "cancelled";
  preview: string;
}

export type AutomationTrigger = "booking_created" | "booking_cancelled" | "check_in" | "check_out" | "recurring";
export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  scopeLabel: string;
  actionLabel: string;
  assignMode: string;
  offsetLabel: string;
  priority: Priority;
  active: boolean;
  runs: number;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  deliveries: { id: string; ts: number; event: string; status: number; ms: number; response: string }[];
}

export interface BlockStyle {
  width: "full" | "wide" | "mid" | "half";
  py: number;   // vertical padding, px — 0 allowed
  px: number;   // horizontal padding, px — 0 allowed
  mt: number;   // margin-top — negatives allowed for flush stacking
  mb: number;   // margin-bottom
  bg: string;   // "" = transparent / inherit
  color: string;// "" = inherit
  scale: number;// font-size multiplier 0.8–1.4
  align: "left" | "center" | "right";
  radius: number;
  heightVh?: number; // min-height in viewport units — 0/undefined = auto
  blend?: string;    // CSS mix-blend-mode for the block
}
export const DEFAULT_BLOCK_STYLE: BlockStyle = {
  width: "full", py: 12, px: 12, mt: 0, mb: 10, bg: "", color: "", scale: 1, align: "left", radius: 3,
};
export const WIDTH_PCT: Record<BlockStyle["width"], number> = { full: 100, wide: 84, mid: 66, half: 50 };

export interface Block {
  id: string;
  type: string;
  cols?: Block[][];
  style?: BlockStyle;
  content?: Record<string, string>;
}
export interface SitePage { id: string; name: string; slug: string; blocks: Block[]; home?: boolean; }

export interface SiteLink { id: string; label: string; url: string; }
export interface SiteChrome {
  header: string;
  footer: string;
  headerLinks: SiteLink[];
  footerLinks: SiteLink[];
  headerBg: string;
  headerColor: string;
  footerBg: string;
  footerColor: string;
  align: "left" | "center" | "right";
}
export interface SavedAsset { id: string; name: string; url: string; kind: "image" | "copy"; note?: string; }
export interface WebsiteState {
  id: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: "none" | "pending_dns" | "verified";
  published: boolean;
  pages: SitePage[];
  activePageId: string;
  theme: { palette: string; radius: number; font: string };
  analytics: { day: string; views: number; visitors: number; bookings: number; revenue: number }[];
}

export interface Collection { id: string; name: string; slug: string; rule: string; itemIds: string[]; featured: boolean; }

export interface StoreItem {
  id: string;
  name: string;
  type: "upsell" | "experience" | "partner_offer" | "product";
  price: number;
  currency: string;
  active: boolean;
  enabledProperties: string[];
  desc: string;
}

export interface GuidebookSection { id: string; name: string; required: boolean; fields: Record<string, string>; fieldDefs: { key: string; label: string; multiline?: boolean; sync?: string }[]; }
export interface Guidebook {
  propertyId: string;
  sections: GuidebookSection[];
  aiOnly: string;
  design: { theme: string; font: string; accent: string };
  published: boolean;
  views30d: number;
  sectionEngagement: Record<string, number>;
  storeConversionPct: number;
  lastSavedTs: number;
}

export interface SyncState {
  key: string; // propertyId:channel
  propertyId: string;
  channel: ChannelId;
  lastSuccessTs: number;
  queueDepth: number;
  errorRate24h: number; // 0..1
  lastFailure?: { ts: number; request: string; response: string; cls: string };
  state: MapState;
}

export interface Conflict {
  id: string;
  channel: ChannelId;
  externalRef: string;
  rawRoomType: string;
  suggestion: string;
  propertyId: string;
  ts: number;
  nights: number;
  total: number;
}

export interface AuditEntry { ts: number; actor: string; action: string; source: "ui" | "api" | "automation" | "channel_sync" | "ai"; before?: string; after?: string; }

export interface IssueReport {
  id: string;
  taskId: string;
  propertyId: string;
  item: string;
  note: string;
  photo?: boolean;
  state: "pending" | "accepted" | "resolved";
  ts: number;
  escalatedToTaskId?: string;
  providerId?: string;
}

export interface Toast { id: number; tone: "ok" | "warn" | "err" | "info"; title: string; body?: string; }

export interface OnboardStep { id: string; label: string; detail: string; done: boolean; route: string; }
