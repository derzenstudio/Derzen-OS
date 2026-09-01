# Audit and remediation brief: DERZEN OS

Paste this whole file as your opening message to a coding agent working in the
repository root. It is written to be executed, not read for inspiration.

---

## What you are working on

A multi-property hospitality platform. React 18 plus TypeScript plus Vite plus
Tailwind, roughly 24,700 lines across 66 source files in `src/`. It compiles to
a static bundle and is uploaded over FTP to Hostinger shared hosting by
`.github/workflows/deploy.yml`. Two surfaces:

- `app.alvianpermana.art` is the public tenant application.
- `dev.alvianpermana.art` is the internal developer and backoffice console.

There is no application server in the request path. A Supabase backend is
scaffolded in `supabase/` but may not be provisioned yet. Read `SECURITY.md`
before you touch anything.

## The single fact that governs every decision here

The deployed bundle is a public file. Anyone can download it, read every line,
and edit it in memory. A private GitHub repository does not change this.

Therefore: **no check that executes in the browser is a security control.** A
password comparison, a role flag on a session object, a hidden route, a
`localStorage` allowlist. These decide what the interface draws. They do not
decide what a person can reach.

Only two things on this stack enforce anything: Apache via `.htaccess`, and the
Supabase backend via row-level security and Edge Functions. When you propose a
security fix, state which of those two enforces it. If the answer is neither,
you have written a UI change, and you must label it as one rather than
presenting it as a fix.

---

## Non-negotiable rules

1. **Verify before you trust.** `QA_AUDIT.md` in this repo marks issue S-1 as
   FIXED. It is not fixed. A previous pass registered a record without
   persisting it, so the crash moved one page reload later and the audit
   recorded a pass. Treat every existing status document as a claim to be
   re-tested, never as evidence.

2. **Reproduce before you fix.** For every defect you report, write a runnable
   script or test that demonstrates the broken behaviour first. Show its output.
   A finding without a reproduction is a hypothesis.

3. **Verify after you fix.** Re-run the same reproduction and show it passing.
   `npx tsc --noEmit` and `npx vite build` must both be clean at every commit.
   A green build is a floor, not evidence that a behaviour changed.

4. **Do not fabricate.** No invented CVE numbers, benchmark figures, file paths,
   or line numbers. If you cannot verify something, write "unverified" next to
   it. If a check is impossible in your environment, say which check and why.

5. **Do not mark work complete that you have not tested.** If you ran out of
   budget partway through a task, say exactly where you stopped. An honest
   partial result is worth more than a confident false one.

6. **Report negative results.** If you audit an area and find nothing, say so.
   Silence reads as "not checked".

---

## Phase 1: establish ground truth

Do not fix anything yet.

1. Run `npx tsc --noEmit` and `npx vite build`. Record the output.
2. Run `./deploy/verify-live.sh`. It curls both live hosts and checks for
   exposed credentials, missing headers, published source maps, and whether the
   internal host is gated. Record the full output as your starting baseline.
3. Inventory every place the code makes a trust decision: authentication,
   authorisation, tenant scoping, and anything reading a role or a session. For
   each, name what enforces it. Expect most answers to be "the browser".
4. Inventory every sink that can execute or inject: `dangerouslySetInnerHTML`,
   `innerHTML`, `eval`, `new Function`, `document.write`, dynamic `src` or
   `href` built from user input, and any `postMessage` handler.
5. Inventory every non-null assertion (`!`) applied to the result of `.find()`,
   `.get()`, or an index lookup. Each is a potential crash on a missing record.
6. Grep the built `dist/` for credential-shaped strings before you change
   anything, so you can prove the delta afterwards.

Produce a findings table before writing any code. Columns: ID, severity,
component, what breaks, how you reproduced it, what enforces the fix.

Severity means user impact, not effort:

- **SEV-1**: data loss, a crash on a common path, credentials exposed publicly,
  or one tenant able to reach another tenant's data.
- **SEV-2**: a feature silently produces wrong output, or a control that looks
  enforced is not.
- **SEV-3**: correct but fragile, poor accessibility, misleading copy.

---

## Phase 2: security

Work in this order. It is ranked by risk removed per hour, not by interest.

