// Embeddable widget theming — every visual property is tenant-controllable,
// and the generated JS/iframe snippets carry the exact same values.

export type WidgetField = "location" | "dates" | "guests" | "button";

export interface WidgetStyle {
  bg: string;        // widget background
  card: string;      // field / cell background
  text: string;      // primary text colour
  sub: string;       // secondary text colour
  accent: string;    // buttons, selection, blocked dates
  borderW: number;   // 0–4 px
  borderColor: string;
  radius: number;    // corner radius px
  gap: number;       // element gap px
  pad: number;       // outer padding px
  fontSize: number;  // base font size px
  fontUrl: string;   // optional CSS link (Google Fonts or any stylesheet)
  fontFamily: string;// optional family name
  btn: "solid" | "outline" | "soft";
  btnRadius: number;
  fields: WidgetField[]; // render order of the interactive fields
  fieldH: number;    // field height px
  btnH: number;      // button height px
  syncFonts: boolean; // pull heading/body fonts from the global brand settings
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  bg: "#ffffff", card: "#f4f5f0", text: "#141811", sub: "#5c6357", accent: "#0e6b4e",
  borderW: 1, borderColor: "#d8dccd", radius: 3, gap: 8, pad: 14, fontSize: 13,
  fontUrl: "", fontFamily: "", btn: "solid", btnRadius: 3,
  fields: ["location", "dates", "guests", "button"], fieldH: 40, btnH: 40, syncFonts: true,
};

export function widgetCssVars(s: WidgetStyle): string {
  return [
    `--dw-bg:${s.bg}`, `--dw-card:${s.card}`, `--dw-text:${s.text}`, `--dw-sub:${s.sub}`,
    `--dw-accent:${s.accent}`, `--dw-bw:${s.borderW}px`, `--dw-bc:${s.borderColor}`,
    `--dw-r:${s.radius}px`, `--dw-gap:${s.gap}px`, `--dw-pad:${s.pad}px`,
    `--dw-fs:${s.fontSize}px`, `--dw-font:${s.fontFamily || "inherit"}`,
    `--dw-btn:${s.btn}`, `--dw-btn-r:${s.btnRadius}px`,
    `--dw-fields:${s.fields.join(",")}`, `--dw-field-h:${s.fieldH}px`, `--dw-btn-h:${s.btnH}px`,
  ].join(";");
}

/** Resolve the effective font stack — honours the tenant's global brand fonts when syncFonts is on. */
export function widgetFonts(s: WidgetStyle, brandHeading: string, brandBody: string): { heading: string; body: string } {
  if (s.syncFonts) return { heading: `'${brandHeading}', sans-serif`, body: `'${brandBody}', sans-serif` };
  const f = s.fontFamily ? `'${s.fontFamily}', sans-serif` : "inherit";
  return { heading: f, body: f };
}

// ── Embed snippets ──────────────────────────────────────────────
// Both snippets address the host that is actually serving this app, resolved
// at the moment the operator copies them. The old ones named cdn.derzen.site
// and <subdomain>.derzen.site, neither of which was ever registered, so every
// snippet a tenant pasted onto their website was dead on arrival. The frame
// carries the workspace id, so the concierge inside it answers from that one
// tenant knowledge base and no other.
function embedBase(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function embedQuery(
  s: WidgetStyle,
  widget: "search" | "calendar" | "chatbot",
  tenantId: string,
  propId?: string,
): string {
  const e = encodeURIComponent;
  return [
    `widget=${widget}`,
    `tenant=${e(tenantId)}`,
    propId ? `property=${e(propId)}` : "",
    `bg=${e(s.bg)}`, `card=${e(s.card)}`, `text=${e(s.text)}`,
    `sub=${e(s.sub)}`, `accent=${e(s.accent)}`, `bc=${e(s.borderColor)}`,
    `bw=${s.borderW}`, `r=${s.radius}`, `g=${s.gap}`, `p=${s.pad}`,
    `fs=${s.fontSize}`, `br=${s.btnRadius}`, `fh=${s.fieldH}`, `bh=${s.btnH}`,
    s.fontUrl ? `fu=${e(s.fontUrl)}` : "",
    s.fontFamily ? `ff=${e(s.fontFamily)}` : "",
  ]
    .filter(Boolean)
    .join("&");
}

export function embedUrl(
  s: WidgetStyle,
  widget: "search" | "calendar" | "chatbot",
  tenantId: string,
  propId?: string,
): string {
  return `${embedBase()}/#/embed?${embedQuery(s, widget, tenantId, propId)}`;
}

// The script form needs no file from us: it writes its own frame and listens
// for the height the embed page reports, so the widget grows with the
// conversation instead of being clipped. One tag, nothing for us to host and
// nothing to go stale.
export function embedJsSnippet(
  s: WidgetStyle,
  widget: "search" | "calendar" | "chatbot",
  tenantId: string,
  propId?: string,
): string {
  return `<!-- DERZEN ${widget} widget · styled by you, sized by itself -->
<div id="derzen-embed"></div>
<script>
(function () {
  var mount = document.getElementById("derzen-embed");
  var frame = document.createElement("iframe");
  frame.src = "${embedUrl(s, widget, tenantId, propId)}";
  frame.title = "DERZEN ${widget}";
  frame.loading = "lazy";
  frame.style.cssText = "width:100%;border:0;height:560px;display:block";
  mount.appendChild(frame);
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.source !== "derzen-embed") return;
    if (frame.contentWindow !== ev.source) return;
    if (typeof d.height === "number" && d.height > 120) frame.style.height = d.height + "px";
  });
})();
<\/script>`;
}

// The plain frame for anyone who will not run a script tag. Fixed height, so
// a long conversation scrolls inside the frame instead of pushing the page.
export function embedIframeSnippet(
  s: WidgetStyle,
  widget: "search" | "calendar" | "chatbot",
  tenantId: string,
  propId?: string,
): string {
  return `<!-- DERZEN ${widget} widget · no script, fixed height -->
<iframe src="${embedUrl(s, widget, tenantId, propId)}"
  title="DERZEN ${widget}" loading="lazy" referrerpolicy="no-referrer"
  style="width:100%;height:560px;border:0;display:block"></iframe>`;
}
