import { useEffect, useState } from "react";
import { cx, timeAgo } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Btn } from "../components/ui";
import { useApp } from "../store";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isServerAuthConfigured, supabase, functionsUrl } from "../lib/supabase";
import { SURFACE } from "../lib/surface";
import { PROVIDER_META, aiKeyLocation, loadProviders, type AiProviderId } from "../lib/aiGateway";

// ── Platform · infra ────────────────────────────────────────────────────────
// Everything on this tab is measured when it opens. Nothing here is seeded.
// The previous version rendered five hardcoded "healthy" chips - including one
// for a module that no longer exists - and a progress bar that counted to 100
// and then declared the state valid. The one screen an operator reaches for
// during an incident was the one screen guaranteed to lie. Every row below is
// now the result of a real request against this deployment, or a real pass
// over the live store.
type ProbeState = "checking" | "ok" | "warn" | "down" | "off";

interface Probe {
  key: string;
  icon: IconName;
  name: string;
  role: string;
  detail: string;
  state: ProbeState;
  note: string;
}

const PROBE_TONE: Record<ProbeState, { chip: string; icon: string; label: string }> = {
  checking: { chip: "bg-white/10 text-white/50", icon: "text-white/40", label: "checking" },
  ok: { chip: "bg-[#1d3527] text-[#4CC38A]", icon: "text-[#4CC38A]", label: "healthy" },
  warn: { chip: "bg-[#3a3320] text-[#e2a33c]", icon: "text-[#e2a33c]", label: "degraded" },
  down: { chip: "bg-[#3b1d1f] text-[#ff9592]", icon: "text-[#e5484d]", label: "down" },
  off: { chip: "bg-white/10 text-white/45", icon: "text-white/35", label: "off" },
};

function measureStorage(prefix: string): { bytes: number; keys: number } {
  try {
    let bytes = 0;
    let keys = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      keys += 1;
      bytes += k.length + (localStorage.getItem(k) ?? "").length;
    }
    return { bytes, keys };
  } catch {
    return { bytes: -1, keys: -1 };
  }
}

interface Finding { label: string; count: number; sample: string }

