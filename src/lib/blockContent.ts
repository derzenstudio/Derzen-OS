// Block content model — every block type has editable string fields.
// Lists are stored as delimited strings so the inline editor stays simple
// (one line per item, "Q | A" pairs for FAQ, comma-separated URLs for galleries).

export interface ContentField { key: string; label: string; multiline?: boolean; kind?: "text" | "image" | "lines" | "qa" | "csv" | "url" | "icons" | "select_property"; hint?: string; }
export const CONTENT_SCHEMA: Record<string, ContentField[]> = {
  hero: [
    { key: "headline", label: "Headline" },
    { key: "sub", label: "Subline" },
    { key: "badge", label: "Price badge" },
    { key: "image", label: "Background image", kind: "image" },
  ],
  rich_text: [
    { key: "title", label: "Title" },
    { key: "text", label: "Body text", multiline: true },
  ],
  image: [
    { key: "src", label: "Image", kind: "image" },
    { key: "caption", label: "Caption" },
  ],
  gallery: [
    { key: "title", label: "Title" },
    { key: "images", label: "Image URLs (comma-separated)", multiline: true, kind: "csv", hint: "or pull from your asset library" },
  ],
  faq: [
    { key: "title", label: "Section title" },
    { key: "items", label: "Questions & answers", multiline: true, kind: "qa", hint: "one per line, format: Question | Answer" },
  ],
  guest_reviews: [
    { key: "quote", label: "Review quote", multiline: true },
    { key: "author", label: "Guest & stay" },
    { key: "rating", label: "Rating (stars)" },
  ],
  table: [
    { key: "title", label: "Title" },
    { key: "rows", label: "Rows", multiline: true, kind: "csv", hint: "one row per line, cells separated by commas" },
  ],
  collection_grid: [{ key: "title", label: "Heading" }, { key: "cta", label: "Button label" }],
  collection_list: [{ key: "title", label: "Heading" }],
  featured_offering: [
    { key: "title", label: "Offering name" },
    { key: "text", label: "Description", multiline: true },
    { key: "price", label: "Price line" },
    { key: "image", label: "Image", kind: "image" },
  ],
  offerings_grid: [{ key: "title", label: "Heading" }],
  search_bar: [{ key: "button", label: "Button label" }, { key: "placeholder", label: "Placeholder" }],
  booking_calendar: [{ key: "propertyId", label: "Selected Property ID", kind: "select_property" }],
  group_calendar: [{ key: "title", label: "Group Title" }, { key: "subtitle", label: "Group Subtitle" }, { key: "propertyId", label: "Selected Property ID", kind: "select_property" }],
  cta_banner: [
    { key: "headline", label: "Headline" },
    { key: "button", label: "Button label" },
    { key: "url", label: "Button link", kind: "url" },
  ],
  contact_form: [
    { key: "title", label: "Form title" },
    { key: "button", label: "Submit label" },
  ],
  icon_highlights: [
    { key: "title", label: "Heading" },
    { key: "items", label: "Highlights", multiline: true, kind: "icons", hint: "one per line — click the icon chip on canvas to change it" },
  ],
};

// Parse an icon-highlight line "iconName | label" → { icon, label }.
export function parseIconItems(raw: string): { icon: string; label: string }[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [a, ...rest] = l.split("|");
      const head = (a ?? "").trim();
      const label = rest.join("|").trim();
      // "icon | label" — head is an icon name; plain "label" defaults to sparkle
      return rest.length ? { icon: head || "sparkle", label } : { icon: "sparkle", label: head };
    });
}

