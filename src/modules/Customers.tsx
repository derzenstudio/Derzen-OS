import { useMemo, useState } from "react";
import { cx, money, timeAgo, download, toCSV } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Avatar, Badge, Btn, Empty, Field, Input, Modal, SearchBox, Select, Textarea, Toggle } from "../components/ui";
import { useApp } from "../store";
import { GUESTS, channelDef, propertyById } from "../lib/data";

const srcIcon: Record<string, IconName> = { airbnb: "home", booking: "globe", whatsapp: "whatsapp", email: "mail", web: "globe", agoda: "globe", trip: "globe", traveloka: "globe", vrbo: "home" };

export default function Customers() {
  const { toast } = useApp();
  const reservations = useApp((s) => s.reservations);
  const quotes = useApp((s) => s.quotes);
  const conversations = useApp((s) => s.conversations);
  const [consent, setConsent] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const list = useMemo(() => {
    let out = [...GUESTS];
    if (status !== "all") out = out.filter((g) => g.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((g) => g.name.toLowerCase().includes(s) || g.emails.some((e) => e.includes(s)) || g.country.toLowerCase().includes(s));
    }
    return out.sort((a, b) => b.lastActivityTs - a.lastActivityTs);
  }, [q, status]);

  const detail = GUESTS.find((g) => g.id === detailId) ?? null;
  const detailRes = detail ? reservations.filter((r) => r.guestId === detail.id) : [];
  const detailQuotes = detail ? quotes.filter((x) => x.guestId === detail.id) : [];
  const detailConvs = detail ? conversations.filter((c) => c.guestId === detail.id) : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search name, email, country" className="w-[240px]" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[130px]" aria-label="Status filter">
          <option value="all">All statuses</option><option value="active">Active</option><option value="vip">VIP</option><option value="blocked">Blocked</option>
        </Select>
        <p className="text-[11.5px] font-semibold text-mute">OTA alias emails + normalised phones dedupe into one record automatically.</p>
        <div className="ml-auto flex gap-2">
          {sel.length >= 2 && <Btn icon="users" onClick={() => setMergeOpen(true)}>Merge {sel.length} selected</Btn>}
          {sel.length > 0 && <Btn icon="send" onClick={() => setBulkOpen(true)}>Message {sel.length}</Btn>}
          <Btn icon="download" onClick={() => { download("trellis-customers.csv", toCSV([["Name", "Emails", "Country", "Lifetime spend (EUR)", "Status"], ...list.map((g) => [g.name, g.emails.join("; "), g.country, g.lifetimeSpend / 100, g.status])])); toast("ok", "Exported CSV", `${list.length} guests`); }}>Export</Btn>
          <Btn variant="solid" icon="plus" onClick={() => setCreateOpen(true)}>New guest</Btn>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
              <th className="w-8 px-3 py-2.5" aria-label="Select" />
              <th className="px-2 py-2.5">Guest</th><th className="px-3 py-2.5">Contact</th><th className="px-3 py-2.5">Country</th>
              <th className="px-3 py-2.5">Last activity</th><th className="px-3 py-2.5 text-right">Lifetime spend</th>
              <th className="px-3 py-2.5 text-right">Stays</th><th className="px-3 py-2.5 text-right">Quotes</th><th className="px-3 py-2.5">Tags</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => {
              const stays = reservations.filter((r) => r.guestId === g.id && r.kind === "stay").length;
              const gq = quotes.filter((x) => x.guestId === g.id).length;
              return (
                <tr key={g.id} className={cx("cursor-pointer border-b border-line/60 transition-colors hover:bg-paper/70", sel.includes(g.id) && "bg-brand-soft/40")} onClick={() => setDetailId(g.id)}>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${g.name}`} checked={sel.includes(g.id)} onChange={() => setSel((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))} className="accent-[#0E7A5F]" />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={g.name} size={30} color={g.status === "vip" ? "#C07F14" : "#0E7A5F"} />
                      <div>
                        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">{g.name} {g.status === "vip" && <Badge tone="warn">VIP</Badge>} {g.verifiedId && <Ic name="shield" size={11} className="text-brand" aria-label="ID verified" />}</p>
                        {g.aliases.length > 0 && <p className="text-[9.5px] font-semibold text-faint">{g.aliases.length} OTA alias{g.aliases.length > 1 ? "es" : ""} merged</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-[11.5px] text-mute">{g.emails[0]}</p>
                    <p className="font-mono text-[10px] text-faint">{g.phones[0]}</p>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] font-semibold">{g.country}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-mute"><Ic name={srcIcon[g.lastSource] ?? "mail"} size={12} className="text-faint" /> {timeAgo(g.lastActivityTs)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold text-ink">{money(g.lifetimeSpend, "EUR")}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px]">{stays}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px]">{gq}</td>
                  <td className="px-3 py-2.5"><span className="flex flex-wrap gap-1">{g.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <Empty icon="users" title="No guests match" body="Try clearing the search." />}
      </div>

      {/* Detail timeline */}
      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail ? `${detail.name} — full timeline` : ""} w={640}>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-paper p-3">
              <Avatar name={detail.name} size={40} color="#0E7A5F" />
              <div className="flex-1">
                <p className="text-[13.5px] font-bold text-ink">{detail.name} <span className="font-semibold text-mute">· {detail.country}</span></p>
                <p className="text-[11px] text-mute">{detail.emails.join(" · ")}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[16px] font-bold text-brand-deep">{money(detail.lifetimeSpend, "EUR")}</p>
                <p className="text-[10px] font-bold uppercase text-mute">lifetime · EUR reporting</p>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-mute">
                <Toggle checked={consent[detail.id] ?? detail.consentMarketing} onChange={(v) => setConsent({ ...consent, [detail.id]: v })} label="Marketing consent" /> consent
              </label>
            </div>
            <ol>
              {[
                ...detailRes.map((r) => ({ ts: r.createdAt, icon: "ticket" as IconName, text: `Stay ${r.ref} · ${propertyById(r.propertyId).name} · ${r.checkIn} → ${r.checkOut} · ${r.status.replace("_", " ")}`, amount: money(r.total, r.currency) })),
                ...detailQuotes.map((x) => ({ ts: x.createdAt, icon: "doc" as IconName, text: `Quote ${x.ref} · ${propertyById(x.propertyId).name} · ${x.status}`, amount: money(x.total, x.currency) })),
                ...detailConvs.flatMap((c) => c.messages.filter((m) => m.from === "guest").slice(-1).map((m) => ({ ts: m.ts, icon: "chat" as IconName, text: `Message via ${channelDef(c.channel as never).name}: “${m.body.slice(0, 70)}…”`, amount: "" }))),
              ]
                .sort((a, b) => b.ts - a.ts)
                .map((ev, i, arr) => (
                  <li key={i} className="relative pb-3 pl-8 last:pb-0">
                    {i < arr.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-line" aria-hidden="true" />}
                    <span className="absolute left-0 top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-soft text-brand-deep"><Ic name={ev.icon} size={11} /></span>
                    <p className="text-[12px] font-semibold text-ink">{ev.text}</p>
                    <p className="font-mono text-[10px] text-faint">{timeAgo(ev.ts)} {ev.amount && `· ${ev.amount}`}</p>
                  </li>
                ))}
            </ol>
            <p className="rounded-md bg-paper px-3 py-2 text-[10.5px] text-mute">PII reads by staff are logged · alias emails stored only as hashes after dedupe · GDPR export & erase available per guest.</p>
          </div>
        )}
      </Modal>

      {/* Merge */}
      <Modal open={mergeOpen} onClose={() => setMergeOpen(false)} title="Merge duplicates" w={460}
        footer={<><Btn variant="ghost" onClick={() => setMergeOpen(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => { setSel([]); setMergeOpen(false); toast("ok", "Records merged", "Fuzzy name + stay matching confirmed · alias emails preserved as hashes"); }}>Merge records</Btn></>}>
        <p className="text-[12.5px] leading-relaxed text-mute">
          You selected <b className="text-ink">{sel.length} records</b>. The merge keeps the richest profile, sums lifetime spend in the reporting currency,
          re-links every reservation, message and quote, and preserves OTA alias emails as hashes for future dedupe. Written to the audit log.
        </p>
        <div className="mt-3 space-y-1.5">
          {sel.map((id) => {
            const g = GUESTS.find((x) => x.id === id);
            return g ? <p key={id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-bold"><Avatar name={g.name} size={22} /> {g.name} <span className="ml-auto font-mono text-[10px] text-faint">{g.emails[0]}</span></p> : null;
          })}
        </div>
      </Modal>

      {/* Bulk message */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk message · ${sel.length} guests`} w={460}
        footer={<><Btn variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Btn><Btn variant="solid" icon="send" onClick={() => { setBulkOpen(false); setSel([]); toast("ok", "Queued with per-guest variables", "Only guests with marketing consent receive it — the rest are skipped and logged."); }}>Queue messages</Btn></>}>
        <Field label="Message (variables allowed)">
          <Textarea value={bulkMsg} onChange={(e) => setBulkMsg(e.target.value)} placeholder="Hi {{guest_first}} — our low-season rates are live…" />
        </Field>
        <p className="mt-2 text-[11px] text-mute">Sends via each guest's preferred channel. Consent flags are enforced server-side.</p>
      </Modal>

      {/* Create */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New guest record" w={440}
        footer={<><Btn variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Btn><Btn variant="solid" icon="plus" onClick={() => { setCreateOpen(false); toast("ok", "Guest created", "Dedupe check passed — no matching aliases found"); }}>Create guest</Btn></>}>
        <div className="space-y-3">
          <Field label="Full name"><Input placeholder="Jane Doe" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input placeholder="jane@mail.com" /></Field>
            <Field label="Phone"><Input placeholder="+62 …" /></Field>
          </div>
          <Field label="Country"><Input placeholder="Australia" /></Field>
        </div>
      </Modal>
    </div>
  );
}
