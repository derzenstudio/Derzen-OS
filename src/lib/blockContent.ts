// Block content model — every block type has editable string fields.
// Lists are stored as delimited strings so the inline editor stays simple
// (one line per item, "Q | A" pairs for FAQ, comma-separated URLs for galleries).

export interface ContentField { key: string; label: string; multiline?: boolean; kind?: "text" | "image" | "lines" | "qa" | "csv" | "url"; hint?: string; }
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
    { key: "items", label: "Highlights", multiline: true, kind: "lines", hint: "one per line" },
  ],
};

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
    case "cta_banner": return { headline: "Direct bookings save ~15%, always.", button: "Book direct", url: "/search" };
    case "contact_form": return { title: "Talk to a human", button: "Send message" };
    case "icon_highlights": return { title: "Why guests return", items: "Private staff on call\nMarket-fresh chef menus\nHonest direct pricing" };
    default: return { text: "New block — click to edit." };
  }
}

export const parseLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
export const parseQA = (s: string) =>
  parseLines(s).map((l) => {
    const [q, ...rest] = l.split("|");
    return { q: (q ?? "").trim(), a: rest.join("|").trim() };
  });
export const parseCSV = (s: string) => parseLines(s).map((l) => l.split(",").map((c) => c.trim()));
