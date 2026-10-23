# AI Automation verification — 20 October 2026

This is a partial implementation of the supplied platform specification: draft authoring and schema validation. It is not a completed workflow execution platform.

## Commands

Frontend:

```sh
npm run build
npm test -- --include='src/app/features/admin/ai-automation/workflows.spec.ts'
```

Backend, from `/home/senghour/Desktop/E-Shop`:

```sh
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH mvn -pl ai-service -am -Dtest=WorkflowDraftIntegrationTest -Dsurefire.failIfNoSpecifiedTests=false test
```

The first Maven attempt used the shell's incompatible Java compiler and failed with `release version 17 not supported`; rerun selects the installed Java 17 explicitly.

## Real HTTP evidence

- `GET http://localhost:8080/actuator/health`: HTTP 200.
- Unauthenticated `GET http://localhost:8080/api/ai/admin/workflows/catalog`: HTTP 401.

The 401 establishes that the gateway rejects unauthenticated requests. It does not establish that the new controller is deployed. No authenticated browser session or credentials were supplied for a live end-to-end workflow authoring run. No deployment/restart, production migration, payment transfer, inventory write or notification delivery was performed.

## Test boundaries

Backend integration tests use real Hibernate/H2 persistence and the real registry/schema validator. Identity grants are isolated test fixtures. Angular tests use HttpTestingController to test client behavior. These automated tests do not substitute fake production data or verify live external services. PostgreSQL migration application, authenticated gateway calls, browser layout and full business workflows still require environment verification.

## Results

- Angular targeted tests: **4 passed**, 1 test file. Covers revision-bearing writes, required basic fields, malformed JSON rejection and API failure behavior.
- Backend integration tests: **5 passed**, zero failures/errors/skips; Maven reactor **BUILD SUCCESS**. Covers real draft persistence/update, stale revision rejection, real registry validation with no execution, unknown tools/arguments, owner isolation, administrator restriction and sensitive-field rejection.
- Angular production build: **passed**. Existing initial bundle warning: approximately 748 kB against the configured 650 kB warning budget.
- The initial backend integration run exposed missing explicit JPA package registration; fixed in `AiServiceApplication.java`, then reran successfully. H2 now runs in PostgreSQL compatibility mode for existing service entities.

## Remaining risks and next phase

New source is not deployed into the running AI service, and the PostgreSQL upgrade has not been applied. Authenticated live CRUD, browser rendering and external-provider checks are unverified. Per-workflow permission grants beyond administrator access, append-only audit records, rich graph validation, immutable publication, execution persistence, durable orchestration, approvals and event/scheduled execution remain outstanding. These are required before enabling business writes. The current module never returns invented execution counts or successful workflow executions.

Final regression command:

```sh
npm test -- --include='src/app/features/admin/ai-automation/workflows.spec.ts' --include='src/app/features/admin/layout/admin-layout.spec.ts' --include='src/app/features/admin/automation/automation.api.spec.ts'
```

Result: **3 test files passed, 11 tests passed**. Final production build passed again after the sidebar change; the initial bundle warning remains 748.44 kB / 650 kB.
