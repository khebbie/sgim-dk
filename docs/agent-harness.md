# Agent harness

This repository is built around a lightweight agent harness: a set of docs, conventions, and executable sensors that help agents work safely and consistently.

## The model

The harness follows the same principles described in the two articles referenced in the request:

- AGENTS.md is an index, not an encyclopedia. It should stay short and point to the real sources of truth.
- The system of record lives in repository files such as the constitution, the product spec, app README files, and the task runner configuration.
- Deterministic sensors provide fast feedback so agents can self-correct before issues reach human review.
- When the harness changes, agents need to understand the change and the reason for it.

## What is in the harness

### 1. Repository knowledge

The main sources of truth are:

- [constitution.md](../constitution.md) — engineering rules and architectural constraints.
- [spec.md](../spec.md) — product context for the website and CMS.
- [mise.toml](../mise.toml) — the default developer and quality-gate entrypoints.
- [cms/README.md](../cms/README.md) and [web/README.md](../web/README.md) — app-specific setup and commands.

### 2. Deterministic sensors

The current harness uses the following sensors as the default quality gates:

- linting
- typechecking
- automated tests
- dependency-boundary checks
- secrets scanning

The main entrypoint is `mise run check`.

These sensors are intentionally fast and deterministic. They are the first line of feedback for agents before a change is considered done.

### 3. Task tracking

Issues live in Beads and should be specific enough that another agent can work on them independently. This is part of the harness because it keeps work legible and reduces context gaps.

## How agents should use the harness

1. Start from the task and the relevant code.
2. Read the docs that define the rules and the expected architecture.
3. Use the sensors before finishing work.
4. If a sensor fails, fix the underlying issue rather than bypassing the signal.
5. If the change changes workflow, architecture, or agent expectations, update the relevant docs in the repo.

## Why this matters

A good harness improves two things at once:

- It raises the probability that an agent produces a good result.
- It reduces the amount of human review needed for routine work.

That is why the harness should stay understandable, maintainable, and explicit. A short AGENTS.md file plus deeper docs and executable checks is better than a single monolithic instruction file.
