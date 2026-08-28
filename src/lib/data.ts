// ── DERZEN seed workspace: "Sanggraha Villas" (tenant tnt_sanggraha) ──────
// All money = integer minor units + currency. All dates = dayKey in the
// property's own timezone. Night math is half-open [checkIn, checkOut).

import { addDays, dayKey, fmtShort, today } from "./format";
import type {
  AuditEntry, Automation, ChannelDef, ChannelId, Collection, Conflict, Conversation, Expense,
  Guidebook, Guest, IssueReport, KnowledgeScope, LineItem, MsgTemplate, OnboardStep, Payment,
  Property, Provider, QueuedMessage, Quote, RatePlan, Reservation, ResStatus, Review,
  Service, ServiceBooking, StaffMember, StoreItem, SyncState, Task, TaskTemplate, TimelineEvent,
  Upsell, VariableDef, WebhookEndpoint, WebsiteState,
} from "./types";

const now = Date.now();
const H = 3_600_000;
const D = 24 * H;

// ── Channels ───────────────────────────────────────────────────────────────
export const CHANNEL_DEFS: ChannelDef[] = [
  { id: "airbnb", name: "Airbnb", short: "AB", color: "#E8485F", structure: "unit", auth: "oauth", currency: "USD", markupPct: 3, replyWindowH: null },
  { id: "booking", name: "Booking.com", short: "BDC", color: "#2557D6", structure: "hotel", auth: "extranet", currency: "EUR", markupPct: 12, replyWindowH: 72 },
  { id: "vrbo", name: "VRBO", short: "VR", color: "#1485A8", structure: "unit", auth: "email_code", currency: "USD", markupPct: 8, replyWindowH: null },
  { id: "expedia", name: "Expedia", short: "EX", color: "#D98E04", structure: "hotel", auth: "extranet", currency: "USD", markupPct: 12, replyWindowH: null },
  { id: "agoda", name: "Agoda", short: "AG", color: "#0F8B8D", structure: "hotel", auth: "extranet", currency: "USD", markupPct: 10, replyWindowH: null },
  { id: "trip", name: "Trip.com", short: "TC", color: "#3E9BFF", structure: "hotel", auth: "extranet", currency: "USD", markupPct: 10, replyWindowH: 48 },
  { id: "mmt", name: "MakeMyTrip", short: "MM", color: "#E05C2A", structure: "hotel", auth: "api_key", currency: "USD", markupPct: 9, replyWindowH: null },
  { id: "traveloka", name: "Traveloka", short: "TV", color: "#0FA3B1", structure: "unit", auth: "extranet", currency: "IDR", markupPct: 7, replyWindowH: null },
  { id: "ical", name: "iCal", short: "IC", color: "#6B7280", structure: "unit", auth: "api_key", currency: "IDR", markupPct: 0, replyWindowH: null },
  { id: "direct", name: "Direct", short: "DR", color: "#0E6B4E", structure: "unit", auth: "oauth", currency: "IDR", markupPct: 0, replyWindowH: null },
];
export const channelDef = (id: ChannelId | "email" | "whatsapp" | "google") =>
  CHANNEL_DEFS.find((c) => c.id === id) ?? { id: "direct", name: String(id), short: "•", color: "#61705F", structure: "unit", auth: "oauth", currency: "IDR", markupPct: 0, replyWindowH: null } as ChannelDef;

// FX → reporting currency (EUR). Stored with every converted amount.
export const FX_TO_EUR: Record<string, number> = { IDR: 1 / 17120, USD: 0.92, EUR: 1, AUD: 0.61, GBP: 1.17 };
export const FX_FROM_IDR: Record<string, number> = { IDR: 1, USD: 1 / 15800, EUR: 1 / 17120, AUD: 1 / 16300, GBP: 1 / 20100 };

// ── Properties ─────────────────────────────────────────────────────────────
const IMG = {
  anggrek: "https://image.qwenlm.ai/generated-images/befb873c-1f15-4628-b2da-676d2019b6b0/_result.png",
  cemara: "https://image.qwenlm.ai/generated-images/6b1d83f7-3b3a-4f34-8f78-e0c11f02d2f7/_result.png",
  senja: "https://image.qwenlm.ai/generated-images/a913be62-6abb-460e-a561-429f24d49bcf/_result.png",
  purnama: "https://image.qwenlm.ai/generated-images/2b718074-078b-41af-bf85-fb3598bb9748/_result.png",
  kelapa: "https://image.qwenlm.ai/generated-images/5c2242ae-c250-48f3-90d0-f077992e201d/_result.png",
};


function pricing(base: number, opts?: Partial<Property["pricing"]>): Property["pricing"] {
  return {
    plans: [
      { id: `rp-${base}`, name: "Base", kind: "base", nightly: base },
      { id: `rp-hi-${base}`, name: "High season", kind: "season", season: "high", nightly: Math.round(base * 1.25), months: [5, 6, 7, 11] },
      { id: `rp-lo-${base}`, name: "Low season", kind: "season", season: "low", nightly: Math.round(base * 0.85), months: [1, 2, 9] },
      { id: `rp-pk-${base}`, name: "Peak season", kind: "season", season: "peak", nightly: Math.round(base * 1.45), months: [6, 11] },
    ],
    extraGuestAfter: 6,
    extraGuestFee: Math.round(base * 0.06),
    childDiscountPct: 30,
    childAgeMax: 12,
    cleaningFee: Math.round(base * 0.12),
    serviceFeePct: 5,
    vatPct: 11,
    weeklyPct: 10,
    monthlyPct: 20,
    ...opts,
  };
}

export const PROPERTIES: Property[] = [
  {
    id: "p-anggrek", name: "Villa Anggrek", code: "ANG", city: "Uluwatu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(4_200_000), bedrooms: 4, bathrooms: 4, maxGuests: 8, parentId: null, isParent: false,
    image: IMG.anggrek, channels: { airbnb: "live", booking: "live", direct: "live", ical: "live" }, archived: false,
    checkInTime: "14:00", checkOutTime: "11:00", minNights: 2, maxNights: 30, maxAdvanceDays: 365, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 18,
    amenities: ["Infinity pool", "Chef kitchen", "Cinema room", "Fast Wi-Fi", "AC", "BBQ", "Parking"], order: 0, map: { x: 16, y: 78 },
  },
  {
    id: "p-cemara", name: "Villa Cemara", code: "CEM", city: "Canggu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(3_600_000), bedrooms: 3, bathrooms: 3, maxGuests: 6, parentId: null, isParent: false,
    image: IMG.cemara, channels: { airbnb: "live", booking: "live", vrbo: "paused", direct: "live" }, archived: false,
    checkInTime: "15:00", checkOutTime: "11:00", minNights: 2, maxNights: 28, maxAdvanceDays: 270, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 15,
    amenities: ["Pool", "Garden", "Workspace", "Wi-Fi", "AC", "Scooter rental"], order: 1, map: { x: 30, y: 38 },
  },
  {
    id: "p-senja", name: "Rumah Senja", code: "SEN", city: "Ubud", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(2_100_000, { extraGuestAfter: 4 }), bedrooms: 2, bathrooms: 2, maxGuests: 4, parentId: null, isParent: false,
    image: IMG.senja, channels: { booking: "live", airbnb: "live", direct: "live" }, archived: false,
    checkInTime: "14:00", checkOutTime: "12:00", minNights: 1, maxNights: 30, maxAdvanceDays: 180, publishDirect: true,
    checkoutEnabled: true, managed: false, commissionPct: 0,
    amenities: ["Valley view", "Plunge pool", "Yoga deck", "Wi-Fi", "Breakfast incl."], order: 2, map: { x: 52, y: 34 },
  },
  {
    id: "p-samudra", name: "Samudra Estate", code: "SAM", city: "Uluwatu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(1_850_000), bedrooms: 6, bathrooms: 6, maxGuests: 12, parentId: null, isParent: true,
    image: IMG.anggrek, channels: { booking: "live", direct: "live" }, archived: false,
    checkInTime: "15:00", checkOutTime: "11:00", minNights: 2, maxNights: 30, maxAdvanceDays: 365, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 20,
    amenities: ["3 villas", "Shared lap pool", "Butler service", "Cliff lounge"], order: 3, map: { x: 20, y: 86 },
  },
  {
    id: "p-sam-one", name: "Samudra One", code: "SM1", city: "Uluwatu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(1_850_000, { extraGuestAfter: 4 }), bedrooms: 2, bathrooms: 2, maxGuests: 4, parentId: "p-samudra", isParent: false,
    image: IMG.anggrek, channels: { airbnb: "live", direct: "live" }, archived: false,
    checkInTime: "15:00", checkOutTime: "11:00", minNights: 1, maxNights: 30, maxAdvanceDays: 365, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 20, amenities: ["Pool access", "AC", "Wi-Fi"], order: 4, map: { x: 21, y: 88 },
  },
  {
    id: "p-sam-two", name: "Samudra Two", code: "SM2", city: "Uluwatu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(1_850_000, { extraGuestAfter: 4 }), bedrooms: 2, bathrooms: 2, maxGuests: 4, parentId: "p-samudra", isParent: false,
    image: IMG.senja, channels: { airbnb: "live", direct: "live", booking: "error" }, archived: false,
    checkInTime: "15:00", checkOutTime: "11:00", minNights: 1, maxNights: 30, maxAdvanceDays: 365, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 20, amenities: ["Pool access", "AC", "Wi-Fi"], order: 5, map: { x: 23, y: 84 },
  },
  {
    id: "p-sam-three", name: "Samudra Three", code: "SM3", city: "Uluwatu", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(2_050_000, { extraGuestAfter: 4 }), bedrooms: 2, bathrooms: 2, maxGuests: 5, parentId: "p-samudra", isParent: false,
    image: IMG.purnama, channels: { airbnb: "live" }, archived: false,
    checkInTime: "15:00", checkOutTime: "11:00", minNights: 1, maxNights: 30, maxAdvanceDays: 365, publishDirect: false,
    checkoutEnabled: false, managed: true, commissionPct: 20, amenities: ["Pool access", "Kitchenette", "AC"], order: 6, map: { x: 19, y: 82 },
  },
  {
    id: "p-purnama", name: "Villa Purnama", code: "PUR", city: "Seminyak", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(5_400_000, { extraGuestAfter: 8 }), bedrooms: 5, bathrooms: 5, maxGuests: 10, parentId: null, isParent: false,
    image: IMG.purnama, channels: { booking: "live", airbnb: "live", agoda: "error", trip: "paused", direct: "live" }, archived: false,
    checkInTime: "14:00", checkOutTime: "12:00", minNights: 3, maxNights: 45, maxAdvanceDays: 420, publishDirect: true,
    checkoutEnabled: true, managed: true, commissionPct: 18,
    amenities: ["Beachfront", "Lap pool", "Spa bale", "Staff house", "Gym"], order: 7, map: { x: 36, y: 46 },
  },
  {
    id: "p-kelapa", name: "The Kelapa House", code: "KEL", city: "Nusa Lembongan", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(1_450_000, { extraGuestAfter: 4 }), bedrooms: 2, bathrooms: 2, maxGuests: 5, parentId: null, isParent: false,
    image: IMG.kelapa, channels: { airbnb: "live", traveloka: "live", direct: "live" }, archived: false,
    checkInTime: "13:00", checkOutTime: "10:00", minNights: 2, maxNights: 21, maxAdvanceDays: 240, publishDirect: true,
    checkoutEnabled: true, managed: false, commissionPct: 0,
    amenities: ["Beach 2 min", "Hammocks", "Snorkel gear", "Boat transfer"], order: 8, map: { x: 82, y: 66 },
  },
  {
    id: "p-bayu", name: "Villa Bayu", code: "BAY", city: "Amed", region: "Bali", tz: "Asia/Makassar", tzShort: "WITA",
    currency: "IDR", pricing: pricing(2_900_000), bedrooms: 3, bathrooms: 2, maxGuests: 6, parentId: null, isParent: false,
    image: IMG.senja, channels: {}, archived: true,
    checkInTime: "14:00", checkOutTime: "11:00", minNights: 2, maxNights: 30, maxAdvanceDays: 180, publishDirect: false,
    checkoutEnabled: false, managed: false, commissionPct: 0, amenities: ["Sea view", "Pool"], order: 9, map: { x: 88, y: 18 },
  },
];
export const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id)!;

