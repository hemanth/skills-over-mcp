---
name: deploy-service
description: Multi-step deployment workflow for production services
---

# Deployment Workflow

Follow this procedure for deploying a service to production. This skill
covers pre-flight checks, staging validation, production rollout, and
post-deployment monitoring.

## Prerequisites

- You must have the `run_tests` tool available.
- Access to the deployment pipeline (CI/CD).
- The service must be on the `main` branch with all tests passing.

## Step 1 — Pre-flight Checks

1. **Verify tests pass** — use the `run_tests` tool with `suite: "all"`.
   - All unit and integration tests must be green.
   - If any test fails, **stop** — do not proceed with deployment.
2. **Check the changelog** — confirm that `CHANGELOG.md` has been updated
   for this release.
3. **Review open issues** — ensure no critical/blocker issues are tagged
   against this release milestone.

## Step 2 — Version Tagging

Create a semantic version tag following [SemVer](https://semver.org/):

| Change type         | Version bump | Example          |
| ------------------- | ------------ | ---------------- |
| Breaking change     | Major        | `v1.0.0` → `v2.0.0` |
| New feature         | Minor        | `v1.0.0` → `v1.1.0` |
| Bug fix / patch     | Patch        | `v1.0.0` → `v1.0.1` |

```bash
git tag -a v<X.Y.Z> -m "Release v<X.Y.Z>"
git push origin v<X.Y.Z>
```

## Step 3 — Deploy to Staging

1. Trigger the staging deployment pipeline.
2. Wait for the deployment to complete (typically 3–5 minutes).
3. Run **smoke tests** against the staging environment:
   - Health check endpoint returns `200 OK`.
   - Key user flows work end-to-end.
   - No error spikes in the staging log dashboard.

### If staging fails

- **Rollback** immediately using the previous stable tag.
- Investigate the failure, fix, and restart from Step 1.

## Step 4 — Deploy to Production

> ⚠️ **Only proceed after staging sign-off.**

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

```bash
# Deploy the previous known-good tag
deploy --service <service-name> --tag <previous-tag> --environment production
```

Always notify the team in `#deployments` when a rollback occurs.
