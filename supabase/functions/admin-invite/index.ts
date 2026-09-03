// ── admin-invite ───────────────────────────────────────────────────────────
// Creates a developer-console seat. Needs the service role key, so it cannot
// live in the browser. Re-checks that the caller is an owner: the button in
// the UI is a convenience, this check is the control.
//
// Deploy: supabase functions deploy admin-invite

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://dev.alvianpermana.art"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: caller } = await admin.auth.getUser(jwt);
  if (!caller?.user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  const { data: seat } = await admin
    .from("platform_admins").select("role").eq("user_id", caller.user.id).maybeSingle();
  if ((seat as { role?: string } | null)?.role !== "owner") {
    return new Response(JSON.stringify({ error: "owner role required" }), { status: 403, headers });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || null;
  const role = body.role === "owner" ? "owner" : "admin";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "valid email required" }), { status: 400, headers });
  }

  // Invite rather than set a password. No shared secret is ever typed by one
  // person and read by another; the invitee sets their own on first use.
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://dev.alvianpermana.art/#/en/reset",
  });

  let userId = invited?.user?.id;
  if (inviteErr || !userId) {
    // Already an auth user (e.g. they hold a tenant account). Reuse the id.
    const { data: list } = await admin.auth.admin.listUsers();
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) return new Response(JSON.stringify({ error: inviteErr?.message ?? "could not invite" }), { status: 400, headers });
  }

  const { error: insErr } = await admin
    .from("platform_admins")
    .upsert({ user_id: userId, email, name, role }, { onConflict: "user_id" });
  if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers });

  return new Response(JSON.stringify({ ok: true, email, role }), { headers });
});
