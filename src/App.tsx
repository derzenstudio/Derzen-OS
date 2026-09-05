import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Shell } from "./components/Shell";
import { AnimateMount } from "./components/AnimateMount";
import { useApp } from "./store";
import { refreshFx } from "./lib/fx";
import { Btn, ToastHost } from "./components/ui";
import { Ic } from "./components/icons";
import { SURFACE, SURFACE_LABELS, SURFACE_URLS, type Surface } from "./lib/surface";
import { supabase, isServerAuthConfigured } from "./lib/supabase";
import { TENANTS } from "./lib/tenants";
import { onAiFailure } from "./lib/aiGateway";
import { onPersistFailure } from "./lib/tenantPersist";

// ── Route-level code splitting ─────────────────────────────────────────────
// Every surface loads its own chunk on first visit; the initial payload is
// just the shell, store, seed data and design system.
const PublicSite = lazy(() => import("./modules/Public").then((m) => ({ default: m.PublicSite })));
const LoginPage = lazy(() => import("./modules/Public").then((m) => ({ default: m.LoginPage })));
const PaymentPage = lazy(() => import("./modules/ChatWidget").then((m) => ({ default: m.PaymentPage })));
const Backoffice = lazy(() => import("./components/Backoffice").then((m) => ({ default: m.Backoffice })));
const DevConsole = lazy(() => import("./modules/DevConsole"));
const Dashboard = lazy(() => import("./modules/Dashboard"));
const Calendar = lazy(() => import("./modules/Calendar"));
const Inbox = lazy(() => import("./modules/Inbox"));
const Reservations = lazy(() => import("./modules/Reservations"));
const Operations = lazy(() => import("./modules/Operations"));
const Concierge = lazy(() => import("./modules/Concierge"));
const Reviews = lazy(() => import("./modules/Reviews"));
const Customers = lazy(() => import("./modules/Customers"));
const Guidebooks = lazy(() => import("./modules/Guidebooks"));
const Listings = lazy(() => import("./modules/Listings"));
const Channels = lazy(() => import("./modules/Channels"));
const Quotes = lazy(() => import("./modules/Quotes"));
const Websites = lazy(() => import("./modules/Websites"));
const GlobalStyling = lazy(() => import("./modules/GlobalStyling"));
const Reports = lazy(() => import("./modules/Reports"));
const SettingsModule = lazy(() => import("./modules/Settings"));
const Integrations = lazy(() => import("./modules/Integrations"));

function LoadingSurface() {
  return (
    <div className="flex h-[40vh] items-center justify-center" role="status" aria-label="Loading module">
      <div className="reg-marks border border-line bg-card px-6 py-4">
        <p className="flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
          <span className="h-3 w-3 anim-spin border-2 border-line2 border-t-brand" aria-hidden="true" />
          Loading module…
        </p>
      </div>
    </div>
  );
}

const MODULES: Record<string, { title: string; sub?: string; el: ComponentType }> = {
  dashboard: { title: "nav.dashboard", sub: "What needs attention today", el: Dashboard },
  calendar: { title: "nav.calendar", sub: "Rates, restrictions & stays across every listing", el: Calendar },
  inbox: { title: "nav.inbox", sub: "Every channel, one thread per guest", el: Inbox },
  reservations: { title: "nav.reservations", sub: "Bookings, payments & the immutable timeline", el: Reservations },
  ops: { title: "nav.ops", sub: "Tasks, providers, automations & expenses", el: Operations },
  sync: { title: "nav.sync", sub: "Channel connections, nothing fails silently", el: Channels },
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
          Your platform operator switched this module off for your workspace, or your tier doesn't include it.
          Nothing was deleted; it reappears the moment it's enabled.
        </p>
        <p className="mt-3 rounded-md bg-paper px-3 py-2 font-mono text-[10.5px] text-faint">HTTP 402 · PLAN_LIMIT · module="{name}"</p>
        <Btn className="mt-4" variant="solid" icon="trendUp" onClick={() => useApp.getState().navigate("/settings")}>Review plan in Settings</Btn>
      </div>
    </div>
  );
}

