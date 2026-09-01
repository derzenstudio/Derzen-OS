# ── app.alvianpermana.art · tenant surface ────────────────────────────────
# Uploaded by CI to the app FTP root. Hostinger runs Apache, so this is the
# only place on the stack where a rule is enforced by something other than the
# browser. Use it.

# ── HTTPS only ─────────────────────────────────────────────────────────────
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

<IfModule mod_headers.c>
  # Two years, preloadable. Set this only once the certificate is stable:
  # a wrong HSTS header locks browsers out of the domain until it expires.
  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains"

  # The app renders tenant-authored HTML in the site builder. The sanitiser is
  # the first line; this is the second, and it is the one an attacker cannot
  # edit. 'unsafe-inline' on style-src is required by Tailwind's injected
  # styles. There is no 'unsafe-eval' and no 'unsafe-inline' on script-src, so
  # an injected <script> or inline handler will not run even if markup escapes
  # the sanitiser.
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co https://*.functions.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"

  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-Frame-Options "DENY"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()"
  Header always set Cross-Origin-Opener-Policy "same-origin"

  # Hashed assets are immutable; the entry document must never be cached or a
  # deploy leaves people on a stale bundle pointing at deleted chunks.
  <FilesMatch "\.(js|css|woff2|svg|png|jpg|webp)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
</IfModule>

# Never serve source maps, dotfiles, or stray config in production.
<FilesMatch "\.(map|env|log|sql|yml|yaml|json5|bak|old)$">
  Require all denied
</FilesMatch>
<FilesMatch "^\.">
  Require all denied
</FilesMatch>

Options -Indexes
ServerSignature Off

# SPA fallback: unknown paths render the app, real files are served as-is.
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
