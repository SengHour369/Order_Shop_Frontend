# AI Excel import, review and execution

The actual Angular dashboard is at `D:/fronend_order`. The existing Spring/FastAPI implementation is at `D:/spring boot/E-Shop`. [Gap analysis](gap-analysis.md) records the inspection completed before UI changes.

## Using the dashboard

1. Open **AI Assistant → Excel upload & analysis**, attach `.xlsx`/`.xls` with the chatbot attachment control, or open `/admin/imports`.
2. Select a staged batch. Analyze worksheets. Review the registry and explicitly confirm a type and a one-to-one mapping for every worksheet. AI suggestions are shown separately; no suggested or inferred cell value is silently approved.
3. Review paginated original values and current corrections. Required and absent optional fields remain editable. Save corrections, include/skip rows as needed, then validate the entire workbook. Filter by Valid, Invalid, Duplicate, Edited, Created, Failed, Skipped or Unvalidated.
4. The uploader submits the current version to an independent authorized reviewer by user ID. The service revalidates all rows and verifies the reviewer through auth-service. The uploader and last editor cannot approve.
5. The assigned reviewer opens **Pending Excel Imports** at `/admin/import-approvals`. Inspect originals, mappings, current values, validation errors, affected resource IDs and audit/revision history. Supply a reason and approve, reject, or request changes. Reviewer edits invalidate prior approval and require resubmission to a different independent reviewer.
6. Open **Import Executions** at `/admin/import-executions`. The approving reviewer explicitly executes the approved version. Each request processes at most ten rows. Continue while Processing; retry failed rows after inspecting the current results. The UI never automatically retries writes or executes immediately after approval.
7. Download the authenticated server-generated validation/execution CSV or original workbook. CSV formula protection remains server-side. Original downloads are named `.bin` to avoid opening an untrusted workbook automatically.

Preparation, approvals and execution pages accept `?batch=<uuid>` links. Batch and row pagination are separate. Summary counts cover the entire workbook; Edited overlaps the row status counts. Deep-link changes reload the selected batch. Stale reads cannot replace a newer selection. Any failed mutation disables further writes until a successful reload, preserving local corrections for inspection.

## Processing and security

Workbook → AI Service parser → staged file/sheets/original rows → advisory inference (headers only) → explicit mapping confirmation → deterministic schema and catalog bulk validation → immutable revision → assigned independent approval → registered catalog-domain handler → transactional business change + idempotency receipt → confirmed resource ID → row execution record → notification outbox → Kafka → deduplicating Notification Service.

This reuses the existing `ExcelImportParser`, `AiImportService`, fixed `ImportTool` registry, `ImportMappingClient`, `CatalogImportService`, `ImportApprovalProof`, notification outbox and all eleven `ai_import_*` staging tables. No second payment, inventory, approval or import database implementation was introduced. Domain writes remain in their owning service, including inventory locking and reserved-stock validation. The AI provider may be unavailable without bypassing confirmation, validation or approval.

Uploaders need `IMPORT_UPLOAD` and each domain permission. Reviewers need `IMPORT_REVIEW`; approval/execution also require `IMPORT_APPROVE`, `IMPORT_EXECUTE`, and domain grants. Backend permissions are authoritative. Specifically granted staff can enter import pages without gaining unrelated admin navigation; the child guard rechecks this scope on every navigation. Existing administrator/manager module guards remain in effect.

Uploaded content cannot choose URLs, register tools or execute APIs. Angular text bindings escape malicious cell contents; strings are never used as HTML. A staged row displays **Unconfirmed** until the domain service returns its resource ID. Timeouts remain failures requiring reconciliation/retry with the same row idempotency key. Approval is bound to the backend revision, and data changes invalidate it. Request and trace IDs are visible with the batch; audit, approval, snapshot and attempt history are available for authorized inspection.

## API examples

Upload: `POST /api/ai/imports/upload`, multipart field `file`.