export function planFor(p: Property, d: Date): RatePlan {
  const m = d.getMonth();
  const seasonal = p.pricing.plans.filter((r) => r.kind === "season" && r.months?.includes(m));
  if (seasonal.length) return seasonal[seasonal.length - 1];
  return p.pricing.plans[0];
}

/** Quote/preview line items in the listing currency (IDR). Items always sum to total. */
export function computeStay(p: Property, start: Date, nights: number, adults: number, children: number): { items: LineItem[]; total: number } {
  const items: LineItem[] = [];
  let nightsSum = 0;
  for (let i = 0; i < nights; i++) {
    const d = addDays(start, i);
    const plan = planFor(p, d);
    items.push({ label: `${plan.name} · ${fmtShort(d)}`, kind: "night", amount: plan.nightly });
    nightsSum += plan.nightly;
  }
  const party = adults + children;
  if (party > p.pricing.extraGuestAfter) {
    const extra = (party - p.pricing.extraGuestAfter) * p.pricing.extraGuestFee * nights;
    items.push({ label: `Extra guests × ${nights} nights`, kind: "extra_guest", amount: extra });
    nightsSum += extra;
  }
  const cleaning = p.pricing.cleaningFee;
  items.push({ label: "Cleaning fee", kind: "fee", amount: cleaning });
  const service = Math.round((nightsSum) * (p.pricing.serviceFeePct / 100));
  items.push({ label: `Service fee ${p.pricing.serviceFeePct}%`, kind: "fee", amount: service });
  if (nights >= 28) items.push({ label: "Monthly stay −20%", kind: "discount", amount: -Math.round(nightsSum * 0.2) });
  else if (nights >= 7) items.push({ label: "Weekly stay −10%", kind: "discount", amount: -Math.round(nightsSum * 0.1) });
  const preTax = items.reduce((s, i) => s + i.amount, 0);
  const vat = Math.round(preTax * (p.pricing.vatPct / 100));
  items.push({ label: `VAT ${p.pricing.vatPct}%`, kind: "tax", amount: vat });
  return { items, total: items.reduce((s, i) => s + i.amount, 0) };
}

// ── Guests ─────────────────────────────────────────────────────────────────
const g = (id: string, name: string, country: string, emails: string[], phones: string[], spend: number, tags: string[], aliases: string[], lastSource: Guest["lastSource"], hAgo: number): Guest => ({
  id, name, emails, phones, country, status: spend > 4000_00 ? "vip" : "active",
  lastActivityTs: now - hAgo * H, lastSource, lifetimeSpend: spend, tags, notes: "", consentMarketing: hAgo % 2 === 0,
  aliases, verifiedId: hAgo < 100,
});
export const GUESTS: Guest[] = [
  g("g-01", "Amelia Hartono", "Australia", ["amelia.h@gmail.com", "a.hartono-airbnb@guest.airbnb.com"], ["+61 412 887 210"], 6820_00, ["repeat", "vip"], ["a.hartono-airbnb@guest.airbnb.com"], "airbnb", 2),
  g("g-02", "Jonas Weber", "Germany", ["j.weber@web.de"], ["+49 171 555 0192"], 3140_00, ["first-timer"], [], "booking", 5),
  g("g-03", "Sofia Marques", "Portugal", ["sofia.m@outlook.pt"], ["+351 912 445 900"], 1290_00, [], [], "whatsapp", 9),
  g("g-04", "Daniel Okafor", "Nigeria", ["d.okafor@proton.me"], ["+234 803 220 114"], 940_00, ["business"], [], "email", 26),
  g("g-05", "Yuki Tanaka", "Japan", ["yuki.t@yahoo.co.jp", "y.tanaka-bdc@guest.booking.com"], ["+81 90 4421 8873"], 4510_00, ["repeat"], ["y.tanaka-bdc@guest.booking.com"], "booking", 31),
  g("g-06", "Priya Raghavan", "India", ["priya.r@gmail.com"], ["+91 98450 22317"], 2210_00, ["family"], [], "agoda", 40),
  g("g-07", "Lucas Meyer", "France", ["lucas.meyer@orange.fr"], ["+33 6 44 71 20 93"], 760_00, [], [], "web", 52),
  g("g-08", "Grace Lin", "Singapore", ["grace.lin@gmail.com"], ["+65 8231 7745"], 5320_00, ["vip", "repeat"], ["g.lin-trip@guest.trip.com"], "whatsapp", 4),
  g("g-09", "Tom Bradley", "United Kingdom", ["tom.bradley@btinternet.com"], ["+44 7911 284 551"], 1870_00, [], [], "airbnb", 70),
  g("g-10", "Hannah de Vries", "Netherlands", ["h.devries@ziggo.nl"], ["+31 6 24 88 12 07"], 3560_00, ["repeat"], [], "web", 8),
  g("g-11", "Marco Ricci", "Italy", ["m.ricci@libero.it"], ["+39 333 442 8810"], 420_00, ["first-timer"], [], "booking", 120),
  g("g-12", "Chen Wei", "China", ["chen.wei@163.com"], ["+86 138 0011 2299"], 2980_00, ["family"], ["chen.w-agoda@guest.agoda.com"], "trip", 16),
  g("g-13", "Elena Widura", "Indonesia", ["elena@widura.co.id"], ["+62 811 390 221"], 0, ["owner"], [], "email", 200),
];
export const guestById = (id: string) => GUESTS.find((x) => x.id === id)!;

// ── Reservations ───────────────────────────────────────────────────────────
let refSeq = 2416;
function mkStay(
  p: Property, channel: ChannelId, guestId: string, inOff: number, nights: number,
  adults: number, children: number, status: ResStatus, extra?: Partial<Reservation>,
): Reservation {
  const def = channelDef(channel);
  const start = addDays(today(), inOff);
  const idr = computeStay(p, start, nights, adults, children);
  const fx = FX_FROM_IDR[def.currency] ?? 1;
  const items = idr.items.map((i) => ({ ...i, amount: Math.round(i.amount * fx) }));
  const total = items.reduce((s, i) => s + i.amount, 0);
  const payments: Payment[] = [];
  if (["deposit_paid", "checked_in", "checked_out"].includes(status)) {
    payments.push({ id: `pay-${refSeq}a`, ts: now - 9 * D, amount: Math.round(total * 0.3), currency: def.currency, method: channel === "direct" ? "Stripe (hosted)" : "OTA-collected", kind: "payment" });
  }
  if (["checked_in", "checked_out"].includes(status)) {
    payments.push({ id: `pay-${refSeq}b`, ts: now - 2 * D, amount: total - Math.round(total * 0.3), currency: def.currency, method: channel === "direct" ? "Stripe (hosted)" : "OTA-collected", kind: "payment" });
  }
  const timeline: TimelineEvent[] = [
    { ts: now - 12 * D, label: "Reservation created", source: channel === "direct" ? "ui" : "channel_sync" },
    ...(channel !== "direct" ? [{ ts: now - 12 * D + 4 * H, label: `Imported from ${def.name}`, source: "channel_sync" as const }] : []),
    ...(["deposit_paid", "checked_in", "checked_out"].includes(status) ? [{ ts: now - 9 * D, label: "Deposit received (30%)", source: "api" as const }] : []),
    ...(status !== "pending" && status !== "enquiry" && status !== "cancelled" ? [{ ts: now - 8 * D, label: "Confirmed", source: "ui" as const }] : []),
    ...(status === "checked_in" ? [{ ts: now + inOff * D, label: "Checked in", source: "ui" as const }] : []),
    ...(status === "cancelled" ? [{ ts: now - 3 * D, label: "Cancelled by guest", source: "channel_sync" as const }] : []),
  ];
  refSeq += 1;
  return {
    id: `r-${refSeq}`, ref: `R-${refSeq}`, propertyId: p.id, guestId, channel, kind: "stay",
    checkIn: dayKey(start), checkOut: dayKey(addDays(start, nights)),
    checkInTime: extra?.checkInTime ?? (status === "enquiry" ? "FLEXIBLE" : p.checkInTime),
    adults, children, infants: 0, status, items, total, currency: def.currency,
    fxRate: FX_TO_EUR[def.currency] ?? 1, fxTs: now - 12 * D, depositHeld: status === "checked_in" ? 150 : 0,
    payments, externalRef: channel !== "direct" ? `HM${def.short}${refSeq}X` : undefined,
    notes: "", guidebookCode: `GB-${p.code}-${refSeq}`, timeline, archived: false,
    createdAt: now - 12 * D, addOns: [], ...extra,
  };
}

