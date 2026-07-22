# Backups (sgim-0lt.8)

Two things must be captured, and they live in different places:

1. **The Postgres database** — all content: events, clubs, pages, navigation,
   site settings, duty assignments, admin/member accounts.
2. **The Strapi uploads volume** — media is *not* in the database.

Losing either loses real content, so both are dumped together with a shared
timestamp: a restore pair is always obvious.

## What runs

| Unit | Schedule | Does |
| --- | --- | --- |
| `sgim-backup.timer` | daily 02:30 UTC (randomised) | `/usr/local/bin/sgim-backup.sh` |

Output lands in `/srv/backups/sgim/`:

- `daily/` — last **7** database dumps + uploads archives
- `weekly/` — Sunday runs, last **4**

The script fails loudly if the dump is missing or fails `gzip -t`. A zero-byte
dump is worse than no dump, because it looks like a backup.

## Restoring

Prove the backup first — never restore into production from an unverified file:

```bash
/usr/local/bin/sgim-restore-drill.sh                 # newest backup
/usr/local/bin/sgim-restore-drill.sh /path/to.sql.gz # a specific one
```

The drill restores into a throwaway database, prints row counts, and drops it.
Production is untouched.

To restore **into production** (destructive — the dump is `--clean --if-exists`,
so it drops and recreates objects):

```bash
cd /srv/sgim
set -a; . ./.env; set +a
docker compose stop web cms                 # stop writers first
gunzip -c /srv/backups/sgim/daily/sgim-db-<stamp>.sql.gz \
  | docker compose exec -T db psql -U "$DATABASE_USERNAME" -d "$DATABASE_NAME"
docker run --rm -v sgim_cms_uploads:/data -v /srv/backups/sgim/daily:/backup \
  alpine tar xzf /backup/sgim-uploads-<stamp>.tar.gz -C /data
docker compose up -d
```

## Verified

The drill has been run against a real backup and recovered: 683 events,
6 clubs, 4 navigation items, the Om os page and 6 duty categories — with real
rows, not an empty schema.

Note for anyone writing queries against this database: Strapi names its tables
**singular and hyphenated** (`event`, `club`, `static-page`), not by the plural
API ids. The first version of the drill checked `events`/`clubs`, found nothing
and looked like a failed restore when the backup was in fact fine.

## Not done yet — offsite

Backups currently sit **on the same droplet as the data they protect**. That
covers "someone deleted the wrong thing" but not losing the VPS. It also means
they are unencrypted at rest, and the content includes member names.

Offsite needs a destination and credentials (object storage, another host).
Whatever is chosen should be encrypted and monitored for failure — a backup
job that has been silently failing for a month is the classic way to discover
all of this too late.
