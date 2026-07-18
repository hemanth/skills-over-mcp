/**
 * Skills Over MCP — Cloudflare Worker
 *
 * A single worker that serves:
 *   - GET /           → static UI (from assets)
 *   - GET /api/index  → skill discovery index
 *   - GET /api/resources → list all resources
 *   - GET /api/resource?uri=... → read a resource
 *   - GET /api/tools  → list tools
 *   - POST /api/tool  → call a tool
 *
 * All skill content is embedded at build time so no filesystem is needed.
 */

// ─── Embedded skills content ─────────────────────────────────────────────────
const SKILLS: Record<string, string> = {
  "git-workflow/SKILL.md": `---
name: git-workflow
description: Follow this team's Git conventions for branching and commits
---

# Git Workflow

This skill defines the standard Git workflow for our team. Follow these
conventions whenever creating branches, writing commits, or preparing code
for review.

## Prerequisites

- You must have the \`create_branch\` tool available.
- You must have the \`run_tests\` tool available.
- The repository must be cloned locally with a clean working tree.

## Branch Naming

All branches **must** follow this naming convention:

\`\`\`
<type>/<ticket-number>-<short-slug>
\`\`\`

| Type    | Usage                                         |
| ------- | --------------------------------------------- |
| \`feat/\` | New features or enhancements                  |
| \`fix/\`  | Bug fixes                                     |
| \`docs/\` | Documentation-only changes                    |
| \`chore/\`| Tooling, CI, or dependency updates            |

**Example:** \`feat/123-add-login-form\`

Use the \`create_branch\` tool to create the branch. Always branch from \`main\`
unless the ticket specifies a different base.

## Commit Messages

Commits must follow the **Conventional Commits** standard:

\`\`\`
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
\`\`\`

- Keep the subject line under 72 characters.
- Use the imperative mood ("add", not "added" or "adds").
- Reference ticket numbers in the footer: \`Refs: #123\`.

## Before Pushing

1. **Run tests** — use the \`run_tests\` tool with \`suite: "all"\`.
   - If tests fail, fix the issues before continuing.
   - If only integration tests fail and your change is frontend-only,
     you may push with \`suite: "unit"\` passing, but note this in the PR.
2. **Lint check** — ensure no lint warnings are introduced.
3. **Rebase** — rebase onto the latest \`main\` to avoid merge conflicts.

## Pull Request

- Title should match the primary commit subject.
- Include a description summarising *what* changed and *why*.
- Tag at least one reviewer from the \`CODEOWNERS\` file.
- Link the tracking ticket in the PR description.
`,

  "code-review/SKILL.md": `---
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
- The security checklist at \`references/security-checklist.md\`.

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
| \`Blocker:\`    | Must be fixed before merge                   |
| \`Suggestion:\` | Recommended but not blocking                 |
| \`Nit:\`        | Style/formatting — optional                  |
| \`Question:\`   | Seeking clarification from the author        |
| \`Praise:\`     | Something done well — reinforce good patterns|

## Decision Guide

- **If no blockers** → Approve the PR.
- **If blockers exist** → Request changes with clear descriptions.
- **If unsure** → Add a \`Question:\` comment and request a second reviewer.
`,

  "code-review/references/security-checklist.md": `# Security Checklist

OWASP-aligned checklist for code reviews.

## Authentication & Authorization

- [ ] All endpoints require authentication unless explicitly public.
- [ ] Role-based access control is enforced at the handler level.
- [ ] API keys and tokens are not hardcoded in source.
- [ ] Session tokens use secure, HttpOnly cookies.

## Input Validation

- [ ] All user input is validated and sanitised on the server side.
- [ ] SQL queries use parameterised statements (no string concatenation).
- [ ] File uploads are restricted by type and size.
- [ ] URL redirects are validated against an allowlist.

## Data Protection

- [ ] Sensitive data (PII, credentials) is encrypted at rest and in transit.
- [ ] Logs do not contain passwords, tokens, or PII.
- [ ] Database credentials are managed via environment variables or a vault.

## HTTP Security

- [ ] CORS policy is restrictive (not \`*\`).
- [ ] Content Security Policy (CSP) headers are set.
- [ ] Rate limiting is applied to authentication endpoints.
- [ ] HTTPS is enforced in production.

## Error Handling

- [ ] Error responses do not leak stack traces or internal details.
- [ ] All exceptions are caught and logged with sufficient context.
- [ ] Retry logic has maximum bounds to prevent infinite loops.
`,

  "deploy-service/SKILL.md": `---
name: deploy-service
description: Multi-step deployment workflow for production services
---

# Deployment Workflow

Follow this procedure for deploying a service to production. This skill
covers pre-flight checks, staging validation, production rollout, and
post-deployment monitoring.

## Prerequisites

- You must have the \`run_tests\` tool available.
- Access to the deployment pipeline (CI/CD).
- The service must be on the \`main\` branch with all tests passing.

## Step 1 — Pre-flight Checks

1. **Verify tests pass** — use the \`run_tests\` tool with \`suite: "all"\`.
   - All unit and integration tests must be green.
   - If any test fails, **stop** — do not proceed with deployment.
2. **Check the changelog** — confirm that \`CHANGELOG.md\` has been updated
   for this release.
3. **Review open issues** — ensure no critical/blocker issues are tagged
   against this release milestone.

## Step 2 — Version Tagging

Create a semantic version tag following [SemVer](https://semver.org/):

| Change type         | Version bump | Example          |
| ------------------- | ------------ | ---------------- |
| Breaking change     | Major        | \`v1.0.0\` → \`v2.0.0\` |
| New feature         | Minor        | \`v1.0.0\` → \`v1.1.0\` |
| Bug fix / patch     | Patch        | \`v1.0.0\` → \`v1.0.1\` |

\`\`\`bash
git tag -a v<X.Y.Z> -m "Release v<X.Y.Z>"
git push origin v<X.Y.Z>
\`\`\`

## Step 3 — Deploy to Staging

1. Trigger the staging deployment pipeline.
2. Wait for the deployment to complete (typically 3–5 minutes).
3. Run **smoke tests** against the staging environment:
   - Health check endpoint returns \`200 OK\`.
   - Key user flows work end-to-end.
   - No error spikes in the staging log dashboard.

### If staging fails

- **Rollback** immediately using the previous stable tag.
- Investigate the failure, fix, and restart from Step 1.

## Step 4 — Deploy to Production

> Only proceed after staging sign-off.

1. Trigger the production deployment pipeline.
2. Use a **canary deployment** strategy:
   - Route 10% of traffic to the new version.
   - Monitor error rates for 5 minutes.
   - If error rate stays below 0.1%, proceed to full rollout.
   - If error rate exceeds 0.1%, **rollback immediately**.
3. Gradually increase traffic: 10% → 25% → 50% → 100%.

## Step 5 — Post-Deployment Monitoring

For the first **30 minutes** after full rollout, actively monitor:

- [ ] Error rates in the logging dashboard.
- [ ] Response latency (p50, p95, p99).
- [ ] CPU and memory utilisation of service pods.
- [ ] Customer-facing alerts and support channels.

If any anomaly is detected, trigger an immediate rollback and create
a post-incident report.

## Rollback Procedure

\`\`\`bash
# Deploy the previous known-good tag
deploy --service <service-name> --tag <previous-tag> --environment production
\`\`\`

Always notify the team in \`#deployments\` when a rollback occurs.
`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFrontmatter(content: string): { name: string; description: string } {
  const nameMatch = content.match(/^name:\s*(.+)$/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  return {
    name: nameMatch ? nameMatch[1].trim() : "unknown",
    description: descMatch ? descMatch[1].trim() : "No description",
  };
}

function buildSkillIndex() {
  const skills: Array<{ name: string; type: string; description: string; url: string }> = [];
  for (const [path, content] of Object.entries(SKILLS)) {
    if (!path.endsWith("SKILL.md")) continue;
    const meta = parseFrontmatter(content);
    skills.push({
      name: meta.name,
      type: "skill-md",
      description: meta.description,
      url: `skill://${path}`,
    });
  }
  return {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills,
  };
}

function buildResources() {
  const resources = [
    {
      uri: "skill://index.json",
      name: "skills-index",
      description: "Discovery index listing all available skills on this server",
      mimeType: "application/json",
      annotations: { audience: ["assistant", "user"], priority: 1.0, lastModified: new Date().toISOString() },
    },
  ];
  for (const [path, content] of Object.entries(SKILLS)) {
    const isSkillMd = path.endsWith("SKILL.md");
    const meta = isSkillMd ? parseFrontmatter(content) : { name: path, description: `Supporting file: ${path}` };
    resources.push({
      uri: `skill://${path}`,
      name: meta.name,
      description: meta.description,
      mimeType: "text/markdown",
      annotations: { audience: ["assistant"], priority: isSkillMd ? 0.8 : 0.3, lastModified: new Date().toISOString() },
    });
  }
  return resources;
}

const TOOLS = [
  {
    name: "create_branch",
    description: "Create a new Git branch from the current HEAD. Referenced by the git-workflow skill.",
    inputSchema: {
      type: "object" as const,
      properties: {
        branch_name: { type: "string", description: "Branch name (e.g. feat/123-add-login)" },
        base: { type: "string", description: "Base branch (default: main)" },
      },
      required: ["branch_name"],
    },
  },
  {
    name: "run_tests",
    description: "Run the project test suite and return a pass/fail summary. Referenced by git-workflow and deploy-service skills.",
    inputSchema: {
      type: "object" as const,
      properties: {
        suite: { type: "string", description: "Test suite: unit | integration | all" },
      },
    },
  },
];

function callTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "create_branch": {
      const branchName = args?.branch_name ?? "unnamed";
      const base = args?.base ?? "main";
      return { content: [{ type: "text", text: `Branch "${branchName}" created from "${base}". (mock)` }] };
    }
    case "run_tests": {
      const suite = args?.suite ?? "all";
      return { content: [{ type: "text", text: `Test suite "${suite}" passed — 42 tests, 0 failures. (mock)` }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Request handler ─────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // ── API routes ───────────────────────────────────────────
      if (path === "/api/index") {
        return json(buildSkillIndex());
      }

      if (path === "/api/resources") {
        return json(buildResources());
      }

      if (path === "/api/resource") {
        const uri = url.searchParams.get("uri");
        if (!uri) return json({ error: "Missing ?uri= parameter" }, 400);

        if (uri === "skill://index.json") {
          return json({ uri, mimeType: "application/json", text: JSON.stringify(buildSkillIndex(), null, 2) });
        }

        if (uri.startsWith("skill://")) {
          const relPath = uri.replace("skill://", "");
          const content = SKILLS[relPath];
          if (content !== undefined) {
            return json({ uri, mimeType: "text/markdown", text: content });
          }
        }

        return json({ error: `Resource not found: ${uri}` }, 404);
      }

      if (path === "/api/tools") {
        return json(TOOLS);
      }

      if (path === "/api/tool" && request.method === "POST") {
        const body = await request.json() as { name: string; arguments?: Record<string, unknown> };
        const result = callTool(body.name, body.arguments ?? {});
        return json(result);
      }

      // Static assets are handled by wrangler's [assets] config
      // This catch-all returns 404 for unknown API paths
      if (path.startsWith("/api/")) {
        return json({ error: "Not found" }, 404);
      }

      // Let assets binding handle everything else
      return new Response("Not found", { status: 404 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: msg }, 500);
    }
  },
};