const P = (id: string) => propertyById(id);
export const RESERVATIONS: Reservation[] = [
  mkStay(P("p-anggrek"), "airbnb", "g-01", -2, 7, 4, 0, "checked_in"),
  mkStay(P("p-cemara"), "booking", "g-02", 0, 5, 2, 1, "confirmed", { checkInTime: "14:00" }),
  mkStay(P("p-senja"), "direct", "g-03", 0, 4, 2, 0, "deposit_paid", { checkInTime: "FLEXIBLE" }),
  mkStay(P("p-sam-one"), "airbnb", "g-09", 0, 3, 2, 0, "confirmed", { checkInTime: "15:00" }),
  mkStay(P("p-purnama"), "agoda", "g-06", -4, 4, 6, 2, "checked_in", {}),
  mkStay(P("p-sam-two"), "direct", "g-10", -3, 5, 2, 0, "checked_in"),
  mkStay(P("p-anggrek"), "direct", "g-08", 1, 6, 2, 0, "confirmed"),
  mkStay(P("p-cemara"), "airbnb", "g-05", 1, 4, 2, 2, "confirmed"),
  mkStay(P("p-purnama"), "booking", "g-12", 2, 7, 6, 2, "confirmed"),
  mkStay(P("p-senja"), "airbnb", "g-07", 3, 5, 2, 0, "pending"),
  mkStay(P("p-sam-three"), "airbnb", "g-11", 4, 3, 3, 0, "confirmed"),
  mkStay(P("p-kelapa"), "traveloka", "g-04", 5, 4, 2, 1, "confirmed"),
  mkStay(P("p-anggrek"), "booking", "g-02", 6, 5, 2, 1, "confirmed"),
  mkStay(P("p-purnama"), "direct", "g-07", 8, 5, 4, 0, "enquiry", { checkInTime: "FLEXIBLE" }),
  mkStay(P("p-sam-two"), "airbnb", "g-09", 9, 4, 2, 0, "confirmed"),
  mkStay(P("p-cemara"), "vrbo", "g-11", 2, 6, 2, 0, "cancelled"),
  mkStay(P("p-anggrek"), "airbnb", "g-05", -12, 5, 2, 0, "checked_out"),
  mkStay(P("p-senja"), "booking", "g-02", -6, 3, 2, 0, "checked_out"),
  mkStay(P("p-sam-one"), "direct", "g-10", 12, 7, 2, 0, "confirmed"),
  mkStay(P("p-kelapa"), "direct", "g-03", 16, 5, 2, 1, "confirmed"),
  mkStay(P("p-purnama"), "airbnb", "g-01", 18, 4, 4, 0, "confirmed"),
  mkStay(P("p-sam-three"), "booking", "g-12", 21, 3, 2, 2, "confirmed"),
];

export const BLOCKS: { id: string; propertyId: string; checkIn: string; checkOut: string; type: "owner" | "manual" | "hold"; label: string }[] = [
  { id: "b-1", propertyId: "p-cemara", checkIn: dayKey(addDays(today(), 9)), checkOut: dayKey(addDays(today(), 12)), type: "owner", label: "Owner · Widura family" },
  { id: "b-2", propertyId: "p-anggrek", checkIn: dayKey(addDays(today(), 13)), checkOut: dayKey(addDays(today(), 15)), type: "manual", label: "Deep clean & pool repair" },
  { id: "b-3", propertyId: "p-purnama", checkIn: dayKey(addDays(today(), 3)), checkOut: dayKey(addDays(today(), 5)), type: "hold", label: "Hold · quote Q-108" },
  { id: "b-4", propertyId: "p-kelapa", checkIn: dayKey(addDays(today(), 10)), checkOut: dayKey(addDays(today(), 11)), type: "manual", label: "Boat maintenance" },
];

// ── Services ───────────────────────────────────────────────────────────────
export const SERVICES: Service[] = [
  { id: "s-chef", name: "Private Chef Dinner", category: "experience", durationMin: 180, capacity: 10, price: 1_500_000, currency: "IDR", deposit: 0, location: "In-villa kitchen", leadTimeH: 24, image: IMG.purnama, active: true, checkoutEnabled: true },
  { id: "s-transfer", name: "Airport Transfer", category: "chauffeur", durationMin: 90, capacity: 4, price: 350_000, currency: "IDR", deposit: 0, location: "DPS ⇄ any villa", leadTimeH: 6, image: IMG.cemara, active: true, checkoutEnabled: true },
  { id: "s-spa", name: "In-Villa Spa Ritual", category: "spa", durationMin: 120, capacity: 2, price: 900_000, currency: "IDR", deposit: 100_000, location: "In-villa", leadTimeH: 12, image: IMG.senja, active: true, checkoutEnabled: true },
  { id: "s-surf", name: "Surf Coaching Session", category: "activities", durationMin: 120, capacity: 4, price: 750_000, currency: "IDR", deposit: 0, location: "Batu Bolong beach", leadTimeH: 12, image: IMG.kelapa, active: true, checkoutEnabled: false },
  { id: "s-scooter", name: "Scooter Rental · day", category: "equipment", durationMin: 1440, capacity: 6, price: 125_000, currency: "IDR", deposit: 200_000, location: "Delivery to villa", leadTimeH: 3, image: IMG.cemara, active: true, checkoutEnabled: true },
  { id: "s-catamaran", name: "Sunset Catamaran Cruise", category: "experience", durationMin: 240, capacity: 12, price: 2_800_000, currency: "IDR", deposit: 500_000, location: "Benoa marina", leadTimeH: 48, image: IMG.anggrek, active: true, checkoutEnabled: true },
];
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)!;

const sb = (id: string, serviceId: string, propertyId: string, staffId: string, off: number, start: string, guests: number, status: ServiceBooking["status"] = "scheduled"): ServiceBooking => ({
  id, serviceId, propertyId, staffId, date: dayKey(addDays(today(), off)), start, guests, status, value: serviceById(serviceId).price,
});
export const SERVICE_BOOKINGS: ServiceBooking[] = [
  sb("sb-1", "s-chef", "p-anggrek", "m-kadek", 0, "18:00", 6),
  sb("sb-2", "s-transfer", "p-cemara", "m-nyoman", 0, "11:30", 3),
  sb("sb-3", "s-spa", "p-sam-two", "m-kadek", 1, "10:00", 2),
  sb("sb-4", "s-surf", "p-cemara", "m-nyoman", 1, "08:00", 3),
  sb("sb-5", "s-transfer", "p-senja", "m-nyoman", 0, "15:00", 2),
  sb("sb-6", "s-catamaran", "p-purnama", "m-nyoman", 3, "16:00", 8),
  sb("sb-7", "s-scooter", "p-kelapa", "m-jana", 2, "09:00", 2),
  sb("sb-8", "s-chef", "p-purnama", "m-kadek", 4, "19:00", 10),
  sb("sb-9", "s-spa", "p-anggrek", "m-kadek", 2, "14:00", 2),
  sb("sb-10", "s-transfer", "p-sam-one", "m-nyoman", 0, "13:00", 2, "done"),
];

// ── Conversations ──────────────────────────────────────────────────────────
const msg = (from: Conversation["messages"][number]["from"], body: string, hAgo: number, extra?: Partial<Conversation["messages"][number]>): Conversation["messages"][number] => ({
  id: `m-${Math.random().toString(36).slice(2, 8)}`, from, body, ts: now - hAgo * H, ...extra,
});
export const CONVERSATIONS: Conversation[] = [
  {
    id: "c-01", guestId: "g-02", propertyId: "p-cemara", reservationId: "r-2418", channel: "booking", unread: 2, needsReply: true, escalated: false, notes: "Prefers ground-floor bedroom.",
    subject: "Early arrival today?",
    messages: [
      msg("guest", "Hello! Our flight lands at 10:20 — can we come straight to the villa and leave bags?", 6),
      msg("operator", "Hi Jonas! Bags anytime from 11:00, and we'll have the villa ready by 14:00.", 5, { authorName: "Marco" }),
      msg("guest", "Perfect. Also — is the pool heated? We have a toddler with us.", 1.2),
      msg("guest", "One more thing: do you provide a cot?", 0.6),
    ],
  },
  {
    id: "c-02", guestId: "g-01", propertyId: "p-anggrek", reservationId: "r-2417", channel: "whatsapp", unread: 1, needsReply: true, escalated: true, notes: "",
    subject: "Pool pump noise",
    messages: [
      msg("guest", "Hi — the pool pump started making a loud grinding noise around 6am. Can someone check?", 3),
      msg("guest", "It's the box next to the pool stairs. Photo attached.", 2.8, { kind: "attachment", attachmentName: "pump-noise.mp4" }),
      msg("ai", "Thanks Amelia — I've logged this for our maintenance team. Putu will come by within the hour. Meanwhile the pump can stay running safely.", 2.5, { model: "concierge-v2", citedSources: ["Villa Anggrek · Maintenance SOP"] }),
    ],
  },
  {
    id: "c-03", guestId: "g-08", propertyId: "p-anggrek", reservationId: "r-2423", channel: "whatsapp", unread: 1, needsReply: true, escalated: false, notes: "",
    subject: "Airport pickup + chef night",
    messages: [
      msg("guest", "Hi! Arriving tomorrow 13:10 DPS (SQ 938). Could we book the airport transfer and the chef dinner for Friday night?", 4.5),
    ],
  },
  {
    id: "c-04", guestId: "g-07", propertyId: "p-purnama", reservationId: "r-2430", channel: "email", unread: 0, needsReply: true, escalated: false, notes: "Comparing us with The Legian — emphasize staff house + privacy.",
    subject: "Quote for 4 adults, flexible dates",
    messages: [
      msg("guest", "Bonjour — we are 4 adults looking at early next month, roughly 5 nights. Could you send your best rate and deposit terms?", 22),
      msg("operator", "Hi Lucas, thanks for writing! I've sent quote Q-107 through our secure page — it includes our weekly discount and flexible cancellation.", 20, { authorName: "Sarah" }),
      msg("guest", "Merci! If we also wanted a late checkout on the last day, what would that cost?", 7),
    ],
  },
  {
    id: "c-05", guestId: "g-12", propertyId: "p-purnama", reservationId: "r-2425", channel: "trip", unread: 0, needsReply: false, escalated: false, notes: "",
    subject: "Invoice request",
    messages: [
      msg("guest", "Please issue the invoice under Chen Wei Consulting Pte Ltd, with our UEN.", 30),
      msg("operator", "Done — the updated invoice is attached to your booking page.", 28, { authorName: "Wayan" }),
    ],
  },
  {
    id: "c-06", guestId: "g-11", propertyId: "p-sam-three", reservationId: "r-2427", channel: "airbnb", unread: 1, needsReply: true, escalated: false, notes: "",
    subject: "Check-in code timing",
    messages: [
      msg("guest", "Ciao! When will we receive the door code? We land quite late, around 23:40.", 2.2),
    ],
  },
  {
    id: "c-07", guestId: "g-10", propertyId: "p-sam-two", reservationId: "r-2422", channel: "whatsapp", unread: 0, needsReply: false, escalated: false, notes: "",
    subject: "Scooter for the week",
    messages: [
      msg("guest", "Could we get two scooters delivered tomorrow morning?", 49),
      msg("operator", "Of course! Two scooters booked for 09:00 tomorrow, helmets and rain coats included.", 47, { authorName: "Kadek" }),
      msg("guest", "Wonderful, thank you!", 46),
    ],
  },
  {
    id: "c-08", guestId: "g-04", propertyId: "p-kelapa", reservationId: "r-2428", channel: "traveloka", unread: 1, needsReply: true, escalated: false, notes: "",
    subject: "Boat schedule question",
    messages: [
      msg("guest", "Does the villa arrange the speedboat from Sanur, or do we book separately? We are 2 adults + 1 child.", 1.5),
    ],
  },
];

