import { useEffect, useRef, useState } from "react";
import { cx, money, moneyRaw, fmtDate, dayKey, addDays, today, range } from "../lib/format";
import { Ic } from "../components/icons";
import { Btn } from "../components/ui";
import { useApp } from "../store";
import { PROPERTIES, propertyById } from "../lib/data";
import type { WidgetStyle } from "../lib/widgetTheme";
import { aiChat, isAiConfigured, loadProviders } from "../lib/aiGateway";

// ── Live preview of the embeddable concierge chatbot ──────────────────────
// Guests see this bubble on the tenant's own website. It answers from the
// tenant's knowledge base, opens an inline stay picker, books, and hands off
// to the hosted payment page in a new tab — the money never touches the embed.

interface Msg { from: "guest" | "bot"; text: string; picker?: boolean; }

export function ChatbotPreview({ st, onBooked }: { st: WidgetStyle; onBooked: (ref: string) => void }) {
  const { chatBooking, brand } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Hi! I'm the Sanggraha concierge. Ask me about our villas, or tap below to check availability." },
  ]);
  const [typing, setTyping] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [propId, setPropId] = useState(PROPERTIES[0].id);
  const [from, setFrom] = useState(dayKey(addDays(today(), 7)));
  const [nights, setNights] = useState(4);
  const [guests, setGuests] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, typing, pickerOpen]);

  const bot = (text: string, delay = 700) => {
    setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs((m) => [...m, { from: "bot", text }]); }, delay);
  };

  const ask = (q: string, a: string) => {
    setMsgs((m) => [...m, { from: "guest", text: q }]);
    bot(a);
  };

  const [input, setInput] = useState("");
  const aiOn = useApp((s) => s.aiConfig.enabled);
  const sendFree = async () => {
    const q = input.trim();
    if (!q || typing) return;
    setInput("");
    setMsgs((m) => [...m, { from: "guest", text: q }]);
    const p = propertyById(propId);
    const providers = loadProviders();
    if (aiOn && isAiConfigured(providers)) {
      setTyping(true);
      try {
        const sys = `You are the ${p.name} concierge chatbot. Answer the guest briefly (1-3 sentences), warm and helpful. Never invent prices, dates or availability. If you can't confirm, invite them to check availability.`;
        const res = await aiChat(sys, q, { maxTokens: 120 });
        setTyping(false);
        setMsgs((m) => [...m, { from: "bot", text: res.text }]);
        return;
      } catch { setTyping(false); }
    }
    bot("I'd love to help with that. Tap “Check availability” and I'll show you live dates and rates.", 500);
  };

  const estimate = () => {
    const p = propertyById(propId);
    const base = p.pricing.plans.find((pl) => pl.kind === "base")?.nightly ?? 3_500_000;
    return base * nights;
  };

  const book = () => {
    const to = dayKey(addDays(from, nights));
    const { ref, total, currency } = chatBooking({ propertyId: propId, from, to, guests });
    setMsgs((m) => [...m, { from: "guest", text: `Book ${propertyById(propId).name}, ${fmtDate(from)} → ${fmtDate(to)}` }]);
    bot(`Done. I've held ${propertyById(propId).name} for you. Total ${money(total, currency)} (30% deposit due now). Opening the secure payment page…`, 500);
    setTimeout(() => onBooked(ref), 1600);
  };

  return (
    <div className="overflow-hidden rounded-lg shadow-2xl" style={{ background: st.bg, border: `${st.borderW}px solid ${st.borderColor}`, borderRadius: st.radius, width: 320, fontFamily: st.fontFamily || `'${brand.bodyFamily}', sans-serif` }}>
      <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ background: brand.ink }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: st.accent, color: "#fff" }}>SV</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold text-white">Sanggraha concierge</p>
          <p className="flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: "#8FE3BF" }}><span className="h-1.5 w-1.5 rounded-full bg-[#4CC38A] blink" /> online · answers in seconds</p>
        </div>
        <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/40">powered by DERZEN</span>
      </div>

      <div ref={scrollRef} className="h-[240px] space-y-2 overflow-y-auto px-3 py-3" style={{ fontSize: st.fontSize, color: st.text }}>
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.from === "guest" && "justify-end")}>
            <p className={cx("max-w-[85%] px-2.5 py-1.5 text-[11.5px] leading-snug", m.from === "guest" ? "rounded-lg rounded-br-sm text-white" : "rounded-lg rounded-bl-sm border")}
              style={m.from === "guest" ? { background: st.accent } : { background: st.card, borderColor: st.borderColor }}>
              {m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className="flex"><span className="flex items-center gap-1 rounded-lg rounded-bl-sm border px-2.5 py-2" style={{ background: st.card, borderColor: st.borderColor }}>
            {[0, 1, 2].map((d) => <span key={d} className="h-1 w-1 rounded-full bg-current opacity-50 blink" style={{ animationDelay: `${d * 0.18}s` }} />)}
          </span></div>
        )}

        {pickerOpen && (
          <div className="anim-pop space-y-2 rounded-lg border p-2.5" style={{ background: st.card, borderColor: st.borderColor }}>
            <select value={propId} onChange={(e) => setPropId(e.target.value)} aria-label="Choose villa" className="h-7 w-full rounded-sm border px-1.5 text-[11px] font-semibold outline-none" style={{ borderColor: st.borderColor, background: st.bg, color: st.text }}>
              {PROPERTIES.filter((p) => !p.archived && !p.isParent).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.city}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-1.5">
              <label className="block"><span className="mb-0.5 block text-[8.5px] font-bold uppercase tracking-wide opacity-60">Check-in</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-7 w-full rounded-sm border px-1 text-[10px] outline-none" style={{ borderColor: st.borderColor, background: st.bg, color: st.text }} /></label>
              <label className="block"><span className="mb-0.5 block text-[8.5px] font-bold uppercase tracking-wide opacity-60">Nights</span>
                <select value={nights} onChange={(e) => setNights(Number(e.target.value))} className="h-7 w-full rounded-sm border px-1 text-[10px]" style={{ borderColor: st.borderColor, background: st.bg, color: st.text }}>{range(14).map((n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}</select></label>
              <label className="block"><span className="mb-0.5 block text-[8.5px] font-bold uppercase tracking-wide opacity-60">Guests</span>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="h-7 w-full rounded-sm border px-1 text-[10px]" style={{ borderColor: st.borderColor, background: st.bg, color: st.text }}>{range(12).map((n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}</select></label>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[10px] font-bold opacity-70">≈ {moneyRaw(estimate(), propertyById(propId).currency, { compact: true })} <span className="font-normal opacity-70">+ fees</span></p>
              <button onClick={book} className="rounded-sm px-3 py-1.5 text-[10.5px] font-bold text-white transition-transform hover:scale-[1.03]" style={{ background: st.accent, borderRadius: st.btnRadius }}>Book now →</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5" style={{ borderColor: st.borderColor, background: st.bg }}>
        {[
          ["Check availability", () => { setMsgs((m) => [...m, { from: "guest", text: "I'd like to check availability" }]); bot("Of course. Pick your villa and dates below.", 450); setPickerOpen(true); }],
          ["Pool heated?", () => ask("Is the pool heated?", "Pools sit around 29°, and Bali rarely needs more. Want me to check dates for you?")],
          ["Airport transfer?", () => ask("Do you do airport transfers?", "Yes. Share your flight number after booking and a driver meets you at DPS arrivals.")],
        ].map(([label, fn]) => (
          <button key={String(label)} onClick={fn as () => void} className="rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors hover:opacity-80" style={{ borderColor: st.borderColor, color: st.text, background: st.card }}>{String(label)}</button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t px-2.5 py-2" style={{ borderColor: st.borderColor, background: st.bg }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendFree()}
          placeholder="Ask anything…"
          className="h-8 w-full min-w-0 rounded-sm border bg-transparent px-2.5 text-[11px] outline-none focus:border-current"
          style={{ borderColor: st.borderColor, color: st.text }}
          aria-label="Message the concierge"
        />
        <button
          onClick={sendFree}
          disabled={typing || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-opacity disabled:opacity-40"
          style={{ background: st.accent, color: "#fff" }}
          aria-label="Send message"
        >
          {typing ? <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white anim-spin" /> : <Ic name="send" size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── Hosted payment page (public, guest-facing) ────────────────────────────
export function PaymentPage({ refCode }: { refCode: string }) {
  const { reservations, completeChatPayment, setResStatus, brand, navigate } = useApp();
  const res = reservations.find((r) => r.ref === refCode);
  const [method, setMethod] = useState<"card" | "va" | "transfer">("card");
  const [state, setState] = useState<"form" | "processing" | "done">("form");
  const p = res ? propertyById(res.propertyId) : null;
  const deposit = res ? Math.round(res.total * 0.3) : 0;

  if (!res || !p) {
    return (
      <Shell0>
        <div className="mx-auto max-w-[420px] rounded-lg border border-line bg-card p-8 text-center anim-pop">
          <Ic name="alertTri" size={26} className="mx-auto text-gold" />
          <h1 className="mt-3 font-display text-[20px] font-bold text-ink">Reservation not found</h1>
          <p className="mt-1.5 text-[12.5px] text-mute">The payment link <code className="font-mono">{refCode}</code> doesn't match an open booking. It may have expired or already been paid.</p>
          <p className="mt-3 font-mono text-[10px] text-faint">If you just booked, wait a few seconds and refresh. Links activate once the hold is confirmed.</p>
        </div>
      </Shell0>
    );
  }

  const pay = () => {
    setState("processing");
    setTimeout(() => {
      completeChatPayment(res.ref, method === "card" ? "Card (gateway)" : method === "va" ? "Xendit Virtual Account" : "Bank transfer");
      setResStatus(res.id, "deposit_paid");
      setState("done");
    }, 1400);
  };

  return (
    <Shell0>
      <div className="mx-auto grid w-full max-w-[760px] gap-4 lg:grid-cols-[1fr_300px]">
        <div className="rounded-lg border border-line bg-card p-6 anim-rise">
          {state === "done" ? (
            <div className="py-6 text-center anim-pop">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft"><Ic name="checkCircle" size={30} className="text-brand" /></span>
              <h1 className="mt-4 font-display text-[24px] font-bold text-ink">Payment received</h1>
              <p className="mx-auto mt-1.5 max-w-[40ch] text-[13px] leading-relaxed text-mute">
                Your deposit for <b className="text-ink">{p.name}</b> is confirmed. A receipt and your guidebook link are on the way to your inbox, and the villa is now blocked for you across every channel.
              </p>
              <p className="mt-4 inline-block rounded-sm bg-paper px-3 py-1.5 font-mono text-[12px] font-bold text-brand-deep">{res.ref} · deposit {money(deposit, res.currency)}</p>
              <div className="mt-5"><Btn onClick={() => navigate("/reservations")}>View in workspace (demo)</Btn></div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm text-[13px] font-bold text-white" style={{ background: brand.primary }}>SV</span>
                <div>
                  <h1 className="font-display text-[18px] font-bold text-ink">Secure checkout</h1>
                  <p className="text-[11px] text-mute">Sanggraha Villas · hosted by DERZEN Payments · PCI-DSS via gateway</p>
                </div>
                <span className="ml-auto flex items-center gap-1 font-mono text-[10px] font-bold text-brand-deep"><Ic name="lock" size={11} /> TLS 1.3</span>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-mute">Pay with</p>
                <div className="space-y-1.5">
                  {([
                    ["card", "Card", "Visa · Mastercard · Amex, processed by the connected gateway; card data never touches this site"],
                    ["va", "Virtual account", "Xendit VA · BCA, Mandiri, BNI, BRI, expires in 24h"],
                    ["transfer", "Bank transfer", "Manual instructions, confirmed within one business day"],
                  ] as const).map(([id, label, sub]) => (
                    <label key={id} className={cx("flex cursor-pointer items-start gap-2.5 rounded-sm border px-3 py-2.5 transition-colors", method === id ? "border-brand bg-brand-soft/50" : "border-line hover:border-line2")}>
                      <input type="radio" name="pm" checked={method === id} onChange={() => setMethod(id)} className="mt-1" />
                      <span><span className="block text-[12.5px] font-bold text-ink">{label}</span><span className="block text-[10.5px] text-mute">{sub}</span></span>
                    </label>
                  ))}
                </div>
              </div>

              {method === "card" && (
                <div className="mt-3 grid grid-cols-2 gap-2.5 anim-rise">
                  <label className="col-span-2 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-mute">Card number (hosted field)</span>
                    <input placeholder="4242 4242 4242 4242" className="h-9 w-full rounded-sm border border-line bg-paper px-2.5 font-mono text-[12.5px] outline-none focus:border-brand" /></label>
                  <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-mute">Expiry</span>
                    <input placeholder="12 / 28" className="h-9 w-full rounded-sm border border-line bg-paper px-2.5 font-mono text-[12.5px] outline-none focus:border-brand" /></label>
                  <label className="block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-mute">CVC</span>
                    <input placeholder="123" className="h-9 w-full rounded-sm border border-line bg-paper px-2.5 font-mono text-[12.5px] outline-none focus:border-brand" /></label>
                  <p className="col-span-2 rounded-sm bg-paper px-2.5 py-1.5 text-[10px] leading-snug text-faint"><Ic name="shield" size={10} className="mr-1 inline" /> This field is tokenised by the gateway. The merchant and DERZEN only ever see a token, never the number.</p>
                </div>
              )}
              {method === "va" && (
                <div className="mt-3 rounded-sm border border-line bg-paper px-3 py-2.5 font-mono text-[11.5px] anim-rise">
                  <p className="font-bold text-ink">8890 1234 5678 9012</p>
                  <p className="mt-0.5 text-[10px] text-mute">a.n. PT DERZEN PAYMENTS · amount auto-matches your deposit · expires in 24:00:00</p>
                </div>
              )}
              {method === "transfer" && (
                <div className="mt-3 rounded-sm border border-line bg-paper px-3 py-2.5 text-[11px] leading-relaxed anim-rise">
                  <p className="font-bold text-ink">BCA 0881 2345 67 · PT Sanggraha Hospitality</p>
                  <p className="mt-0.5 text-mute">Reference: <b className="font-mono">{res.ref}</b>. Send the confirmation screenshot to stay@sanggraha.co and we'll verify manually.</p>
                </div>
              )}

              <button onClick={pay} disabled={state === "processing"} className={cx("btn-grad mt-5 flex w-full items-center justify-center gap-2 rounded-sm py-3 text-[13.5px] font-bold text-white", state === "processing" && "opacity-70")}>
                {state === "processing" ? <><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white anim-spin" /> Processing with gateway…</> : <>Pay deposit · {money(deposit, res.currency)} <Ic name="lock" size={13} /></>}
              </button>
              <p className="mt-2.5 text-center font-mono text-[9.5px] text-faint">3-D Secure / SCA where required · refunds follow the cancellation policy shown at booking</p>
            </>
          )}
        </div>

        <aside className="h-fit rounded-lg border border-line bg-card p-5 anim-rise" style={{ animationDelay: "0.08s" }}>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-mute">Order summary</p>
          <p className="mt-1.5 text-[14px] font-bold text-ink">{p.name}</p>
          <p className="text-[11px] text-mute">{fmtDate(res.checkIn)} → {fmtDate(res.checkOut)} · {res.adults} guest{res.adults > 1 ? "s" : ""}</p>
          <div className="mt-3 space-y-1 border-t border-line pt-3 text-[11.5px]">
            {res.items.map((it, i) => (
              <p key={i} className="flex justify-between"><span className="text-mute">{it.label}</span><span className="font-mono font-semibold text-ink">{moneyRaw(it.amount, res.currency)}</span></p>
            ))}
            <p className="flex justify-between border-t border-line pt-1.5 text-[12.5px] font-bold"><span>Total</span><span className="font-mono text-ink">{moneyRaw(res.total, res.currency)}</span></p>
            <p className="flex justify-between text-brand-deep"><span>Due now (30%)</span><span className="font-mono font-bold">{money(deposit, res.currency)}</span></p>
            <p className="flex justify-between text-mute"><span>Balance at check-in</span><span className="font-mono">{money(res.total - deposit, res.currency)}</span></p>
          </div>
          <p className="mt-3 rounded-sm bg-paper px-2.5 py-2 text-[9.5px] leading-relaxed text-faint">Booked via the embedded concierge · reservation {res.ref} is held for 30 minutes while you pay.</p>
        </aside>
      </div>
    </Shell0>
  );
}

function Shell0({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <p className="mb-5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-faint">DERZEN hosted checkout</p>
      {children}
    </div>
  );
}
