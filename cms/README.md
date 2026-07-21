# sgim.dk — CMS

Headless CMS for sgim.dk, built with [Strapi v5](https://docs.strapi.io) (TypeScript) and
PostgreSQL. This is one of two independently deployable parts of the project — see the repo
root [`AGENTS.md`](../AGENTS.md) and [`constitution.md`](../constitution.md) for the overall
architecture and the non-negotiable engineering rules that apply to all code here.

## Local setup

Requirements: Node.js 20–26, npm, Docker (for the local Postgres instance).

1. **Start Postgres:**

   ```bash
   docker compose up -d
   ```

   This runs a local `postgres:16-alpine` container using the credentials in `.env`/
   `.env.example` (db `sgim`, user `strapi`, password `strapi`, port `5432`). Data persists
   in the `cms_postgres_data` Docker volume. If Docker isn't available, point `DATABASE_*`
   at any reachable PostgreSQL instance instead.

2. **Configure environment:**

   ```bash
   cp .env.example .env
   ```

   Every variable in `.env.example` is documented there. Generate fresh secret values
   instead of committing the placeholders, e.g.:

   ```bash
   node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
   ```

   The app **fails fast at boot** with a clear error naming the missing variable if any
   required value (`DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `APP_KEYS`,
   `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`,
   `ENCRYPTION_KEY`) is missing — see `src/config/env.ts`.

3. **Install dependencies** (already done if you just ran `npm install`):

   ```bash
   npm install
   ```

4. **Run the admin panel:**

   ```bash
   npm run dev
   ```

   Strapi starts at `http://localhost:1337/admin` (or `$HOST:$PORT`). The first time you
   visit it, Strapi prompts you to create the first admin user.

## npm scripts

| Script              | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Start Strapi in develop mode (autoReload).          |
| `npm run build`     | Build the admin panel for production.               |
| `npm run start`     | Start Strapi in production mode (no autoReload).    |
| `npm test`          | Run the Jest test suite.                            |
| `npm run lint`      | Run ESLint over the project.                        |
| `npm run typecheck` | Type-check with `tsc --noEmit` (no output emitted). |

## Configuration — a single Config module

Per the constitution's determinism rule ("inject Config… no hidden `process.env`"), **all**
environment reads live in one place: [`src/config/env.ts`](./src/config/env.ts). Its
`getEnvConfig()` function:

- reads and validates every environment variable exactly once (result is cached),
- **throws immediately** with a descriptive `MissingEnvVarError` if a required variable
  (database credentials, `APP_KEYS`, JWT/admin/api secrets) is absent or empty, and
- throws a descriptive error if a numeric variable (e.g. `PORT`, `DATABASE_PORT`) can't be
  parsed as an integer.

Strapi's own configuration entry points — `config/database.ts`, `config/server.ts`,
`config/admin.ts` — are required by the framework to live at those exact paths, so they
can't be removed, but each one only calls `getEnvConfig()` and maps the result into the
shape Strapi expects. None of them read `process.env` directly. (Two purely cosmetic admin
panel toggles, `WEBHOOKS_POPULATE_RELATIONS` and the `FLAG_*` admin UI flags, are left on
Strapi's own `env()` helper since they aren't part of the required configuration surface —
DB connection, secrets, server host/port.)

Application code (content-type lifecycle hooks, controllers, services, etc.) must import
`getEnvConfig()` rather than reading `process.env` directly.

## Database

PostgreSQL is the only supported `DATABASE_CLIENT` — this matches the production target
(constitution.md: Replaceability / production parity) and keeps `config/database.ts`
simple. There is no SQLite fallback.

## Seeding & content import

`src/config/bootstrap-seed.ts` runs on Strapi bootstrap and has two **independent** parts:

1. **Dev sample content** — gated behind `BOOTSTRAP_SEED=true`. Seeds realistic Danish
   sample content (site settings, navigation, clubs, a few events, a `medlem@sgim.dk`
   member, duties) so you can see the site without clicking through the admin. Idempotent:
   skips any content type that already has entries. **Never enable this in production.**

2. **Bulk import of scraped content** — gated behind `IMPORT_EVENTS_FILE` /
   `IMPORT_CLUBS_FILE` (absolute paths to the scraped JSON). Runs independently of the
   sample seed and is idempotent by `slug` (existing slugs are skipped). **This is the
   intended production import path.**

The JSON is produced by the repo-root Python scrapers (`scrape_sgim_program.py`,
`scrape_sgim_klubber.py`) → `sgim-events.json`, `sgim-clubs.json`.

```bash
# Production import (real calendar/clubs only, no sample content):
IMPORT_EVENTS_FILE=/abs/path/sgim-events.json \
IMPORT_CLUBS_FILE=/abs/path/sgim-clubs.json \
npm run start

# Local dev with sample content AND the scraped import:
BOOTSTRAP_SEED=true \
IMPORT_EVENTS_FILE=/abs/path/sgim-events.json \
IMPORT_CLUBS_FILE=/abs/path/sgim-clubs.json \
npm run start
```

> Note: the import is **create-only** — it adds events/clubs whose slug isn't present yet,
> but does not update changed entries or remove deleted ones. Re-running a fresh scrape
> won't reconcile edits/deletions (see the Beads follow-up on upsert semantics).

## Testing

Tests run with [Jest](https://jestjs.io) + `ts-jest` (`jest.config.js`). `src/config/env.ts`
has a full unit-test suite (`src/config/env.test.ts`) covering the fail-fast behavior for
every required variable — this is the pattern to follow for future domain logic: colocate
`*.test.ts` files next to the code they test.

## Conventions carried over from the constitution

- **Ports & adapters:** Strapi is a vendor dependency; the website consumes this CMS only
  through the versioned REST API (`/api/v1/…` once versioning is introduced), never by
  importing Strapi internals.
- **Structured logging, resilience, and validation** for content-type-specific code land as
  those content types are built (see the `sgim-pgx.*` issues in Beads); this scaffold only
  establishes the Config module, database, and tooling baseline.
- **TypeScript strict mode** is on (`tsconfig.json`); keep it on.
- **Sandi Metz rules:** keep new modules small and functions short — `src/config/env.ts` is
  split into small single-purpose builders per config section for this reason.

## Docker Compose

`docker-compose.yml` in this directory starts **Postgres only**, for local development.
Deploying the CMS itself (or a combined web+CMS compose stack) is out of scope for this
task — see `sgim-x60.13` for the local dev docker-compose that will run web + CMS together.