// ── Team ───────────────────────────────────────────────────────────────────
export const MEMBERS: StaffMember[] = [
  { id: "m-you", name: "Sarah Whitfield", email: "sarah@sanggraha.co", phone: "+62 812 390 110", role: "owner", duty: "none", propertyIds: [], color: "#0E6B4E", isYou: true },
  { id: "m-marco", name: "Marco Reyes", email: "marco@sanggraha.co", phone: "+62 812 390 111", role: "admin", duty: "task_service", propertyIds: [], color: "#2557D6" },
  { id: "m-wayan", name: "Wayan Sudiarta", email: "wayan@sanggraha.co", phone: "+62 813 220 480", role: "manager", duty: "task", propertyIds: [], color: "#1485A8" },
  { id: "m-kadek", name: "Kadek Mira", email: "mira@sanggraha.co", phone: "+62 819 771 235", role: "staff", duty: "task_service", propertyIds: ["p-anggrek", "p-samudra", "p-purnama"], color: "#38708A" },
  { id: "m-ari", name: "Made Ari", email: "ari@sanggraha.co", phone: "+62 817 033 902", role: "staff", duty: "task", propertyIds: ["p-cemara", "p-senja"], color: "#D98E04" },
  { id: "m-komang", name: "Komang Devi", email: "devi@sanggraha.co", phone: "+62 818 552 117", role: "staff", duty: "task", propertyIds: ["p-cemara", "p-senja", "p-kelapa"], color: "#E8485F" },
  { id: "m-nyoman", name: "Nyoman Putra", email: "nyoman@sanggraha.co", phone: "+62 821 900 342", role: "staff", duty: "service", propertyIds: [], color: "#0FA3B1" },
  { id: "m-jana", name: "Putu Jana", email: "jana@sanggraha.co", phone: "+62 819 118 770", role: "staff", duty: "task", propertyIds: ["p-kelapa", "p-purnama"], color: "#E05C2A", offline: true },
  { id: "m-elena", name: "Elena Widura", email: "elena@widura.co.id", phone: "+62 811 390 221", role: "property_owner", duty: "none", propertyIds: ["p-samudra", "p-sam-one", "p-sam-two", "p-sam-three"], color: "#6B7280" },
  { id: "m-inv1", name: "Gusti Ayu", email: "ayu@sanggraha.co", phone: "—", role: "coordinator", duty: "none", propertyIds: [], color: "#61705F", pending: true },
  { id: "m-inv2", name: "Ketut Rini", email: "rini@sanggraha.co", phone: "—", role: "staff", duty: "task", propertyIds: ["p-anggrek"], color: "#61705F", pending: true },
];
export const memberById = (id: string | null) => MEMBERS.find((m) => m.id === id);

// ── Tasks ──────────────────────────────────────────────────────────────────
const cl = (labels: [string, boolean?][], photoAt: number[] = []): Task["checklist"] =>
  labels.map(([label, done], i) => ({ id: `ci-${label.slice(0, 8)}-${i}`, label, done: !!done, requiresPhoto: photoAt.includes(i) }));

export const TASKS: Task[] = [
  {
    id: "t-501", title: "Turnover clean — Villa Purnama", type: "cleaning", propertyId: "p-purnama", assigneeId: "m-komang",
    due: now + 3 * H, priority: "high", status: "in_progress", templateId: "tt-clean", templateVersion: 4, linkedReservationId: "r-2421", createdAt: now - D,
    checklist: cl([["Strip & remake all beds (5 rooms)", true], ["Kitchen deep clean", true], ["Bathrooms + toiletries restock"], ["Pool area & loungers", false], ["Photo: finished living room", false]], [4]),
  },
  {
    id: "t-502", title: "Pre-arrival prep — Villa Cemara", type: "cleaning", propertyId: "p-cemara", assigneeId: "m-ari",
    due: now + 1 * H, priority: "urgent", status: "in_progress", templateId: "tt-prep", templateVersion: 3, linkedReservationId: "r-2418", createdAt: now - D,
    checklist: cl([["Fresh linen & towels (2 adults, 1 child)", true], ["Welcome drink + cold towels"], ["Cot set up in ground-floor room"], ["AC on 23° at 13:30"], ["Photo: entrance ready", false]], [4]),
  },
  {
    id: "t-503", title: "Fix AC drip — master suite", type: "maintenance", propertyId: "p-purnama", assigneeId: "m-jana",
    due: now - 20 * H, priority: "urgent", status: "open", templateId: "tt-maint", templateVersion: 2, createdAt: now - 2 * D,
    checklist: cl([["Inspect condensate line"], ["Clear drain pan"], ["Flagged: water stain spreading on ceiling", false], ["Photo before/after", false]], [3]),
  },
  {
    id: "t-504", title: "Monthly inspection — Rumah Senja", type: "inspection", propertyId: "p-senja", assigneeId: "m-wayan",
    due: now + 2 * D, priority: "medium", status: "open", templateId: "tt-insp", templateVersion: 2, createdAt: now - 3 * D,
    checklist: cl([["Roof & gutters"], ["Pool pump + chemistry log"], ["Smoke detectors test"], ["Inventory: linen count"]]),
  },
  {
    id: "t-505", title: "Turnover clean — Samudra One", type: "cleaning", propertyId: "p-sam-one", assigneeId: "m-kadek",
    due: now + 11 * H, priority: "high", status: "open", templateId: "tt-clean", templateVersion: 4, linkedReservationId: "r-2420", createdAt: now - 18 * H,
    checklist: cl([["Full clean 2BR"], ["Restock minibar"], ["Photo: finished living room", false]], [2]),
  },
  {
    id: "t-506", title: "Garden + hedge trim", type: "custom", propertyId: "p-kelapa", assigneeId: "m-jana",
    due: now + 3 * D, priority: "low", status: "open", createdAt: now - 2 * D,
    checklist: cl([["Trim beach-path hedge"], ["Clear palm fronds"], ["Oil deck furniture"]]),
  },
  {
    id: "t-507", title: "Deep clean & pool repair window", type: "maintenance", propertyId: "p-anggrek", assigneeId: null,
    due: now + 13 * D, priority: "medium", status: "open", createdAt: now - D,
    checklist: cl([["Drain + acid-wash pool edge"], ["Pump seal replacement (provider)"], ["Full villa deep clean"]]),
  },
  {
    id: "t-508", title: "Grocery restock — Villa Purnama", type: "custom", propertyId: "p-purnama", assigneeId: "m-kadek",
    due: now + 26 * H, priority: "medium", status: "open", linkedReservationId: "r-2425", createdAt: now - 12 * H,
    checklist: cl([["Welcome basket (6 pax, 2 kids)"], ["Minibar + coffee capsules"], ["Sunscreen & beach towels ×8"]]),
  },
  {
    id: "t-509", title: "Pool service — Villa Cemara", type: "maintenance", propertyId: "p-cemara", assigneeId: "m-ari",
    due: now + 16 * H, priority: "medium", status: "open", createdAt: now - 2 * D,
    checklist: cl([["Chemistry check & log", true], ["Skim + vacuum", true], ["Pump basket clean"]]),
  },
  {
    id: "t-510", title: "Housekeeping refresher training", type: "custom", propertyId: "p-cemara", assigneeId: "m-wayan",
    due: now + 5 * D, priority: "low", status: "open", createdAt: now - 4 * D,
    checklist: cl([["New linen folding standard"], ["Photo standards walkthrough"]]),
  },
  {
    id: "t-511", title: "Evening tidy — Samudra Two", type: "cleaning", propertyId: "p-sam-two", assigneeId: "m-kadek",
    due: now + 21 * H, priority: "low", status: "open", createdAt: now - 8 * H,
    checklist: cl([["Light tidy + trash out"], ["Towels refresh"]]),
  },
  {
    id: "t-512", title: "Security system check", type: "inspection", propertyId: "p-anggrek", assigneeId: "m-wayan",
    due: now + 6 * D, priority: "medium", status: "open", templateId: "tt-insp", templateVersion: 1, createdAt: now - 30 * D,
    checklist: cl([["Cameras + NVR storage"], ["Gate sensor"], ["Safe battery check"]]),
  },
  {
    id: "t-513", title: "Turnover clean — Rumah Senja", type: "cleaning", propertyId: "p-senja", assigneeId: "m-komang",
    due: now - 26 * H, priority: "high", status: "done", completedAt: now - 30 * H, templateId: "tt-clean", templateVersion: 4, createdAt: now - 3 * D,
    checklist: cl([["Full clean 2BR", true], ["Deck + plunge pool", true]], [1]),
  },
  {
    id: "t-514", title: "Water heater descale", type: "maintenance", propertyId: "p-kelapa", assigneeId: "m-jana",
    due: now - 3 * D, priority: "low", status: "expired", createdAt: now - 10 * D,
    checklist: cl([["Descale unit"], ["Check anode"]]),
  },
];

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "tt-clean", name: "Checkout turnover clean", type: "cleaning", estMinutes: 180, version: 4, defaultRole: "Housekeeping",
    items: [
      { label: "Strip & remake all beds", requiresPhoto: false },
      { label: "Kitchen deep clean incl. appliances", requiresPhoto: false },
      { label: "Bathrooms + restock toiletries", requiresPhoto: false },
      { label: "Floors, dusting, glass doors", requiresPhoto: false },
      { label: "Photo: finished living room", requiresPhoto: true },
      { label: "Photo: each made bed", requiresPhoto: true },
    ],
  },
  {
    id: "tt-prep", name: "Pre-arrival preparation", type: "cleaning", estMinutes: 90, version: 3, defaultRole: "Butler",
    items: [
      { label: "Fresh linen & towels per guest count", requiresPhoto: false },
      { label: "Welcome drink + cold towels", requiresPhoto: false },
      { label: "AC pre-cool 45 min before ETA", requiresPhoto: false },
      { label: "Photo: entrance ready", requiresPhoto: true },
    ],
  },
  {
    id: "tt-maint", name: "Maintenance work order", type: "maintenance", estMinutes: 120, version: 2, defaultRole: "Maintenance",
    items: [
      { label: "Diagnose & isolate fault", requiresPhoto: false },
      { label: "Carry out repair", requiresPhoto: false },
      { label: "Photo before / after", requiresPhoto: true },
      { label: "Log parts used + expense", requiresPhoto: false },
    ],
  },
  {
    id: "tt-insp", name: "Monthly property inspection", type: "inspection", estMinutes: 75, version: 2, defaultRole: "Property manager",
    items: [
      { label: "Roof, gutters, exterior", requiresPhoto: true },
      { label: "Pool pump + chemistry log", requiresPhoto: false },
      { label: "Smoke detectors & extinguishers", requiresPhoto: false },
      { label: "Inventory: linen & appliances", requiresPhoto: false },
    ],
  },
];

export const PROVIDERS: Provider[] = [
  { id: "pv-1", name: "Bali Pool & Plumbing Co.", contact: "Agus W.", phone: "+62 812 700 118", email: "jobs@balipoolplumb.co.id", specialties: ["plumbing", "hvac"], hourlyRate: 150_000, currency: "IDR", status: "active", hasAppAccess: false, jobsDone: 23 },
  { id: "pv-2", name: "Volta Electrical", contact: "Rai M.", phone: "+62 813 900 471", email: "hello@voltaelectrical.id", specialties: ["electrical", "security"], hourlyRate: 175_000, currency: "IDR", status: "active", hasAppAccess: true, jobsDone: 11 },
  { id: "pv-3", name: "GreenScape Crew", contact: "Komang S.", phone: "+62 819 220 875", email: "greenscape.crew@gmail.com", specialties: ["landscaping", "exterior", "pest_control"], hourlyRate: 95_000, currency: "IDR", status: "active", hasAppAccess: false, jobsDone: 34 },
  { id: "pv-4", name: "Sparkle Squad", contact: "Dewi L.", phone: "+62 817 445 260", email: "book@sparklesquad.id", specialties: ["cleaning"], hourlyRate: 80_000, currency: "IDR", status: "active", hasAppAccess: true, jobsDone: 58 },
  { id: "pv-5", name: "Pak Ketut Handyman", contact: "Ketut R.", phone: "+62 821 118 902", email: "—", specialties: ["handyman", "appliances"], hourlyRate: 100_000, currency: "IDR", status: "suspended", hasAppAccess: false, jobsDone: 7 },
];