function AppRoutes() {
  const route = useApp((s) => s.route);
  const session = useApp((s) => s.session);
  const navigate = useApp((s) => s.navigate);
  const featureOn = useApp((s) => s.featureOn);

  const theme = useApp((s) => s.theme);

  useEffect(() => {
    // The /dev surface is guarded and host-gated. On the dev.* subdomain an
    // unauthenticated visitor is sent to the login page (which shows the
    // internal backoffice entry there). On the app host the dev surface is
    // unreachable entirely — the visitor lands on the marketing site.
    const host = window.location.hostname.toLowerCase();
    const isDevHost = host === "dev" || host.startsWith("dev.");
    const routeForHash = () => {
      const r = parseHashSafe();
      if (r.path[0] === "dev" && useApp.getState().session?.kind !== "developer") {
        window.location.hash = isDevHost ? `/${r.locale}/login` : `/${r.locale}`;
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

  // Wire the AI gateway failure sink to a toast. Every AI call site catches
  // and falls back to a deterministic local answer, which is good for the
  // product but used to make a 401 from ai-proxy - or a project with no
  // provider key saved - indistinguishable from a real model reply. Now the
  // operator is told, once, exactly why the model did not answer.
  useEffect(() => {
    onAiFailure((message) => useApp.getState().toast("err", "AI gateway unavailable", message));
    return () => onAiFailure(null);
  }, []);

  // apply theme attribute (light/dark) — tokens re-value under [data-theme="dark"]
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // surface an expired-session drop once, right after boot
  useEffect(() => {
    try {
      if (localStorage.getItem("derzen.sessionExpired") === "1") {
        localStorage.removeItem("derzen.sessionExpired");
        window.setTimeout(() => useApp.getState().toast("warn", "Session expired", "For your security, please sign in again."), 400);
      }
    } catch { /* private mode */ }
  }, []);

  const sessionState = useApp((s) => s.session);

  // Poll server auth to detect revoked sessions server-side
  useEffect(() => {
    if (!sessionState || (sessionState.kind === "tenant" && (sessionState as any).impersonated) || !isServerAuthConfigured()) return;
    // A seeded demo workspace is public sample data behind a plaintext
    // password - there is no Supabase user for it. Polling auth.getUser()
    // for such a session always returns AuthSessionMissingError, which fired
    // logout() one tick after "Launch live demo" signed the visitor in. The
    // session vanished before React painted the dashboard, so every demo
    // entry point on the marketing site and the login page looked like a
    // dead button. Demo sessions hold no server data and nothing to revoke,
    // so they are exempt from the revoke poll.
    const isSeededDemoSession =
      sessionState.kind === "tenant" &&
      TENANTS.some((t) => t.id === sessionState.tenantId && t.isDemo);
    if (isSeededDemoSession) return;
    const checkAuth = async () => {
      const { error } = await supabase().auth.getUser();
      if (error && (error.status === 401 || error.status === 403 || error.message.includes("session_not_found") || error.name === "AuthSessionMissingError")) {
        useApp.getState().logout();
        useApp.getState().toast("warn", "Session revoked", "Your session was ended by the server.");
      }
    };
    checkAuth();
    const handleFocus = () => checkAuth();
    window.addEventListener("focus", handleFocus);
    const interval = window.setInterval(checkAuth, 60000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(interval);
    };
  }, [sessionState]);

  // A workspace write that never reached tenant_states used to be silent, so a
  // tenant could believe their changes were saved when the table was empty.
  // The persistence layer now reports its own failures and they surface here.
  useEffect(() => {
    onPersistFailure((message) => useApp.getState().toast("err", "Workspace not saved", message));
    return () => onPersistFailure(null);
  }, []);

  // tenant font injection — heading + body fonts from the tenant's own URLs
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
  if (route.path[0] === "pay")
    return <Suspense fallback={<LoadingSurface />}><PaymentPage refCode={route.path[1] ?? ""} /></Suspense>;

  // ── public surface ──
  if (!session) {
    // dev.* is internal-only — no marketing site, straight to the sign-in wall
    if (SURFACE === "dev") return <Suspense fallback={<LoadingSurface />}><LoginPage /></Suspense>;
    return (
      <Suspense fallback={<LoadingSurface />}>
        <AnimateMount>{route.path[0] === "login" ? <LoginPage /> : <PublicSite />}</AnimateMount>
      </Suspense>
    );
  }

  // ── surface guard: one audience per host ──
  if (SURFACE !== "all") {
    const audience: Surface = session.kind === "developer" ? "dev" : "app";
    if (audience !== SURFACE) return <WrongSurface audience={audience} />;
  }

  // ── internal backoffice (separate application: own shell, nav, audit) ──
  if (session.kind === "developer") {
    const sub = route.path[1];
    return (
      <Suspense fallback={<LoadingSurface />}>
        {sub === "console" ? <DevConsole />
                            : <Backoffice />}
      </Suspense>
    );
  }

  // ── tenant app ──
  const page = route.path[0] || "dashboard";
  const def = MODULES[page];
  if (!def) {
    return (
      <Shell>
        <div className="p-10 text-center">
          <p className="font-display text-[24px] font-extrabold text-ink">404. That route doesn't exist</p>
          <Btn className="mt-4" onClick={() => navigate("/dashboard")}>Back to dashboard</Btn>
        </div>
      </Shell>
    );
  }
  const enabled = featureOn(page);
  return (
    <Shell>
      {enabled ? <Suspense fallback={<LoadingSurface />}><def.el key={page} /></Suspense> : <ModuleGated name={page} />}
    </Shell>
  );
}

// Every toast in the product was firing into a void: ToastHost is defined in
// components/ui.tsx and was never rendered anywhere, so sign-in failures, the
// demo-workspace notice, saved designs, session expiry and AI gateway errors
// all produced silence. Mount it once at the root, outside the route switch,
// so it covers the marketing site, the tenant app and the internal consoles.
export default function App() {
  return (
    <>
      <AppRoutes />
      <ToastHost />
    </>
  );
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
          on its own subdomain. Sessions are never shared between the two.
        </p>
        <p className="mt-3 rounded-md bg-paper px-3 py-2 font-mono text-[10.5px] text-faint">{target}</p>
        <a
          href={target}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Continue there <Ic name="arrowR" size={15} />
        </a>
        <button
          onClick={() => useApp.getState().logout()}
          className="mt-3 block w-full text-[12px] font-semibold text-mute transition-colors hover:text-ink"
        >
          Or sign out of this session
        </button>
      </div>
    </div>
  );
}
