// Global brand styling — one source of truth for fonts, palette, borders and
// card treatment. Applies to websites, embeddable widgets, quotes, invoices,
// emails and the guidebook. Site builder blocks and widgets can override.

export interface BrandState {
  headingFamily: string;
  headingUrl: string;   // stylesheet link (Google Fonts or any CSS)
  headingWoff2: string; // uploaded file name (hosted to /fonts/)
  bodyFamily: string;
  bodyUrl: string;
  bodyWoff2: string;
  primary: string;      // with alpha hex
  accent: string;
  ink: string;
  paper: string;
  radius: number;       // card corner radius
  borderW: number;      // card border width
  borderColor: string;
  shadow: "none" | "soft" | "lifted";
  btn: "solid" | "outline" | "soft";
  btnRadius: number;
}

export const DEFAULT_BRAND: BrandState = {
  headingFamily: "Big Shoulders Display",
  headingUrl: "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;700;800&display=swap",
  headingWoff2: "",
  bodyFamily: "IBM Plex Sans",
  bodyUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  bodyWoff2: "",
  primary: "#0e6b4e",
  accent: "#9a6a0b",
  ink: "#141811",
  paper: "#ffffff",
  radius: 3,
  borderW: 1,
  borderColor: "#e2e4dd",
  shadow: "soft",
  btn: "solid",
  btnRadius: 3,
};

export function brandVars(b: BrandState): Record<string, string> {
  return {
    "--brand-primary": b.primary,
    "--brand-accent": b.accent,
    "--brand-ink": b.ink,
    "--brand-paper": b.paper,
    "--brand-radius": `${b.radius}px`,
    "--brand-border-w": `${b.borderW}px`,
    "--brand-border-c": b.borderColor,
    "--brand-heading": `'${b.headingFamily}', sans-serif`,
    "--brand-body": `'${b.bodyFamily}', sans-serif`,
    "--brand-btn-r": `${b.btnRadius}px`,
    "--brand-shadow": b.shadow === "none" ? "none" : b.shadow === "soft" ? "0 1px 3px rgba(20,24,17,0.08)" : "0 10px 30px -12px rgba(20,24,17,0.25)",
  };
}

export function applyBrand(b: BrandState) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(brandVars(b))) root.setProperty(k, v);
  // fonts: swap in real time
  root.setProperty("--tenant-heading", `'${b.headingFamily}', sans-serif`);
  root.setProperty("--tenant-body", `'${b.bodyFamily}', sans-serif`);
  // ensure the stylesheets exist exactly once
  const ensure = (url: string, id: string) => {
    if (!url || document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet"; l.href = url;
    document.head.appendChild(l);
  };
  ensure(b.headingUrl, "brand-heading-css");
  ensure(b.bodyUrl, "brand-body-css");
}
