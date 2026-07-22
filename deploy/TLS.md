# TLS / Let's Encrypt on the khebbie.dk VPS

How certificates are issued and renewed for the blog and the sgim sites
(sgim-0lt.1). Everything here runs on the VPS (157.230.29.244).

## What was wrong

The server previously used **nginx-proxy + acme-companion** — Let's Encrypt
called the proxy, the companion answered the HTTP-01 challenge and renewed the
cert. Its traces are still in `/etc/letsencrypt/khebbie.dk/` (a `.companion`
marker and ACME account symlinks).

That companion container is gone: the blog migration replaced the proxy stack
with a standalone nginx that only *mounted* the PEM files. Nothing renewed them
any more — no certbot, no cron, no timer — and `DEPLOYMENT.md` claiming
"certificates auto-renew via certbot" was stale. The khebbie.dk certificate was
26 days from expiring with no mechanism to renew it.

## How it works now

**certbot in Docker, HTTP-01 over a webroot.** No packages are installed on the
host (it is an EOL Ubuntu 18.04), and certbot stays current by image tag.

- `/srv/acme/webroot` — challenge webroot, mounted read-only into the edge nginx
  and read-write into certbot.
- The edge nginx serves `/.well-known/acme-challenge/` over **plain HTTP**.
  This required restructuring the `:80` server block: it used a server-level
  `return 301`, which runs in the rewrite phase and would swallow the challenge.
  The redirect now lives in `location /` so the ACME location can win.
- Certificates live at `/etc/letsencrypt/live/<name>/` and the whole
  `/etc/letsencrypt` tree is mounted into nginx so `live/` symlinks into
  `archive/` resolve.
- One certificate **per site** (not one combined SAN cert) so the blog and the
  sgim hosts stay independent — adding sgim.dk later cannot break the blog.

### Renewal

`/usr/local/bin/certbot-renew.sh`, run by the `certbot-renew.timer` systemd
timer twice a day (03:00 and 15:00 with a randomised delay). certbot only acts
within 30 days of expiry. After renewing, the script reloads every running
TLS-terminating container so the new cert is actually picked up — nginx keeps
the old one in memory otherwise.

The ACME account is registered with an email address, so Let's Encrypt also
sends expiry warnings. That is the backstop against this silently lapsing again;
`sgim-0lt.11` adds independent expiry monitoring.

## Current state

| Host | Certificate | Notes |
| --- | --- | --- |
| khebbie.dk | issued, expires 2026-10-20 | serves the Hugo blog |
| sgim.khebbie.dk | issued, expires 2026-10-20 | **no vhost yet** — until `sgim-0lt.4` the catch-all serves the blog with a mismatched cert |
| sgim.dk, www.sgim.dk | not issued | blocked until DNS points at the VPS (`sgim-0lt.5`) |

## Commands

```bash
# Add a hostname (e.g. at the sgim.dk cutover, once DNS points here)
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v /srv/acme/webroot:/var/www/certbot \
  certbot/certbot:latest certonly --webroot -w /var/www/certbot \
  -d sgim.dk -d www.sgim.dk --cert-name sgim.dk \
  --non-interactive --agree-tos -m <email>

# Verify renewal without touching rate limits
docker run --rm -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v /srv/acme/webroot:/var/www/certbot \
  certbot/certbot:latest renew --dry-run --webroot -w /var/www/certbot

systemctl list-timers certbot-renew.timer   # when it next runs
systemctl start certbot-renew.service       # run it now
journalctl -u certbot-renew.service         # what happened
```

A pre-change backup of the edge config and the old certs is at
`/root/acme-backup-<timestamp>/`.
