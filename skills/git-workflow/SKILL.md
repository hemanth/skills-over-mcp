---
name: git-workflow
description: Follow this team's Git conventions for branching and commits
---

# Git Workflow

This skill defines the standard Git workflow for our team. Follow these
conventions whenever creating branches, writing commits, or preparing code
for review.

## Prerequisites

- You must have the `create_branch` tool available.
- You must have the `run_tests` tool available.
- The repository must be cloned locally with a clean working tree.

## Branch Naming

All branches **must** follow this naming convention:

```
<type>/<ticket-number>-<short-slug>
```

| Type    | Usage                                         |
| ------- | --------------------------------------------- |
| `feat/` | New features or enhancements                  |
| `fix/`  | Bug fixes                                     |
| `docs/` | Documentation-only changes                    |
| `chore/`| Tooling, CI, or dependency updates            |

**Example:** `feat/123-add-login-form`

Use the `create_branch` tool to create the branch. Always branch from `main`
unless the ticket specifies a different base.

## Commit Messages

Commits must follow the **Conventional Commits** standard:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

- Keep the subject line under 72 characters.
- Use the imperative mood ("add", not "added" or "adds").
- Reference ticket numbers in the footer: `Refs: #123`.

## Before Pushing

1. **Run tests** — use the `run_tests` tool with `suite: "all"`.
   - If tests fail, fix the issues before continuing.
   - If only integration tests fail and your change is frontend-only,
     you may push with `suite: "unit"` passing, but note this in the PR.
2. **Lint check** — ensure no lint warnings are introduced.
3. **Rebase** — rebase onto the latest `main` to avoid merge conflicts.

## Pull Request

- Title should match the primary commit subject.
- Include a description summarising *what* changed and *why*.
- Tag at least one reviewer from the `CODEOWNERS` file.
- Link the tracking ticket in the PR description.
