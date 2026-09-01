# Securing DERZEN on Hostinger

## The constraint everything follows from

This ships as a static bundle uploaded over FTP to shared hosting. There is no
application server of ours in the request path. Anyone who can load
`dev.alvianpermana.art` can open devtools, read every line of the JavaScript,
and edit it in memory.

That makes one rule non-negotiable: **no check that runs in the browser is a
security control.** A password comparison in `store.ts`, a role flag on a
session object, a hidden route, a `localStorage` registry of team members: all
of these decide what the UI draws. None of them decide what a person can reach.

So the question is not how to write a better login screen. It is which parts of
the stack can enforce something, and there are exactly two: Apache on Hostinger,
and a backend. The architecture below uses both.

---

## Priority order

Ranked by risk removed per hour of work. Do them in this order.

| # | Control | Blocks | Effort |
|---|---------|--------|--------|
| 1 | Basic auth on `dev.alvianpermana.art` via `.htaccess` | The entire internal console being world-downloadable | 15 min |
| 2 | Move AI provider keys into an Edge Function | Live billable keys sitting in every operator's `localStorage`, drained by any XSS | half a day |
| 3 | Supabase Auth + RLS for both surfaces | Client-side auth being decorative; tenant A reading tenant B | 2 to 3 days |
| 4 | CSP and the rest of the security headers | An injected script executing even if the sanitiser is bypassed | 1 hour |
| 5 | Main-only production gate, FTPS, secret scan in CI | Feature branches redeploying production; credentials in cleartext | done |

Item 1 alone removes more risk than everything else combined, because until it
is in place the dev console has no protection at all. Do it today, before the
Supabase work.

---

## 1. Gate the internal host at the web server

`deploy/htaccess.dev` is uploaded to the dev FTP root by CI. It sets
`AuthType Basic` with `Require valid-user`, so Apache rejects the request before
a single byte of the bundle is served. This is categorically stronger than an
in-app login: there is no bundle to inspect and no route to guess.

Create the password file once, over SSH, **outside the web root**:

```
htpasswd -c /home/YOUR_USER/.htpasswd-derzen derzen
```

Then set `AuthUserFile` in `deploy/htaccess.dev` to that path. CI fails the
build if the placeholder is still there, so a forgotten edit cannot ship an
unprotected console.

Hostinger's hPanel has "Password Protect Directories" which generates the same
thing if you would rather not use SSH.

---

## 2. Get the AI keys out of the browser

Today `aiGateway.ts` stores Groq, OpenRouter and Gemini keys in
`localStorage` and calls the providers directly with an `Authorization` header.
Every operator's laptop holds a copy, and any successful XSS on the origin
exfiltrates all three in a single line of script. The keys are billable and
have no per-user cap.

`supabase/functions/ai-proxy/index.ts` replaces that. The browser sends a prompt
and its JWT; the function holds the keys as function secrets, verifies the JWT,
enforces a per-user daily token cap, and fails down the provider chain
server-side. `aiChat()` now takes this path automatically whenever the backend
is configured.

```
supabase functions deploy ai-proxy
supabase secrets set GROQ_API_KEY=... OPENROUTER_API_KEY=... GEMINI_API_KEY=...
```

Rotate all three provider keys after deploying, because the old ones have been
sitting in browser storage and must be treated as compromised.

---

## 3. Real accounts: Supabase Auth and row-level security

`@supabase/supabase-js` was already a dependency, so this is the natural fit.

**`derzenstudio@gmail.com` becomes the platform owner, and it is not seeded from
the bundle.** Create the auth user once in the Supabase dashboard with a long
random password, then run `supabase/migrations/0001_auth_and_tenancy.sql`, which
reads the id back from `auth.users` and inserts the `platform_admins` row. The
migration raises an exception if no owner ends up seeded, so a half-run
migration fails loudly rather than leaving an ownerless console.

No password, hash, or entitlement for that account exists anywhere in this
repository.

What the schema enforces:

- Every table is `enable row level security` with deny-by-default. A tampered
  client can issue any query it likes; Postgres answers only what the JWT is
  entitled to.
