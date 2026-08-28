# Domain documentation

This repository uses a single domain context.

## Locations

- `CONTEXT.md` is the domain glossary.
- `architecture/decisions/` contains architecture decision records.

These paths override engineering-skill defaults that refer to `docs/adr/`.

## Consumer rules

Before exploring or changing the codebase:

1. Read `CONTEXT.md` when it exists.
2. Read architecture decisions relevant to the area being changed.
3. Use the glossary’s canonical terminology in code, tests, issues, and documentation.
4. Surface any conflict with an existing decision explicitly.

If these files or directories do not exist, proceed silently. Create them lazily when the first domain term or qualifying architecture decision needs to be recorded.

`CONTEXT.md` is a glossary, not a specification or implementation guide.

Create an ADR only when the decision is:

- costly to reverse;
- surprising without its context; and
- the result of a meaningful trade-off.

Name ADRs sequentially as `architecture/decisions/0001-short-title.md`.
