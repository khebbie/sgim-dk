# Agent harness index

This file is the entrypoint for coding agents. It is intentionally short and points to the repository's real sources of truth.

## Read these first

1. [constitution.md](constitution.md) — non-negotiable engineering rules and architectural constraints.
2. [spec.md](spec.md) — product context for the website and CMS.
3. [mise.toml](mise.toml) — the default quality gates and local task runner.
4. [cms/README.md](cms/README.md) and [web/README.md](web/README.md) — app-specific setup and commands.
5. [docs/agent-harness.md](docs/agent-harness.md) — how this repository's harness is meant to work for agents.

## What this harness is

This repository uses a harness approach rather than a single giant instruction file:

- The repository knowledge lives in versioned docs and code, not in chat history.
- The quality gates are encoded as deterministic sensors in [mise.toml](mise.toml).
- The constitution is the main policy layer for architecture, testing, and resilience.
- Agents are expected to use the harness, not bypass it.

In other words, this file is an index. The real guidance lives in the docs and tools above.

## Default workflow for agents

1. Understand the request and the relevant code paths.
2. Read the relevant documentation before changing behavior or architecture.
3. Prefer the smallest change that solves the problem.
4. Add or update tests for meaningful behavior.
5. Run the relevant quality gate before finishing:
   - `mise run check` for full validation
   - `mise run check:cms` or `mise run check:web` for scoped work
6. If a sensor fails, fix the root cause rather than papering over it.

## Harness conventions

- Use `mise` for package management and local tasks. Do not use `npm` or `pnpm` directly unless a task is missing and you have added it to [mise.toml](mise.toml).
- Follow the rules in [constitution.md](constitution.md): replaceability, determinism, explicit boundaries, and test-first thinking for complex logic.
- Keep changes small, readable, and reviewable. Improve adjacent code when you touch it.
- If a change alters architecture, workflows, or agent-facing behavior, update the relevant docs in the repo.

## Task tracking

This project uses Beads for issues. Use `bd` commands for issue discovery, claiming, and closing work.

- `bd ready` — find available work
- `bd show <id>` — inspect an issue
- `bd update <id> --claim` — claim an issue
- `bd close <id>` — close a completed issue

## Non-interactive shell usage

Use non-interactive flags for file operations to avoid hanging prompts:

```bash
cp -f source dest
mv -f source dest
rm -f file
```
