# ADR-0009: Deferred Automated Testing and CI Pipeline for Initial Launch

**Status:** Accepted (POC phase)  
**Date:** 2026-05-10  
**Deciders:** Engineering team (via design review)  
**Supersedes:** None

## Context
The current repository has:
- No test runner configured (`npm test` exits with "no test specified").
- No unit, integration, or end-to-end tests for routes, controllers, models, or services.
- No continuous integration (GitHub Actions, GitLab CI, etc.).
- Manual testing is performed via the Bruno collection under `bruno-collection/`.

The `DESIGN_DOCUMENT.md` notes: "Automated tests: No test runner configured (`npm test` exits with 'no test specified'). CI/CD: Not present in repo artifacts reviewed."

For a marketplace handling real user data and financial transactions (even used-instrument sales), the absence of automated tests is a recognized risk. However, writing a meaningful test suite and setting up CI would add significant scope and delay the first deploy.

## Decision
**Launch the POC without automated tests or CI**, relying on:
- Manual verification through the Bruno collection.
- Code review and the existing ESLint/Prettier/Husky pre-commit hooks.
- The small surface area and experienced team reducing the likelihood of regressions in the initial feature set.

Once the service is live and usage patterns are understood, the team will introduce tests and CI as the next engineering priority.

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| **Implement full test suite + CI before launch** | High confidence, regression safety, documentation | Large upfront effort, delays first user value | Unacceptable for POC timeline |
| **Only lint + type checks** | Fast, catches obvious issues | No behavioral verification | Insufficient for data-moving code |
| **Chosen: Manual + pre-commit hooks only** | Fastest path to production, still prevents formatting/quality regressions | No automated regression detection | Pragmatic given constraints and team size |

## Consequences

**Positive**
- First paying or beta users can be onboarded weeks earlier.
- Engineering effort stays focused on core marketplace features (ads, images, DB failover).
- Real usage will reveal which paths are worth testing first (avoiding tests for features that may change).

**Negative**
- Regressions are possible between deploys.
- Onboarding new developers is harder without tests as executable documentation.
- Production incidents may take longer to diagnose without test coverage metrics.

**Future Work**
- After launch, prioritize:
  1. Smoke tests for the critical happy paths (create ad with images, delete ad with cleanup, failover scenarios).
  2. Integration tests using a test database.
  3. GitHub Actions workflow that runs lint + tests on every PR.
- A follow-up ADR will define the testing pyramid and coverage goals once the first test suite is introduced.

## Observability Requirement
Until tests exist, every production deployment must be accompanied by a manual checklist (run via Bruno) that covers the flows modified in that release.

---

*Decision reached after reviewing `package.json` scripts, the absence of a `test/` directory, and the explicit note in DESIGN_DOCUMENT.md during the 2026-05-10 design review.*