// ── Reviews ────────────────────────────────────────────────────────────────
const rv = (id: string, guestName: string, propertyId: string, platform: Review["platform"], nativeRating: number, nativeScale: 5 | 10, daysAgo: number, body: string, extra?: Partial<Review>): Review => ({
  id, guestName, propertyId, platform, nativeRating, nativeScale,
  normalized: Math.round((nativeRating / nativeScale) * 100) / 10,
  date: now - daysAgo * D, body, ...extra,
});
export const REVIEWS: Review[] = [
  rv("rv-1", "Yuki Tanaka", "p-anggrek", "airbnb", 5, 5, 1, "Absolutely flawless. Kadek thought of everything before we asked — the cliff sunset from the pool is unreal. Already rebooked for December."),
  rv("rv-2", "Jonas Weber", "p-senja", "booking", 9.2, 10, 2, "Waking up over the river valley is magic. Breakfast on the deck daily. Minor: Wi-Fi dips in the bedroom, but honestly you won't care.", { replyDeadline: now + 46 * H }),
  rv("rv-3", "Priya Raghavan", "p-purnama", "agoda", 3.4, 5, 3, "Beautiful villa but the AC in the master suite dripped all night and maintenance only came the next morning. With 3 kids this was stressful.", {
    aiDraft: "Dear Priya, thank you for staying at Villa Purnama — and I'm truly sorry the AC issue disrupted your night. That's below our standard. Our team has since replaced the condensate line and added a same-hour maintenance SLA for family stays. We'd love the chance to make it right: your next stay includes a complimentary chef dinner. — Sarah, Sanggraha Villas",
    replyDeadline: now + 18 * H,
  }),
  rv("rv-4", "Grace Lin", "p-anggrek", "direct", 10, 10, 5, "Third stay and still the best-managed villa portfolio in Bali. Door code arrived the moment our ID check cleared. Zero friction."),
  rv("rv-5", "Tom Bradley", "p-sam-one", "airbnb", 4, 5, 6, "Great value, spotless, and the shared pool is gorgeous. Note it's a 15-min walk to the beach — scooters from the estate office solve it."),
  rv("rv-6", "Hannah de Vries", "p-kelapa", "google", 5, 5, 8, "Barefoot paradise. The boat transfer they arranged was seamless and the snorkel gear is actually good quality."),
  rv("rv-7", "Chen Wei", "p-purnama", "trip", 6.8, 10, 4, "位置很好,泳池很棒。早餐选择可以更多。(Great location, great pool. Breakfast could have more variety.)", { replyDeadline: now + 9 * H }),
  rv("rv-8", "Marco Ricci", "p-sam-three", "booking", 7.5, 10, 9, "Clean, quiet, helpful staff. The estate lounge is a bonus. Kitchen could use sharper knives and a proper coffee machine.", { replyDeadline: now + 60 * H }),
];

// ── Expenses ───────────────────────────────────────────────────────────────
const ex = (id: string, off: number, category: Expense["category"], amount: number, note: string, vendor: string, extra?: Partial<Expense>): Expense => ({
  id, date: dayKey(addDays(today(), off)), category, amount, currency: "IDR", note, vendor, taxDeductible: true, recurring: false, approval: "approved", ...extra,
});
export const EXPENSES: Expense[] = [
  ex("e-1", -1, "cleaning", 480_000, "Turnover clean × 2 villas", "Sparkle Squad"),
  ex("e-2", -2, "maintenance", 1_250_000, "Pool pump seal + labour", "Bali Pool & Plumbing Co.", { taskId: "t-507" }),
  ex("e-3", -3, "utilities", 2_340_000, "PLN electricity — Seminyak", "PLN", { propertyId: "p-purnama" }),
  ex("e-4", -4, "software", 1_490_000, "DERZEN platform subscription", "DERZEN", { recurring: true }),
  ex("e-5", -6, "supplies", 860_000, "Toiletries + welcome baskets", "COCO Mart", { propertyId: "p-anggrek", approval: "pending", receipt: "receipt-0412.jpg" }),
  ex("e-6", -8, "salaries", 18_500_000, "Staff wages — week 14", "Payroll", { recurring: true }),
  ex("e-7", -10, "maintenance", 350_000, "Gate sensor battery pack", "Volta Electrical", { approval: "rejected", note: "Duplicate of e-2 line item" }),
  ex("e-8", -12, "subscriptions", 640_000, "Wi-Fi business line × 3 sites", "Biznet", { recurring: true }),
];
export const EXPENSE_CATEGORIES = ["cleaning", "maintenance", "salaries", "software", "subscriptions", "supplies", "taxes", "utilities"] as const;

// ── Quotes ─────────────────────────────────────────────────────────────────
function mkQuote(id: string, ref: string, guestId: string, propertyId: string, inOff: number, nights: number, adults: number, children: number, status: Quote["status"], extra?: Partial<Quote>): Quote {
  const p = propertyById(propertyId);
  const stay = computeStay(p, addDays(today(), inOff), nights, adults, children);
  return {
    id, ref, guestId, propertyId, serviceIds: [], checkIn: dayKey(addDays(today(), inOff)), checkOut: dayKey(addDays(today(), inOff + nights)),
    adults, items: stay.items, total: stay.total, currency: "IDR",
    depositTerms: "30% deposit at acceptance · balance 14 days before arrival",
    paymentTerms: "Payment by card via our secure checkout page. Bank transfer available on request — BCA 8830-1122-77, PT Sanggraha Hospitality. Refunds follow the published cancellation policy.",
    expiresAt: now + 3 * D, status, createdAt: now - 2 * D, ...extra,
  };
}
export const QUOTES: Quote[] = [
  mkQuote("q-107", "Q-107", "g-07", "p-purnama", 8, 5, 4, 0, "sent"),
  mkQuote("q-108", "Q-108", "g-08", "p-purnama", 3, 2, 2, 0, "viewed"),
  mkQuote("q-109", "Q-109", "g-10", "p-sam-two", -3, 5, 2, 0, "converted", { expiresAt: now - 4 * D }),
  mkQuote("q-106", "Q-106", "g-04", "p-kelapa", 5, 4, 2, 1, "draft", { serviceIds: ["s-transfer", "s-scooter"] }),
  mkQuote("q-105", "Q-105", "g-11", "p-sam-three", -10, 3, 2, 0, "expired", { expiresAt: now - 2 * D }),
];

// ── Concierge ──────────────────────────────────────────────────────────────
export const UPSELLS: Upsell[] = [
  { id: "u-1", name: "Early check-in (from 11:00)", price: 250_000, currency: "IDR", window: "Offer after booking, until 48h pre-arrival", eligibility: "Only if previous night is vacant", prompt: "Mention when guest asks about arrival time or flight lands before 12:00", offered: 41, accepted: 17, revenue: 4_250_000, active: true },
  { id: "u-2", name: "Late checkout (until 14:00)", price: 350_000, currency: "IDR", window: "Offer 24h before checkout", eligibility: "Only if arrival gap ≥ 6h", prompt: "Offer proactively on checkout morning when no same-day turnover", offered: 36, accepted: 12, revenue: 4_200_000, active: true },
  { id: "u-3", name: "Welcome basket — tropical deluxe", price: 450_000, currency: "IDR", window: "From booking until 72h pre-arrival", eligibility: "All stays ≥ 3 nights", prompt: "Suggest for first-time guests and anniversaries", offered: 29, accepted: 11, revenue: 4_950_000, active: true },
  { id: "u-4", name: "Floating breakfast for two", price: 300_000, currency: "IDR", window: "Any time during stay", eligibility: "Villas with pool only", prompt: "Offer on day 1 evening if not yet booked", offered: 22, accepted: 9, revenue: 2_700_000, active: false },
];

export const KNOWLEDGE: KnowledgeScope[] = [
  {
    id: "kb-general", name: "General (account-wide)", scope: "general",
    sources: [
      { id: "ks-1", kind: "document", name: "Sanggraha brand tone guide.pdf", ts: now - 40 * D },
      { id: "ks-2", kind: "url", name: "sanggraha.co/cancellation-policy", ts: now - 35 * D },
      { id: "ks-3", kind: "text", name: "FAQ — deposits & payment schedules", ts: now - 20 * D },
    ],
    rules: [
      { id: "kr-1", kind: "hard", text: "Never quote rates lower than the published direct rate." },
      { id: "kr-2", kind: "tone", text: "Warm but concise; sign off with the butler's first name, not 'the team'." },
    ],
  },
  {
    id: "kb-anggrek", name: "Villa Anggrek", scope: "property", refId: "p-anggrek",
    sources: [
      { id: "ks-4", kind: "document", name: "ANG access codes & gate SOP.pdf", ts: now - 12 * D },
      { id: "ks-5", kind: "text", name: "House rules — cliff-edge safety", ts: now - 12 * D },
    ],
    rules: [{ id: "kr-3", kind: "hard", text: "Gate codes only after ID verification is complete." }],
  },
  {
    id: "kb-purnama", name: "Villa Purnama", scope: "property", refId: "p-purnama",
    sources: [{ id: "ks-6", kind: "document", name: "PUR staff contacts & SOPs.pdf", ts: now - 9 * D }],
    rules: [{ id: "kr-4", kind: "hard", text: "Staff-house access questions escalate to manager." }],
  },
  {
    id: "kb-senja", name: "Rumah Senja", scope: "property", refId: "p-senja",
    sources: [],
    rules: [],
  },
  {
    id: "kb-chef", name: "Service · Private Chef Dinner", scope: "service", refId: "s-chef",
    sources: [{ id: "ks-7", kind: "auto", name: "Auto-synced from service record (menu, allergens, timing)", ts: now - 1 * D }],
    rules: [{ id: "kr-5", kind: "hard", text: "Allergen questions require 24h notice — never promise same-day." }],
  },
];

export const ACTION_ITEMS: { id: string; question: string; propertyId: string; reason: string; ts: number; status: "open" | "saved" | "tasked" }[] = [
  { id: "ai-1", question: "Is the pool at Villa Anggrek heated in August?", propertyId: "p-anggrek", reason: "No source covers pool heating — 0 of 3 scopes matched", ts: now - 5 * H, status: "open" },
  { id: "ai-2", question: "Can the private chef do a full keto menu for 6?", propertyId: "p-anggrek", reason: "Service knowledge lacks dietary matrix; guardrail refused to invent", ts: now - 26 * H, status: "open" },
  { id: "ai-3", question: "Is there a gym within walking distance of Rumah Senja?", propertyId: "p-senja", reason: "Property scope has no sources at all (readiness 0%)", ts: now - 2 * D, status: "open" },
];

