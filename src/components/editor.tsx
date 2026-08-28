import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { Ic, type IconName } from "./icons";
import { useApp } from "../store";
import { PROPERTIES, propertyById } from "../lib/data";
import { compressImage } from "../lib/photoStore";

// ── Inline editable text — true Canva behaviour ────────────────────────────
// Always contentEditable. The initial HTML is frozen at mount so React never
// re-writes the text node (which would reset the caret on every keystroke).
// Typing commits live via onInput; external updates sync only when unfocused.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
/**
 * Sanitiser for inline editor content. Allows only typographic tags and strips
 * every attribute except a safe `color`/`style:color` pair — so pasted or typed
 * markup (e.g. <img onerror>, <script>, javascript: hrefs) can never execute on
 * the canvas OR on the guest-facing published site.
 */
const ALLOWED = /<\/?(b|i|u|em|strong|br|font|span|div|p)\b[^>]*>/gi;
export const sanitizeHtml = (s: string) =>
  s.replace(/<[^>]*>/g, (tag) => {
    const m = tag.match(/^<\/?\s*([a-z0-9]+)/i);
    const name = m?.[1]?.toLowerCase() ?? "";
    if (!["b", "i", "u", "em", "strong", "br", "font", "span", "div", "p"].includes(name)) return "";
    const closing = tag.startsWith("</");
    const color = tag.match(/(?:color\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}|[a-z]+))/i)?.[1];
    if (closing) return `</${name}>`;
    if (name === "br") return "<br/>";
    return color ? `<${name} style="color:${color}">` : `<${name}>`;
  });
void ALLOWED;
/** Content strings may hold light formatting HTML — sanitised, never rendered raw. */
export const toHtml = (s: string) => (/<[a-z!/]/i.test(s) ? sanitizeHtml(s) : esc(s));
/** Read a contentEditable node as storable HTML; empty normalises to "". */
const readHtml = (el: HTMLElement | null) => {
  if (!el) return "";
  const html = el.innerHTML.replace(/&nbsp;/g, " ");
  const plain = el.innerText.replace(/\u00a0/g, " ").trim();
  return plain === "" ? "" : html;
};

export function EditableText({
  value, onCommit, className, style, multiline, placeholder, as: Tag = "span", disabled,
}: {
  value: string;
  onCommit: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  placeholder?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  disabled?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const focused = useRef(false);
  const [focus, setFocus] = useState(false);
  const [barPos, setBarPos] = useState<{ x: number; y: number } | null>(null);
  const initial = useRef(toHtml(value)).current; // frozen — keeps the DOM stable

  // sync external changes (reset, undo) only while not typing
  useEffect(() => {
    if (!focused.current && ref.current && toHtml(value) !== ref.current.innerHTML) {
      ref.current.innerHTML = toHtml(value);
    }
  }, [value]);

  const placeBar = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setBarPos({ x: Math.max(8, Math.min(r.left + r.width / 2 - 132, window.innerWidth - 272)), y: Math.max(8, r.top - 44) });
  };

  if (disabled) return <Tag className={className} style={style}>{value || placeholder}</Tag>;

  return (
    <>
      <Tag
        ref={ref as never}
        contentEditable
        suppressContentEditableWarning
        draggable={false}
        dangerouslySetInnerHTML={{ __html: initial }}
        data-ph={placeholder}
        className={cx(
          className,
          "et-edit outline-none",
          focus ? "cursor-text rounded-sm ring-2 ring-brand/70" : "cursor-text transition-shadow hover:ring-1 hover:ring-line2",
        )}
        style={{ ...style, minWidth: "1ch" }}
        onFocus={() => { focused.current = true; setFocus(true); placeBar(); }}
        onBlur={() => {
          focused.current = false; setFocus(false); setBarPos(null);
          const next = readHtml(ref.current);
          if (next !== value && !(next === "" && toHtml(value) === "")) onCommit(next);
          if (ref.current && next === "") ref.current.innerHTML = ""; // keep :empty placeholder working
        }}
        onInput={() => {
          const next = readHtml(ref.current);
          if (next !== value) onCommit(next); // live — the store updates as you type, formatting included
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !multiline) { e.preventDefault(); (e.target as HTMLElement).blur(); }
          if (e.key === "Escape") (e.target as HTMLElement).blur();
        }}
        onClick={(e) => { e.stopPropagation(); placeBar(); }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={placeholder ?? "editable text"}
      />
      {focus && barPos && <TextBar pos={barPos} multiline={!!multiline} />}
    </>
  );
}

