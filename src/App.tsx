import { useEffect, type ComponentType } from "react";
import { Shell } from "./components/Shell";
import { useApp } from "./store";
import { refreshFx } from "./lib/fx";
import { PublicSite, LoginPage } from "./modules/Public";
import DevConsole from "./modules/DevConsole";
import DevBackoffice from "./modules/DevBackoffice";
import DevOps from "./modules/DevOps";
import { Backoffice } from "./components/Backoffice";
import Dashboard from "./modules/Dashboard";
import Calendar from "./modules/Calendar";
import Inbox from "./modules/Inbox";
import Reservations from "./modules/Reservations";
import Operations from "./modules/Operations";
import Concierge from "./modules/Concierge";
import Reviews from "./modules/Reviews";
import Customers from "./modules/Customers";
import Guidebooks from "./modules/Guidebooks";
import Listings from "./modules/Listings";
import Channels from "./modules/Channels";
import Quotes from "./modules/Quotes";
import Websites from "./modules/Websites";
import GlobalStyling from "./modules/GlobalStyling";
import Reports from "./modules/Reports";
import SettingsModule from "./modules/Settings";
import Integrations from "./modules/Integrations";
import { PaymentPage } from "./modules/ChatWidget";
import { Btn } from "./components/ui";
import { Ic } from "./components/icons";
import { SURFACE, SURFACE_LABELS, SURFACE_URLS, type Surface } from "./lib/surface";

const MODULES: Record<string, { title: string; sub?: string; el: ComponentType }> = {
  dashboard: { title: "nav.dashboard", sub: "What needs attention today", el: Dashboard },
  calendar: { title: "nav.calendar", sub: "Rates, restrictions & stays across every listing", el: Calendar },
  inbox: { title: "nav.inbox", sub: "Every channel, one thread per guest", el: Inbox },
  reservations: { title: "nav.reservations", sub: "Bookings, payments & the immutable timeline", el: Reservations },
  ops: { title: "nav.ops", sub: "Tasks, providers, automations & expenses", el: Operations },
  sync: { title: "nav.sync", sub: "Channel connections — nothing fails silently", el: Channels },
  concierge: { title: "nav.concierge", sub: "Knowledge, autopilot & scheduled messages", el: Concierge },
  reviews: { title: "nav.reviews", sub: "Aggregate ratings & reply workflows", el: Reviews },
  customers: { title: "nav.customers", sub: "Guests deduplicated across channels", el: Customers },
  quotes: { title: "nav.quotes", sub: "Build, send, convert", el: Quotes },
  listings: { title: "nav.listings", sub: "Properties, pricing & services", el: Listings },
  channels: { title: "nav.channels", sub: "Distribution, mapping & the connect wizard", el: Channels },
  websites: { title: "nav.websites", sub: "Builder, widgets & site analytics", el: Websites },
  styling: { title: "nav.styling", sub: "One brand across sites, widgets, invoices & emails", el: GlobalStyling },
  guidebooks: { title: "nav.guidebooks", sub: "Guest guides with an in-guide store", el: Guidebooks },
  reports: { title: "nav.reports", sub: "Revenue, costs & reconciliation", el: Reports },
  integrations: { title: "nav.integrations", sub: "Webhooks, API & connected apps", el: Integrations },
  settings: { title: "nav.settings", sub: "Workspace, team & billing", el: SettingsModule },
};

function ModuleGated({ name }: { name: string }) {
  const { t } = useApp();
  const label = MODULES[name] ? t(MODULES[name].title) : name;
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-[440px] rounded-xl border border-line bg-card p-8 text-center anim-pop">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><Ic name="lock" size={22} /></span>
        <h2 className="mt-4 font-display text-[20px] font-extrabold text-ink">{label} isn't on your plan</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          Your platform operator switched this module off for your workspace — or your tier doesn't include it.
          Nothing was deleted; it reappears the moment it's enabled.
        </p>
        <p className="mt-3 rounded-md bg-paper px-3 py-2 font-mono text-[10.5px] text-faint">HTTP 402 · PLAN_LIMIT · module="{name}"</p>
        <Btn className="mt-4" variant="solid" icon="trendUp" onClick={() => useApp.getState().navigate("/settings")}>Review plan in Settings</Btn>
      </div>
    </div>
  );
}

