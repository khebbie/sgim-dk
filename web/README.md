# sgim.dk — website

Public site and members-only duty rosters for Stjær/Galten Indre Mission,
built with **SvelteKit (TypeScript, strict)**. This app is the "website"
half of the project (see repo-root `AGENTS.md` / `constitution.md`); it
consumes the Strapi CMS in `/cms` over HTTP and never talks to Postgres
directly.

## Local setup

```sh
npm install
cp .env.example .env   # then fill in the values, see below
npm run dev            # http://localhost:5173

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Configuration

All environment access goes through **one Config module**
(`src/lib/server/config.ts`) — nothing else in the app reads
`process.env`/`$env` directly. The logic that validates the raw values is a
plain, dependency-free function (`src/lib/server/config-loader.ts`) so it can
be unit tested with fake env objects (see
`src/lib/server/config-loader.test.ts`).

Copy `.env.example` to `.env` and fill in real values. Required variables:

| Variable                 | Required  | Purpose                                  |
| ------------------------ | --------- | ---------------------------------------- |
| `CMS_BASE_URL`           | yes       | Base URL of the Strapi CMS API           |
| `CMS_REQUEST_TIMEOUT_MS` | no (5000) | Timeout for outbound requests to the CMS |
| `SESSION_SECRET`         | yes       | Signs/encrypts member session cookies    |

If a required variable is missing or invalid, the app **fails fast at server
startup** with a clear `Error` naming the offending variable (wired via
`src/hooks.server.ts`, which imports the config module for its side effect)
— it does not silently start in a half-configured state.

`src/lib/server/config.ts` lives under `$lib/server`, so SvelteKit refuses to
bundle it into client-side code — the session secret can never leak to the
browser.

## CSS approach

Plain CSS, no framework/preprocessor. Design tokens (colors, spacing, type
scale) are CSS custom properties in `src/lib/styles/tokens.css`, imported by
the global stylesheet `src/app.css` (loaded once, from the root layout).
Components should read `var(--token-name)` rather than hard-coding values.
This was chosen over Tailwind to keep the dependency surface small for a
site of this size; revisit if the component count grows a lot.

## Locale

Danish is the only locale (`<html lang="da">` in `src/app.html`) — no i18n
library is set up.

## Scripts

| Script      | Purpose                                    |
| ----------- | ------------------------------------------ |
| `dev`       | Start the Vite dev server                  |
| `build`     | Production build (Node adapter, see below) |
| `preview`   | Run the production build locally           |
| `test`      | Run the Vitest suite once                  |
| `lint`      | `prettier --check` + `eslint`              |
| `typecheck` | `svelte-kit sync` + `svelte-check`         |

## Building & deployment target

```sh
npm run build
npm run preview   # try the production build locally
```

This project uses `@sveltejs/adapter-node`, since the deployment target is a
plain Node process inside a docker-compose stack (see `sgim-x60.13`).
Actual deployment/CI is out of scope for this repo.
