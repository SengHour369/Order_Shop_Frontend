# Automation acceptance status — 21 October 2026

The reference screenshots remain the target. This is not a claim of a full match.

| Reference | Current behavior | Remaining work |
| --- | --- | --- |
| Automation list | Server drafts, real summary counts, edit, duplicate, export | Active/inactive lifecycle; full list filters; approval metrics |
| Basic information | Required name/description/module, category/tags/priority retained | Team/organization access and version strategy settings |
| Trigger | Manual version execution | Event subscriptions, schedules, filters and verified trigger payloads |
| Builder | Live registry palette, ordered steps, configuration, validation, forward-only conditions and end steps | Drag/drop graph, delays, loops, approval steps and general output bindings |
| Settings | Owner privacy, live permissions, immutable versions and idempotent run keys | Configurable timeout/retry/concurrency, validity and notifications |
| Review/publish | Backend validation and immutable publication of permitted read tools | Approval-gated write publication and execution |
| Overview | Actual draft details, graph, versions | Per-workflow trends and activation lifecycle |
| Builder tools | Permission-scoped registry with executable tool distinction | Domain write handlers and graph controls |
| Templates/AI | Backend registry-derived templates and provider-backed single-tool proposals | Full multi-step proposal generation and supported business templates |
| Execution list | Server pagination, workflow-name/status/date filters, workflow names | Event-trigger reporting and multi-user delegated execution |
| Execution detail | Recorded steps, status, times, hashes, paged persisted audit logs, cancel and rerun APIs | Trigger input/output presentation with an explicit data retention policy |
| Approvals | Existing import review/approval engine remains available | Workflow-specific approval requests, rules, delegation and expiry |

## Verified in this continuation

- 14 targeted frontend tests passed, including API contracts and HTTP UUID fallback.
- 5 lifecycle tests passed using real H2 persistence and real audit records (identity is a fixture).
- 5 Catalog HTTP integration tests passed against the actual running Catalog service. The executor, HTTP client and business responses are real; identity is a fixture and test persistence is isolated H2.
- Authoring proposal and draft integration tests passed separately. Provider behavior is represented by a fixture in the authoring unit tests; no live AI generation success is claimed.
- AI and frontend deployed locally. No sign-in credentials were supplied. Full authenticated gateway acceptance remains pending, as requested code checks continued while signed out.

Cancellation is cooperative: an in-flight remote request may complete, and its uncertain result is recorded as UNKNOWN. Reruns use a new idempotency key against the same immutable published version. No writes, refunds, bank transfers or domain approval checks were bypassed.

## Condition and end-step implementation

The engine now supports `WORKFLOW_CONDITION` and `WORKFLOW_END`. Conditions use a JSON Pointer into an earlier executed step's real response and a fixed scalar comparison (`EXISTS`, `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`). True/false targets must point forward to another step or `$end`. Normal action steps can also select a later next step or `$end`. No scripts or expression evaluation are accepted.

Validation rejects cycles, unknown targets and references to later source steps. Publication remains immutable and permission-scoped. Execution stores condition output hashes and explicitly marks unselected steps as `SKIPPED` / `BRANCH_NOT_SELECTED`; it does not invent successful business outputs. Actual source payloads are bounded in memory and are not persisted in the ledger.

Verification: 6 Catalog HTTP integration tests (including true and false branches on real responses), 6 draft integration tests, 5 lifecycle tests, 4 authoring tests passed. 18 frontend tests passed. Identity remains a fixture in the Catalog integration tests. The Condition and End handlers and editor were subsequently verified in running containers.

## Bounded manual controls — 22 October 2026

- `WORKFLOW_DELAY` waits for actual elapsed time within the current authenticated manual request. Total requested delay is limited to 30 seconds per workflow; it is not a durable schedule and does not resume automatically after a process restart.
- `WORKFLOW_REPEAT` calls one permitted read tool 1–10 times, with permissions rechecked on every iteration. It is a bounded repeat, not an unrestricted loop or a write retry. Each successful read iteration has a persisted audit entry.
- The graph cannot exceed 100 business read calls. Repeat cannot invoke writes, other controls or arbitrary URLs. Conditions and branches can use the actual repeated response array in memory.
- The UI exposes numeric delay/repeat fields and a read-tool selector. Control buttons require the corresponding backend capability.

Verification: 23 backend tests passed (7 using real Catalog HTTP, 7 draft integration, 5 lifecycle, 4 authoring) and 19 frontend tests passed. Real HTTP tests verify the delay actually waits and that repeated reads leave audit records. Identity remains a test fixture; signed-in gateway acceptance and live AI-provider generation are unverified.

Events, scheduling, workflow approvals, approved writes, unrestricted loops and durable long waits are still not implemented. This document does not certify a full match with the screenshots.