Analyze/validate/execute: `POST /api/ai/imports/<batchId>/<action>`:
```json
{"version":2}
```
Confirm worksheet mapping: `PATCH /api/ai/imports/<batchId>/sheets/<sheetId>`:
```json
{"version":2,"tool":"CATEGORY_BULK_CREATE","columns":{"Title":"name","Active":"status"}}
```
Correct a row: `PATCH /api/ai/imports/<batchId>/rows/<rowId>`:
```json
{"version":3,"values":{"name":"Audio Accessories","status":"true"}}
```
Submit: `POST /api/ai/imports/<batchId>/submit`:
```json
{"version":4,"reviewerId":2}
```
Review: `POST /api/ai/imports/<batchId>/approve` (or `reject`, `request-changes`):
```json
{"version":4,"reason":"Reviewed original values and validation results."}
```
Example batch response (illustrative, not a claim of live creation):
```json
{"id":"11111111-1111-4111-8111-111111111111","revision":4,"status":"APPROVED","ownerId":1,"assignedReviewerId":2,"reviewerId":2}
```
Preview: `GET /api/ai/imports/<batchId>/preview?page=0&size=50&status=EDITED`. History: `GET .../history`, row attempts: `GET .../executions`, report: `GET .../report`. Pending list: `GET /api/ai/imports?review=true`; assigned history: `GET /api/ai/imports?assigned=true`.

## Deployment and limitations

The backend already supplies owner-specific upgrade scripts:
- ai-service: `src/main/resources/db/upgrade/20261013_ai_excel_import.sql`
- catalog-service: `src/main/resources/db/upgrade/20261013_ai_import_receipts.sql`
- auth-service: `src/main/resources/db/upgrade/20261013_ai_excel_import_permissions.sql`
- notification-service: `src/main/resources/db/upgrade/20261013_import_notifications.sql`

Use the existing migration process and backups for each owning database. Configure matching private `AI_IMPORT_SIGNING_KEY` values (minimum 32 characters) in AI and catalog services. Missing signing keys fail closed. No secrets were added to frontend code and no database was reset.

Parser defaults: 5 MiB file, 10,000 total data rows, 64 columns, 16 sheets; configurable through existing `AI_IMPORT_MAX_*` settings. Formulas, encrypted workbooks, macro content, embedded objects, external links, excessive expanded ZIP data and malformed content are rejected. AI receives headers and registered validation codes, not workbook rows. Date serial values are not guessed; provide ISO values.

**Two registered domain tools remain unavailable:** Branch imports need a real Branch service and authoritative branch access contract; Product imports need an approved image attachment workflow matching the multipart Product API. The registry disables both. Unknown branch fields/types fail closed. No arbitrary branch access or image requirement bypass was added. Category, SKU, inventory stock-in/adjustment and percentage-promotion imports use existing handlers; initial SKU stock must be zero and inventory changes are separate approved operations.

On 2026-10-14 a live preview check identified an older running ai-service without the summary response. The local AI container was updated with the Maven-verified JAR using the existing runtime image and Compose configuration; databases and other service containers were preserved. Local image: `e-shop-ai-service:excel-import-20261014`. Its override is `.cache/ai-import/runtime/compose.verified.yaml`. Production should rebuild from the repository's standard Dockerfile and apply all deployment prerequisites. An incompatible older API now produces a clear error instead of crashing Angular.

## Verification

Actual test/build logs are in `.cache/ai-import`:
- Affected Maven reactor `verify`: 206 tests passed, zero failures/errors, 16 environment-gated tests skipped (222 discovered). This includes parser/security, workflow/versioning, domain import, inventory, auth and outbox/consumer tests.
- Additional isolated PostgreSQL run: all 3 import integration tests passed, including concurrent stock movement deduplication, adjustment rollback and natural-key receipts. The disposable container was removed afterward. This turns three of the 16 initial skips into verified passes (209 distinct Java tests passed; 13 other optional tests remain unrun).
- FastAPI import mapping tests: 4 passed. One existing Starlette/httpx deprecation warning.
- Angular targeted tests: 43 passed; authorization, mapping confirmation, self-approval, stale versions/reads, uncertain outcomes, malformed content, missing preview contracts, pagination, deep links and HTTP contracts are covered.
- Production Angular build passed. The initial bundle is 654.63 kB, 4.63 kB over the 650 kB warning threshold (not a build failure).

Live checks use the previously authorized local admin account and inspect existing staged data only. The updated preview returned and displayed 50 rows across five worksheets; the pending-approval and execution-history routes loaded successfully. No approval or domain creation is asserted from the unit tests or UI reads. PostgreSQL concurrency/inventory tests passed in the isolated follow-up. A full two-user live execution/Kafka-delivery run remains outside these results; this is not a claim that every production rollout dependency is complete.