export function Platform() {
  const { toast, properties, reservations, tasks, conversations, sync } = useApp();
  const [probes, setProbes] = useState<Probe[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [scanned, setScanned] = useState(0);
  const [scanAt, setScanAt] = useState(0);

  const runProbes = async () => {
    setChecking(true);
    const out: Probe[] = [];
    const configured = isServerAuthConfigured();
    const host = configured ? new URL(SUPABASE_URL).host : "not set";

    if (!configured) {
      out.push({ key: "auth", icon: "lock", name: "Supabase auth", role: "GoTrue", detail: "VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY", state: "off", note: "not compiled into this bundle - sign-in falls back to the local store" });
      out.push({ key: "db", icon: "layers", name: "Postgres · RLS", role: "PostgREST", detail: "public.tenants", state: "off", note: "no project to reach" });
      out.push({ key: "fn", icon: "bolt", name: "AI proxy", role: "Edge Function", detail: "ai-proxy", state: "off", note: "no project to reach" });
    } else {
      const t0 = performance.now();
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_ANON_KEY }, cache: "no-store" });
        out.push({ key: "auth", icon: "lock", name: "Supabase auth", role: "GoTrue", detail: host, state: r.ok ? "ok" : "warn", note: `HTTP ${r.status} in ${Math.round(performance.now() - t0)} ms` });
      } catch (err) {
        out.push({ key: "auth", icon: "lock", name: "Supabase auth", role: "GoTrue", detail: host, state: "down", note: (err as Error).message });
      }

      const t1 = performance.now();
      try {
        const { count, error } = await supabase().from("tenants").select("id", { count: "exact", head: true });
        const ms = Math.round(performance.now() - t1);
        out.push({ key: "db", icon: "layers", name: "Postgres · RLS", role: "PostgREST", detail: "select on public.tenants", state: error ? "warn" : "ok", note: error ? `${error.code || "error"} - ${error.message}` : `${count ?? 0} row(s) visible to this session in ${ms} ms` });
      } catch (err) {
        out.push({ key: "db", icon: "layers", name: "Postgres · RLS", role: "PostgREST", detail: "select on public.tenants", state: "down", note: (err as Error).message });
      }

      const t2 = performance.now();
      try {
        const r = await fetch(functionsUrl("ai-proxy"), { method: "OPTIONS", cache: "no-store" });
        const ms = Math.round(performance.now() - t2);
        out.push({ key: "fn", icon: "bolt", name: "AI proxy", role: "Edge Function", detail: "ai-proxy", state: r.status === 404 ? "down" : r.status >= 500 ? "warn" : "ok", note: r.status === 404 ? "404 - the function is not deployed to this project" : `HTTP ${r.status} in ${ms} ms` });
      } catch (err) {
        out.push({ key: "fn", icon: "bolt", name: "AI proxy", role: "Edge Function", detail: "ai-proxy", state: "down", note: (err as Error).message });
      }
    }
    const providers = loadProviders();
    const keyed = (Object.keys(PROVIDER_META) as AiProviderId[]).filter((id) => providers[id].apiKey.trim().length > 0);
    const home = aiKeyLocation();
    out.push({
      key: "keys", icon: "key", name: "Model credentials", role: home === "server" ? "server-held" : "browser-held",
      detail: home === "server" ? "Edge Function secrets" : "localStorage · development only",
      state: home === "server" ? "ok" : keyed.length ? "warn" : "off",
      note: home === "server"
        ? "keys never reach the browser - the fallback chain resolves inside ai-proxy"
        : keyed.length
          ? `${keyed.map((id) => PROVIDER_META[id].name).join(", ")} keyed in this browser; never ship this path`
          : "no key on either side - AI features refuse instead of inventing",
    });

    const store = measureStorage("derzen.");
    out.push({
      key: "store", icon: "archive", name: "Client persistence", role: "localStorage", detail: "derzen.*",
      state: store.bytes < 0 || store.bytes > 4_000_000 ? "warn" : "ok",
      note: store.bytes < 0
        ? "storage is blocked - private mode or a hardened profile"
        : `${store.keys} key(s), ${(store.bytes / 1024).toFixed(0)} KB of a ~5 MB budget`,
    });

    const entry = (document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null)?.src.split("/").pop() || "vite dev server";
    out.push({ key: "build", icon: "terminal", name: "This build", role: `${SURFACE} surface`, detail: entry, state: "ok", note: `${window.location.host} · document last modified ${document.lastModified}` });

    setProbes(out);
    setCheckedAt(Date.now());
    setChecking(false);
  };

  useEffect(() => { void runProbes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runSuite = () => {
    const propIds = new Set(properties.map((p) => p.id));
    const resIds = new Set(reservations.map((r) => r.id));
    const seenRes = new Set<string>();
    const dupRes = reservations.filter((r) => (seenRes.has(r.id) ? true : (seenRes.add(r.id), false)));

    const checks: { label: string; ids: string[] }[] = [
      { label: "Reservations bound to a property that no longer exists", ids: reservations.filter((r) => !propIds.has(r.propertyId)).map((r) => r.ref || r.id) },
      { label: "Reservations that end on or before they start", ids: reservations.filter((r) => r.checkOut <= r.checkIn).map((r) => r.ref || r.id) },
      { label: "Duplicate reservation ids", ids: dupRes.map((r) => r.id) },
      { label: "Tasks bound to a missing property", ids: tasks.filter((t) => !propIds.has(t.propertyId)).map((t) => t.id) },
      { label: "Tasks linked to a reservation that is gone", ids: tasks.filter((t) => !!t.linkedReservationId && !resIds.has(t.linkedReservationId)).map((t) => t.id) },
      { label: "Conversations bound to a missing property", ids: conversations.filter((c) => !propIds.has(c.propertyId)).map((c) => c.id) },
      { label: "Conversations linked to a reservation that is gone", ids: conversations.filter((c) => !!c.reservationId && !resIds.has(c.reservationId)).map((c) => c.id) },
      { label: "Channel sync rows for a missing property", ids: sync.filter((s) => !propIds.has(s.propertyId)).map((s) => s.key) },
    ];

    const hits = checks.filter((c) => c.ids.length > 0).map((c) => ({ label: c.label, count: c.ids.length, sample: c.ids.slice(0, 4).join(", ") }));
    const total = properties.length + reservations.length + tasks.length + conversations.length + sync.length;
    setScanned(total);
    setScanAt(Date.now());
    setFindings(hits);
    toast(hits.length ? "warn" : "ok", hits.length ? `${hits.length} integrity finding(s)` : "State is consistent", `${total} record(s) walked across properties, reservations, tasks, conversations and channel sync.`);
  };
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-display text-[15px] font-bold text-white">Runtime health</h2>
          <Btn size="xs" variant="ghost" icon="refresh" onClick={() => void runProbes()} disabled={checking}>{checking ? "checking" : "Re-check"}</Btn>
        </div>
        <p className="mb-3 font-mono text-[10px] text-white/35">probed live from this browser · {checkedAt ? `last run ${timeAgo(checkedAt)}` : "running now"}</p>
        {probes.length === 0 && (
          <p className="rounded-md border border-white/10 px-3 py-6 text-center font-mono text-[11px] text-white/35">probing this deployment…</p>
        )}
        {probes.map((p) => (
          <div key={p.key} className="mb-2 flex items-start gap-3 rounded-md border border-white/10 px-3 py-2.5">
            <Ic name={p.icon} size={14} className={cx("mt-0.5 shrink-0", PROBE_TONE[p.state].icon)} />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-white/85">{p.name} <span className="font-normal text-white/40">· {p.role}</span></p>
              <p className="truncate font-mono text-[10px] text-white/35">{p.detail}</p>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-white/55">{p.note}</p>
            </div>
            <span className={cx("shrink-0 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase", PROBE_TONE[p.state].chip)}>{PROBE_TONE[p.state].label}</span>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0a0a09] p-5">
        <h2 className="mb-1 font-display text-[15px] font-bold text-white">State integrity</h2>
        <p className="mb-3 font-mono text-[10px] text-white/35">walks the loaded workspace for dangling references · read-only, it changes nothing</p>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] font-bold text-white/85">Reference scan</p>
            <Btn size="xs" variant="solid" icon="shield" onClick={runSuite}>Run now</Btn>
          </div>
          {findings === null && (
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-white/35">
              {properties.length} properties · {reservations.length} reservations · {tasks.length} tasks · {conversations.length} conversations · {sync.length} channel sync rows loaded and ready to walk
            </p>
          )}
          {findings !== null && findings.length === 0 && (
            <p className="anim-pop mt-2 font-mono text-[11px] font-bold text-[#4CC38A]">✓ {scanned} record(s) walked {timeAgo(scanAt)} — no dangling references.</p>
          )}
          {findings !== null && findings.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <p className="font-mono text-[10px] text-white/35">{scanned} record(s) walked {timeAgo(scanAt)}</p>
              {findings.map((f) => (
                <div key={f.label} className="rounded-md border border-[#e2a33c]/30 bg-[#3a3320]/30 px-3 py-2">
                  <p className="text-[11.5px] font-bold text-[#e2a33c]">{f.count}× {f.label}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/45">{f.sample}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="mt-4 rounded-md border border-white/10 bg-[#171714] px-3 py-2.5 font-mono text-[10px] leading-relaxed text-white/45">
          Access is decided by row-level security in Postgres, never by this console — the row count above is only what your own session is allowed to read. Card numbers are never stored (gateways tokenise) and identity documents stay field-encrypted.
        </p>
      </section>
    </div>
  );
}
