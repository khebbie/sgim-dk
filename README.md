# sgim.dk

This repository contains the sgim.dk monorepo for the public website and the CMS.

## Overview

- CMS: a Strapi-based content backend in [cms/](cms)
- Website: a SvelteKit frontend in [web/](web)
- Root tooling: shared development tooling and repo-level checks in the project root

## Project structure

- [cms/](cms) — Strapi admin, API, content types, and local database setup
- [web/](web) — SvelteKit app for the public site and members area
- [spec.md](spec.md) — project requirements and scope
- [constitution.md](constitution.md) — engineering principles for the codebase
- [AGENTS.md](AGENTS.md) — repository-specific agent workflow guidance

## Getting started

This project is organized as a monorepo with separate app directories.

### Recommended workflow

- Install dependencies with mise:

  ```bash
  mise run install
  ```

- Run the full checks:

  ```bash
  mise run check
  ```

### Running the apps

Use the repo-level mise tasks for local development:

- CMS:

  ```bash
  mise run dev:cms
  ```

- Website:

  ```bash
  mise run dev:web
  ```

For app-specific setup, configuration, and scripts, see the dedicated README files:

- [cms/README.md](cms/README.md)
- [web/README.md](web/README.md)