// Floating format bar (Canva-style) while a text element has focus.
// Formatting is done with the Range API — no deprecated execCommand anywhere.
function TextBar({ pos, multiline }: { pos: { x: number; y: number }; multiline: boolean }) {
  const [tick, setTick] = useState(0);
  void tick; void multiline;

  const commit = () => {
    (document.activeElement as HTMLElement | null)?.dispatchEvent(new Event("input", { bubbles: true }));
    setTick((t) => t + 1);
  };
  const selEl = () => {
    const sel = window.getSelection();
    const n = sel?.anchorNode;
    return n instanceof Element ? n : (n?.parentElement ?? null);
  };
  const host = () => selEl()?.closest("[contenteditable]") as HTMLElement | null;

  const wrap = (tag: "b" | "i" | "u") => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const existing = selEl()?.closest(tag);
    if (existing && existing.contains(range.commonAncestorContainer)) {
      const parent = existing.parentNode;
      if (parent) { while (existing.firstChild) parent.insertBefore(existing.firstChild, existing); parent.removeChild(existing); commit(); return; }
    }
    try {
      const frag = range.extractContents();
      const el = document.createElement(tag);
      el.appendChild(frag);
      range.insertNode(el);
      sel.removeAllRanges();
      const r2 = document.createRange();
      r2.selectNodeContents(el);
      sel.addRange(r2);
    } catch { /* selection crossing block boundaries — leave as typed */ }
    commit();
  };
  const setColor = (c: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    try {
      const range = sel.getRangeAt(0);
      const frag = range.extractContents();
      const el = document.createElement("font");
      el.setAttribute("color", c); // the only attribute the sanitizer allows through
      el.appendChild(frag);
      range.insertNode(el);
    } catch { /* ignore */ }
    commit();
  };
  const setSize = (dir: 1 | -1) => {
    const h = host();
    if (!h) return;
    const cur = parseFloat(h.style.fontSize) || 1; // em, relative to the block's base
    h.style.fontSize = `${Math.min(1.7, Math.max(0.7, +(cur + dir * 0.15).toFixed(2)))}em`;
    commit();
  };
  const align = (v: "left" | "center" | "right") => {
    const h = host();
    if (!h) return;
    h.style.textAlign = v;
    commit();
  };
  const activeTag = (tag: string) => !!selEl()?.closest(tag);
  const alignActive = (v: string) => (host()?.style.textAlign || "left") === v;

  return (
    <div
      className="anim-pop fixed z-[95] flex items-center gap-0.5 rounded-md border border-line bg-card px-1 py-0.5 shadow-xl"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection
    >
      <ToolBtn icon="bold" label="Bold" active={activeTag("b")} onClick={() => wrap("b")} />
      <ToolBtn icon="italic" label="Italic" active={activeTag("i")} onClick={() => wrap("i")} />
      <ToolBtn icon="underline" label="Underline" active={activeTag("u")} onClick={() => wrap("u")} />
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button onClick={() => setSize(-1)} aria-label="Smaller text" title="Smaller" className="rounded-sm px-1 font-mono text-[10px] font-bold text-mute hover:bg-paper">A−</button>
      <button onClick={() => setSize(1)} aria-label="Larger text" title="Larger" className="rounded-sm px-1 font-mono text-[12px] font-bold text-mute hover:bg-paper">A+</button>
      <span className="mx-0.5 h-4 w-px bg-line" />
      {["#141811", "#0e6b4e", "#9a6a0b", "#b42318", "#ffffff"].map((c) => (
        <button key={c} onClick={() => setColor(c)} aria-label={`Text colour ${c}`} title="Text colour" className="h-4 w-4 rounded-full border border-line2" style={{ background: c }} />
      ))}
      <span className="mx-0.5 h-4 w-px bg-line" />
      <ToolBtn icon="alignL" label="Align left" active={alignActive("left")} onClick={() => align("left")} />
      <ToolBtn icon="alignC" label="Align centre" active={alignActive("center")} onClick={() => align("center")} />
      <ToolBtn icon="alignR" label="Align right" active={alignActive("right")} onClick={() => align("right")} />
    </div>
  );
}