export const VARIABLES: VariableDef[] = [
  { key: "guest_name", label: "Guest full name", auto: true },
  { key: "guest_first", label: "Guest first name", auto: true },
  { key: "guest_last", label: "Guest last name", auto: true },
  { key: "guest_phone", label: "Guest phone", auto: true },
  { key: "guests", label: "Guest count", auto: true },
  { key: "adults", label: "Adult count", auto: true },
  { key: "property_name", label: "Property name", auto: true },
  { key: "checkin_date", label: "Check-in date", auto: true },
  { key: "checkout_date", label: "Check-out date", auto: true },
  { key: "nights", label: "Nights", auto: true },
  { key: "checkin_time", label: "Check-in time", auto: true },
  { key: "checkout_time", label: "Check-out time", auto: true },
  { key: "wifi_password", label: "Wi-Fi password", auto: false, value: "sanggraha-guest", overrides: { "p-anggrek": "ANGGREK-5G / moonstone", "p-kelapa": "KELAPA-beach-2024" } },
  { key: "manager_phone", label: "Duty manager phone", auto: false, value: "+62 813 220 480", overrides: {} },
];

export const MSG_TEMPLATES: MsgTemplate[] = [
  { id: "mt-1", name: "Booking confirmation", lifecycle: "new_reservation", version: 4, channels: ["Email", "OTA native", "WhatsApp"], targeting: "All properties", state: "active", offsetLabel: "Immediately on confirmation", body: "Dear {{guest_first}}, your stay at {{property_name}} is confirmed: {{checkin_date}} → {{checkout_date}} ({{nights}} nights, {{adults}} adults). We'll be in touch 48h before arrival with your access details. — {{manager_name}}" },
  { id: "mt-2", name: "Pre-arrival essentials", lifecycle: "pre_arrival", version: 3, channels: ["Email", "WhatsApp"], targeting: "All properties", state: "active", offsetLabel: "48h before check-in, 09:00 local", body: "Hi {{guest_first}} — almost time! Check-in is from {{checkin_time}} on {{checkin_date}}. Wi-Fi: {{wifi_password}}. Need an airport transfer or a stocked fridge? Just reply here." },
  { id: "mt-3", name: "Check-in morning", lifecycle: "check_in", version: 2, channels: ["WhatsApp", "OTA native"], targeting: "All properties", state: "active", offsetLabel: "Check-in day, 08:00 local", body: "Good morning {{guest_first}}! Your villa will be ready from {{checkin_time}}. Your guidebook: {{guidebook_url}}. Safe travels — Kadek" },
  { id: "mt-4", name: "Mid-stay care check", lifecycle: "during_stay", version: 1, channels: ["WhatsApp"], targeting: "Stays ≥ 4 nights", state: "paused", offsetLabel: "Day 2, 17:00 local", body: "Hi {{guest_first}}, how is {{property_name}} treating you? Reply with anything at all — the kettle, the pillows, the sunset — we're on it." },
  { id: "mt-5", name: "Checkout instructions", lifecycle: "checkout", version: 3, channels: ["Email", "WhatsApp", "OTA native"], targeting: "All properties", state: "active", offsetLabel: "Checkout day, 07:30 local", body: "Hi {{guest_first}} — checkout is {{checkout_time}} today. Leave keys on the console; your deposit releases within 48h. Late flight? Ask about our lounge + shower." },
  { id: "mt-6", name: "Review request", lifecycle: "post_stay", version: 2, channels: ["Email"], targeting: "Direct bookings only", state: "active", offsetLabel: "2 days after checkout, 10:00 local", body: "Dear {{guest_first}}, it was a pleasure hosting you at {{property_name}}. If you have a moment, a review means the world to our small team — and here's 10% off your next direct booking." },
];

export const MSG_QUEUE: QueuedMessage[] = [
  { id: "mq-1", templateId: "mt-3", guestName: "Jonas Weber", propertyId: "p-cemara", channel: "WhatsApp", sendAt: now + 14 * H, state: "upcoming", preview: "Good morning Jonas! Your villa will be ready from 14:00…" },
  { id: "mq-2", templateId: "mt-3", guestName: "Sofia Marques", propertyId: "p-senja", channel: "WhatsApp", sendAt: now + 15 * H, state: "upcoming", preview: "Good morning Sofia! Your villa will be ready from 14:00…" },
  { id: "mq-3", templateId: "mt-3", guestName: "Tom Bradley", propertyId: "p-sam-one", channel: "Airbnb native", sendAt: now + 16 * H, state: "upcoming", preview: "Good morning Tom! Samudra One will be ready from 15:00…" },
  { id: "mq-4", templateId: "mt-2", guestName: "Grace Lin", propertyId: "p-anggrek", channel: "WhatsApp", sendAt: now + 20 * H, state: "upcoming", preview: "Hi Grace — almost time! Check-in is from 14:00…" },
  { id: "mq-5", templateId: "mt-2", guestName: "Chen Wei", propertyId: "p-purnama", channel: "Email", sendAt: now + 2 * D, state: "upcoming", preview: "Hi Chen — almost time! Check-in is from 14:00…" },
  { id: "mq-6", templateId: "mt-1", guestName: "Yuki Tanaka", propertyId: "p-cemara", channel: "Email", sendAt: now - 6 * H, state: "sent", preview: "Dear Yuki, your stay at Villa Cemara is confirmed…" },
  { id: "mq-7", templateId: "mt-5", guestName: "Amelia Hartono", propertyId: "p-anggrek", channel: "WhatsApp", sendAt: now - 1 * D, state: "sent", preview: "Hi Amelia — checkout is 11:00 today…" },
  { id: "mq-8", templateId: "mt-6", guestName: "Hannah de Vries", propertyId: "p-kelapa", channel: "Email", sendAt: now - 2 * D, state: "sent", preview: "Dear Hannah, it was a pleasure hosting you…" },
  { id: "mq-9", templateId: "mt-2", guestName: "Marco Ricci", propertyId: "p-sam-three", channel: "WhatsApp", sendAt: now - 8 * H, state: "failed", preview: "Hi Marco — almost time! (WhatsApp session expired — guest re-opt-in required)" },
  { id: "mq-10", templateId: "mt-4", guestName: "Priya Raghavan", propertyId: "p-purnama", channel: "WhatsApp", sendAt: now - 3 * H, state: "cancelled", preview: "Cancelled — guest checked out early" },
];

export const AUTOMATIONS: Automation[] = [
  { id: "au-1", name: "Post-checkout cleaning", trigger: "check_out", scopeLabel: "All properties", actionLabel: "Create task from “Checkout turnover clean”, assign to housekeeping (round-robin by workload)", assignMode: "Anyone available · round-robin", offsetLabel: "At checkout time", priority: "high", active: true, runs: 148 },
  { id: "au-2", name: "Pre-check-in preparation", trigger: "check_in", scopeLabel: "All properties", actionLabel: "Create task from “Pre-arrival preparation”, assign to butler on duty", assignMode: "Kadek Mira", offsetLabel: "1 day before, 09:00 local", priority: "urgent", active: true, runs: 132 },
  { id: "au-3", name: "Monthly maintenance inspection", trigger: "recurring", scopeLabel: "Each property", actionLabel: "Create task from “Monthly property inspection”, notify Wayan", assignMode: "Wayan Sudiarta", offsetLabel: "Every 30 days, on the 1st, 08:00", priority: "medium", active: true, runs: 41 },
  { id: "au-4", name: "Guest 24h arrival reminder", trigger: "check_in", scopeLabel: "All properties", actionLabel: "Send message template “Pre-arrival essentials”", assignMode: "—", offsetLabel: "24h before, 09:00 local", priority: "medium", active: true, runs: 289 },
];

export const RECIPES: { name: string; trigger: string; action: string }[] = [
  { name: "Post-checkout cleaning", trigger: "Check-out", action: "Task from template → housekeeping" },
  { name: "Pre-check-in preparation", trigger: "Check-in − 1d", action: "Task from template → butler" },
  { name: "Monthly maintenance inspection", trigger: "Every 30 days", action: "Task from template → manager" },
  { name: "Checkout notification to staff", trigger: "Check-out − 1h", action: "Notify role: housekeeping" },
  { name: "Guest booking confirmation", trigger: "Booking created", action: "Send template → guest" },
  { name: "Guest 24h reminder", trigger: "Check-in − 24h", action: "Send template → guest" },
  { name: "Guest cancellation notice", trigger: "Booking cancelled", action: "Send template → guest" },
  { name: "New assignment email", trigger: "Task assigned", action: "Notify assignee (WhatsApp + email)" },
  { name: "Reassignment alert", trigger: "Task reassigned", action: "Notify old + new assignee" },
  { name: "Day-before reminder", trigger: "Task due − 1d", action: "Notify assignee (WhatsApp)" },
];

export const ISSUES: IssueReport[] = [
  { id: "i-1", taskId: "t-503", propertyId: "p-purnama", item: "Water stain spreading on ceiling", note: "Stain doubled since yesterday, paint bubbling. Recommend provider visit before next check-in.", photo: true, state: "pending", ts: now - 19 * H },
  { id: "i-2", taskId: "t-509", propertyId: "p-cemara", item: "Pump basket cracked", note: "Hairline crack, holding for now. Spare ordered.", photo: true, state: "accepted", ts: now - 2 * D, providerId: "pv-1" },
  { id: "i-3", taskId: "t-513", propertyId: "p-senja", item: "Deck board loose near plunge pool", note: "Screwed back down; needs full re-fix next month.", photo: false, state: "resolved", ts: now - 4 * D, escalatedToTaskId: "t-506" },
];