**2.1 Confirm the internal host is gated at the web server.**
`deploy/htaccess.dev` sets HTTP Basic auth. Confirm CI actually uploads it: the
FTP action skips dotfiles by default, so `.htaccess` can silently fail to land
and every header and the auth gate vanish with no error. Verify against the
live host, not against the repository. An anonymous request must return 401.

**2.2 Confirm nothing credential-shaped is in either bundle.**
A previous deployment shipped a developer email and password as string literals
in the JavaScript. Confirm they are gone from `dist/` and from both live hosts.
Then check the git history: removing a secret from `HEAD` does not remove it
from the log. List anything you find so it can be rotated, but do not attempt
history rewriting without asking.

**2.3 Audit the Supabase row-level security policies.**
Read `supabase/migrations/0001_auth_and_tenancy.sql`. For every table, answer:
can an authenticated user of tenant A read or write anything belonging to
tenant B? Can a workspace owner modify their own billing, plan, suspension
state, or free-access grant? Can anyone insert into `platform_admins` from the
browser? Check that every `security definer` function pins `search_path`,
because without it a caller can shadow `public` and hijack the lookup the
policies depend on. Write a test that signs in as one tenant and attempts to
read another's rows, and show it being refused.

**2.4 Audit the Edge Functions.**
`supabase/functions/ai-proxy` and `supabase/functions/admin-invite`. Check:
authentication is enforced before any provider or privileged call is reached;
authorisation is re-checked server-side and not inherited from the client;
CORS is restricted to the two known origins; input is bounded before anything
billable happens; quota cannot be reset by clearing the browser; and no error
path leaks a key or a raw upstream response.

**2.5 Audit the HTML sanitiser and the CSP together.**
`sanitizeHtml` in `src/components/editor.tsx` walks a parsed DOM and rebuilds an
allowlist. Attack it. Try malformed and unterminated tags, nesting, mutation
XSS, SVG and MathML foreign content, attribute smuggling, and CSS-based
payloads. Then confirm the CSP in both `.htaccess` files has no `unsafe-inline`
and no `unsafe-eval` on `script-src`, because CSP is the layer an attacker
cannot edit and the sanitiser is the layer they can study.

**2.6 Audit the pipeline.**
Production should deploy only from `main`. The FTP transfer should use FTPS.
The workflow should declare least-privilege `permissions`. Third-party actions
should be pinned to a commit SHA rather than a mutable tag, especially any
action that receives hosting credentials. Source maps must be deleted before
upload. No `VITE_`-prefixed variable may hold a secret, because everything with
that prefix is compiled into the public bundle.

**2.7 Anything still client-enforced.**
List every remaining control that depends on browser-side logic. Do not quietly
leave these out because the fix is large. Name each one, say what it would take
to move it server-side, and do not describe any of them as secure.

---

## Phase 3: correctness

**3.1 Crash paths.** Every non-null assertion from Phase 1 step 5. For each,
determine whether a real sequence of user actions can produce a miss. Persisted
state is the usual culprit: a record saved in one session and its dependency not
saved alongside it. Prove the crash, then fix it, then prove the fix.

**3.2 Persistence coherence.** For every entity written to storage, check that
everything it references is written in the same operation. A reservation saved
without its guest, or a booking saved without its property, produces a dangling
reference on the next load. Enumerate the reference graph rather than spot
checking.

**3.3 Date and boundary arithmetic.** Hospitality software is mostly interval
maths and it is where the subtle bugs live. Check half-open versus closed
intervals, same-day turnover (one booking departs and another arrives on the
same date), zero-night and day-use bookings, stays crossing a month or year
boundary, stays extending past the visible window, and timezone handling in any
date key. Verify both the calculation and what is drawn, because a correct
calculation rendered as overlapping shapes is still a wrong answer to the user.

**3.4 Silent data loss in exports and displays.** Anywhere the code uses `.find()`
to pick one record for a slot that can legitimately hold several, it is
discarding data without telling anyone. CSV exports and calendar cells are the
likely offenders. Check every one.

**3.5 Error handling.** Confirm a render throw cannot blank the application.
Confirm storage quota failures, offline states, and rejected network calls
surface something actionable rather than failing silently or crashing.

