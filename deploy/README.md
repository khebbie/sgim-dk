# Running sgim.dk in production

Operational entry point for the deployment on the khebbie.dk VPS
(157.230.29.244). Topic detail lives in [TLS.md](TLS.md),
[backup/README.md](backup/README.md) and [monitor/README.md](monitor/README.md);
the architecture and the reasoning behind it are in
[../docs/production-architecture.md](../docs/production-architecture.md).

## Where things are

| What | Where |
| --- | --- |
| Stack (compose + `.env`) | `/srv/sgim` on the VPS |
| Edge nginx (also serves the Hugo blog) | `/srv/khebbie-blog` |
| sgim vhosts | `/srv/sgim/nginx/*.conf`, mounted into the edge container |
| Secrets | `/srv/sgim/.env` — root-only, `chmod 600`, **never in git** |
| Data | docker volumes `sgim_db_data`, `sgim_cms_uploads` |
| Backups | `/srv/backups/sgim` |
| Images | `ghcr.io/khebbie/sgim-{web,cms}`, tagged `latest` and per commit SHA |

Services: `db` (Postgres), `cms` (Strapi), `web` (SvelteKit). Only the edge
nginx binds public ports.

## Deploying

**Push to `main`.** If CI is green it builds both images and deploys them,
pinned to that commit's SHA. Nothing else is required.

```bash
gh run watch                              # follow the pipeline
ssh root@khebbie.dk 'grep ^IMAGE_TAG /srv/sgim/.env'   # what is live
```

Manually, on the server:

```bash
/usr/local/bin/sgim-deploy.sh              # latest
/usr/local/bin/sgim-deploy.sh <commit-sha> # a specific build
```

The script switches the tag, pulls, restarts, **verifies the site answers 200**
and fails loudly otherwise, then prunes the previous image.

**Expected downtime: a few seconds** while containers restart. Deploys are not
zero-downtime; that is fine for this site.

## Rolling back

```bash
ssh root@khebbie.dk '/usr/local/bin/sgim-deploy.sh <previous-sha>'
```

No rebuild is needed — images are kept per SHA.

> **⚠️ Code rolls back. The database does not.**
>
> If the deploy you are undoing included a Strapi **content-type change**, the
> database schema has already migrated. The older image may not understand it,
> so rolling back the image alone can fail or misbehave.
>
> For a schema-affecting rollback you must restore the database from the
> backup taken *before* the deploy — see
> [backup/README.md](backup/README.md). Verify the backup first with
> `sgim-restore-drill.sh`; restoring an unverified dump over live data is how a
> small incident becomes a large one.
>
> Plain code, content or styling changes have no schema dimension: roll back
> freely.

## Day-to-day

```bash
cd /srv/sgim

docker compose ps                    # what is running and healthy
docker compose logs -f web           # follow one service (also: cms, db)
docker compose restart web           # restart one service
docker compose up -d                 # apply a compose/.env change

journalctl -u sgim-monitor -n 20 -o cat   # last health check
journalctl -u sgim-backup -n 20           # last backup
systemctl list-timers 'sgim-*' 'certbot-*' 'docker-prune*'
```

Scheduled jobs: `sgim-monitor` (hourly), `sgim-backup` (Sundays 02:30),
`certbot-renew` (twice daily), `docker-prune` (Mondays 04:00).

## The CMS

- Admin: **https://sgim.khebbie.dk/admin** (after cutover also on sgim.dk)
- The admin account is a Strapi super-admin; the password was generated on the
  server. Retrieve it with
  `ssh root@khebbie.dk 'grep BOOTSTRAP_ADMIN_PASSWORD /srv/sgim/.env'`, change
  it on first login, then blank both `BOOTSTRAP_ADMIN_*` values and redeploy.
- Public self-registration is **disabled**; members are created by an admin.
- Editing content in the admin is safe across deploys: the seed only creates
  pages/settings when missing, it does not overwrite them.

## Changing a secret

Edit `/srv/sgim/.env`, then `docker compose up -d`. Note that changing
`ENCRYPTION_KEY` or the JWT secrets invalidates existing admin sessions and API
tokens — expect to log in again.

## Going live on sgim.dk

DNS is owned by the site owner. Once `sgim.dk` and `www.sgim.dk` point at the
VPS, run `/srv/sgim/cutover-sgim-dk.sh`. It refuses to start until DNS actually
resolves here, issues the certificate, installs the vhost (testing nginx config
and rolling back if it fails), and verifies both sgim hosts plus the blog.
Rollback is reverting the A records.

Lower the sgim.dk TTL (currently 3600s) a day beforehand so the switch — and any
rollback — takes minutes rather than an hour.

## When something is wrong

1. `journalctl -u sgim-monitor -n 30 -o cat` — the hourly check covers disk,
   backups, containers, HTTP, certificates and API isolation.
2. `docker compose ps` and `docker compose logs <service>`.
3. Disk full? The usual culprit is Docker images, not backups (~90 KB each):
   `docker image prune -f`.
4. Site down but containers healthy? Check the edge:
   `docker exec khebbie-blog nginx -t` and `docker logs khebbie-blog`.
   The edge also serves the blog, so a broken nginx config takes down both.