- `platform_admins` has a read policy and **no write policy at all**, so the
  anon and authenticated roles cannot insert a row. Seats are created only by
  the `admin-invite` Edge Function, which re-checks that the caller holds the
  owner role using the service role key.
- `tenants` is readable by its own members and by platform admins. Plan,
  suspension and free-access grants are writable by platform admins only, so a
  workspace owner cannot grant themselves free billing.
- Signup provisioning runs in a Postgres trigger, so tenant creation and the
  owner membership commit in one transaction. A client that dies mid-signup
  cannot leave an auth user with no workspace.
- Helper functions are `security definer` with `set search_path = public,
  pg_temp`. Without the pinned search path a caller can shadow `public` and
  hijack the lookup that the policies depend on.

Two behaviours changed in the client because the old ones were theatre:

- **Password reset** now sends a real single-use Supabase link. The previous
  flow generated a six-digit code in the browser and printed it on screen, which
  verified nothing at all. In fallback mode the UI now says so in red.
- **Error messages** are flattened. "No account found" versus "wrong password"
  turns a login form into an account-enumeration oracle, so both return the same
  text and the reset form always reports success.

Set the two build variables in GitHub under Settings, Secrets and variables,
Actions, **Variables** (not Secrets, since they are compiled into a public
bundle either way and this makes that visible):

```
SUPABASE_URL       https://YOURPROJECT.supabase.co
SUPABASE_ANON_KEY  eyJ...
```

The anon key is public by design. It grants nothing on its own because every
table is RLS-denied. **The service role key must never appear in a `VITE_`
variable, a `.env` file, or this repository.** CI greps `dist/` for
secret-shaped strings and fails the deploy if it finds one.

Until those variables are set, the app runs on the browser-only fallback and
shows a red banner on the login screen saying access checks are not enforced.
That banner is deliberate. A build with no backend should look broken.

---

## 4. Headers

Both `.htaccess` files set HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options: DENY`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and
a CSP with no `unsafe-inline` and no `unsafe-eval` on `script-src`.

That CSP matters more here than in most apps. The site builder renders
tenant-authored HTML through `dangerouslySetInnerHTML`. The DOM-walk sanitiser
is the first line; CSP is the second, and unlike the sanitiser an attacker
cannot edit it. Even if markup escapes the allowlist, an injected `<script>` or
inline handler will not execute.

Also set: source maps deleted before upload, directory indexes off, dotfiles and
`.map`/`.sql`/`.env`/`.log` denied, immutable caching on hashed assets and
`no-cache` on the entry document so a deploy cannot strand people on a stale
bundle pointing at deleted chunks. The dev surface uses `no-store` throughout
and adds `X-Robots-Tag: noindex`.

One caution on HSTS: `max-age=63072000` locks browsers to HTTPS for two years.
Confirm the certificate renews cleanly before enabling it, because a broken cert
after that header is served will lock people out until it expires.

---

## 5. Pipeline

Already applied in the previous pass and extended here:

- Production deploys only from `main`; other branches build and ship to dev.
- `protocol: ftps`, so deploy credentials are no longer sent in cleartext.
- `permissions: contents: read` on the workflow.
- `.htaccess` explicitly uploaded, since the FTP action skips dotfiles by
  default and the whole header and auth story would silently vanish.
- Secret scan on `dist/` before upload.

---

## What is still not covered

Being straight about the gaps, because a security document that only lists wins
is worse than none.

- **Tenant data is still in `localStorage`, not Postgres.** Auth is now
  server-enforced, but reservations, guests and settings persist per browser.
  Until those tables move behind RLS, "tenant isolation" means one browser
  profile per workspace. The schema here is the foundation for that migration,
  not the migration itself.
- **Sessions.** Supabase JWTs are short-lived and refreshed by the SDK, which is
  a real improvement on a 12-hour hand-rolled token. Refresh tokens still sit in
  browser storage; that is standard for SPAs and CSP is the mitigation.
- **Rate limiting on auth.** Supabase applies defaults. Tighten them in the
  dashboard under Authentication, Rate Limits before launch.
- **MFA.** Supabase supports TOTP. For a console that can suspend tenants and
  waive billing, enrol it on the owner seat at minimum.
- **Backups.** Enable point-in-time recovery on the Supabase project. FTP
  hosting has no meaningful rollback.