// ── Inline editable image (Canva-style: click → swap) ──────────────────────
// The picker renders through a PORTAL at document level, so it is never
// clipped by overflow-hidden blocks (galleries, heroes). Uploads are real:
// the file is read, compressed client-side, saved to the asset library and
// committed — not a stock-photo placeholder.
export function EditableImage({
  src, onCommit, className, style, alt = "", fit = "cover",
}: {
  src: string; onCommit: (v: string) => void; className?: string; style?: React.CSSProperties; alt?: string; fit?: "cover" | "contain";
}) {
  const { savedAssets, propertyPhotos, addSavedAsset, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const effective = src || PROPERTIES[0].image;
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (v: string) => { onCommit(v); setOpen(false); toast("ok", "Image replaced", "Saved to this block — publish to push it live."); };
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = boxRef.current?.getBoundingClientRect();
    if (r) {
      const below = r.bottom + 230 < window.innerHeight;
      setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 300)), y: below ? r.bottom + 6 : Math.max(8, r.top - 236) });
    }
    setOpen(true);
  };
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const { url: dataUrl } = await compressImage(f);
      addSavedAsset({ name: f.name.replace(/\.[a-z]+$/i, ""), url: dataUrl, kind: "image" });
      pick(dataUrl);
    } catch {
      toast("err", "Couldn't read that file", "Try a JPG, PNG or WebP.");
    } finally {
      setBusy(false);
    }
  };

  const library = [
    ...savedAssets.filter((a) => a.kind === "image").map((a) => ({ id: a.id, name: a.name, url: a.url })),
    ...Object.entries(propertyPhotos).flatMap(([pid, photos]) => photos.slice(0, 4).map((ph) => ({ id: `${pid}-${ph.id}`, name: `${propertyById(pid)?.name ?? "Property"} · ${ph.label}`, url: ph.url }))),
    ...PROPERTIES.map((p) => ({ id: p.id, name: p.name, url: p.image })),
  ].filter((a, i, arr) => arr.findIndex((x) => x.url === a.url) === i).slice(0, 16);

  return (
    <div ref={boxRef} className={cx("group/img relative overflow-hidden", className)} style={style}>
      <img src={effective} alt={alt} className="h-full w-full" style={{ objectFit: fit }} onError={(e) => ((e.target as HTMLImageElement).src = PROPERTIES[0].image)} />
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="absolute inset-0 flex items-center justify-center gap-1.5 bg-pine-950/0 text-[11px] font-bold text-white opacity-0 transition-all hover:bg-pine-950/45 hover:opacity-100 focus-visible:opacity-100"
        aria-label="Replace image"
      >
        <Ic name="image" size={14} /> Replace
      </button>
      {/* always-visible affordance — works without hover (touch, keyboards) */}
      <button
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-sm bg-pine-950/70 text-white opacity-80 transition-opacity hover:opacity-100"
        aria-label="Change image"
        title="Change image"
      >
        <Ic name="image" size={12} />
      </button>
      {open && createPortal(
        <div className="anim-pop fixed z-[96] w-[290px] rounded-md border border-line bg-card p-2.5 shadow-2xl" style={{ left: pos.x, top: pos.y }} onClick={(e) => e.stopPropagation()}>
          <p className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-mute">
            Image library <button onClick={() => setOpen(false)} aria-label="Close image picker" className="text-faint hover:text-ink"><Ic name="x" size={11} /></button>
          </p>
          <div className="mb-2 grid max-h-[140px] grid-cols-4 gap-1 overflow-y-auto">
            {library.map((a) => (
              <button key={a.id} onClick={() => pick(a.url)} className="h-12 overflow-hidden rounded-sm border border-line transition-transform hover:scale-105" title={a.name} aria-label={`Use ${a.name}`}>
                <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or paste" className="h-7 min-w-0 flex-1 rounded-sm border border-line bg-paper px-2 text-[10.5px] outline-none focus:border-brand" />
            <button onClick={() => url.trim() && pick(url.trim())} className="rounded-sm bg-brand px-2 text-[10px] font-bold text-white">Use</button>
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1 rounded-sm border border-line px-2 text-[10px] font-bold text-mute hover:border-brand hover:text-brand-deep" aria-label="Upload image">
              {busy ? <span className="h-2.5 w-2.5 anim-spin rounded-full border border-line2 border-t-brand" /> : <Ic name="download" size={11} />} Upload
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
          </div>
          <p className="mt-1.5 text-[9px] leading-snug text-faint">Uploads are compressed in your browser and saved to the asset library, so every block can reuse them.</p>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Floating toolbar (appears above a selected block) ─────────────────────
export function FloatingToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("anim-pop pointer-events-auto absolute -top-3 right-2 z-40 flex items-center gap-0.5 rounded-md border border-line bg-card px-1 py-0.5 shadow-lg", className)}>
      {children}
    </div>
  );
}
export function ToolBtn({ icon, label, onClick, danger, active }: { icon: IconName; label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={cx(
        "flex h-6 w-6 items-center justify-center rounded-sm transition-colors",
        danger ? "text-mute hover:bg-danger-soft hover:text-danger" : active ? "bg-brand-soft text-brand-deep" : "text-mute hover:bg-paper hover:text-ink",
      )}
    >
      <Ic name={icon} size={13} />
    </button>
  );
}

// ── A popover panel anchored to the right of the canvas (content + style) ──
export function InspectorPanel({ title, icon, onClose, children, footer }: { title: string; icon: IconName; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="anim-slide-l sticky top-16 z-30 flex max-h-[calc(100dvh-140px)] flex-col overflow-hidden rounded-md border border-brand/40 bg-card shadow-2xl">
      <div className="flex items-center gap-2 border-b border-line bg-brand-soft/50 px-3 py-2">
        <Ic name={icon} size={14} className="text-brand-deep" />
        <p className="flex-1 truncate text-[11.5px] font-bold uppercase tracking-wider text-brand-deep">{title}</p>
        <button onClick={onClose} aria-label="Close inspector" className="rounded-sm p-0.5 text-mute hover:text-ink"><Ic name="x" size={13} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
      {footer && <div className="border-t border-line bg-paper/60 px-3 py-2">{footer}</div>}
    </div>
  );
}

// ── Small labelled field wrappers for the inspector ───────────────────────
export function Ifield({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-wider text-faint">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[9px] text-faint">{hint}</span>}
    </label>
  );
}
export function TextInput({ value, onChange, multiline, placeholder }: { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) {
  return multiline ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full rounded-sm border border-line bg-paper px-2 py-1.5 text-[11px] outline-none focus:border-brand" />
  ) : (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-7 w-full rounded-sm border border-line bg-paper px-2 text-[11px] outline-none focus:border-brand" />
  );
}
export function SegBtns<T extends string>({ options, value, onChange }: { options: { v: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-sm border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cx("flex-1 rounded-sm px-1 py-1 text-[10px] font-bold capitalize transition-colors", value === o.v ? "bg-ink text-white" : "text-mute hover:text-ink")}>{o.l}</button>
      ))}
    </div>
  );
}

// helper to read a property safely
export { propertyById };
