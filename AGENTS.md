# AGENTS.md

## Project Snapshot

[Nx plugin](https://nx.dev) for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) that aims to assist in efficient, scalable app development and remove the mental overhead of how to set up a Forge project.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org). Treat `.commitlintrc` as the source of truth for commit-message rules.

## Code style

Write clean, functional, composable code. Prefer `const` and immutable data over `let` and mutation. Keep generators and executors close to the matching upstream Nx code, for example the `@nx/node` application generator, so the two are easy to compare.

## Agent skills

### Documentation boundary

The `docs/` directory is the source for the public VitePress website. Place only content intended for publication under `docs/`.

Use these locations for internal project knowledge:

- Agent configuration: `.agents/config/`
- Domain glossary: `CONTEXT.md`
- Architecture decisions: `architecture/decisions/`
- Temporary working material: `.scratch/`

These repository-specific paths override engineering-skill defaults that refer to `docs/agents/` or `docs/adr/`. Do not place internal agent configuration, context, ADRs, or working material under `docs/`.

### Issue tracker

Issues and specifications are tracked in GitHub Issues. See `.agents/config/issue-tracker.md`.

### Triage labels

The repository uses the canonical triage label vocabulary. See `.agents/config/triage-labels.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md` and relevant decisions under `architecture/decisions/` when they exist. See `.agents/config/domain.md`.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