// ── Channels / sync ────────────────────────────────────────────────────────
export const SYNC: SyncState[] = [
  { key: "p-anggrek:airbnb", propertyId: "p-anggrek", channel: "airbnb", lastSuccessTs: now - 4 * 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
  { key: "p-anggrek:booking", propertyId: "p-anggrek", channel: "booking", lastSuccessTs: now - 9 * 60_000, queueDepth: 2, errorRate24h: 0.02, state: "live" },
  { key: "p-anggrek:direct", propertyId: "p-anggrek", channel: "direct", lastSuccessTs: now - 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
  { key: "p-cemara:airbnb", propertyId: "p-cemara", channel: "airbnb", lastSuccessTs: now - 6 * 60_000, queueDepth: 1, errorRate24h: 0, state: "live" },
  { key: "p-cemara:booking", propertyId: "p-cemara", channel: "booking", lastSuccessTs: now - 12 * 60_000, queueDepth: 0, errorRate24h: 0.01, state: "live" },
  { key: "p-cemara:vrbo", propertyId: "p-cemara", channel: "vrbo", lastSuccessTs: now - 26 * H, queueDepth: 6, errorRate24h: 0.55, state: "error", lastFailure: { ts: now - 3 * H, cls: "AUTH_EXPIRED", request: "PUT /v1/listings/88412/rates\n{ \"nights\": 25, \"currency\": \"USD\", \"plan\": \"base+season\" }", response: "401 Unauthorized\n{ \"error\": \"oauth_token_expired\", \"hint\": \"re-authenticate in extranet\" }" } },
  { key: "p-samudra:booking", propertyId: "p-samudra", channel: "booking", lastSuccessTs: now - 22 * 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
  { key: "p-sam-two:airbnb", propertyId: "p-sam-two", channel: "airbnb", lastSuccessTs: now - 11 * 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
  { key: "p-sam-two:booking", propertyId: "p-sam-two", channel: "booking", lastSuccessTs: now - 40 * H, queueDepth: 3, errorRate24h: 0.72, state: "error", lastFailure: { ts: now - 2 * H, cls: "ROOM_TYPE_UNMAPPED", request: "POST /extranet/rateplan/4410/update\n{ \"room\": \"Deluxe King Room\", \"nights\": 30 }", response: "409 Conflict\n{ \"error\": \"room_type_not_mapped\", \"unmapped_room\": \"Deluxe King Room\" }" } },
  { key: "p-purnama:agoda", propertyId: "p-purnama", channel: "agoda", lastSuccessTs: now - 31 * H, queueDepth: 14, errorRate24h: 0.42, state: "error", lastFailure: { ts: now - 70 * 60_000, cls: "RATE_PUSH_REJECTED", request: "PUT /ycs/properties/77120/rates\n{ \"currency\": \"USD\", \"base\": 341, \"seasonal\": true }", response: "422 Unprocessable\n{ \"error\": \"rate_below_floor\", \"min_allowed\": 348 }" } },
  { key: "p-purnama:trip", propertyId: "p-purnama", channel: "trip", lastSuccessTs: now - 5 * D, queueDepth: 0, errorRate24h: 0, state: "mapping" },
  { key: "p-purnama:airbnb", propertyId: "p-purnama", channel: "airbnb", lastSuccessTs: now - 7 * 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
  { key: "p-kelapa:traveloka", propertyId: "p-kelapa", channel: "traveloka", lastSuccessTs: now - 18 * 60_000, queueDepth: 0, errorRate24h: 0, state: "live" },
];

export const CONFLICTS: Conflict[] = [
  { id: "cf-1", channel: "booking", externalRef: "BDC-99172-XK", rawRoomType: "Deluxe King Room", suggestion: "Samudra Two (SM2)", propertyId: "p-sam-two", ts: now - 2 * H, nights: 4, total: 412_00 },
  { id: "cf-2", channel: "expedia", externalRef: "EXP-31120-QW", rawRoomType: "Villa 2BR Garden", suggestion: "Samudra One (SM1)", propertyId: "p-sam-one", ts: now - 7 * H, nights: 2, total: 228_00 },
];

// ── Webhooks / audit ───────────────────────────────────────────────────────
export const WEBHOOKS: WebhookEndpoint[] = [
  {
    id: "wh-1", url: "https://ops.sanggraha.co/hooks/derzen", events: ["reservation.created", "reservation.modified", "reservation.cancelled", "payment.received"],
    secret: "whsec_9f2k1m••••redacted", active: true,
    deliveries: [
      { id: "d-1", ts: now - 18 * 60_000, event: "reservation.created", status: 200, ms: 184, response: "200 OK · {\"received\":true}" },
      { id: "d-2", ts: now - 3 * H, event: "payment.received", status: 200, ms: 220, response: "200 OK · {\"received\":true}" },
      { id: "d-3", ts: now - 6 * H, event: "reservation.modified", status: 500, ms: 5023, response: "500 Internal · timeout after 5s — retry #2 of 5 (backoff 8m)" },
      { id: "d-4", ts: now - 9 * H, event: "reservation.modified", status: 200, ms: 151, response: "200 OK · {\"received\":true}" },
      { id: "d-5", ts: now - 26 * H, event: "reservation.cancelled", status: 200, ms: 198, response: "200 OK · {\"received\":true}" },
    ],
  },
];

export const AUDIT: AuditEntry[] = [
  { ts: now - 2 * H, actor: "Concierge (autopilot: suggestion)", action: "Drafted reply in thread “Pool pump noise”", source: "ai", after: "model=concierge-v2 · prompt=v14 · cited=1 source" },
  { ts: now - 5 * H, actor: "Sarah Whitfield", action: "Bulk edit: Villa Anggrek + Cemara · 14 nights · rate +8% peak overlay", source: "ui", before: "Base IDR 4,200,000", after: "Peak overlay IDR 4,536,000 · pushed to 5 channels" },
  { ts: now - 8 * H, actor: "Channel sync (Booking.com)", action: "Imported reservation BDC-99172-XK → quarantined (unmapped room type)", source: "channel_sync" },
  { ts: now - 11 * H, actor: "Automation au-1", action: "Created task “Turnover clean — Villa Purnama” from template tt-clean v4", source: "automation" },
  { ts: now - 22 * H, actor: "Marco Reyes", action: "Refund 30% on R-2432 (VRBO cancellation, guest-initiated)", source: "ui", before: "Paid USD 1,184", after: "Refunded USD 355 · ledger + owner statement updated atomically" },
  { ts: now - 30 * H, actor: "System", action: "Guest identity verification completed for Grace Lin (provider ref VY-88213, expires in 30d)", source: "api" },
  { ts: now - 2 * D, actor: "Website builder", action: "Published sanggraha.derzen.site (pages: 4, blocks: 18)", source: "ui" },
  { ts: now - 3 * D, actor: "RatePilot (dynamic pricing)", action: "Suggested +6% on Villa Anggrek for Oct long weekend — awaiting review", source: "automation" },
];

// ── Guidebooks ─────────────────────────────────────────────────────────────
function gb(propertyId: string, completeness: number, aiOnly = "Escalate any question about cliff-edge safety to the duty manager. Never invent beach shuttle times — use only the published 09:00 / 13:00 / 17:00 slots."): Guidebook {
  const fill = (v: string) => (Math.random() < completeness ? v : "");
  return {
    propertyId,
    aiOnly,
    sections: [
      {
        id: "arrival", name: "Arrival & Access", required: true,
        fields: { checkin_time: fill("From 14:00 WITA"), address: fill(propertyById(propertyId).city + ", Bali, Indonesia — full pin in your confirmation"), directions: fill("From DPS: 55 min via the toll road; driver will WhatsApp you a live pin."), parking: fill("Private carport fits 2 cars; gate code on the day."), access_code: fill("Sent after ID verification clears."), key_handoff: fill("Smart lock — no physical keys. Backup key with the estate office.") },
        fieldDefs: [
          { key: "checkin_time", label: "Check-in time", sync: "property.checkInTime" },
          { key: "address", label: "Address", sync: "property.address", multiline: true },
          { key: "directions", label: "Directions", multiline: true },
          { key: "parking", label: "Parking instructions", multiline: true },
          { key: "access_code", label: "Access codes" },
          { key: "key_handoff", label: "Key handoff" },
        ],
      },
      {
        id: "space", name: "The Space", required: true,
        fields: { amenities: fill("Infinity pool · chef kitchen · cinema room · fast Wi-Fi · BBQ"), appliances: fill("Coffee machine: fill tank, capsule left slot, double-shot button. Washing machine: powder in drawer 2, eco cycle."), wifi: fill("Network: " + propertyById(propertyId).code + "-5G · Password in your welcome message") },
        fieldDefs: [{ key: "amenities", label: "Amenities", multiline: true }, { key: "appliances", label: "Appliance how-tos", multiline: true }, { key: "wifi", label: "Wi-Fi" }],
      },
      {
        id: "rules", name: "House Rules", required: true,
        fields: { rules: fill("Quiet hours 22:00–07:00 · no parties over 12 · pool closes at dusk for under-12s without supervision · smoking outside only.") },
        fieldDefs: [{ key: "rules", label: "Rules", multiline: true }],
      },
      {
        id: "stay", name: "During Your Stay", required: true,
        fields: { staff: fill("Butler Kadek (08:00–20:00) · Duty manager Wayan 24/7"), services: fill("Chef dinners, spa, transfers — book from the Store tab below."), local: fill("Tourist levy: show this QR at immigration (auto-generated).") },
        fieldDefs: [{ key: "staff", label: "Staff contacts", multiline: true }, { key: "services", label: "Services", multiline: true }, { key: "local", label: "Local registration requirements", multiline: true }],
      },
      {
        id: "where", name: "Where is it?", required: true,
        fields: { transport: fill("Grab works here; our drivers are cheaper after 22:00. Beach shuttle 09:00 / 13:00 / 17:00.") },
        fieldDefs: [{ key: "transport", label: "Transport", multiline: true }],
      },
      {
        id: "checkout", name: "Checkout", required: true,
        fields: { time: fill("By 11:00 WITA"), procedure: fill("Leave keys on the console, AC off, gate pulls shut behind you. Deposit releases within 48h.") },
        fieldDefs: [{ key: "time", label: "Checkout time", sync: "property.checkOutTime" }, { key: "procedure", label: "Procedure", multiline: true }],
      },
      {
        id: "ai", name: "AI-only instructions", required: false,
        fields: {},
        fieldDefs: [],
      },
    ],
    design: { theme: "Bali Dusk", font: "Big Shoulders / Schibsted Grotesk", accent: "#0E6B4E" },
    published: completeness >= 0.8,
    views30d: Math.round(140 * completeness) + 20,
    sectionEngagement: { arrival: 92, space: 78, rules: 41, stay: 66, where: 57, checkout: 83 },
    storeConversionPct: Math.round(18 * completeness + 4),
    lastSavedTs: now - 4 * 60_000,
  };
}
export const GUIDEBOOKS: Guidebook[] = [
  gb("p-anggrek", 1), gb("p-cemara", 0.92), gb("p-senja", 0.62), gb("p-samudra", 0.85),
  gb("p-purnama", 0.96), gb("p-kelapa", 0.88), gb("p-bayu", 0.3),
];
// deterministic content (Math.random above runs once at load — stable per session)

export const STORE_ITEMS: StoreItem[] = [
  { id: "si-1", name: "Floating breakfast for two", type: "upsell", price: 300_000, currency: "IDR", active: true, enabledProperties: ["p-anggrek", "p-purnama", "p-samudra"], desc: "Served in-pool 07:30–10:00." },
  { id: "si-2", name: "Sunset catamaran · 4h", type: "experience", price: 2_800_000, currency: "IDR", active: true, enabledProperties: ["p-purnama", "p-kelapa"], desc: "Up to 12 guests, crew + snacks included." },
  { id: "si-3", name: "Warung Nia — 15% partner offer", type: "partner_offer", price: 0, currency: "IDR", active: true, enabledProperties: ["p-cemara"], desc: "Show the guidebook for 15% off the set menu." },
  { id: "si-4", name: "Villa coffee beans 250g", type: "product", price: 120_000, currency: "IDR", active: true, enabledProperties: ["p-anggrek", "p-cemara", "p-senja"], desc: "Kintamani roast, the one in your welcome basket." },
  { id: "si-5", name: "In-villa spa ritual · 120 min", type: "experience", price: 900_000, currency: "IDR", active: true, enabledProperties: ["p-anggrek", "p-purnama", "p-sam-two"], desc: "Two therapists, oils included." },
  { id: "si-6", name: "Late checkout (until 14:00)", type: "upsell", price: 350_000, currency: "IDR", active: false, enabledProperties: ["p-anggrek"], desc: "Subject to next-arrival gap." },
];

export const STORE_TXNS: { id: string; item: string; guest: string; ts: number; amount: number; payment: "completed" | "pending" | "processing" | "failed"; fulfillment: "fulfilled" | "unfulfilled" }[] = [
  { id: "st-1", item: "Floating breakfast for two", guest: "Amelia Hartono", ts: now - 5 * H, amount: 300_000, payment: "completed", fulfillment: "unfulfilled" },
  { id: "st-2", item: "In-villa spa ritual · 120 min", guest: "Hannah de Vries", ts: now - 1 * D, amount: 900_000, payment: "completed", fulfillment: "fulfilled" },
  { id: "st-3", item: "Villa coffee beans 250g", guest: "Jonas Weber", ts: now - 2 * D, amount: 240_000, payment: "pending", fulfillment: "unfulfilled" },
  { id: "st-4", item: "Sunset catamaran · 4h", guest: "Grace Lin", ts: now - 3 * D, amount: 2_800_000, payment: "processing", fulfillment: "unfulfilled" },
  { id: "st-5", item: "Late checkout (until 14:00)", guest: "Tom Bradley", ts: now - 4 * D, amount: 350_000, payment: "failed", fulfillment: "unfulfilled" },
];

// ── Websites & collections ─────────────────────────────────────────────────
export const COLLECTIONS: Collection[] = [
  { id: "col-1", name: "Oceanfront", slug: "oceanfront", rule: "Manual — 3 curated stays", itemIds: ["p-anggrek", "p-purnama", "p-kelapa"], featured: true },
  { id: "col-2", name: "Family-friendly", slug: "family-friendly", rule: "Rule: maxGuests ≥ 6 AND bedrooms ≥ 3", itemIds: ["p-purnama", "p-cemara", "p-samudra"], featured: true },
  { id: "col-3", name: "Honeymoon Hideaways", slug: "honeymoon", rule: "Rule: bedrooms ≤ 2 AND tag = romantic", itemIds: ["p-senja", "p-kelapa"], featured: false },
];

const day30 = Array.from({ length: 30 }, (_, i) => {
  const d = addDays(today(), i - 29);
  const wave = Math.sin(i / 3.1) * 0.35 + 1 + i * 0.012;
  const views = Math.round(220 * wave + (i % 7 === 5 ? 90 : 0));
  return {
    day: dayKey(d),
    views,
    visitors: Math.round(views * 0.62),
    bookings: i % 9 === 2 || i % 13 === 6 ? (i % 2 ? 2 : 1) : 0,
    revenue: i % 9 === 2 ? 412_00 : i % 13 === 6 ? 268_00 : 0, // EUR minor
  };
});
export const WEBSITE: WebsiteState = {
  id: "w-1", subdomain: "sanggraha.derzen.site", customDomain: "stay.sanggraha.co", domainStatus: "pending_dns", published: true, activePageId: "pg-home",
  pages: [
    {
      id: "pg-home", name: "Home", slug: "/", home: true,
      blocks: [
        { id: "b-hero", type: "hero" },
        { id: "b-highlights", type: "icon_highlights" },
        { id: "b-cols", type: "section", cols: [[{ id: "b-rt-1", type: "rich_text" }], [{ id: "b-img-1", type: "image" }]] },
        { id: "b-coll", type: "collection_grid" },
        { id: "b-reviews", type: "guest_reviews" },
        { id: "b-faq", type: "faq" },
        { id: "b-cta", type: "cta_banner" },
      ],
    },
    { id: "pg-villas", name: "Villas", slug: "/villas", blocks: [{ id: "b-search", type: "search_bar" }, { id: "b-offgrid", type: "offerings_grid" }] },
    { id: "pg-exp", name: "Experiences", slug: "/experiences", blocks: [{ id: "b-collist", type: "collection_list" }, { id: "b-featured", type: "featured_offering" }] },
    { id: "pg-contact", name: "Contact", slug: "/contact", blocks: [{ id: "b-form", type: "contact_form" }] },
  ],
  theme: { palette: "Palm & Sand", radius: 10, font: "Fraunces / Instrument Sans" },
  analytics: day30,
};

// ── Hotel-style listings: one property, many rentable rooms ───────────────
export const HOTEL_ROOMS: Record<string, { id: string; name: string }[]> = {
  "p-samudra": [
    { id: "u-sam-1", name: "Garden Suite" }, { id: "u-sam-2", name: "Pool Suite" },
    { id: "u-sam-3", name: "Ocean Suite" }, { id: "u-sam-4", name: "Cliff Suite" },
    { id: "u-sam-5", name: "Family Loft" }, { id: "u-sam-6", name: "Honeymoon Villa" },
  ],
  "p-kelapa": [
    { id: "u-kel-1", name: "Room 1 · Frangipani" }, { id: "u-kel-2", name: "Room 2 · Bougainville" },
    { id: "u-kel-3", name: "Room 3 · Jasmine" }, { id: "u-kel-4", name: "Room 4 · Hibiscus" },
  ],
};

// ── Asset library: uploaded media + saved copy tenants reuse in the builder ──
export const SAVED_COPIES: { id: string; label: string; text: string }[] = [
  { id: "copy-welcome", label: "Welcome paragraph", text: "Selamat datang! Our team lives ten minutes away and answers within the hour. The house manual lives in this guidebook — wifi, pool care, and our favourite warungs are all inside." },
  { id: "copy-faq-pool", label: "FAQ · Is the pool heated?", text: "The pool is not heated, but Bali does the work for us — it sits at a natural 28–30°C year-round. Towels and floats are in the store room by the kitchen." },
  { id: "copy-faq-checkin", label: "FAQ · Early check-in", text: "Check-in is from 14:00. Early arrival depends on the previous guest — message us the day before and we will do our best, or book the early check-in add-on to guarantee it." },
  { id: "copy-faq-staff", label: "FAQ · Is staff included?", text: "Yes — daily housekeeping and a private chef on request are included in your stay. Drivers and spa therapists can be booked from the store." },
  { id: "copy-cta", label: "Direct-booking CTA", text: "Book direct and save ~15% — plus late checkout when the calendar allows." },
];

export const EMBED_SNIPPET = `<script async src="https://cdn.derzen.site/embed.js"
  data-site="sanggraha" data-widget="search"
  data-currency="EUR" data-locale="en"></script>
<div class="derzen-embed" data-widget="search"
  style="min-height:120px"></div>`;

export const EMBED_IFRAME = `<iframe src="https://sanggraha.derzen.site/embed/search"
  style="width:100%;height:140px;border:0"
  title="Search Sanggraha Villas availability"
  sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;

// ── Reports series ─────────────────────────────────────────────────────────
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHLY = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(today().getFullYear(), today().getMonth() - 11 + i, 1);
  const season = 1 + 0.35 * Math.sin(((d.getMonth() - 6) / 12) * Math.PI * 2) + i * 0.015;
  const revenue = Math.round(48_200 * season) * 100; // EUR minor
  const expenses = Math.round(revenue * (0.44 + 0.05 * Math.sin(i)));
  return {
    label: MON_SHORT[d.getMonth()],
    revenue, expenses, net: revenue - expenses,
    bookings: Math.round(24 * season), adr: Math.round(revenue / (26 * season)) , occupancy: 0.52 + 0.3 * season - 0.15,
  };
});
export const CHANNEL_SPLIT = [
  { channel: "Airbnb", share: 0.34, amount: 198_400_00 },
  { channel: "Booking.com", share: 0.27, amount: 157_600_00 },
  { channel: "Direct website", share: 0.21, amount: 122_500_00 },
  { channel: "Agoda", share: 0.08, amount: 46_700_00 },
  { channel: "Trip.com", share: 0.05, amount: 29_200_00 },
  { channel: "Other", share: 0.05, amount: 29_100_00 },
];

// ── Onboarding / misc ──────────────────────────────────────────────────────
export const ONBOARD_STEPS: OnboardStep[] = [
  { id: "ob-1", label: "Add your first property", detail: "Photos, capacity, timezone, listing currency.", done: true, route: "/listings" },
  { id: "ob-2", label: "Connect a channel or iCal", detail: "Blocking dates within 10 minutes of signup.", done: true, route: "/channels" },
  { id: "ob-3", label: "Set your rate plans", detail: "Base + seasonal rates, extra guests, discounts.", done: true, route: "/listings" },
  { id: "ob-4", label: "Publish your direct-booking site", detail: "Subdomain is live; connect your own domain any time.", done: false, route: "/websites" },
  { id: "ob-5", label: "Invite your team", detail: "Roles, workforce duties, per-property scoping.", done: false, route: "/settings?tab=team" },
];

export const WORKSPACE = {
  name: "Sanggraha Villas",
  tenantId: "tnt_sanggraha",
  currency: "EUR",
  tz: "Europe/Amsterdam",
  dateFormat: "D MMM YYYY",
  timeFormat: "24h",
  weekStart: "Monday",
  locale: "en" as const,
  inboundEmail: "invoices-7f3k@sanggraha.derzen.site",
  supportAccess: true,
  supportLastAccess: now - 6 * D,
  ownerFinancialsVisible: true,
  trialEndsInDays: 9,
  plan: "Growth",
  credits: { used: 742, limit: 2000 },
};

export const NOTIF_EVENTS: { group: string; events: string[] }[] = [
  { group: "Booking & revenue", events: ["New booking request", "Booking confirmed", "Booking cancelled", "Payment received", "Payout processed", "Review received", "Check-in / check-out reminders"] },
  { group: "Guest communication", events: ["New guest message", "Autopilot action taken", "Guest verification completed", "Urgent / keyword-flagged message"] },
  { group: "Operational alerts", events: ["Low availability window", "Pricing optimisation suggestion", "Maintenance & cleaning reminders", "Task overdue", "Team actions on my properties"] },
];
export const NOTIF_CHANNELS = ["Email", "In-app", "WhatsApp", "Push"];

export const GATEWAYS = [
  { id: "stripe", name: "Stripe", status: "active", note: "Hosted checkout · cards, Apple/Google Pay · payout T+2" },
  { id: "razorpay", name: "Razorpay", status: "available", note: "UPI, cards, netbanking · best for INR direct bookings" },
  { id: "offline", name: "Offline / bank transfer", status: "available", note: "Free-form instructions rendered verbatim on quotes & PDFs" },
  { id: "hitpay", name: "HitPay", status: "waitlist", note: "In development — join the waitlist; we ship gateways we can support" },
  { id: "xendit", name: "Xendit", status: "waitlist", note: "In development — Indonesian VA + QRIS" },
  { id: "doku", name: "DOKU", status: "waitlist", note: "In development" },
];
