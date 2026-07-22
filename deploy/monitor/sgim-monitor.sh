#!/bin/bash
# Health checks for the sgim deployment (sgim-0lt.11).
#
# Emits one structured JSON line per check to the journal and exits non-zero if
# anything is wrong, so `systemctl status` / journald show the failure and any
# alerting layer can hook onto the exit code.
#
# Set ALERT_WEBHOOK to POST failures somewhere (Slack/Discord/ntfy/healthchecks
# style). Without it the checks still run and record — they just do not page.
set -uo pipefail

STACK_DIR=${STACK_DIR:-/srv/sgim}
BACKUP_DIR=${BACKUP_DIR:-/srv/backups/sgim}
DISK_WARN_PCT=${DISK_WARN_PCT:-80}
BACKUP_MAX_AGE_DAYS=${BACKUP_MAX_AGE_DAYS:-9}   # weekly backups + slack
CERT_MIN_DAYS=${CERT_MIN_DAYS:-21}              # renewal starts at 30
ALERT_WEBHOOK=${ALERT_WEBHOOK:-}

problems=0

report() { # level, check, message
  printf '{"timestamp":"%s","level":"%s","check":"%s","message":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$2" "$3"
  if [ "$1" = "error" ]; then
    problems=$((problems + 1))
    [ -n "$ALERT_WEBHOOK" ] && curl -fsS -m 10 -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"sgim $2: $3\"}" "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
  fi
}

# --- disk ---
# The owner's specific concern. Note what actually grows here: Docker images
# (a new ~840 MB CMS image per deploy) dwarf the backups, which are ~90 KB each.
used=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "$used" -ge "$DISK_WARN_PCT" ]; then
  report error disk "root filesystem ${used}% full (threshold ${DISK_WARN_PCT}%)"
else
  report info disk "root filesystem ${used}% full"
fi

reclaimable=$(docker system df --format '{{.Type}} {{.Reclaimable}}' 2>/dev/null | awk '/Images/{print $2}')
report info docker-images "reclaimable image space: ${reclaimable:-unknown}"

# --- backups exist and are fresh ---
newest=$(find "$BACKUP_DIR" -maxdepth 1 -name 'sgim-db-*.sql.gz' -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
if [ -z "$newest" ]; then
  report error backup "no database backup found in $BACKUP_DIR"
else
  age_days=$(( ( $(date +%s) - $(stat -c %Y "$newest") ) / 86400 ))
  if [ "$age_days" -gt "$BACKUP_MAX_AGE_DAYS" ]; then
    report error backup "newest backup is ${age_days}d old (max ${BACKUP_MAX_AGE_DAYS}d)"
  else
    report info backup "newest backup ${age_days}d old, $(stat -c %s "$newest") bytes"
  fi
fi

# --- containers ---
cd "$STACK_DIR" 2>/dev/null || report error stack "cannot enter $STACK_DIR"
for svc in db cms web; do
  cid=$(docker compose ps -q "$svc" 2>/dev/null)
  if [ -z "$cid" ]; then
    report error container "$svc is not running"
    continue
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null)
  [ "$state" = "running" ] && report info container "$svc $state" \
                           || report error container "$svc is $state"
done

# --- the site actually answers ---
for url in https://sgim.khebbie.dk/ https://khebbie.dk/posts/; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$url" 2>/dev/null)
  [ "$code" = "200" ] && report info http "$url -> $code" \
                      || report error http "$url -> ${code:-no response}"
done

# --- certificates ---
# Independent of Let's Encrypt's own expiry mail: this catches renewal silently
# breaking, which is exactly how the cert nearly lapsed before.
for host in khebbie.dk sgim.khebbie.dk; do
  end=$(echo | openssl s_client -connect "$host:443" -servername "$host" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$end" ]; then
    report error cert "$host: could not read certificate"
    continue
  fi
  days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 ))
  [ "$days" -lt "$CERT_MIN_DAYS" ] && report error cert "$host expires in ${days}d" \
                                   || report info cert "$host valid ${days}d"
done

# --- the CMS API must not be reachable from the internet ---
# A regression here (someone adding `ports:`) would silently expose the API.
code=$(curl -s -o /dev/null -w '%{http_code}' -m 8 "http://157.230.29.244:1337/api/events" 2>/dev/null)
[ "$code" = "000" ] && report info isolation "CMS port not reachable externally" \
                    || report error isolation "CMS port answered externally with $code"

report info summary "$problems problem(s)"
exit $(( problems > 0 ? 1 : 0 ))
