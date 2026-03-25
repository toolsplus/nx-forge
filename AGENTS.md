# AGENTS.md

## Task Completion Requirements
- Always review your work and verify the results of your work using the appropriate tools before considering tasks completed.

## Project Snapshot

[Nx plugin](https://nx.dev) for [Atlassian Forge](https://developer.atlassian.com/platform/forge/) that aims to assist in efficient, scalable app development and remove the mental overhead of how to set up a Forge project.

## Core Priorities

1. Reliability first.
2. Simplicity and correctness.
3. Avoid accidental complexity.

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long-term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem. If you are not sure, research to find a good solution. 

## Technology Stack

- Use npm
