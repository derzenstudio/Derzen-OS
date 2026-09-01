import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx, money, fmtShort } from "../lib/format";
import { Ic, type IconName } from "./icons";
import { useApp } from "../store";
import { GUESTS, guestById, propertyById } from "../lib/data";

// ── Command Palette — jump to any tool, property, booking, or action ──────
// Answers the operator's complaint that key tools are buried in menus.
// Ctrl/Cmd+K from anywhere; fuzzy-matches pages, properties, reservations,
// quotes, guests and one-click actions. Fully keyboard-driven.

type Cmd = {
  id: string;
  group: "Pages" | "Properties" | "Reservations" | "Quotes" | "Guests" | "Quick actions";
  label: string;
  hint?: string;
  icon: IconName;
  keywords: string;
  run: () => void;
};

function fuzzy(q: string, s: string): number {
  const needle = q.toLowerCase().trim();
  const hay = s.toLowerCase();
  if (!needle) return 1;
  let i = 0, score = 0, streak = 0;
  for (let h = 0; h < hay.length && i < needle.length; h++) {
    if (hay[h] === needle[i]) { i++; streak++; score += 1 + streak * 2; }
    else streak = 0;
  }
  if (i < needle.length) return 0;
  return score + (hay.startsWith(needle) ? 50 : 0);
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { navigate, properties, reservations, quotes, setTheme, theme } = useApp();
  const guests = GUESTS;
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = (path: string) => { navigate(path); onClose(); };

  const cmds = useMemo<Cmd[]>(() => {
    const pages: [string, IconName, string, string][] = [
      ["dashboard", "grid", "Dashboard", "overview today"],
      ["calendar", "calendar", "Multi-calendar", "availability bulk edit rates"],
      ["inbox", "inbox", "Guest inbox", "messages conversations"],
      ["reservations", "ticket", "Reservations", "bookings stays"],
      ["operations", "wrench", "Command Center", "tasks providers automations"],
      ["concierge", "sparkle", "AI Concierge", "knowledge autopilot templates"],
      ["reviews", "star", "Reviews", "ratings responses"],
      ["customers", "users", "Customers", "crm guests profiles"],
      ["guidebooks", "book", "Guidebooks", "property guides store"],
      ["listings", "home", "Listings & Services", "properties rooms sell"],
      ["channels", "plug", "Channel Manager", "ota connections sync"],
      ["quotes", "doc", "Quotes", "estimates invoices"],
      ["websites", "globe", "Websites", "builder embeds widgets"],
      ["styling", "palette", "Global Styling", "brand fonts colors"],
      ["reports", "chart", "Reports", "revenue financials"],
      ["settings", "gear", "Settings", "team billing profile"],
      ["integrations", "puzzle", "Integrations & API", "webhooks payments"],
      ["sync", "satellite", "Sync Health", "connection errors"],
    ];
    const out: Cmd[] = pages.map(([path, icon, label, kw]) => ({
      id: `pg-${path}`, group: "Pages", label, icon, keywords: `${label} ${kw} ${path}`,
      run: () => go(`/${path}`),
    }));

    properties.filter((p) => !p.archived).forEach((p) => {
      out.push({
        id: `prop-${p.id}`, group: "Properties", label: p.name, icon: "home",
        hint: `${p.city} · ${p.maxGuests} guests`, keywords: `${p.name} ${p.city} property listing`,
        run: () => go(`/listings?property=${p.id}`),
      });
      out.push({
        id: `cal-${p.id}`, group: "Quick actions", label: `Calendar — ${p.name}`, icon: "calendar",
        keywords: `${p.name} availability dates`, run: () => go("/calendar"),
      });
    });

    reservations.slice(0, 12).forEach((r) => {
      const g = guestById(r.guestId);
      out.push({
        id: `res-${r.id}`, group: "Reservations", label: `${r.ref} — ${g.name}`, icon: "ticket",
        hint: `${propertyById(r.propertyId).name} · ${fmtShort(r.checkIn)} · ${r.status.replace("_", " ")}`,
        keywords: `${r.ref} ${g.name} reservation booking`, run: () => go(`/reservations/${r.id}`),
      });
    });

    quotes.slice(0, 8).forEach((qq) => {
      const g = guestById(qq.guestId);
      out.push({
        id: `qt-${qq.id}`, group: "Quotes", label: `${qq.ref} — ${g.name}`, icon: "doc",
        hint: `${money(qq.total, qq.currency)} · ${qq.status}`, keywords: `${qq.ref} ${g.name} quote`,
        run: () => go("/quotes"),
      });
    });

    guests.slice(0, 8).forEach((g) => {
      out.push({
        id: `gst-${g.id}`, group: "Guests", label: g.name, icon: "users",
        hint: `${g.country} · ${g.status}`, keywords: `${g.name} guest customer ${g.country}`,
        run: () => go("/customers"),
      });
    });

    out.push(
      { id: "act-newres", group: "Quick actions", label: "New reservation", icon: "plus", keywords: "create add booking", run: () => go("/reservations") },
      { id: "act-newquote", group: "Quick actions", label: "New quote", icon: "plus", keywords: "create add estimate", run: () => go("/quotes") },
      { id: "act-addlisting", group: "Quick actions", label: "Add listing / import from OTA", icon: "download", keywords: "property import airbnb booking", run: () => go("/listings") },
      { id: "act-bulk", group: "Quick actions", label: "Bulk-edit calendar rates", icon: "sliders", keywords: "price availability range", run: () => go("/calendar") },
      { id: "act-theme", group: "Quick actions", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", icon: theme === "dark" ? "sun" : "moon", keywords: "theme appearance", run: () => { setTheme(theme === "dark" ? "light" : "dark"); onClose(); } },
      { id: "act-copilot", group: "Quick actions", label: "Ask the Copilot", icon: "sparkle", keywords: "ai assistant help", run: () => { useApp.getState().setCopilotOpen(true); onClose(); } },
    );
    return out;
  }, [properties, reservations, quotes, guests, theme]);

  const results = useMemo(() => {
    const scored = cmds.map((c) => ({ c, s: fuzzy(q, `${c.label} ${c.hint ?? ""} ${c.keywords}`) })).filter((x) => x.s > 0);
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.c).slice(0, 9);
  }, [cmds, q]);

  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  // group results preserving order
  const groups: { name: Cmd["group"]; items: { c: Cmd; i: number }[] }[] = [];
  results.forEach((c) => {
    const gi = results.indexOf(c);
    let g = groups.find((x) => x.name === c.group);
    if (!g) { g = { name: c.group, items: [] }; groups.push(g); }
    g.items.push({ c, i: gi });
  });

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-pine-950/60 px-4 pt-[12vh] backdrop-blur-[3px]" onMouseDown={onClose}>
      <div
        className="anim-pop w-full max-w-[620px] overflow-hidden rounded-lg border border-line bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog" aria-label="Command palette"
      >
        <div className="ticks flex items-center gap-3 border-b border-line px-4 py-3">
          <Ic name="search" size={17} className="shrink-0 text-brand" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter" && results[idx]) { results[idx].run(); }
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Jump to a tool, property, booking, guest, or action…"
            className="h-8 w-full bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-faint"
            aria-label="Search commands"
          />
          <kbd>esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="px-5 py-8 text-center text-[12.5px] text-faint">
              Nothing matches “{q}”. Try “calendar”, a guest name, or a booking ref.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-4 pb-1 pt-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-faint">{g.name}</p>
              {g.items.map(({ c, i }) => (
                <button
                  key={c.id}
                  data-i={i}
                  onClick={c.run}
                  onMouseEnter={() => setIdx(i)}
                  className={cx("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors", i === idx ? "bg-brand-soft/70" : "hover:bg-paper")}
                >
                  <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-sm", i === idx ? "bg-brand text-white" : "bg-paper text-mute")}>
                    <Ic name={c.icon} size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{c.label}</span>
                    {c.hint && <span className="block truncate text-[10.5px] text-mute">{c.hint}</span>}
                  </span>
                  {i === idx && <kbd>↵</kbd>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-paper/70 px-4 py-2 text-[10px] font-semibold text-faint">
          <span className="flex items-center gap-1"><kbd>↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd>↵</kbd> open</span>
          <span className="ml-auto">{results.length} result{results.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
