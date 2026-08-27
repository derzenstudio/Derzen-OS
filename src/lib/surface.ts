// Which audience this build serves.
//
// Tenant app  -> https://app.alvianpermana.art  (public_html/derzen_app)
// Internal    -> https://dev.alvianpermana.art  (public_html/derzen)
//
// Set at build time with VITE_SURFACE ("app" | "dev"); see the deploy workflows.
// Falls back to the hostname so a plain `vite build` still behaves, and to
// "all" (no gating, both surfaces reachable) for local development.

export type Surface = "app" | "dev";
export type SurfaceMode = Surface | "all";

export const SURFACE_URLS: Record<Surface, string> = {
  app: "https://app.alvianpermana.art",
  dev: "https://dev.alvianpermana.art",
};

export const SURFACE_LABELS: Record<Surface, string> = {
  app: "tenant app",
  dev: "internal backoffice",
};

function fromEnv(): Surface | null {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const raw = (env?.VITE_SURFACE ?? "").trim().toLowerCase();
  return raw === "app" || raw === "dev" ? raw : null;
}

function fromHost(): Surface | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (host.startsWith("dev.")) return "dev";
  if (host.startsWith("app.")) return "app";
  return null;
}

export const SURFACE: SurfaceMode = fromEnv() ?? fromHost() ?? "all";
