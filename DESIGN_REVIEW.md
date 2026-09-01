# DERZEN — Design Review

**From:** Art direction
**To:** Development team
**Scope:** Tenant app + all four developer consoles + marketing/login surfaces
**Verdict in one line:** The bones are right — sharp corners, one green, tabular money, a real ambient layer — but the surface keeps betraying them with the exact moves every AI build makes. We designed an identity and then decorated it like a template.

---

## 0. The identity we actually have (defend this)

- **Square geometry.** Every radius capped at 2–3px. This is our sharpest differentiator — almost nothing in SaaS looks like this. Guard it.
- **One green.** Pine `#0E6B4E`, 80/30/10 discipline. Not indigo, not teal-adjacent. Keep.
- **Big Shoulders Display + Atkinson Hyperlegible + IBM Plex Mono.** Nobody else ships this trio. Keep.
- **Contour ambient background** and **tabular money** are the two moments that feel authored. Push both (see Tier 3).

Everything below is either attacking that identity or failing to commit to it.

---

## Tier 1 — Kill on sight (these are AI fingerprints)

### 1. Aurora blobs on the dashboard greeting band
`Dashboard.tsx:78-79` — two `blur-2xl` radial blobs on a dark band. This is *the* tell. It's the first thing an operator sees every morning and it says "generated."
**Do this instead:** the band is a night-audit header — treat it like paper, not a nebula. Layer: (a) a giant ghost date numeral in Big Shoulders at ~180px, cropped off the right edge at 6% opacity; (b) a fine 24px plot-grid (the contour motif, gridded); (c) the greeting left-aligned against it. Zero blur. The ghost numeral updates daily — that's the living element, and it's *ours*.

### 2. The bento grid on the marketing site
`Public.tsx` — seven `BentoTile`s in a `md:grid-cols-6` mosaic. Bento grids are the 2024 AI signature; users now pattern-match them instantly.
**Do this instead:** a "rate card" editorial layout: one tall 8-col panel (the calendar story, with a real mini strip of colored reservation bars) + three offset stacked items in the remaining 4 cols, alternating alignment, unequal heights. Asymmetry is the whole point.

### 3. The pricing trio
`Public.tsx` — Starter / Scale / Enterprise as three equal cards, middle one "featured" and lifted. The single most predictable layout in software.
**Do this instead:** a ledger. One dominant card for the plan we want to sell (big numeral, itemized like a folio: units × rate = line items) beside a **monospace comparison table** — rows = capabilities, columns = plans, no cards at all. Pricing that reads like the invoices we generate is a brand statement and a conversion argument at once.

### 4. The login split-rail with three checkmark claims
`Public.tsx` LoginPage — dark left rail, form right, three bullet promises. Universal.
**Do this instead:** the **keycard**. Hospitality's most characteristic object. The form sits on a keycard-styled panel (sharp corners, a punch-hole circle, the DERZEN mark embossed top-left, room number = tenant code). The background is the contour field at full presence. Demo workspaces render as a key rack — literal hooks, one key per workspace. Nobody else's login looks like this, and it's on-brand to the bone.

### 5. Gradient-framed buttons everywhere
`.btn-grad` is applied to every solid button. A gradient border on a day-to-day "Save" is costume jewelry.
**Do this instead:** solid ink `#141811` primary (hover → pine), green **only** for confirmations and "go" actions, outline for secondary. Reserve the gradient frame for exactly one element per screen — the hero CTA on marketing, the "Book direct" button on guest surfaces. Scarcity is what makes it land.

### 6. 146 `rounded-full` pills against a square system
We capped radii at 3px and then pill-shaped every badge, chip and button in the app (DevOps alone has 18). Sharp cards + pill chips = a design that argues with itself.
**Do this instead:** chips and badges at 2px. **Full circles reserved for exactly one job: live status dots.** One rule, no exceptions. This alone makes the whole product feel 30% more authored.

---

## Tier 2 — Reshape (structure and hierarchy)

### 7. Type mush: everything lives at 11–14px
Labels 10px, body 12.5px, headings 13.5–24px. Big Shoulders is a *condensed display* face — at 22px it's wasted, and the app reads as one gray hum.
**Do this instead:** enforce a published scale and break it nowhere:

| Role | Face | Size |
|---|---|---|
| KPI numerals | Big Shoulders 700 | **44–56px** (tabular, tight) |
| Page titles | Big Shoulders 600 uppercase | 22–28px, tracked +0.04em |
| Section heads | Big Shoulders 600 | 15–17px |
| Body | Atkinson | 14.5px / 1.62 |
| Data cells | Plex Mono | 12px |
| Labels | Plex Mono uppercase | 9.5–10px, tracked 0.14em |

The dashboard's four KPIs at 52px condensed numerals with 10px mono captions is the look. Contrast is the design.

