// ── Server-enforced auth ───────────────────────────────────────────────────
// Everything here is a thin wrapper over Supabase Auth. The important property
// is not in this file: it is that `platform_admins` and `tenant_members` are
// RLS-protected tables, so a tampered client can ask whatever it likes and
// Postgres still answers only what the JWT is entitled to. Deleting a check in
// this file changes what the UI draws, not what the user can reach.
//
// The platform owner (derzenstudio@gmail.com) is seeded by SQL migration, not
// by this bundle. Its address is not a secret and appearing in a network
// request is harmless; what matters is that no password, hash, or entitlement
// is decided here.

import { supabase, isServerAuthConfigured } from "./supabase";

export type PlatformRole = "owner" | "admin";

export interface PlatformAdmin {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: PlatformRole;
  created_at: string;
  last_login_at: string | null;
}

export interface TenantMembership {
  tenant_id: string;
  workspace: string;
  role: "owner" | "manager" | "staff";
  currency: string;
}

export interface AuthResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/** Signals a caller should show the "backend not wired" state. */
export const serverAuthReady = isServerAuthConfigured;

// Auth errors are deliberately flattened. Distinguishing "no such account"
// from "wrong password" turns the form into an account-enumeration oracle.
const GENERIC = "Those credentials are not recognised.";

// ── session ────────────────────────────────────────────────────────────────

export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const { data } = await supabase().auth.getUser();
  const u = data.user;
  return u && u.email ? { id: u.id, email: u.email } : null;
}

export async function signOutServer(): Promise<void> {
  try { await supabase().auth.signOut(); } catch { /* already gone */ }
}

// ── platform (developer console) ───────────────────────────────────────────

/**
 * Sign in, then ask the database whether this user is a platform admin.
 * A non-admin gets a valid session and no console: RLS returns zero rows, and
 * every dev-console table is closed to them regardless of what the UI renders.
 */
export async function signInPlatform(email: string, pw: string): Promise<AuthResult<PlatformAdmin>> {
  if (!isServerAuthConfigured()) return { ok: false, error: "This build has no backend configured." };
  const sb = supabase();
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
  if (error || !data.user) return { ok: false, error: GENERIC };

  const admin = await fetchPlatformAdmin();
  if (!admin) {
    // Do not leave a half-signed-in state on the internal host.
    await signOutServer();
    return { ok: false, error: GENERIC };
  }
  await sb.rpc("touch_platform_login").then(() => undefined, () => undefined);
  return { ok: true, data: admin };
}

/** The caller's own platform_admins row, or null. RLS does the deciding. */
export async function fetchPlatformAdmin(): Promise<PlatformAdmin | null> {
  const { data, error } = await supabase()
    .from("platform_admins")
    .select("id,user_id,email,name,role,created_at,last_login_at")
    .maybeSingle();
  if (error || !data) return null;
  return data as PlatformAdmin;
}

/** Every seat, readable only by platform admins (RLS). */
export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  const { data, error } = await supabase()
    .from("platform_admins")
    .select("id,user_id,email,name,role,created_at,last_login_at")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data as PlatformAdmin[];
}

/**
 * Invite a new console seat. Runs as an Edge Function because creating an auth
 * user needs the service role key, which cannot exist in this bundle. The
 * function re-checks that the caller is an owner; the UI check below is only
 * there to avoid offering a button that will fail.
 */
export async function invitePlatformAdmin(input: { email: string; name: string; role: PlatformRole }): Promise<AuthResult> {
  const { error } = await supabase().functions.invoke("admin-invite", { body: input });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function revokePlatformAdmin(userId: string): Promise<AuthResult> {
  const { error } = await supabase().functions.invoke("admin-revoke", { body: { user_id: userId } });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Change your own password. Supabase requires an active session for this. */
export async function changeOwnPassword(newPw: string): Promise<AuthResult> {
  if (newPw.length < 12) return { ok: false, error: "Console passwords need at least 12 characters." };
  const { error } = await supabase().auth.updateUser({ password: newPw });
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ── tenant (customer workspaces) ───────────────────────────────────────────

export async function signInTenant(email: string, pw: string): Promise<AuthResult<TenantMembership>> {
  if (!isServerAuthConfigured()) return { ok: false, error: "This build has no backend configured." };
  const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
  if (error || !data.user) return { ok: false, error: GENERIC };
  const m = await fetchMembership();
  if (!m) { await signOutServer(); return { ok: false, error: "That account has no workspace yet." }; }
  return { ok: true, data: m };
}

export async function fetchMembership(): Promise<TenantMembership | null> {
  const { data, error } = await supabase()
    .from("tenant_members")
    .select("tenant_id,role,tenants(workspace,currency)")
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as { tenant_id: string; role: TenantMembership["role"]; tenants?: { workspace?: string; currency?: string } };
  return {
    tenant_id: row.tenant_id,
    role: row.role,
    workspace: row.tenants?.workspace ?? "Workspace",
    currency: row.tenants?.currency ?? "IDR",
  };
}

/**
 * Self-serve signup. Supabase creates the auth user; a Postgres trigger
 * provisions the tenant row and the owner membership in the same transaction,
 * so a client that dies mid-flow cannot leave an orphaned account.
 */
export async function signUpTenant(input: { name: string; workspace: string; email: string; pw: string }): Promise<AuthResult> {
  if (!isServerAuthConfigured()) return { ok: false, error: "This build has no backend configured." };
  const { error } = await supabase().auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.pw,
    options: { data: { full_name: input.name.trim(), workspace: input.workspace.trim() || `${input.name.trim()} Villas` } },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Real password reset: Supabase emails a single-use link. There is no code to
 * display in the UI, which is the point. The previous flow generated the code
 * in the browser and printed it on screen, so it verified nothing at all.
 */
export async function requestPasswordReset(email: string, surface: "app" | "dev"): Promise<AuthResult> {
  if (!isServerAuthConfigured()) return { ok: false, error: "This build has no backend configured." };
  const base = surface === "dev" ? "https://dev.alvianpermana.art" : "https://app.alvianpermana.art";
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${base}/#/en/reset`,
  });
  // Always report success. A different answer for a missing address turns this
  // form into an account-enumeration oracle.
  void error;
  return { ok: true };
}
