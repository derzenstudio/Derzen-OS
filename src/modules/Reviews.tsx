import { useMemo, useState } from "react";
import { cx, pct, timeAgo, hoursLeft, fmtShort } from "../lib/format";
import { Ic } from "../components/icons";
import { Badge, Btn, Dot, Empty, Hist, Select, Textarea } from "../components/ui";
import { useApp } from "../store";
import { propertyById } from "../lib/data";

const PLATFORMS = ["airbnb", "booking", "trip", "google", "direct"] as const;
const P_COLOR: Record<string, string> = { airbnb: "#E8485F", booking: "#2557D6", trip: "#3E9BFF", google: "#9A6A0B", direct: "#0E6B4E" };

export default function Reviews() {
  const { route, reviews, replyReview, useAiDraft, toast } = useApp();
  const [filter, setFilter] = useState(route.query.get("filter") ?? "all");
  const [platform, setPlatform] = useState("all");
  const [minRating, setMinRating] = useState("all");
  const [sort, setSort] = useState("newest");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const list = useMemo(() => {
    let out = [...reviews];
    if (filter === "new") out = out.filter((r) => Date.now() - r.date < 7 * 86_400_000);
    if (filter === "needs-response") out = out.filter((r) => !r.reply && (!r.replyDeadline || r.replyDeadline > Date.now()));
    if (filter === "channels") out = out.filter((r) => r.platform !== "direct");
    if (filter === "direct") out = out.filter((r) => r.platform === "direct");
    if (platform !== "all") out = out.filter((r) => r.platform === platform);
    if (minRating !== "all") out = out.filter((r) => r.normalized >= Number(minRating));
    out.sort((a, b) =>
      sort === "newest" ? b.date - a.date : sort === "oldest" ? a.date - b.date : sort === "highest" ? b.normalized - a.normalized : a.normalized - b.normalized,
    );
    return out;
  }, [reviews, filter, platform, minRating, sort]);

  const responded = reviews.filter((r) => r.reply).length;
  const dist = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => reviews.filter((r) => Math.round(r.normalized) === n).length);
  const new7 = reviews.filter((r) => Date.now() - r.date < 7 * 86_400_000).length;
  const new30 = reviews.filter((r) => Date.now() - r.date < 30 * 86_400_000).length;
  const avg = reviews.reduce((s, r) => s + r.normalized, 0) / Math.max(1, reviews.length);

  return (
    <div className="space-y-4">
      {/* Analytics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Total reviews · avg</p>
          <p className="mt-1 font-display text-[26px] font-bold text-ink">{reviews.length} <span className="text-[15px] text-gold">★ {avg.toFixed(1)}/10</span></p>
          <p className="mt-1 flex gap-3 text-[11px] font-bold"><span className="text-brand-deep">+{new7} in 7d</span><span className="text-mute">+{new30} in 30d</span></p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute">Response rate</p>
          <p className="mt-1 font-display text-[26px] font-bold text-ink">{pct(responded / reviews.length)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: pct(responded / reviews.length) }} /></div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Rating distribution (normalised /10)</p>
          <Hist data={dist} labels={dist.map((_, i) => String(i + 1))} h={92} color="#0E6B4E" />
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-mute">Per-platform</p>
          {PLATFORMS.map((p) => {
            const rs = reviews.filter((r) => r.platform === p);
            if (!rs.length) return null;
            const a = rs.reduce((s, r) => s + r.normalized, 0) / rs.length;
            return (
              <div key={p} className="mb-1.5 flex items-center gap-2">
                <span className="w-[74px] text-[11px] font-bold capitalize" style={{ color: P_COLOR[p] }}>{p}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${(rs.length / reviews.length) * 100}%`, background: P_COLOR[p] }} /></div>
                <span className="font-mono text-[10.5px] font-bold text-ink">{a.toFixed(1)} · {rs.length}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {[["all", "All"], ["channels", "Channels"], ["direct", "Direct"], ["new", "New · 7d"], ["needs-response", "Needs response"]].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={cx("rounded-md px-2.5 py-1.5 text-[11.5px] font-bold", filter === id ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}>{label}</button>
          ))}
        </div>
        <Select value={platform} onChange={(e) => setPlatform(e.target.value)} className="!w-[130px]" aria-label="Platform filter">
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={minRating} onChange={(e) => setMinRating(e.target.value)} className="!w-[120px]" aria-label="Minimum rating">
          <option value="all">Any rating</option><option value="8">8.0+</option><option value="9">9.0+</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-[120px]" aria-label="Sort order">
          <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest</option><option value="lowest">Lowest</option>
        </Select>
      </div>

      {/* Review cards */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {list.length === 0 && <div className="xl:col-span-2"><Empty icon="star" title="No reviews match" body="Adjust filters to see more." /></div>}
        {list.map((r) => {
          const p = propertyById(r.propertyId);
          const deadlineH = r.replyDeadline ? hoursLeft(r.replyDeadline) : null;
          return (
            <article key={r.id} className={cx("rounded-xl border bg-card p-4 transition-shadow hover:shadow-md", !r.reply && deadlineH !== null && deadlineH < 24 ? "border-danger/40" : "border-line")}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: P_COLOR[r.platform] ?? "#61705F" }}>{r.platform === "booking" ? "BDC" : r.platform.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink">
                    {r.guestName} <span className="font-semibold text-mute">· {p.name}</span>
                    <Badge tone="mute">{r.platform} · native {r.nativeRating}/{r.nativeScale}</Badge>
                  </p>
                  <p className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[13px] font-bold text-gold" aria-label={`Rating ${r.normalized} out of 10`}>{"★".repeat(Math.max(1, Math.round(r.normalized / 2)))}<span className="text-line2">{"★".repeat(5 - Math.max(1, Math.round(r.normalized / 2)))}</span></span>
                    <span className="font-mono text-[11px] font-bold text-ink">{r.normalized.toFixed(1)}/10</span>
                    <span className="text-[10.5px] text-faint">{timeAgo(r.date)}</span>
                    {deadlineH !== null && !r.reply && (
                      <span className={cx("flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold", deadlineH < 24 ? "bg-danger-soft text-danger" : "bg-gold-soft text-[#8a5c07]")}>
                        <Ic name="clock" size={9} /> reply window: {deadlineH > 0 ? `${deadlineH}h left` : "expired"}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink/85">{r.body}</p>
                  {r.reply ? (
                    <div className="mt-2.5 rounded-lg border border-brand/30 bg-brand-soft/50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-deep">Your reply · {r.repliedAt ? timeAgo(r.repliedAt) : ""}</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink">{r.reply}</p>
                    </div>
                  ) : (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {r.aiDraft && (
                        <Btn size="xs" icon="sparkle" onClick={() => { setReplyFor(r.id); setDraft(r.aiDraft!); }}>Use AI draft</Btn>
                      )}
                      <Btn size="xs" variant="solid" icon="chat" onClick={() => { setReplyFor(replyFor === r.id ? null : r.id); setDraft(r.aiDraft ?? ""); }}>{replyFor === r.id ? "Close" : "Reply"}</Btn>
                      {r.aiDraft && <span className="self-center text-[10px] font-semibold text-plum">AI draft ready · tone-checked, needs your approval</span>}
                    </div>
                  )}
                  {replyFor === r.id && !r.reply && (
                    <div className="anim-rise mt-2.5">
                      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="!min-h-[88px]" />
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-faint">Pushes back to {r.platform === "direct" ? "your records" : `${r.platform} where the API allows`}</span>
                        <Btn size="xs" variant="solid" icon="send" onClick={() => { replyReview(r.id, draft); setReplyFor(null); }}>Publish reply</Btn>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {list.length > 0 && (
        <p className="text-[11px] text-mute">Native scales preserved (Airbnb /5, Booking /10) · normalised to /10 for cross-channel analytics · deadlines follow each platform's public-reply window. {fmtShort(new Date())} aggregate exported nightly to reports.</p>
      )}
    </div>
  );
}