export default function App() {
  const route = useApp((s) => s.route);
  const session = useApp((s) => s.session);
  const navigate = useApp((s) => s.navigate);
  const featureOn = useApp((s) => s.featureOn);

  const theme = useApp((s) => s.theme);

  useEffect(() => {
    // The /dev surface is guarded: anyone without a developer session is sent
    // to the login screen's Developer tab — never the marketing site.
    const routeForHash = () => {
      const r = parseHashSafe();
      if (r.path[0] === "dev" && useApp.getState().session?.kind !== "developer") {
        window.location.hash = `/${r.locale}/login?mode=developer`;
        return;
      }
      useApp.setState({ route: r });
    };
    window.addEventListener("hashchange", routeForHash);
    if (!window.location.hash) {
      // Hostname-aware boot: a dev.* subdomain (e.g. dev.alvianpermana.art)
      // lands directly on the developer console; app.* / apex land on the site.
      const host = window.location.hostname.toLowerCase();
      const isDevHost = host === "dev" || host.startsWith("dev.") || /(^|\.)dev\./.test(host);
      window.location.hash = isDevHost ? "/en/dev" : "/en";
    } else {
      routeForHash();
    }
    void refreshFx(); // best-effort live rates; falls back to the dated snapshot
    return () => window.removeEventListener("hashchange", routeForHash);
  }, []);

  // apply theme attribute (light/dark) — tokens re-value under [data-theme="dark"]
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // tenant font injection — heading + body fonts from the tenant's own URLs
  const sessionState = useApp((s) => s.session);
  const tenantFonts = useApp((s) => s.tenantFonts);
  useEffect(() => {
    const root = document.documentElement;
    const rootStyle = root.style;
    // clear previous injection
    document.querySelectorAll("link[data-tenant-font]").forEach((l) => l.remove());
    rootStyle.removeProperty("--tenant-heading");
    rootStyle.removeProperty("--tenant-body");
    const tid = sessionState?.kind === "tenant" ? sessionState.tenantId : null;
    const f = tid ? tenantFonts[tid] : undefined;
    if (!f) return;
    const inject = (url: string) => {
      if (!url.trim()) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url.trim();
      link.dataset.tenantFont = "1";
      document.head.appendChild(link);
    };
    if (f.headingUrl) inject(f.headingUrl);
    if (f.bodyUrl) inject(f.bodyUrl);
    if (f.headingFamily) rootStyle.setProperty("--tenant-heading", f.headingFamily);
    if (f.bodyFamily) rootStyle.setProperty("--tenant-body", f.bodyFamily);
  }, [sessionState, tenantFonts]);

  // ── guest-facing hosted payment page (public — reachable from the chatbot embed) ──
  if (route.path[0] === "pay") return <PaymentPage refCode={route.path[1] ?? ""} />;

  // ── public surface ──
  if (!session) {
    // dev.* is internal-only — no marketing site, straight to the sign-in wall
    if (SURFACE === "dev") return <LoginPage />;
    return route.path[0] === "login" ? <LoginPage /> : <PublicSite />;
  }

  // ── surface guard: one audience per host ──
  if (SURFACE !== "all") {
    const audience: Surface = session.kind === "developer" ? "dev" : "app";
    if (audience !== SURFACE) return <WrongSurface audience={audience} />;
  }

  // ── internal backoffice (separate application: own shell, nav, audit) ──
  if (session.kind === "developer") {
    const sub = route.path[1];
    if (sub === "console") return <DevConsole />;
    if (sub === "backoffice") return <DevBackoffice />;
    if (sub === "substrate") return <DevOps />;
    return <Backoffice />;
  }

  // ── tenant app ──
  const page = route.path[0] || "dashboard";
  const def = MODULES[page];
  if (!def) {
    return (
      <Shell>
        <div className="p-10 text-center">
          <p className="font-display text-[24px] font-extrabold text-ink">404 — that route doesn't exist</p>
          <Btn className="mt-4" onClick={() => navigate("/dashboard")}>Back to dashboard</Btn>
        </div>
      </Shell>
    );
  }
  const enabled = featureOn(page);
  return <Shell>{enabled ? <def.el key={page} /> : <ModuleGated name={page} />}</Shell>;
}

import { parseHash as parseHashSafe } from "./store";


// Each host serves exactly one audience. If a session lands on the wrong one,
// point it at the right subdomain instead of quietly rendering the other app.
function WrongSurface({ audience }: { audience: Surface }) {
  const target = SURFACE_URLS[audience];
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-8">
      <div className="max-w-[460px] rounded-xl border border-line bg-card p-8 text-center anim-pop">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><Ic name="lock" size={22} /></span>
        <h2 className="mt-4 font-display text-[20px] font-extrabold text-ink">Wrong door</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mute">
          This host does not serve the {SURFACE_LABELS[audience]}. Your session belongs there, and it lives
          on its own subdomain — sessions are never shared between the two.
        </p>
        <p className="mt-3 rounded-md bg-paper px-3 py-2 font-mono text-[10.5px] text-faint">{target}</p>
        <a
          href={target}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Continue there <Ic name="arrowR" size={15} />
        </a>
        <button
          onClick={() => useApp.setState({ session: null })}
          className="mt-3 block w-full text-[12px] font-semibold text-mute transition-colors hover:text-ink"
        >
          Or sign out of this session
        </button>
      </div>
    </div>
  );
}
