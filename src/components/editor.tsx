import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../lib/format";
import { Ic, type IconName } from "./icons";
import { useApp } from "../store";
import { PROPERTIES, propertyById } from "../lib/data";

// ── Inline editable text (Canva-style: click, type, commit on blur/Enter) ──
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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) ref.current.textContent = value;
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const next = (ref.current?.textContent ?? "").replace(/\u00a0/g, " ");
    if (next !== value) onCommit(next);
  };

  if (disabled) return <Tag className={className} style={style}>{value || placeholder}</Tag>;

  return (
    <Tag
      ref={ref as never}
      contentEditable={editing}
      suppressContentEditableWarning
      className={cx(
        className,
        "outline-none transition-shadow",
        editing && "cursor-text rounded-sm ring-2 ring-brand/60 ring-offset-1 ring-offset-transparent",
        !editing && "cursor-text hover:ring-1 hover:ring-line2",
      )}
      style={style}
      data-ph={placeholder}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation(); // don't trigger canvas shortcuts while typing
        if (e.key === "Enter" && !multiline) { e.preventDefault(); (e.target as HTMLElement).blur(); }
        if (e.key === "Escape") (e.target as HTMLElement).blur();
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={placeholder ?? "editable text"}
    >
      {value || placeholder}
    </Tag>
  );
}

// ── Inline editable image (Canva-style: hover → swap) ──────────────────────
export function EditableImage({
  src, onCommit, className, style, alt = "", fit = "cover",
}: {
  src: string; onCommit: (v: string) => void; className?: string; style?: React.CSSProperties; alt?: string; fit?: "cover" | "contain";
}) {
  const { savedAssets, addSavedAsset, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const effective = src || PROPERTIES[0].image;
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (v: string) => { onCommit(v); setOpen(false); };

  return (
    <div className={cx("group/img relative overflow-hidden", className)} style={style}>
      <img src={effective} alt={alt} className="h-full w-full" style={{ objectFit: fit }} onError={(e) => ((e.target as HTMLImageElement).src = PROPERTIES[0].image)} />
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="absolute inset-0 flex items-center justify-center gap-1.5 bg-pine-950/0 text-[11px] font-bold text-white opacity-0 transition-all hover:bg-pine-950/45 hover:opacity-100"
        aria-label="Replace image"
      >
        <Ic name="image" size={14} /> Replace
      </button>
      {open && (
        <div className="anim-pop absolute inset-x-2 top-2 z-30 rounded-md border border-line bg-card p-2.5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute">Pick an image</p>
          <div className="mb-2 grid max-h-[120px] grid-cols-4 gap-1 overflow-y-auto">
            {savedAssets.filter((a) => a.kind === "image").concat(PROPERTIES.map((p) => ({ id: p.id, name: p.name, url: p.image, kind: "image" as const }))).slice(0, 12).map((a) => (
              <button key={a.id} onClick={() => pick(a.url)} className="h-12 overflow-hidden rounded-sm border border-line transition-transform hover:scale-105" title={a.name} aria-label={`Use ${a.name}`}>
                <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… or paste" className="h-7 flex-1 rounded-sm border border-line bg-paper px-2 text-[10.5px] outline-none focus:border-brand" />
            <button onClick={() => url && pick(url)} className="rounded-sm bg-brand px-2 text-[10px] font-bold text-white">Use</button>
            <button onClick={() => fileRef.current?.click()} className="rounded-sm border border-line px-2 text-[10px] font-bold text-mute" aria-label="Upload image"><Ic name="download" size={11} /></button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => { addSavedAsset({ name: "Uploaded image", url: PROPERTIES[1].image, kind: "image" }); toast("ok", "Image uploaded to asset library"); }} />
          </div>
        </div>
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
