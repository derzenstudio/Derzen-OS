import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/format";
import { Ic, ICON_NAMES, type IconName } from "./icons";
import { useApp } from "../store";
import { PROPERTIES, propertyById } from "../lib/data";
import { compressImage } from "../lib/photoStore";
import { useDraggable } from "./controls";

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
const ALLOWED_TAGS = new Set(["B", "I", "U", "EM", "STRONG", "BR", "FONT", "SPAN", "DIV", "P"]);
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\(\s*[\d.,\s%]+\))$/i;

/**
 * Parse, walk, rebuild. The previous version matched tags with a regex, which
 * meant an unterminated or malformed tag could pass through untouched into
 * dangerouslySetInnerHTML. Parsing into an inert document instead means the
 * browser normalises the markup first and we only ever re-emit nodes we built
 * ourselves, so there is no bypass to find.
 *
 * Allowed: typographic tags, plus a colour on span/font. Everything else,
 * including all other attributes, event handlers and URLs, is dropped.
 */
export const sanitizeHtml = (s: string): string => {
  if (typeof document === "undefined") return s.replace(/<[^>]*>/g, "");
  const doc = new DOMParser().parseFromString(`<body>${s}</body>`, "text/html");

  const clean = (src: Node, dst: Node): void => {
    src.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        dst.appendChild(document.createTextNode(node.nodeValue ?? ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return; // comments, CDATA, PI
      const el = node as Element;
      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Keep the words, drop the element. <script>/<style> contribute nothing.
        if (el.tagName !== "SCRIPT" && el.tagName !== "STYLE") clean(el, dst);
        return;
      }
      const out = document.createElement(el.tagName.toLowerCase());
      const colour =
        (el as HTMLElement).style?.color ||
        (el.tagName === "FONT" ? el.getAttribute("color") ?? "" : "");
      if (colour && SAFE_COLOR.test(colour.trim())) out.style.color = colour.trim();
      clean(el, out);
      dst.appendChild(out);
    });
  };

  const out = doc.createElement("div");
  clean(doc.body, out);
  return out.innerHTML;
};
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
    // The WHOLE image is the click target — a single, unmissable hit area.
    // The photo and the affordance layers are pointer-events-none visuals, so
    // nothing stacked above or below can intercept or double-fire the click.
    <div
      ref={boxRef}
      role="button"
      tabIndex={0}
      aria-label="Change image"
      title="Click to change image"
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggle(); } }}
      className={cx("group/img relative cursor-pointer overflow-hidden", className)}
      style={style}
    >
      <img src={effective} alt={alt} className="pointer-events-none h-full w-full select-none" style={{ objectFit: fit }} draggable={false} onError={(e) => ((e.target as HTMLImageElement).src = PROPERTIES[0].image)} />
      {/* hover scrim — visual only */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 bg-pine-950/0 text-[11px] font-bold text-white opacity-0 transition-all group-hover/img:bg-pine-950/45 group-hover/img:opacity-100">
        <Ic name="image" size={14} /> Replace
      </span>
      {/* always-visible corner affordance — visual only */}
      <span className="pointer-events-none absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-sm bg-pine-950/70 text-white opacity-90">
        <Ic name="image" size={12} />
      </span>
      {open && createPortal(
        // click-away backdrop sits under the picker; it closes the library
        <div className="fixed inset-0 z-[95]" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-hidden="true" />,
        document.body,
      )}
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

// ── IconPicker — searchable glyph grid, portal-rendered ─────────────────────
export function IconPicker({
  open, pos, value, onPick, onClose,
}: {
  open: boolean; pos: { x: number; y: number }; value: string;
  onPick: (name: IconName) => void; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => { if (open) setQ(""); }, [open]);
  if (!open) return null;
  const names = ICON_NAMES.filter((n) => !q || n.toLowerCase().includes(q.toLowerCase()));
  return createPortal(
    <>
      <div className="fixed inset-0 z-[95]" onClick={onClose} aria-hidden="true" />
      <div className="anim-pop fixed z-[96] w-[260px] rounded-lg border border-line bg-card p-2.5 shadow-2xl" style={{ left: pos.x, top: pos.y }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center gap-2">
          <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-mute">Pick an icon</p>
          <button onClick={onClose} aria-label="Close icon picker" className="text-faint hover:text-ink"><Ic name="x" size={12} /></button>
        </div>
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
          className="mb-2 h-7 w-full rounded-sm border border-line bg-paper px-2 text-[11px] outline-none focus:border-brand"
          aria-label="Search icons"
        />
        <div className="grid max-h-[180px] grid-cols-7 gap-1 overflow-y-auto">
          {names.map((n) => (
            <button
              key={n} onClick={() => { onPick(n); onClose(); }}
              title={n} aria-label={`Icon ${n}`}
              className={cx("flex h-8 w-8 items-center justify-center rounded-sm border transition-all hover:scale-110 hover:border-brand", n === value ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute hover:text-ink")}
            >
              <Ic name={n} size={15} />
            </button>
          ))}
          {names.length === 0 && <p className="col-span-7 py-3 text-center text-[10.5px] text-faint">No icons match “{q}”.</p>}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── FloatPanel — draggable inspector popup that opens at the pointer ───────
// Prefers the exact pointer location (where the tenant clicked); falls back to
// the block's bounding rect. Flips left/above near the viewport edges so the
// panel never opens off-screen. Remount via key= to re-anchor on each click.
const PANEL_W = 290;
const PANEL_H = 360; // nominal; the panel scrolls beyond this
export function FloatPanel({
  anchor, title, onClose, children, footer, at,
}: {
  anchor: string; title: string; onClose: () => void;
  children: ReactNode; footer?: ReactNode;
  at?: { x: number; y: number } | null;
}) {
  const { pos, setPos, dragging, onHandleDown } = useDraggable({ x: 40, y: 90 });
  // anchor once per (re)mount — near the pointer, else beside the block
  useEffect(() => {
    let x: number, y: number;
    if (at) {
      // open to the right of the pointer; flip left when there's no room
      x = at.x + 16 + PANEL_W <= window.innerWidth - 8 ? at.x + 16 : Math.max(8, at.x - PANEL_W - 16);
      // below the pointer; flip above when near the bottom edge
      y = at.y + 12 + PANEL_H <= window.innerHeight - 8 ? at.y + 12 : Math.max(56, at.y - PANEL_H - 8);
    } else {
      const el = document.getElementById(`blk-${anchor}`);
      if (el) {
        const r = el.getBoundingClientRect();
        x = Math.min(Math.max(8, r.right + 14), window.innerWidth - PANEL_W - 8);
        y = Math.min(Math.max(56, r.top), window.innerHeight - 220);
      } else { x = 40; y = 90; }
    }
    setPos({ x, y });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cx("fixed z-[90] flex w-[290px] max-w-[92vw] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-2xl", dragging && "cursor-grabbing")}
      style={{ left: pos.x, top: pos.y, maxHeight: "min(72vh, 640px)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onPointerDown={onHandleDown}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-line bg-gradient-to-r from-brand-soft/70 to-card px-3 py-2"
        title="Drag to move"
      >
        <Ic name="grip" size={13} className="text-brand-deep" />
        <p className="flex-1 truncate text-[11px] font-bold uppercase tracking-wider text-brand-deep">{title}</p>
        <button onClick={onClose} aria-label="Close panel" className="rounded-sm p-0.5 text-mute hover:text-ink"><Ic name="x" size={13} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
      {footer && <div className="shrink-0 border-t border-line bg-paper/60 px-3 py-2">{footer}</div>}
    </div>
  );
}
