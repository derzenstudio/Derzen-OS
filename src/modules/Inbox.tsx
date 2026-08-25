import { useEffect, useMemo, useState } from "react";
import { cx, money, fmtDate, timeAgo, relDay } from "../lib/format";
import { Ic } from "../components/icons";
import { Avatar, Badge, Btn, Dot, Empty, SearchBox, Select, StatusChip, Textarea } from "../components/ui";
import { useApp } from "../store";
import { channelDef, guestById, propertyById, RESERVATIONS } from "../lib/data";
import { ChannelMark } from "../components/ota";
import type { Conversation } from "../lib/types";

export default function Inbox() {
  const { route, navigate, markConvRead, addReply, setConvNote, logAutopilot, toast } = useApp();
  const conversations = useApp((s) => s.conversations);
  const reservations = useApp((s) => s.reservations);
  const tasks = useApp((s) => s.tasks);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(route.query.get("filter") ?? "all");
  const [channel, setChannel] = useState("all");
  const [prop, setProp] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(route.query.get("conv"));
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState("");

  const list = useMemo(() => {
    let out = [...conversations];
    if (filter === "unread") out = out.filter((c) => c.unread > 0);
    if (filter === "needs-reply") out = out.filter((c) => c.needsReply || c.escalated || c.unread > 0);
    if (channel !== "all") out = out.filter((c) => c.channel === channel);
    if (prop !== "all") out = out.filter((c) => c.propertyId === prop);
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((c) => guestById(c.guestId).name.toLowerCase().includes(s) || c.messages.some((m) => m.body.toLowerCase().includes(s)));
    }
    return out.sort((a, b) => b.messages[b.messages.length - 1].ts - a.messages[a.messages.length - 1].ts);
  }, [conversations, filter, channel, prop, q]);

  const conv = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (conv && conv.unread > 0) {
      const t = setTimeout(() => markConvRead(conv.id), 500);
      return () => clearTimeout(t);
    }
  }, [activeId, conv?.messages.length]);

  useEffect(() => {
    if (conv) setNotes(conv.notes);
  }, [activeId]);

  const aiDraft = () => {
    if (!conv) return;
    const g = guestById(conv.guestId);
    const p = propertyById(conv.propertyId);
    const first = g.name.split(" ")[0];
    addReply(conv.id, `Hi ${first}! Thanks for the message — yes, that works. Anything else before your stay at ${p.name}? We're happy to arrange transfers, chef dinners or spa slots from your guidebook. — Kadek`, "ai", { model: "concierge-v2", citedSources: ["General · brand tone guide", `${p.name} · house rules`] });
    logAutopilot(`${conv.subject ?? "Thread"} · ${g.name}`, "sent");
    toast("ok", "Draft inserted (Suggestion mode)", "Nothing is sent until you approve — audit trail updated.");
  };

  const send = () => {
    if (!conv || !draft.trim()) return;
    addReply(conv.id, draft.trim(), "operator", { authorName: "Sarah" });
    setDraft("");
    toast("ok", "Reply sent", `Pushed via ${channelDef(conv.channel as never).name}`);
  };

  const guest = conv ? guestById(conv.guestId) : null;
  const res = conv?.reservationId ? reservations.find((r) => r.id === conv.reservationId) : null;
  const pastStays = guest ? reservations.filter((r) => r.guestId === guest.id && r.kind === "stay").length : 0;
  const openTasks = conv ? tasks.filter((t) => t.propertyId === conv.propertyId && (t.status === "open" || t.status === "in_progress")) : [];

  return (
    <div className="flex h-[calc(100vh-128px)] gap-3">
      {/* Thread list */}
      <section className="flex w-[310px] shrink-0 flex-col rounded-xl border border-line bg-card" aria-label="Conversations">
        <div className="space-y-2 border-b border-line p-2.5">
          <SearchBox value={q} onChange={setQ} placeholder="Search guests & messages" />
          <div className="flex gap-1.5">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!h-8 !text-[11.5px]" aria-label="Filter conversations">
              <option value="all">All threads</option>
              <option value="unread">Unread</option>
              <option value="needs-reply">Needs reply</option>
            </Select>
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="!h-8 !text-[11.5px]" aria-label="Channel filter">
              <option value="all">Channels</option>
              {["airbnb", "booking", "traveloka", "trip", "whatsapp", "email"].map((c) => <option key={c} value={c}>{channelDef(c as never).name}</option>)}
            </Select>
            <Select value={prop} onChange={(e) => setProp(e.target.value)} className="!h-8 !text-[11.5px]" aria-label="Property filter">
              <option value="all">Properties</option>
              {[...new Set(conversations.map((c) => c.propertyId))].map((p) => <option key={p} value={p}>{propertyById(p).code}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 && <Empty icon="inbox" title="No threads match" body="Loosen the filters, or celebrate — the inbox is clear." />}
          {list.map((c) => {
            const g = guestById(c.guestId);
            const last = c.messages[c.messages.length - 1];
            const def = channelDef(c.channel as never);
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)} className={cx("flex w-full items-start gap-2.5 border-b border-line/60 px-3 py-2.5 text-left transition-colors", activeId === c.id ? "bg-brand-soft/60" : "hover:bg-paper")} aria-current={activeId === c.id}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-surface" aria-label={`Channel: ${def.name}`}><ChannelMark id={String(c.channel)} size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cx("truncate text-[12.5px]", c.unread > 0 ? "font-bold text-ink" : "font-semibold text-mute")}>{g.name}</span>
                    {c.escalated && <Badge tone="danger"><Ic name="flag" size={9} /> esc</Badge>}
                    {c.unread > 0 && <span className="ml-auto rounded-full bg-danger px-1.5 font-mono text-[9.5px] font-bold text-white">{c.unread}</span>}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-ink/70">{c.subject}</span>
                  <span className="block truncate text-[11px] text-faint">{last.from === "guest" ? "" : "You: "}{last.body}</span>
                  <span className="mt-0.5 block text-[9.5px] font-semibold text-faint">{propertyById(c.propertyId).code} · {timeAgo(last.ts)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Thread */}
      <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-card" aria-label="Conversation">
        {!conv ? (
          <Empty icon="chat" title="Pick a conversation" body="Unified across Airbnb, Booking.com, VRBO, WhatsApp, email and your direct site — threaded to the right reservation automatically." />
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              <Avatar name={guest!.name} size={32} color={channelDef(conv.channel as never).color} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-ink">{guest!.name} <Badge tone="mute">{channelDef(conv.channel as never).name}</Badge> {conv.escalated && <Badge tone="danger">Escalated to human</Badge>}</p>
                <p className="text-[11px] text-mute">{conv.subject} · {propertyById(conv.propertyId).name}{conv.reservationId && <> · <button className="font-bold text-brand-deep hover:underline" onClick={() => navigate(`/reservations/${conv.reservationId}`)}>{conv.reservationId.toUpperCase()}</button></>}</p>
              </div>
              <Btn size="xs" icon="sparkle" onClick={aiDraft}>AI draft</Btn>
              <Btn size="xs" variant="ghost" icon="ticket" onClick={() => conv.reservationId && navigate(`/reservations/${conv.reservationId}`)}>Reservation</Btn>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-paper/50 p-4">
              {conv.messages.map((m) => (
                <div key={m.id} className={cx("flex gap-2.5", m.from !== "guest" && "flex-row-reverse")}>
                  {m.from === "guest" ? <Avatar name={guest!.name} size={26} color="#61705F" /> : m.from === "ai" ? <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand text-white"><Ic name="sparkle" size={13} /></span> : <Avatar name="Sarah Whitfield" size={26} />}
                  <div className={cx("max-w-[72%] rounded-xl border px-3 py-2 text-[12.5px] leading-relaxed shadow-sm", m.from === "guest" ? "border-line bg-card" : m.from === "ai" ? "border-brand/30 bg-brand-soft" : "border-pine-800 bg-pine-900 text-pine-100")}>
                    {m.kind === "attachment" && (
                      <p className="mb-1 flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 font-mono text-[10.5px] font-bold"><Ic name="clip" size={11} /> {m.attachmentName}</p>
                    )}
                    <p>{m.body}</p>
                    <p className={cx("mt-1 flex items-center gap-1.5 text-[9.5px] font-semibold", m.from === "operator" ? "text-pine-200/60" : "text-faint")}>
                      {m.from === "ai" ? `Concierge · ${m.model}` : m.authorName ?? guest!.name} · {timeAgo(m.ts)}
                      {m.citedSources && <span className="rounded bg-brand/10 px-1 text-brand-deep">cited: {m.citedSources.length}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <footer className="border-t border-line p-3">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply to ${guest!.name} — sent via ${channelDef(conv.channel as never).name}`} className="!min-h-[56px]" />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10.5px] font-semibold text-faint">
                  <Ic name="clip" size={12} /> Attach · <Ic name="tag" size={12} /> Canned reply · Autopilot: Suggestion
                </div>
                <div className="flex gap-2">
                  <Btn icon="sparkle" onClick={aiDraft}>Draft with AI</Btn>
                  <Btn variant="solid" icon="send" onClick={send}>Send reply</Btn>
                </div>
              </div>
            </footer>
          </>
        )}
      </section>

      {/* Context rail */}
      <aside className="hidden w-[264px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex" aria-label="Guest context">
        {conv && guest && (
          <>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Guest 360</p>
              <div className="flex items-center gap-2.5">
                <Avatar name={guest.name} size={38} color="#0E6B4E" />
                <div>
                  <p className="text-[13px] font-bold text-ink">{guest.name}</p>
                  <p className="text-[10.5px] text-mute">{guest.country} · {guest.status === "vip" ? "VIP" : "active"}</p>
                </div>
              </div>
              <dl className="mt-3 space-y-1.5 text-[11.5px]">
                <div className="flex justify-between"><dt className="text-mute">Lifetime spend</dt><dd className="font-mono font-bold text-ink">{money(guest.lifetimeSpend, "EUR")}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">Past stays</dt><dd className="font-bold">{pastStays}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">Last activity</dt><dd className="font-bold">{timeAgo(guest.lastActivityTs)}</dd></div>
                <div className="flex justify-between"><dt className="text-mute">ID verified</dt><dd>{guest.verifiedId ? <Dot tone="ok" label="verified" /> : <Dot tone="warn" label="pending" />}</dd></div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-1">
                {guest.tags.map((tg) => <Badge key={tg} tone="info">{tg}</Badge>)}
              </div>
            </div>
            {res && (
              <div className="rounded-xl border border-line bg-card p-3">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Linked reservation</p>
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[12px] font-bold text-ink">{res.ref}</p>
                  <StatusChip status={res.status} />
                </div>
                <p className="mt-1 text-[11.5px] text-mute">{fmtDate(res.checkIn)} → {fmtDate(res.checkOut)} · {res.adults + res.children} pax</p>
                <p className="mt-1 font-mono text-[13px] font-bold text-brand-deep">{money(res.total, res.currency)}</p>
                <Btn size="xs" className="mt-2 w-full" onClick={() => navigate(`/reservations/${res.id}`)}>Open reservation</Btn>
              </div>
            )}
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Open tasks · {propertyById(conv.propertyId).code}</p>
              {openTasks.length === 0 && <p className="text-[11.5px] text-faint">Nothing open here.</p>}
              {openTasks.slice(0, 3).map((t) => (
                <p key={t.id} className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink"><Ic name="wrench" size={11} className="text-faint" /> {t.title}</p>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Internal notes</p>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { setConvNote(conv.id, notes); }} className="!min-h-[70px] !text-[11.5px]" placeholder="Never shown to guests…" />
            </div>
          </>
        )}
        {!conv && <p className="px-2 text-[11.5px] text-faint">Select a thread to see the guest's full story — spend, stays, verification and open tasks.</p>}
      </aside>
    </div>
  );
}

