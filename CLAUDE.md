# Project instructions for AI agents

Use this repository's harness as a system of checks, docs, and conventions rather than a single giant instruction file.

## Start here

- Read [AGENTS.md](AGENTS.md) for the entrypoint and index.
- Read [constitution.md](constitution.md) for the non-negotiable engineering rules.
- Read [spec.md](spec.md) for product context.
- Read [docs/agent-harness.md](docs/agent-harness.md) for the repository-specific harness model.

## Core expectations

- Use `mise` for package management and local validation.
- Prefer the smallest change that solves the task.
- Add or update tests for meaningful behavior.
- Run the relevant quality gate before finishing.
- Keep the docs and harness aligned with the codebase.

## Repo-specific harness

This project has two independently deployable parts:

- [cms/README.md](cms/README.md) — Strapi CMS
- [web/README.md](web/README.md) — SvelteKit site

The harness uses deterministic sensors such as linting, typechecking, tests, dependency boundaries, and secrets scanning. The default entrypoint is `mise run check`.

## Issue tracking

Use Beads for task tracking and keep issues detailed enough for another agent to work on independently.
