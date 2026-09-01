# QA Audit — DERZEN Hospitality OS

## Resolution log (latest pass)

| Item | Status | Evidence |
|---|---|---|
| S-1 chatbot guest crash | FIXED | `g-chat` guest registered before reservation creation |
| S-2 new-property registry crash | FIXED | `addProperty` registers into the shared lookup |
| S-3 stored XSS in inline editor | FIXED | strict allowlist sanitizer (`sanitizeHtml`) on every render path |
| F-1 chatbot → payment dead flow | FIXED | live chatbot embed preview + public hosted payment page `#/en/pay/:ref` |
| M-1 emdash copy | PARTIAL | guest-facing + global chrome cleaned (Public, Shell, App, ChatWidget); ~300 remain in module/dev-side strings, mapped via `\u2014` grep for the next copy pass |
| M-2 stub site buttons | FIXED | Duplicate clones the full page tree to a `-copy` subdomain; Delete requires typing the subdomain, then unpublishes + resets, audited |
| M-3 execCommand | FIXED | TextBar rewritten on the Range API (wrap/unwrap toggle, font-color via allowlisted attr, block-level align + relative sizing) |
| L-1 no session expiry | FIXED | tenant sessions 12h TTL, developer 4h; expired sessions dropped at boot with a visible notice |
| L-2 photo storage | IMPROVED | per-library capacity readout + "nearly full" warning pointing at the Supabase bucket seam |
| L-3 i18n coverage | OPEN | catalogues still nav/dashboard/common only |
| L-4 bundle splitting | OPEN | single 1.15 MB chunk; needs manualChunks in the Vite config |
| L-5 timer cleanup | OPEN | harmless store timers |

---


**Auditor:** Quality & Release Management
**Scope:** Full codebase review — tenant app (`app.*`), developer consoles (`dev.*`), public site, guest surfaces. Buttons/links, security, functionality, build health.
**Verdict:** 2 crash bugs + 1 injection surface + 1 dead feature found and **fixed in this pass** (build verified green, 83 modules). 7 findings remain open for the team, none blocking.

---

## Fixed during this audit (verify in staging)

### S-1 · Crash — chatbot reservation had no guest record (SEV-1)
`chatBooking` created reservations with `guestId: "g-chat"`, but `guestById` is a non-null registry lookup. Any view touching the reservation (list, detail, invoices) would throw and white-screen.
**Fix:** `chatBooking` now registers the walk-in guest in the shared registry before creating the reservation.

### S-2 · Crash — new properties invisible to the lookup registry (SEV-1)
`addProperty` appended to the store array only, while `propertyById`/`planFor` read the static `PROPERTIES` registry. Calendar bulk edits, CSV export, and channel pushes for a freshly created property would crash on `undefined`.
**Fix:** new properties are registered in the shared registry at creation.

### S-3 · Security — stored XSS in the site builder (HIGH)
Inline editor content was rendered raw (`toHtml` passed any string containing `<` straight to `dangerouslySetInnerHTML`). Pasted or typed markup such as `<img src=x onerror=…>` would execute on the canvas and in guest-facing previews.
**Fix:** strict allowlist sanitizer — only typographic tags (`b i u em strong br font span div p`), every attribute stripped except a safe `color`. Applied everywhere editor content renders.

### F-1 · Dead feature — chatbot booking flow unreachable
`chatBooking`/`completeChatPayment` existed in the store but nothing called them: there was no chatbot embed preview and no payment page, so the advertised "book from the chat → pay" journey 404'd.
**Fix:** new `ChatWidget` module — live concierge-chatbot preview (knowledge-grounded quick replies, in-chat villa/date/guest picker, live price estimate) that books and hands off to a new public hosted payment page at `#/en/pay/:ref` (card / Xendit VA / bank transfer, deposit math, receipt state). Wired into the Embeds tab as a third widget with JS + iframe snippets.

### Verified PASS
- `?tab=design` deep link from Global Styling → Quotes works (init-from-query + route-keyed remount).
- All `navigate()` targets resolve against the route registry (grep audit, 28 call sites).
- No `target="_blank"` anywhere (no tab-nabbing surface).
- Dev-session hardening holds: never persisted, stale sessions discarded at boot, `/dev` redirects unauthenticated visitors to the Developer login, tenant sessions cannot render the backoffice.
- Money remains integer minor units with per-conversion FX rate + timestamp.

---

## Open findings for the team

| ID | Sev | Area | Finding | Recommendation |
|----|-----|------|---------|----------------|
| M-1 | Med | Copy | ~340 em-dashes reintroduced across 37 files after the module rewrites (client asked for their removal). Counts: DevOps 40, DevPlatform 30, Websites 29, Sections7 29, Sections6 22, Sections5 21, Listings 18, Settings 18, Channels 18, Concierge 14, Manual 13, Integrations 12, Public 11, Operations 11, ota 11, Calendar 9, App 8, Shell 8, others ≤7. | Mechanical pass; replacement is context-dependent (comma / colon / space) — review per file, don't blind-replace. |
| M-2 | Med | Websites | "Delete site" is a guard-toast only (no type-the-name confirm flow) and "Duplicate" doesn't create a real copy. | Implement both or downgrade the labels to avoid false affordance. |
| M-3 | Med | Editor | Inline formatting uses `document.execCommand` (deprecated). Works everywhere today, no standard successor. | Plan a Selection-API replacement; track browser deprecation notices. |
| L-1 | Low | Auth | Tenant session persists in localStorage with no expiry or rotation. Fine for demo. | Signed, expiring tokens + refresh in production. |
| L-2 | Low | Storage | Photo uploads fall back to session-only when the browser quota is hit. The Supabase seam exists in `photoStore.ts` but needs a real adapter + keys. | Ship the remote adapter before any tenant relies on library persistence. |
| L-3 | Low | i18n | Catalogues cover nav/dashboard/common; most module copy is hard-coded English. | Catalog migration still owed against the original spec. |
| L-4 | Low | Build | Single 1.14 MB chunk (311 KB gzip). | Route-level code splitting; the build already warns. |
| L-5 | Low | Store | `later()` timers aren't cleared on logout. Harmless in an SPA. | Track for the record; cancel on session end if modules grow. |

---

## Regression checklist for the next build

1. Book via the Embeds → Concierge chatbot picker → payment page completes → reservation shows in Reservations **without crashing** (S-1).
2. Add a listing, then bulk-edit its calendar row and export CSV (S-2).
3. Paste `<img src=x onerror=alert(1)>` into any block's rich text → nothing executes, tags stripped (S-3).
4. `#/en/pay/UNKNOWN` → graceful "not found" state, no crash.
5. Sign out on the tenant host, visit `#/en/dev` → lands on Developer login, never the backoffice.
