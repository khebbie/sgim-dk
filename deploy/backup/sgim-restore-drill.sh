#!/bin/bash
# Restore drill (sgim-0lt.8): prove the latest backup is actually restorable.
#
# Restores into a throwaway database and counts real rows. Production is never
# touched. An untested backup is not a backup, so this is meant to be run
# periodically — not just once when it was set up.
set -euo pipefail

STACK_DIR=${STACK_DIR:-/srv/sgim}
BACKUP_DIR=${BACKUP_DIR:-/srv/backups/sgim}
DRILL_DB=${DRILL_DB:-restore_drill}

cd "$STACK_DIR"
# shellcheck disable=SC1091
set -a; . "$STACK_DIR/.env"; set +a

LATEST=${1:-$(ls -t "$BACKUP_DIR"/daily/sgim-db-*.sql.gz | head -1)}
echo "restoring: $(basename "$LATEST")"

psql_admin() { docker compose exec -T db psql -U "$DATABASE_USERNAME" -d postgres "$@"; }
psql_drill() { docker compose exec -T db psql -U "$DATABASE_USERNAME" -d "$DRILL_DB" "$@"; }

psql_admin -q -c "DROP DATABASE IF EXISTS $DRILL_DB;" >/dev/null
psql_admin -q -c "CREATE DATABASE $DRILL_DB;" >/dev/null

if ! gunzip -c "$LATEST" | psql_drill -q -v ON_ERROR_STOP=0 >/tmp/restore-drill.log 2>&1; then
  echo "restore reported errors; see /tmp/restore-drill.log"
fi

# Strapi names its tables singular and hyphenated ("event", "static-page"),
# not the plural API ids — hence the quoted identifiers below.
echo "--- row counts recovered ---"
psql_drill -tAc "
  SELECT table_name || ' = ' || (xpath('/row/c/text()',
    query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('event','club','static-page','navigation','duty-category','admin_users','up_users')
  ORDER BY table_name;"

echo "--- proof it is real data, not just an empty schema ---"
psql_drill -tAc "SELECT title || ' @ ' || COALESCE(start_time::text,'(all day)') FROM \"event\" ORDER BY start_date LIMIT 2;"

psql_admin -q -c "DROP DATABASE $DRILL_DB;" >/dev/null
echo "drill complete; scratch database dropped"
