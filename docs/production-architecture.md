# Production architecture

How sgim.dk runs on the khebbie.dk VPS, and — more importantly — *why*. Several
of these choices look like they could be simplified, and simplifying them would
break something non-obvious. Operational commands live in
[../deploy/README.md](../deploy/README.md).

```
                    internet
                       │  :80 / :443
            ┌──────────▼───────────┐
            │  edge nginx          │  the only thing binding public ports.
            │  (khebbie-blog       │  Terminates TLS. Also serves the Hugo blog.
            │   container)         │
            └───┬───────────┬──────┘
      khebbie.dk│           │ sgim.dk, sgim.khebbie.dk
       (static  │           │
        blog)   │   ┌───────┴────────────────────────────┐
                │   │ /            → web:3000            │
                │   │ /uploads/    → cms:1337  (media)   │
                │   │ /admin, …    → cms:1337  (panel)   │
                │   └───────┬──────────────┬─────────────┘
                │           │              │
                │      ┌────▼─────┐   ┌────▼─────┐
                │      │   web    │   │   cms    │   no published ports
                │      │ SvelteKit│──▶│  Strapi  │   on either
                │      └──────────┘   └────┬─────┘
                │        internal network  │
                │                     ┌────▼─────┐
                │                     │    db    │   no published ports
                │                     │ Postgres │
                └─────────────────────└──────────┘
```

## Why the CMS API is private, and how

The requirement is that Strapi's content API is reachable only by the website.
That is enforced by **`cms` and `db` publishing no ports at all** — they exist
only on an internal docker network.

The firewall is *not* what protects them. ufw allows only 22/tcp, yet 80/443 are
publicly reachable, because Docker inserts its own iptables rules ahead of ufw.
**Any `ports:` entry added to `cms` or `db` would expose it to the internet
regardless of ufw.** The hourly monitor checks this from outside and fails if
the CMS port ever answers.

## Why `/api` is not blocked at the proxy

It looks obvious to deny `/api` on the public vhost to "hide Strapi". Do not:
**SvelteKit owns `/api/v1/events/ics`**, the calendar subscription feed. A
blanket deny silently kills it.

Privacy comes from *never routing* `/api` to Strapi. The web app reaches the CMS
at `http://cms:1337` over the internal network, never through nginx.

## Why `/uploads` is proxied to the CMS

`mediaUrl()` returns Strapi's **relative** URLs (`/uploads/x.jpg`), so browsers
request media from the public site origin. Without the proxy rule every
CMS-uploaded image 404s.

## Why upstreams resolve at request time

The vhosts use `resolver 127.0.0.11` with variables in `proxy_pass`, rather than
naming `web`/`cms` directly. With direct names, nginx resolves at startup and
**refuses to start if the sgim stack is down — taking the blog down with it**.
Resolving per request means those requests 502 while everything else keeps
working.

## Why ORIGIN is unset

adapter-node's `ORIGIN` pins the app to one hostname and rejects form POSTs from
any other with *"Cross-site POST form submissions are forbidden"*. The site
answers on both `sgim.dk` and `sgim.khebbie.dk`, so the origin is derived per
request from `X-Forwarded-Proto/Host`.

That is safe **because** the app publishes no port: every request arrives
through nginx, which sets those headers from the real request rather than
passing a client-supplied value through. If the app were ever exposed directly,
this would become spoofable.

## Why TZ=Europe/Copenhagen

Event times are Danish wall-clock strings (`"19:00"`), combined with the date via
`new Date("<date>T<time>")` — parsed in the **container's** zone. A UTC container
stores 19:00 as 19:00Z: two hours off. It is easy to miss because the
server-rendered HTML still looks right; the error appears after hydration in a
Danish browser, and in the ICS feed every subscriber imports.

## Images are built in CI, never on the VPS

The box has 2 GB RAM and no swap; the Strapi admin build would likely OOM.
CI builds and pushes to GHCR tagged with the commit SHA, and the server pulls.
That is also what makes rollback a tag change rather than a rebuild.

## Deploy access

CI deploys over SSH with a key restricted by a **forced command** — it can only
run `sgim-deploy.sh`, with a tag that must be `latest` or a commit SHA. A leaked
key can redeploy an already-published image and nothing else: no shell, no
forwarding, no arbitrary commands.

## Known gaps

- **Ubuntu 18.04 is EOL.** Docker's bionic packages topped out at 24.0.2, so the
  next engine upgrade needs an OS upgrade.
- **Backups are on the same droplet as the data** (`sgim-0lt.16`).
- **Alerting has no destination** and every check runs on the box it monitors,
  so a dead droplet reports nothing (`sgim-0lt.11`).
- **No SMTP**, so Strapi cannot send password resets (`sgim-0lt.13`).
