#!/usr/bin/env bash
# ── verify-live.sh ─────────────────────────────────────────────────────────
# Run after every deploy. Checks what the internet can actually see, which is
# the only measurement that counts for a static bundle on shared hosting.
#
#   ./deploy/verify-live.sh
#   ./deploy/verify-live.sh --dev-user derzen --dev-pass 'thepassword'
#
# Exit code 1 if any check fails, so it can gate a release.

set -uo pipefail

APP="https://app.alvianpermana.art"
DEV="https://dev.alvianpermana.art"
DEV_USER=""; DEV_PASS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dev-user) DEV_USER="$2"; shift 2 ;;
    --dev-pass) DEV_PASS="$2"; shift 2 ;;
    *) echo "unknown flag: $1"; exit 2 ;;
  esac
done

FAILED=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILED=1; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; }

hdrs() { curl -sS -o /dev/null -D - --max-time 20 "$1" 2>/dev/null; }

echo
echo "══ 1. Internal host is gated at the web server ══"
CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$DEV/" 2>/dev/null)
if [ "$CODE" = "401" ]; then
  pass "dev host returns 401 to an anonymous visitor"
  if [ -n "$DEV_USER" ]; then
    AUTH_CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 -u "$DEV_USER:$DEV_PASS" "$DEV/" 2>/dev/null)
    [ "$AUTH_CODE" = "200" ] && pass "dev host returns 200 with credentials" || fail "credentials rejected (got $AUTH_CODE)"
  fi
else
  fail "dev host returns $CODE without credentials. The console bundle is downloadable by anyone."
fi

echo
echo "══ 2. No credentials or secrets in the shipped bundles ══"
for HOST in "$APP" "$DEV"; do
  NAME=$(echo "$HOST" | sed 's|https://||')
  CURL_AUTH=()
  [ "$HOST" = "$DEV" ] && [ -n "$DEV_USER" ] && CURL_AUTH=(-u "$DEV_USER:$DEV_PASS")
  ASSETS=$(curl -sS --max-time 20 "${CURL_AUTH[@]}" "$HOST/" 2>/dev/null | grep -oE '/assets/[A-Za-z0-9._-]+\.js' | sort -u)
  if [ -z "$ASSETS" ]; then
    [ "$HOST" = "$DEV" ] && [ "$CODE" = "401" ] && pass "$NAME: not readable without credentials (expected)" || warn "$NAME: no asset URLs found in index.html"
    continue
  fi
  HITS=""
  for A in $ASSETS; do
    BODY=$(curl -sS --max-time 25 "${CURL_AUTH[@]}" "$HOST$A" 2>/dev/null)
    for PAT in 'service_role' 'derzen-dev' 'dev@derzen\.site' 'password:"[^"]\{6,\}"' 'sk-[A-Za-z0-9]\{20,\}' 'gsk_[A-Za-z0-9]\{20,\}'; do
      echo "$BODY" | grep -qE "$PAT" && HITS="$HITS $PAT"
    done
  done
  [ -z "$HITS" ] && pass "$NAME: no credential-shaped strings in the bundle" \
                 || fail "$NAME: bundle contains ->$HITS"
done

echo
echo "══ 3. Source maps are not published ══"
for HOST in "$APP" "$DEV"; do
  NAME=$(echo "$HOST" | sed 's|https://||')
  MAP=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$HOST/assets/index.js.map" 2>/dev/null)
  [ "$MAP" = "200" ] && fail "$NAME: a .map file is served" || pass "$NAME: no source maps served"
done

echo
echo "══ 4. Security headers on the public app ══"
H=$(hdrs "$APP/")
check_hdr() {
  echo "$H" | grep -qi "^$1:" && pass "$2" || fail "$2 missing"
}
check_hdr "strict-transport-security" "HSTS"
check_hdr "x-content-type-options"    "X-Content-Type-Options"
check_hdr "x-frame-options"           "X-Frame-Options"
check_hdr "referrer-policy"           "Referrer-Policy"
check_hdr "permissions-policy"        "Permissions-Policy"
CSP=$(echo "$H" | grep -i "^content-security-policy:" | tr -d '\r')
if echo "$CSP" | grep -q "script-src"; then
  echo "$CSP" | grep -qE "script-src[^;]*unsafe-(inline|eval)" \
    && fail "CSP allows unsafe-inline or unsafe-eval on script-src" \
    || pass "CSP present with a locked script-src"
else
  fail "CSP has no script-src directive (Hostinger's default upgrade-insecure-requests only). .htaccess did not land."
fi

echo
echo "══ 5. HTTPS is forced ══"
RED=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "http://app.alvianpermana.art/" 2>/dev/null)
echo "$RED" | grep -q "^30" && pass "http redirects ($RED)" || warn "http did not redirect ($RED)"

echo
echo "══ 6. Dotfiles and config are denied ══"
for P in ".env" ".htaccess" "supabase/migrations/0001_auth_and_tenancy.sql"; do
  C=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$APP/$P" 2>/dev/null)
  [ "$C" = "200" ] && fail "$P is readable" || pass "$P not served ($C)"
done

echo
[ $FAILED -eq 0 ] && echo "All checks passed." || echo "One or more checks FAILED. Do not treat this deploy as secured."
exit $FAILED
