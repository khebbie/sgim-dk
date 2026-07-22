# Monitoring (sgim-0lt.11)

`/usr/local/bin/sgim-monitor.sh`, run hourly by `sgim-monitor.timer`. It writes
one JSON line per check to the journal and **exits non-zero** when something is
wrong, so `systemctl status sgim-monitor` and journald both show it.

## What it checks

| Check | Fails when |
| --- | --- |
| `disk` | root filesystem ≥ 80% (`DISK_WARN_PCT`) |
| `docker-images` | informational: reclaimable image space |
| `backup` | no dump found, or newest older than 9 days (weekly + slack) |
| `container` | `db`, `cms` or `web` not running |
| `http` | sgim.khebbie.dk or khebbie.dk not returning 200 |
| `cert` | a certificate expires within 21 days (renewal starts at 30) |
| `isolation` | the CMS port answers from the public internet |

The last one is deliberate: the whole "API is private" guarantee rests on the
stack publishing no ports, and a future `ports:` entry would silently undo it.
This catches that regression from the outside.

```bash
/usr/local/bin/sgim-monitor.sh            # run now
journalctl -u sgim-monitor -n 20          # recent results
DISK_WARN_PCT=1 /usr/local/bin/sgim-monitor.sh   # prove failures are detected
```

## Disk

Backups are **not** the disk risk: each is ~90 KB and only 5 are kept
(~450 KB total). The real consumer is Docker — every deploy leaves an orphaned
~840 MB CMS image behind. At the time this was set up, 3.4 GB of images were
present with 2.78 GB reclaimable, plus 45 unused volumes.

So `docker-prune.timer` runs `docker image prune -f` weekly. It prunes **images
only** — volumes are never pruned automatically, because they hold the database
and the uploaded media.

Still outstanding: **45 unused volumes (~1.36 GB)** from earlier stacks (the old
ghost/mariadb setup). They were left alone deliberately — deleting a volume is
irreversible and they may hold data worth keeping. Removing them needs an
owner decision:

```bash
docker volume ls -qf dangling=true          # inspect first
docker volume rm <name>                     # then remove individually
```

## Alerting — still needs a channel

The checks run and record, but nothing pages anyone yet. Two gaps:

1. **A destination.** Set `ALERT_WEBHOOK` in `sgim-monitor.service` to POST
   failures to Slack/Discord/ntfy/healthchecks.io. Without it, failures are
   only visible in the journal — which nobody reads on a quiet Tuesday.
2. **External uptime.** Every check here runs *on the box*. If the droplet dies
   or loses network, nothing reports it. An external monitor (UptimeRobot,
   healthchecks.io, or another host) is what catches a total outage.

Let's Encrypt also emails expiry warnings to the registered address, which is an
independent backstop for the certificate case.
