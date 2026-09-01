// ── Developer team registry ───────────────────────────────────────────────
// Replaces the single hardcoded developer credential. Members are stored in
// this browser with SHA-256 password digests, never plaintext, and no address
// is compiled into the bundle.
//
// FIRST-RUN RULE: while the registry is empty, the first successful sign-in
// claims the owner seat using whatever credentials were entered. After that,
// only registered members can sign in and only an owner can add or remove
// seats.
//
// LIMITATION, read before relying on this: the registry lives in the browser,
// so it is per-device and anyone who reaches the dev host before you do can
// claim the owner seat. That is inherent to a static SPA with no backend. This
// removes the shared secret from the bundle; it does not make the console
// authenticated. Move the check server-side before the console holds anything
// that matters.

import { hashPassword } from "./tenants";

export type DevRole = "owner" | "admin";

export interface DevMember {
  id: string;
  email: string;
  name: string;
  hash: string;
  role: DevRole;
  createdAt: number;
  lastLogin?: number;
}

const KEY = "derzen.devteam.v1";

const read = (): DevMember[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as DevMember[]; } catch { return []; }
};
const write = (list: DevMember[]): void => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private mode */ }
};

export const listDevMembers = (): DevMember[] =>
  read().sort((a, b) => (a.role === b.role ? a.createdAt - b.createdAt : a.role === "owner" ? -1 : 1));

export const devTeamEmpty = (): boolean => read().length === 0;

export const findDevMember = (email: string): DevMember | null => {
  const e = email.trim().toLowerCase();
  return read().find((m) => m.email.toLowerCase() === e) ?? null;
};

export const saveDevMember = (m: DevMember): void => {
  write([...read().filter((x) => x.id !== m.id), m]);
};

export const removeDevMember = (id: string): { ok: boolean; error?: string } => {
  const list = read();
  const target = list.find((m) => m.id === id);
  if (!target) return { ok: false, error: "That member no longer exists." };
  if (target.role === "owner" && list.filter((m) => m.role === "owner").length === 1)
    return { ok: false, error: "The last owner cannot be removed. Promote another member first." };
  write(list.filter((m) => m.id !== id));
  return { ok: true };
};

export async function addDevMember(input: { email: string; name: string; pw: string; role: DevRole }): Promise<{ ok: boolean; error?: string; member?: DevMember }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (findDevMember(email)) return { ok: false, error: "That address already has a seat." };
  if (input.pw.length < 10) return { ok: false, error: "Dev passwords need at least 10 characters." };
  const member: DevMember = {
    id: `dm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    email, name: input.name.trim() || email.split("@")[0],
    hash: await hashPassword(input.pw), role: input.role, createdAt: Date.now(),
  };
  saveDevMember(member);
  return { ok: true, member };
}

export async function setDevPassword(id: string, pw: string): Promise<{ ok: boolean; error?: string }> {
  const m = read().find((x) => x.id === id);
  if (!m) return { ok: false, error: "That member no longer exists." };
  if (pw.length < 10) return { ok: false, error: "Dev passwords need at least 10 characters." };
  saveDevMember({ ...m, hash: await hashPassword(pw) });
  return { ok: true };
}

export async function resetDevPasswordByEmail(email: string, pw: string): Promise<{ ok: boolean; error?: string }> {
  const m = findDevMember(email);
  if (!m) return { ok: false, error: "No developer seat is registered under that address." };
  return setDevPassword(m.id, pw);
}

/**
 * Verify credentials. On an empty registry the caller is seeded as owner.
 * Returns the member so the session can carry an identity.
 */
export async function verifyDevLogin(email: string, pw: string): Promise<{ ok: boolean; error?: string; member?: DevMember; seeded?: boolean }> {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "Enter a valid email address." };

  if (devTeamEmpty()) {
    if (pw.length < 10) return { ok: false, error: "First sign-in creates the owner seat. Choose a password of at least 10 characters." };
    const res = await addDevMember({ email: e, name: "", pw, role: "owner" });
    if (!res.ok || !res.member) return { ok: false, error: res.error };
    const member = { ...res.member, lastLogin: Date.now() };
    saveDevMember(member);
    return { ok: true, member, seeded: true };
  }

  const m = findDevMember(e);
  const hash = await hashPassword(pw);
  // Same message either way, so the form cannot be used to enumerate seats.
  if (!m || m.hash !== hash) return { ok: false, error: "Those developer credentials are not recognised." };
  const member = { ...m, lastLogin: Date.now() };
  saveDevMember(member);
  return { ok: true, member };
}
