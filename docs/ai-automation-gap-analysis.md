# AI Automation repository gap analysis — 20 October 2026

## Analysis and evidence

The current checkout is Angular 22 (`package.json`), not the microservice monorepo. The existing backend is available in `/home/senghour/Desktop/E-Shop` (Spring Boot 3.5, Java 17, Maven modules). Both checkouts contain substantial pre-existing uncommitted work; it is preserved. No AGENTS.md was found under their parent directory.

| Business capability / screen | Observed backend, endpoint, DB/topic | Angular component | Coverage | Reuse / modification / next action |
| --- | --- | --- | --- | --- |
| Order/payment automation | Existing Order/Payment automation event/log/review APIs; inbox/outbox migrations documented in `docs/commerce-automation.md`; existing domain Kafka routing | `features/admin/automation/automation.page.ts` | Existing API contract specs | Reuse deterministic handlers; preserve existing module |
| Registered AI tools | `ai-service/.../registry/AiToolRegistry.java`, `AiToolDefinition`, `AiIntent`, per-tool permission checks and parameter validation | Existing AI assistant and import workflows | Existing backend registry/import tests | Reuse registry; never accept arbitrary HTTP/SQL |
| Identity | `common-lib/.../security/LivePermissionService.java`, `PermissionSnapshot`; JWT security | `core/auth/permission.service.ts`, admin guard | Existing auth tests | Reuse live administrator checks and independently authorize each tool |
| AUT-01 draft list | Previously missing workflow APIs/table | New `features/admin/ai-automation/` | New API/UI specs | Added owner-scoped search/pagination; six production KPIs remain missing |
| AUT-02..06 wizard | New `/api/ai/admin/workflows`, `/catalog`, `/{id}`, `/validate`; new `ai_workflow_drafts`; no new Kafka topic | Typed reactive five-stage editor | New integration/spec tests | Added basic info, manual trigger, sequential registered tools, policy explanation, review/validation/save. Rich canvas, AI proposals and publish remain missing |
| AUT-07..09 details/builder | Draft identity and revision persisted | Reopen a draft in editor; reorder/remove steps | Revision/schema tests | Separate overview, version history, branch canvas, bindings and configuration remain missing |
| AUT-10..11 executions | No durable workflow execution model/engine | Existing domain event monitor remains available | No claim of new workflow execution coverage | Add persisted executions, step logs, engine and detail routes before enabling execution |
| Workflow approvals/versioning | Existing AI import approvals are specialized and cannot be reused as workflow approvals unchanged | Explicit unavailable Publish control | No publication test | Add immutable published versions, exact-operation approvals and workflow permission grants |
| Event/scheduled workflows | Domain Kafka workers exist; no general workflow event inbox/scheduler found | Options disabled with reasons | Existing domain tests only | Add durable event inbox, scheduler, idempotency, recovery and compensation |
| Inference / language | Existing `ai-inference/`, configurable provider integration and AI router | Existing assistant | Existing backend tests, not rerun in this slice | Workflow proposal endpoint and English/Khmer workflow-specific tests remain missing |
| Live system verification | Existing `admin-service` live-tests service and authenticated endpoints | Existing `/admin/live-tests` | Existing tests | Link existing real step-by-step runner; do not fabricate workflow run results |

## Proposed changes and implementation sequence

1. AUT-01..06 foundation: database-backed draft CRUD, permission-filtered registry catalog, typed editor and server schema validation. This slice is implemented.
2. AUT-07..09: immutable versions, publication permissions and approvals; structural graph types and validated binding grammar; diagram/config UI.
3. Durable engine: step persistence, idempotent manual execution, authoritative tool handlers, retries/timeouts and crash recovery. Never implement write execution directly in the browser.
4. AUT-10..11: full-width execution list and routed execution detail with redacted logs; cancellation and re-run contracts.
5. Event/scheduled triggers: inbox/outbox contracts, registered exact event lookups, durable scheduler and deduplication. Preserve deterministic commerce state machines.
6. AI proposals and wider analytics/forecasting scope after the core engine is verified.

## Files changed in the first slice

Frontend: `src/app/features/admin/ai-automation/{workflows.api.ts,workflows.page.ts,workflows.html,workflows.css,workflows.guard.ts,workflows.spec.ts}`, plus route and sidebar entries. Backend: explicit JPA package registration in `ai-service/src/main/java/com/example/eshop/ai/AiServiceApplication.java`, `ai-service/src/main/java/com/example/eshop/ai/workflow/{WorkflowDraft.java,WorkflowDraftRepository.java,WorkflowController.java}`, `ai-service/src/main/resources/db/upgrade/20261020_workflow_drafts.sql`, `ai-service/src/test/java/com/example/eshop/ai/WorkflowDraftIntegrationTest.java`.

## API and storage

All endpoints require a live administrator. Drafts are scoped to the actor's user ID, preventing cross-owner reads/updates. IDs are UUIDs. PUT requires the last server revision; stale revisions return 409. Registry schema and permissions are rechecked for every validation. `/validate` reports `VALIDATION_ONLY` and `executed:false`; it never invokes an AI tool executor. It does not prove live service success, branch routing or business authorization at a future execution time.

Draft JSON uses text storage consistent with a simple draft aggregate; normalized/versioned JSONB execution tables remain a future migration. Drafts are mutable and are never presented as published versions. Partial drafts may be saved; valid JSON, name length, size and step-count limits still apply. Credentials with sensitive field names are rejected; this is not comprehensive PII detection. Authors must use resource references and avoid personal data. Persisted drafts currently have update timestamps/owner attribution, not a complete append-only audit trail.

## Startup / test steps

1. Apply `20261020_workflow_drafts.sql` to the AI database using the existing authenticated database migration process when Hibernate schema creation is disabled. Do not apply it to other service databases.
2. Build/restart `ai-service` using the existing environment and secret injection. No credentials were copied into this module.
3. Run the frontend and sign in as an administrator. Open `/admin/ai-automation`.
4. Create a workflow, complete basic info, choose Manual, add a tool from the real registry and enter schema-valid JSON parameters. Save Draft, close, refresh and reopen to verify persistence.
5. On Review, Test Run performs validation only. Invalid/unknown tools or parameters must fail. No order, payment, inventory or notification writes should occur.
6. Use the linked Live Tests page for existing real HTTP environment checks. Full workflow execution cannot be tested until the engine is installed.

Exact automated results and live-check limits are recorded in `ai-automation-verification.md`.
