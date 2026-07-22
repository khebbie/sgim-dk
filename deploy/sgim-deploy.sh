#!/bin/bash
# Deploy the sgim stack (sgim-0lt.10).
#
# This is the ONLY thing the CI deploy key may run: it is wired into
# /root/.ssh/authorized_keys as a forced command, so a leaked key can trigger a
# redeploy of an already-published image and nothing else — no shell, no
# arbitrary commands, no port forwarding.
#
# Usage:  sgim-deploy.sh [image-tag]
#   image-tag defaults to "latest"; pass a commit SHA to pin or roll back.
set -euo pipefail

STACK_DIR=${STACK_DIR:-/srv/sgim}
TAG=${1:-latest}

# The forced command hands whatever the client asked for in SSH_ORIGINAL_COMMAND.
# Accept it ONLY if it looks like a real tag — "latest" or a git SHA. Anything
# else is ignored rather than written to .env: an early version happily took
# "cat /srv/sgim/.env" as a tag (stripped to junk), which would have pointed the
# stack at a nonexistent image on the next deploy.
if [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  candidate=$(printf '%s' "$SSH_ORIGINAL_COMMAND" | tr -cd 'A-Za-z0-9._-')
  if printf '%s' "$candidate" | grep -qiE '^(latest|[0-9a-f]{7,40})$'; then
    TAG="$candidate"
  else
    echo "refusing tag from SSH_ORIGINAL_COMMAND: not 'latest' or a commit SHA" >&2
    exit 2
  fi
fi

# Same check for a positional argument.
if ! printf '%s' "$TAG" | grep -qiE '^(latest|[0-9a-f]{7,40})$'; then
  echo "invalid image tag: $TAG (expected 'latest' or a commit SHA)" >&2
  exit 2
fi

cd "$STACK_DIR"

echo "deploying tag: $TAG"
sed -i "s|^IMAGE_TAG=.*|IMAGE_TAG=$TAG|" .env

docker compose pull -q
docker compose up -d

# Wait for the stack to settle, then confirm the site actually serves. A deploy
# that leaves the site down should be visible here, not discovered by a visitor.
sleep 8
fail=0
for url in https://sgim.khebbie.dk/ https://sgim.khebbie.dk/kalender; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$url" || echo 000)
  echo "  $url -> $code"
  [ "$code" = "200" ] || fail=1
done

# Housekeeping: each deploy orphans the previous image (~840 MB for the CMS).
docker image prune -f >/dev/null 2>&1 || true

if [ "$fail" != "0" ]; then
  echo "DEPLOY FAILED verification. Roll back with: sgim-deploy.sh <previous-sha>"
  exit 1
fi
echo "deploy ok"
