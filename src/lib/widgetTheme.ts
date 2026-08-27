// Embeddable widget theming — every visual property is tenant-controllable,
// and the generated JS/iframe snippets carry the exact same values.

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
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  bg: "#ffffff", card: "#f4f5f0", text: "#141811", sub: "#5c6357", accent: "#0e6b4e",
  borderW: 1, borderColor: "#d8dccd", radius: 3, gap: 8, pad: 14, fontSize: 13,
  fontUrl: "", fontFamily: "", btn: "solid", btnRadius: 3,
};

export function widgetCssVars(s: WidgetStyle): string {
  return [
    `--dw-bg:${s.bg}`, `--dw-card:${s.card}`, `--dw-text:${s.text}`, `--dw-sub:${s.sub}`,
    `--dw-accent:${s.accent}`, `--dw-bw:${s.borderW}px`, `--dw-bc:${s.borderColor}`,
    `--dw-r:${s.radius}px`, `--dw-gap:${s.gap}px`, `--dw-pad:${s.pad}px`,
    `--dw-fs:${s.fontSize}px`, `--dw-font:${s.fontFamily || "inherit"}`,
    `--dw-btn:${s.btn}`, `--dw-btn-r:${s.btnRadius}px`,
  ].join(";");
}

export function embedJsSnippet(s: WidgetStyle, widget: "search" | "calendar" | "chatbot", propId?: string): string {
  const data = `data-widget="${widget}"${propId ? ` data-property="${propId}"` : ""}`;
  const note = widget === "chatbot"
    ? `The concierge answers from your knowledge base + guidebook, pops an inline
  calendar picker inside the chat, and hands off to a hosted payment page.
  Escalations land in your Inbox; every auto-reply is audited.`
    : `The widget reports its own height via postMessage — the iframe resizes
  with its content (calendars, pickers), so nothing is ever clipped.`;
  return `<!-- DERZEN ${widget} widget · styled by you, sized by itself -->
<link rel="stylesheet" href="${s.fontUrl || "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap"}">
<div class="derzen-embed" ${data} style="${widgetCssVars(s)}"></div>
<script async src="https://cdn.derzen.site/embed.js"></script>
<!--
  ${note}
  Style it any way you like: every --dw-* variable above is yours.
-->`;
}

export function embedIframeSnippet(s: WidgetStyle, widget: "search" | "calendar" | "chatbot", propId?: string, subdomain = "sanggraha"): string {
  const q = [
    `widget=${widget}`, propId ? `property=${propId}` : "",
    `bg=${encodeURIComponent(s.bg)}`, `card=${encodeURIComponent(s.card)}`, `text=${encodeURIComponent(s.text)}`,
    `sub=${encodeURIComponent(s.sub)}`, `accent=${encodeURIComponent(s.accent)}`,
    `bw=${s.borderW}`, `bc=${encodeURIComponent(s.borderColor)}`, `r=${s.radius}`, `gap=${s.gap}`,
    `pad=${s.pad}`, `fs=${s.fontSize}`, `btn=${s.btn}`, `btnr=${s.btnRadius}`,
    s.fontFamily ? `font=${encodeURIComponent(s.fontFamily)}` : "",
  ].filter(Boolean).join("&");
  return `<iframe src="https://${subdomain}.derzen.site/embed?${q}"
  style="width:100%;border:0;display:block" title="DERZEN ${widget} widget"
  scrolling="no"></iframe>
<!-- height is driven by the widget via postMessage auto-resize —
     no fixed height, no clipping, pickers grow the frame up or down -->`;
}
