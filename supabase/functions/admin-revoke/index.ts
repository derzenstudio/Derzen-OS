// admin-revoke
// Removes someone's platform admin access. Owner-only: the caller must be the
// platform owner row in public.platform_admins AND the owner email below.
// Mirrors admin-invite: same origin allowlist, same service-role client, same
// { ok } / { error } response shape that src/lib/authServer.ts expects.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://dev.alvianpermana.art"];
const OWNER_EMAIL = "derzenstudio@gmail.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "content-type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "unauthenticated" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller?.user) return json({ error: "unauthenticated" }, 401);

  const callerEmail = (caller.user.email ?? "").toLowerCase();

  const { data: callerRow } = await admin
    .from("platform_admins")
    .select("role")
    .eq("user_id", caller.user.id)
    .maybeSingle();

  if (callerRow?.role !== "owner" || callerEmail !== OWNER_EMAIL) {
    return json({ error: "owner role required" }, 403);
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json body" }, 400);
  }

  const targetId = (body.user_id ?? "").trim();
  if (!UUID_RE.test(targetId)) return json({ error: "valid user_id required" }, 400);
  if (targetId === caller.user.id) {
    return json({ error: "you cannot revoke your own owner access" }, 400);
  }

  const { data: target } = await admin
    .from("platform_admins")
    .select("email, role")
    .eq("user_id", targetId)
    .maybeSingle();

  if (!target) return json({ error: "that user is not a platform admin" }, 404);
  if (target.role === "owner" || (target.email ?? "").toLowerCase() === OWNER_EMAIL) {
    return json({ error: "the owner account cannot be revoked" }, 400);
  }

  const { error: delErr } = await admin
    .from("platform_admins")
    .delete()
    .eq("user_id", targetId);

  if (delErr) return json({ error: delErr.message }, 400);

  return json({ ok: true, revoked: target.email ?? targetId });
});