**3.6 Accessibility.** Keyboard reachability for every interactive element,
focus management in modals and drawers, `aria-label` on icon-only controls,
live-region announcements for dynamic updates, and colour contrast on small
text. Report what fails rather than asserting the app is accessible.

---

## Phase 4: the copy

The interface reads like generated filler in places. Fix it. This is a product
quality task, not a cosmetic one: hedged, padded microcopy makes a professional
tool feel untrustworthy.

**4.1 Typography.** As of this brief there are 736 em dashes in `src/`, 647 of
them in shipped strings rather than comments, plus 31 en dashes and 1,424
middots. Remove all of them from user-visible text.

Do not run a blind find and replace. The correct replacement depends on the
sentence:

- Parenthetical aside: use commas, or split into two sentences.
- Before a clause that explains the one before it: use a full stop or a colon.
- Numeric or date range: use "to".
- Pairing or connection: use "and".
- Middot used as a separator in a list of metadata: keep one if it is genuinely
  acting as a table separator in dense UI chrome, but a line reading
  `plan · seats · region · status` is a table and should be marked up as one.
  Everywhere else, remove it.

Comments may keep their dashes. Only shipped strings matter.

**4.2 Banned words and phrases.** Remove these from all user-visible copy:

> dive into, delve, unlock, unveil, embark, journey, tapestry, landscape, realm,
> testament, game-changer, in the world of, navigate the, elevate, seamlessly,
> robust, bespoke, vibrant, immersive, curated, whisk away, picture this,
> beckon, nestled, the heart of, step into, effortless, powerful, streamline,
> supercharge, leverage, best-in-class, cutting-edge, next-generation

**4.3 Banned sentence shapes.**

- "It is not just X, it is Y."
- Three-item lists used as padding ("fast, reliable and affordable").
- Balanced reassurance endings ("whether you are doing X or Y, this is for you").
- "From X to Y" sweeps.
- "Furthermore", "Moreover", "Additionally", "Indeed", "Truly" as openers.

**4.4 What good looks like.** British spelling throughout. Vary sentence length
deliberately; fragments are fine. Prefer a specific number, name, or state over
an adjective. An empty state that says "No reservations for these dates. Change
the range or add one." beats "Nothing to see here yet." A destructive
confirmation should say what will be deleted and whether it can be undone. An
error should say what failed and what to do next.

**4.5 Where to look.** Highest concentrations are in `lib/data.ts`,
`modules/Websites.tsx`, `lib/backoffice.ts`, `modules/DevOps.tsx`,
`lib/platform.ts`, `modules/DevPlatform.tsx`, `store.ts` and
`modules/Listings.tsx`. Also cover every toast, empty state, error message,
tooltip, confirmation dialog, button label and `aria-label`.

**4.6 Sanity check.** Some strings are seeded sample data representing what a
customer would have written, for example a guest message or a review. Those
should sound like a person, not like corrected house style. Use judgement and
say which ones you deliberately left alone.

---

## Deliverables

1. **Findings table.** Every issue, with severity, reproduction, and what
   enforces the fix. Include the ones you chose not to fix and why.
2. **Commits.** One logical change per commit, message stating what broke and
   what now enforces the fix. Not "fix bug".
3. **Evidence.** Reproduction output before, verification output after. The
   `verify-live.sh` baseline and the post-change run.
4. **Residual risk.** What is still not secure, in plain terms. This section
   matters more than the list of wins. If tenant data is still browser-local,
   say that tenant isolation does not yet exist rather than describing auth as
   solved.
5. **A rewritten `QA_AUDIT.md`** that a sceptical reader can verify, replacing
   the current one. Every status must cite its evidence.

---

## What not to do

- Do not add dependencies without saying why an existing one will not do.
- Do not refactor for taste. Every diff must trace to a finding.
- Do not add abstraction layers, config systems, or plugin architectures.
- Do not touch the design system, spacing, or colour palette. Copy and
  accessibility only.
- Do not rewrite git history without asking.
- Do not report a UI change as a security fix.
- Do not write a summary that is more confident than the testing behind it.

If a decision genuinely blocks you and the repository does not answer it, ask
one specific question and stop. Do not guess and proceed.
