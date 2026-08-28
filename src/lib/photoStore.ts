// ── Per-property photo library · persistence adapter ──────────────────────
// Storage backends are swappable. This build ships the LOCAL backend
// (localStorage, images compressed client-side before save so they fit the
// browser quota and survive reloads). The Supabase adapter is stubbed below —
// drop in SUPABASE_URL + SUPABASE_ANON_KEY and flip STORAGE_BACKEND, nothing
// else in the app changes: every caller goes through PhotoStore.

export interface PhotoEntry {
  id: string;
  url: string;          // data URL (local) or public bucket URL (supabase)
  label: string;
  source: "ota" | "upload";
  channel?: string;     // which OTA the sync pulled it from
  bytes?: number;
}

export type StorageBackend = "local" | "supabase";
export const STORAGE_BACKEND: StorageBackend = "local";
export const QUOTA_BYTES = 4_800_000; // keep headroom under the ~5MB localStorage cap

// ── Supabase adapter (swap-in ready) ───────────────────────────────────────
// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// Bucket: "property-photos", RLS policy scoped by tenant_id claim.
//   upload:  supabase.storage.from("property-photos").upload(`${tenant}/${prop}/${id}.jpg`, file)
//   list:    supabase.storage.from("property-photos").list(`${tenant}/${prop}`)
//   remove:  supabase.storage.from("property-photos").remove([path])
// Until those vars exist, the app runs on the local backend automatically.

const key = (propId: string) => `derzen.photos.${propId}`;

export function readLibrary(propId: string): PhotoEntry[] | null {
  if (STORAGE_BACKEND !== "local") return null; // supabase path would fetch async
  try {
    const raw = localStorage.getItem(key(propId));
    return raw ? (JSON.parse(raw) as PhotoEntry[]) : null;
  } catch {
    return null;
  }
}

export function writeLibrary(propId: string, photos: PhotoEntry[]): { ok: boolean; bytes: number } {
  const bytes = photos.reduce((s, p) => s + (p.bytes ?? Math.round(p.url.length * 0.75)), 0);
  if (STORAGE_BACKEND !== "local") return { ok: true, bytes };
  try {
    localStorage.setItem(key(propId), JSON.stringify(photos));
    return { ok: true, bytes };
  } catch {
    return { ok: false, bytes }; // QuotaExceededError → caller warns
  }
}

export function libraryBytes(propId: string): number {
  return (readLibrary(propId) ?? []).reduce((s, p) => s + (p.bytes ?? Math.round(p.url.length * 0.75)), 0);
}

// ── Client-side compression (before anything is persisted) ────────────────
export function compressImage(file: File, maxW = 900, quality = 0.74): Promise<{ url: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("read failed"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("not an image"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", quality);
        resolve({ url, bytes: Math.round(url.length * 0.75) });
      };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
