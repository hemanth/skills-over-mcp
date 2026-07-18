---
name: code-review
description: Structured code review workflow and security checks
---

# Code Review Process

Follow these steps when reviewing pull requests. This skill provides a
consistent, thorough review process covering correctness, security,
performance, and maintainability.

## Prerequisites

- Access to the repository and the PR diff.
- Familiarity with the project's coding standards.
- The security checklist at `references/security-checklist.md`.

## Step 1 — Understand Context

1. Read the PR title, description, and linked tickets.
2. Understand the *intent* — what problem does this solve?
3. Check the size of the diff. If it's > 400 lines, consider asking the
   author to split it into smaller, reviewable chunks.

## Step 2 — Automated Checks

Before diving into code, verify:

- [ ] CI pipeline is green (all checks passing).
- [ ] Code coverage hasn't decreased.
- [ ] No new lint warnings or errors introduced.

If any automated check fails, leave a comment asking the author to fix
before continuing the manual review.

## Step 3 — Security Review

Consult the **Security Checklist** for a comprehensive list of items:

> **Reference:** Read the [Security Checklist](skill://code-review/references/security-checklist.md)
> for the full OWASP-aligned checklist.

Key items to spot-check:

- Hardcoded secrets or API keys.
- Unsanitised user input (XSS, SQLi, SSRF vectors).
- Missing authorization checks on new endpoints.
- Overly permissive CORS or CSP headers.

## Step 4 — Logic & Performance

- Look for **algorithmic inefficiencies** — O(n²) loops, unnecessary
  database queries inside loops, unbounded list fetches.
- Check for **memory leaks** — event listeners not cleaned up, growing
  caches without eviction.
- Verify **error handling** — are exceptions caught and logged? Are
  retries bounded?
- Confirm **edge cases** — empty inputs, null values, very large inputs.

## Step 5 — Readability & Maintainability

- Are variable and function names descriptive?
- Is there adequate documentation for public APIs?
- Are complex algorithms explained with comments?
- Is dead code removed?

## Step 6 — Leave Feedback

Use these prefixes to categorise your comments:

| Prefix        | Meaning                                      |
| ------------- | -------------------------------------------- |
| `Blocker:`    | Must be fixed before merge                   |
| `Suggestion:` | Recommended but not blocking                 |
| `Nit:`        | Style/formatting — optional                  |
| `Question:`   | Seeking clarification from the author        |
| `Praise:`     | Something done well — reinforce good patterns|

## Decision Guide

- **If no blockers** → Approve the PR.
- **If blockers exist** → Request changes with clear descriptions.
- **If unsure** → Add a `Question:` comment and request a second reviewer.
