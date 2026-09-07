// Public embed host. This is the page a tenant puts in an iframe on their own
// website, and it is the only supported way to run the concierge somewhere we
// do not serve. It renders the very same component the operator previews under
// Websites and embeds, calls the very same ai-proxy Edge Function, and hydrates
// the knowledge base of the one workspace named in the URL. A guest on one
// tenant site therefore can never be answered out of another tenant sources:
// if that workspace has no sources the bot says it cannot confirm.
//
// The snippet used to point at cdn.derzen.site and <sub>.derzen.site, neither
// of which exists, so every embed a tenant copied was dead on arrival. The
// snippet builders now address this route on the host that served the app.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatbotPreview } from "./ChatWidget";
import { DEFAULT_WIDGET_STYLE, type WidgetStyle } from "../lib/widgetTheme";
import { TENANTS, hydrateTenantData } from "../lib/tenants";

function readQuery(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, "");
  const at = hash.indexOf("?");
  return new URLSearchParams(at < 0 ? "" : hash.slice(at + 1));
}

// Every visual property is the tenant's, so it travels in the URL rather than
// being baked in here. Anything absent falls back to the shipped default.
function styleFromQuery(q: URLSearchParams): WidgetStyle {
  const str = (k: string, fallback: string) => q.get(k) || fallback;
  const num = (k: string, fallback: number) => {
    const raw = q.get(k);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    ...DEFAULT_WIDGET_STYLE,
    bg: str("bg", DEFAULT_WIDGET_STYLE.bg),
    card: str("card", DEFAULT_WIDGET_STYLE.card),
    text: str("text", DEFAULT_WIDGET_STYLE.text),
    sub: str("sub", DEFAULT_WIDGET_STYLE.sub),
    accent: str("accent", DEFAULT_WIDGET_STYLE.accent),
    borderColor: str("bc", DEFAULT_WIDGET_STYLE.borderColor),
    borderW: num("bw", DEFAULT_WIDGET_STYLE.borderW),
    radius: num("r", DEFAULT_WIDGET_STYLE.radius),
    gap: num("g", DEFAULT_WIDGET_STYLE.gap),
    pad: num("p", DEFAULT_WIDGET_STYLE.pad),
    fontSize: num("fs", DEFAULT_WIDGET_STYLE.fontSize),
    fontUrl: str("fu", DEFAULT_WIDGET_STYLE.fontUrl),
    fontFamily: str("ff", DEFAULT_WIDGET_STYLE.fontFamily),
    btnRadius: num("br", DEFAULT_WIDGET_STYLE.btnRadius),
    fieldH: num("fh", DEFAULT_WIDGET_STYLE.fieldH),
    btnH: num("bh", DEFAULT_WIDGET_STYLE.btnH),
  };
}

function Notice({ text, st }: { text: string; st: WidgetStyle }) {
  return (
    <div style={{ background: st.bg, color: st.sub, padding: 20, fontSize: 13, lineHeight: 1.6 }}>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

export default function EmbedHost() {
  const q = useMemo(readQuery, []);
  const st = useMemo(() => styleFromQuery(q), [q]);
  const tenantId = q.get("tenant") || "";
  const widget = q.get("widget") || "chatbot";
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setProblem(
        "This embed does not say which workspace it belongs to. Copy the snippet again from Websites and embeds so it carries the workspace it was generated for.",
      );
      return;
    }
    if (!TENANTS.some((t) => t.id === tenantId)) {
      setProblem(
        "This embed names a workspace that does not exist on this deployment, so there is no knowledge base to answer from. Copy the snippet again from the workspace you want the concierge to speak for.",
      );
      return;
    }
    hydrateTenantData(tenantId);
    setReady(true);
  }, [tenantId]);

  // The host page cannot know how tall a conversation will grow, so measure it
  // and let the snippet resize the frame. Nothing else is ever posted out.
  useEffect(() => {
    if (!ready) return;
    const send = () => {
      const h = box.current ? box.current.scrollHeight : 0;
      if (window.parent !== window) {
        window.parent.postMessage({ source: "derzen-embed", height: Math.ceil(h) }, "*");
      }
    };
    send();
    const ro = new ResizeObserver(send);
    if (box.current) ro.observe(box.current);
    window.addEventListener("resize", send);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", send);
    };
  }, [ready]);

  if (problem) return <Notice text={problem} st={st} />;
  if (!ready) return null;
  if (widget !== "chatbot") {
    return (
      <Notice
        st={st}
        text="Only the concierge is published as an embed on this deployment. The search and calendar widgets are still previews inside the app, so there is nothing to serve here yet."
      />
    );
  }

  return (
    <div ref={box} style={{ background: st.bg, minHeight: "100vh" }}>
      <ChatbotPreview
        st={st}
        onBooked={(ref) => {
          // The payment page is on this host, not inside the guest site, so it
          // opens in its own tab rather than in a narrow frame.
          const locale = q.get("locale") || "en";
          window.open(`${window.location.origin}/#/${locale}/pay/${ref}`, "_blank", "noopener");
        }}
      />
    </div>
  );
}