export function defaultBlockContent(type: string): Record<string, string> {
  switch (type) {
    case "hero": return { headline: "Boutique Bali, run properly.", sub: "Nine staffed villas across the island's best coastlines.", badge: "From Rp 3.6M / night", image: "" };
    case "rich_text": return { title: "A collection, not a chain.", text: "Every Sanggraha villa is hand-run: a butler who knows your name, a chef who shops the morning market, and pricing that doesn't play games." };
    case "image": return { src: "", caption: "Villa Anggrek at golden hour." };
    case "gallery": return { title: "Around the villas", images: "" };
    case "faq": return { title: "Good to know", items: "What time is check-in? | From 14:00 WITA — early bags welcome.\nIs the pool heated? | Pools sit at ~29°. Bali rarely needs more.\nAirport transfers? | Yes — tell us your flight and a driver meets you." };
    case "guest_reviews": return { quote: "Absolutely flawless. Kadek thought of everything before we asked.", author: "Yuki · Villa Anggrek", rating: "5" };
    case "table": return { title: "House essentials", rows: "Wi-Fi,50 Mbps fibre\nPool,Cleaned daily\nStaff,Butler + chef on call\nParking,2 cars, gated" };
    case "collection_grid": return { title: "The collection", cta: "View all villas" };
    case "collection_list": return { title: "This month's picks" };
    case "featured_offering": return { title: "Villa Anggrek", text: "Cliffside in Uluwatu with an infinity edge over the Indian Ocean. Sleeps 8, staffed by five.", price: "from Rp 7.4M / night", image: "" };
    case "offerings_grid": return { title: "Services & experiences" };
    case "search_bar": return { button: "Search stays", placeholder: "Dates · guests · area" };
    case "booking_calendar": return { propertyId: "" };
    case "group_calendar": return { title: "Samudra Estate (Group)", subtitle: "Book the entire estate or select individually.", propertyId: "" };
    case "cta_banner": return { headline: "Direct bookings save ~15%, always.", button: "Book direct", url: "/search" };
    case "contact_form": return { title: "Talk to a human", button: "Send message" };
    case "icon_highlights": return { title: "Why guests return", items: "heart | Private staff on call\nbag | Market-fresh chef menus\ncoins | Honest direct pricing" };
    default: return { text: "New block — click to edit." };
  }
}

// Adjustable elements per block type — the "Elements" tab of the inspector
// lists these; each one accepts position / scale / rotate / opacity / size /
// colour / background / radius / padding adjustments.
export const ELEMENTS: Record<string, { id: string; label: string; kind: "text" | "image" | "button" | "container" }[]> = {
  hero: [{ id: "image", label: "Background image", kind: "image" }, { id: "headline", label: "Headline", kind: "text" }, { id: "badge", label: "Price badge", kind: "button" }],
  rich_text: [{ id: "title", label: "Title", kind: "text" }, { id: "text", label: "Body text", kind: "text" }],
  image: [{ id: "photo", label: "Photo", kind: "image" }, { id: "caption", label: "Caption", kind: "text" }],
  gallery: [{ id: "title", label: "Title", kind: "text" }, { id: "grid", label: "Photo grid", kind: "container" }],
  faq: [{ id: "title", label: "Title", kind: "text" }, { id: "list", label: "Q&A list", kind: "container" }],
  guest_reviews: [{ id: "rating", label: "Stars", kind: "text" }, { id: "quote", label: "Quote", kind: "text" }, { id: "author", label: "Guest & stay", kind: "text" }],
  table: [{ id: "title", label: "Title", kind: "text" }, { id: "grid", label: "Table", kind: "container" }],
  collection_grid: [{ id: "title", label: "Heading", kind: "text" }, { id: "cta", label: "Button", kind: "button" }],
  collection_list: [{ id: "title", label: "Heading", kind: "text" }],
  featured_offering: [{ id: "image", label: "Image", kind: "image" }, { id: "title", label: "Name", kind: "text" }, { id: "text", label: "Description", kind: "text" }, { id: "price", label: "Price line", kind: "text" }],
  offerings_grid: [{ id: "title", label: "Heading", kind: "text" }],
  search_bar: [{ id: "field", label: "Search field", kind: "container" }, { id: "button", label: "Button", kind: "button" }],
  booking_calendar: [{ id: "field", label: "Calendar wrap", kind: "container" }, { id: "button", label: "Book Button", kind: "button" }],
  group_calendar: [{ id: "field", label: "Group wrap", kind: "container" }, { id: "button", label: "Book Button", kind: "button" }],
  cta_banner: [{ id: "banner", label: "Banner", kind: "container" }, { id: "headline", label: "Headline", kind: "text" }, { id: "button", label: "Button", kind: "button" }],
  contact_form: [{ id: "title", label: "Form title", kind: "text" }, { id: "button", label: "Submit button", kind: "button" }],
  icon_highlights: [{ id: "title", label: "Heading", kind: "text" }, { id: "list", label: "Highlights row", kind: "container" }, { id: "chip", label: "Icon chips", kind: "container" }],
};

export const parseLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
export const parseQA = (s: string) =>
  parseLines(s).map((l) => {
    const [q, ...rest] = l.split("|");
    return { q: (q ?? "").trim(), a: rest.join("|").trim() };
  });
export const parseCSV = (s: string) => parseLines(s).map((l) => l.split(",").map((c) => c.trim()));
