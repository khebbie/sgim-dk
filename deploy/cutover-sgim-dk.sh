#!/bin/bash
# sgim.dk cutover (sgim-0lt.5). Run ON THE VPS, AFTER the A records for
# sgim.dk and www.sgim.dk point at this host.
#
# Ordering matters and is the whole reason this is a script:
#   1. certificate FIRST — nginx refuses to start with a missing ssl_certificate,
#      so installing the vhost early would take the blog down too.
#   2. then the vhost, tested before reload, rolled back if the test fails.
#   3. no app change is needed: ORIGIN is deliberately unset, so adapter-node
#      derives the origin per request from the proxy headers. That is what lets
#      sgim.dk and sgim.khebbie.dk BOTH serve the site with working forms.
#
# Rollback: revert the DNS A records. Everything here is additive — the blog and
# the sgim.khebbie.dk vhost keep working throughout.
set -euo pipefail

STACK_DIR=${STACK_DIR:-/srv/sgim}
NGINX_DIR=${NGINX_DIR:-/srv/sgim/nginx}
EDGE_DIR=${EDGE_DIR:-/srv/khebbie-blog}
EMAIL=${EMAIL:-khebbie1974@gmail.com}
VPS_IP=${VPS_IP:-157.230.29.244}

say() { printf '\n=== %s ===\n' "$1"; }

say "1/5 checking DNS"
for host in sgim.dk www.sgim.dk; do
  got=$(dig +short @8.8.8.8 "$host" A | tail -1)
  if [ "$got" != "$VPS_IP" ]; then
    echo "ABORT: $host resolves to '${got:-nothing}', expected $VPS_IP."
    echo "Let's Encrypt validates over HTTP-01, so the records must point here first."
    exit 1
  fi
  echo "$host -> $got"
done

say "2/5 issuing certificate"
# The :80 server block is a catch-all serving /.well-known/acme-challenge for
# ANY hostname, so no nginx change is needed before this.
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v /srv/acme/webroot:/var/www/certbot \
  certbot/certbot:latest certonly --webroot -w /var/www/certbot \
  -d sgim.dk -d www.sgim.dk --cert-name sgim.dk \
  --non-interactive --agree-tos -m "$EMAIL"

test -s /etc/letsencrypt/live/sgim.dk/fullchain.pem || { echo "ABORT: no certificate"; exit 1; }

say "3/5 installing the vhost"
cp "$NGINX_DIR/sgim-dk.conf" "$NGINX_DIR/.sgim-dk.conf.staged"
cd "$EDGE_DIR"
if ! grep -q "sgim-dk.conf" docker-compose.yml; then
  python3 - <<'PY'
p = "docker-compose.yml"
s = open(p).read()
anchor = "      - /srv/sgim/nginx/sgim.conf:/etc/nginx/conf.d/sgim.conf:ro"
add = anchor + "\n      - /srv/sgim/nginx/sgim-dk.conf:/etc/nginx/conf.d/sgim-dk.conf:ro"
assert anchor in s, "expected sgim.conf mount"
open(p, "w").write(s.replace(anchor, add))
print("mounted sgim-dk.conf")
PY
  docker compose up -d
  sleep 4
fi

if ! docker exec khebbie-blog nginx -t >/dev/null 2>&1; then
  echo "ABORT: nginx config test failed — rolling back the vhost"
  docker exec khebbie-blog nginx -t || true
  rm -f "$NGINX_DIR/sgim-dk.conf"
  docker compose up -d
  exit 1
fi
docker exec khebbie-blog nginx -s reload

say "4/5 updating the CMS public URL"
# Only Strapi needs a single canonical URL (for admin links/emails). The web app
# needs no change — it derives the origin per request, so both hosts keep working.
cd "$STACK_DIR"
sed -i 's|^CMS_PUBLIC_URL=.*|CMS_PUBLIC_URL=https://sgim.dk|' .env
docker compose up -d
sleep 6

say "5/5 verifying"
fail=0
# Both sgim hosts must keep working, plus the blog.
for url in https://sgim.dk/ https://sgim.dk/kalender https://sgim.dk/om-os https://sgim.dk/admin \
           https://sgim.khebbie.dk/ https://khebbie.dk/posts/; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$url")
  printf '%-32s %s\n' "$url" "$code"
  [ "$code" = "200" ] || fail=1
done
redir=$(curl -s -o /dev/null -w '%{http_code}' -m 20 https://www.sgim.dk/)
printf '%-32s %s (expect 301)\n' "https://www.sgim.dk/" "$redir"
subj=$(echo | openssl s_client -connect sgim.dk:443 -servername sgim.dk 2>/dev/null | openssl x509 -noout -subject)
echo "certificate: $subj"

if [ "$fail" = "0" ]; then
  echo
  echo "Cutover OK. sgim.dk and sgim.khebbie.dk both serve the site."
  echo "Remaining by hand:"
  echo "  - legacy .aspx redirects (sgim-0lt.12)"
  echo "  - consider a canonical link tag so search engines pick one host"
else
  echo "SOME CHECKS FAILED — investigate before announcing. Rollback = revert DNS."
fi