### 8. The dashboard opens with a greeting, not the work
Greeting band → row of equal stat cards → panels. An operator doesn't log in to be greeted; they log in for the **shift sheet**.
**Do this instead:** open on *today's movements* — a vertical front-desk log: time rail on the left (14:00, 16:30…), arrivals and departures interleaved with guest, unit, and channel mark. Stats demoted to a thin left margin column, ledger-style. The calendar gets a "next 14 nights" strip below it. This is the product's soul; it should be the first pixel.

### 9. Five pastel tints fighting for meaning
`brand-soft`, `gold-soft`, `sea-soft`, `danger-soft`, `plum-soft` — every chip a different pastel. Pastel soup is the default AI palette move.
**Do this instead:** **one** tint (pine wash) for selection/emphasis, neutral ink/4 washes for everything structural, gold reserved strictly for money, red strictly for broken. Sea and plum retire from the token set. Status communicated by dot + label, not by confetti.

### 10. Four near-black consoles, all identical
Ops backoffice, engineering console, ops deep-dive, substrate — all `#0a0a09` + white/10 + green. Plus tenant dark mode. We built the "dark ops app with one neon" four times.
**Do this instead:** differentiate by metaphor. The **Ops backoffice stays dark** (it's the control room — earned). The **engineering/console surfaces go paper**: light backgrounds with the blueprint-grid ambient, ink text, red reserved for incidents — like drafting documents. Now the two sides of the company *feel* like different rooms, and dark mode stays special.

### 11. The sidebar is a generic icon list
It works. It's also forgettable.
**Do this instead:** the **key rack**. The property switcher becomes actual key tags (notch-cut shapes, unit code stamped on them). Active nav items get a folio-tab notch that overlaps the content edge, not just an accent bar. Group headers stay as small-caps "folio" labels. Small work, enormous character.

### 12. Calendar rate cells at 9px
`Calendar.tsx` renders nightly rates at `text-[10px]`/`9px` mono — the product's core data is squinting.
**Do this instead:** floor at 10.5px, rates in Plex Mono semibold, season/override states shown by a 2px left notch on the cell rather than dot + color. The calendar is the hero surface; it gets the best typography, not the worst.

---

## Tier 3 — Amplify (what's good; spend more on it)

### 13. Tabular money is our best asset — make it theatrical
Right-aligned mono amounts are already everywhere. Push: section totals get a **double rule** (two 1px lines, 3px apart — the ledger convention), currency codes as 9px small-caps suffixes, negative values in red with a proper minus (−), not a hyphen. Invoices, reports, owner statements should feel like beautifully typeset accounting documents. Nobody's SaaS does this; accountants will screenshot it.

### 14. Carry the contour motif through everything
It lives on the body background and stops there. Extend: blueprint-grid variant behind the light consoles; a contour watermark on invoice PDFs; the login keycard embossed with one contour line; loading states that "draw" a contour stroke (we already have `line-draw`). One motif, everywhere, at low opacity — that's how brands cohere.

### 15. Motion: we have pops; we need choreography
`anim-pop` on everything is flat by volume. Add: staggered 30ms reveals down list rows (calendar rows, queue items, table rows) on mount; page transitions that slide 8px + fade like turning a folio; hover states that lift 1px with a hard 1px shadow (not blur — blur-soft is a tell too). Numbers count up on the dashboard KPIs only. Restraint reads as confidence.

### 16. Empty states: show the object, not the sentence
They teach the next action (good). Now give each a **ghost artifact**: a dashed-outline sketch of the thing about to exist (a block on the calendar, a thread in the inbox, a page in the builder) at 15% ink. Operators understand objects faster than prose.

---

## Craft spec (pin these, argue later)

- **Radii:** 0 tables & data · 2px controls & chips · 3px cards & modals · `9999px` status dots **only**.
- **Palette:** paper `#f7f8f6` (true neutral — `#f4f5f0` drifts toward the beige we were told to avoid), card white, ink `#141811`, pine `#0E6B4E`, money gold `#9A6A0B`, broken red `#B42318`. Retire sea & plum tokens.
- **Shadow:** hard 1px offset shadows at 8% ink for interactive lift. No `shadow-2xl` on cards; no blur halos anywhere.
- **Iconography:** drop stroke to 1.6, **square caps** to match the 2px geometry. Current round caps soften the whole set.
- **Focus:** keep the green ring — it's correct and accessible.

## Suggested order of work

1. **Today (1 hour):** delete the two blobs (#1), square the 146 pills (#6), swap `.btn-grad` to solid with one-gradient-per-screen (#5).
2. **This week:** dashboard shift-sheet restructure (#8) + type scale (#7) — these two change how the whole product feels.
3. **Next sprint:** marketing rate-card + ledger pricing (#2, #3), keycard login (#4), console light/dark split (#10), key-rack sidebar (#11).
4. **Ongoing:** the Tier 3 amplifications as polish passes per module.

**Bottom line:** we're one discipline away from a product that looks like nobody else's. Every item above is subtracting something generic or committing harder to something we already invented. The generic parts are loud right now; make the invented parts louder.
