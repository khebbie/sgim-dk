#!/bin/bash
# Backup the sgim production data (sgim-0lt.8).
#
# Two things must be captured, and they live in different places:
#   1. the Postgres database  — all content (events, pages, duty assignments)
#   2. the Strapi uploads volume — media is NOT in the database
# Losing either one loses real content, so both are dumped together and share a
# timestamp, which keeps a restore pair obvious.
#
# Runs WEEKLY with roughly a month of retention (5 copies). Content changes
# rarely — the programme arrives as a bulk import — so the trade-off is that up
# to a week of edits could be lost in a total-loss scenario.
#
# Run by sgim-backup.timer; see deploy/backup/README.md for restores.
set -euo pipefail

STACK_DIR=${STACK_DIR:-/srv/sgim}
BACKUP_DIR=${BACKUP_DIR:-/srv/backups/sgim}
KEEP=${KEEP:-5}

STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

cd "$STACK_DIR"

# Read the database credentials from the stack's own .env so they are defined
# in exactly one place.
# shellcheck disable=SC1091
set -a; . "$STACK_DIR/.env"; set +a

DB_FILE="$BACKUP_DIR/sgim-db-$STAMP.sql.gz"
UPLOADS_FILE="$BACKUP_DIR/sgim-uploads-$STAMP.tar.gz"

# --- database ---
# pg_dump runs inside the db container; -T because there is no TTY in a timer.
docker compose exec -T db pg_dump -U "$DATABASE_USERNAME" -d "$DATABASE_NAME" --clean --if-exists \
  | gzip -9 > "$DB_FILE.tmp"
mv "$DB_FILE.tmp" "$DB_FILE"

# --- uploads ---
# Read straight from the named volume, so this works even if the CMS is down.
docker run --rm \
  -v sgim_cms_uploads:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/$(basename "$UPLOADS_FILE").tmp" -C /data . 2>/dev/null
mv "$UPLOADS_FILE.tmp" "$UPLOADS_FILE"

# A zero-byte or truncated dump is worse than no dump, because it looks like a
# backup. Fail loudly instead.
if [ ! -s "$DB_FILE" ] || ! gzip -t "$DB_FILE"; then
  echo "FATAL: database dump missing or corrupt: $DB_FILE" >&2
  exit 1
fi

# --- retention: keep the last $KEEP of each artefact (~1 month of weeklies) ---
prune() { # dir, glob, keep
  find "$1" -maxdepth 1 -name "$2" -type f -printf '%T@ %p\n' \
    | sort -rn | tail -n +"$(( $3 + 1 ))" | cut -d' ' -f2- | xargs -r rm -f
}
prune "$BACKUP_DIR" 'sgim-db-*.sql.gz'      "$KEEP"
prune "$BACKUP_DIR" 'sgim-uploads-*.tar.gz' "$KEEP"

echo "{\"operation\":\"backup\",\"stamp\":\"$STAMP\",\"db_bytes\":$(stat -c %s "$DB_FILE"),\"uploads_bytes\":$(stat -c %s "$UPLOADS_FILE")}"
