> Retired on 2026-10-21: Excel workbook uploads, template downloads, and Excel-specific routes have been removed from the frontend and AI service. The notes below describe the former feature. Manual and AI approval requests still use the shared staging workflow.

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

All seven domain tools are now enabled. Initial SKU stock must be zero; inventory changes are separate approved operations. The user approved adding the Branch and reviewed Product image workflows described below.

## Branch and Product workflows

Open `/admin/branches` to create branches and inspect those visible to your account. Branch records and access assignments belong to catalog-service. Creating a branch does not grant membership. Only an administrator with `BRANCH_ACCESS_MANAGE` can grant or revoke an active user's membership; auth-service verifies the identity. Associating existing inventory additionally requires `INVENTORY_ADJUST`. Membership and inventory associations are audited.

Stock import validation and execution check the inventory's stored branch against authoritative membership. A supplied `branchId` must match that association. Scope is checked again after locking inventory. Existing inventory without a branch remains global; warehouse text never grants branch access. Existing inventory permissions remain required.

For Product worksheets, confirm the mapping, then attach and review actual photos on each row before validation. Product creation requires an existing subcategory, active status and one to four attached images. PNG/JPEG content is decoded, stripped of metadata and stored as sanitized PNG. Limits: 5 MiB per image, 10 million pixels, 8192 pixels per dimension, 20 stored images per batch and 50 MiB total per batch. Sanitization concurrency is bounded.

Images are immutable and owned by their batch and row. SHA-256 references are bound to the approved revision. Spreadsheet mappings and row edits cannot inject `imageIds` or `imageChecksums`. Attachment/removal invalidates validation and approval. Authenticated previews return PNG with `nosniff` and `no-store`. Detached originals remain retained under the batch access policy for audit and count toward storage limits.

Product execution reuses the existing Product/image service and confirms creation only after every image upload is acknowledged and a resource ID is returned. SKU price and stock remain separate operations. Provider asset IDs derive from immutable attachment IDs and checksums; retries use the same ID with `overwrite=false`. See [Cloudinary upload API](https://cloudinary.com/documentation/image_upload_api_reference). Provider uploads and database writes are not a distributed transaction; partial failures still require reconciliation.

Additional additive migrations:

- catalog-service: `src/main/resources/db/upgrade/20261014_branch_import_workflow.sql`
- ai-service: `src/main/resources/db/upgrade/20261014_product_import_images.sql`
- auth-service: `src/main/resources/db/upgrade/20261014_branch_permissions.sql`

Permission definitions are registered by migration; assign staff grants through existing user/group administration.

Create a branch: `POST /api/v1/branches`:

```json
{"name":"Phnom Penh Central","address":"Street 271, Phnom Penh"}
```

Grant/revoke membership: `PUT /api/v1/branches/1/access`:

```json
{"userId":42,"active":true}
```

List branches: `GET /api/v1/branches?page=0`. Inspect membership: `GET /api/v1/branches/1/access`. Associate inventory: `PUT /api/v1/branches/1/inventory/123`.

Attach image: `POST /api/ai/imports/<batchId>/rows/<rowId>/images?version=3`, multipart field `file`. The response contains the updated batch revision. Detach: `POST /api/ai/imports/<batchId>/rows/<rowId>/images/<imageId>/detach`:

```json
{"version":4}
```

Preview contains image metadata, including ID, row ID, checksum, filename and size. Fetch bytes with authenticated `GET /api/ai/imports/<batchId>/images/<imageId>`. Internal multipart execution transports the signed approved row and verified image bytes to catalog-service.

## Local deployment

On 2026-10-15 the additive migrations were applied to the existing AI, catalog and auth databases. AI, catalog, auth, gateway and inference services were updated with verified artifacts. Databases and unrelated service containers were preserved. Image tags end in `imports-20261015`.

Local override: `.cache/ai-import/runtime/compose.expanded.yaml`. The private signing variable is in ignored `import-signing.env` beside it. Preserve the original Compose files, including `compose.ollama.yaml`, and load the backend `.env` followed by the private env file when restarting. Do not commit or print the signing file. Production should use the standard repository image build, secret manager and owning-service migration process. An incompatible older preview API now produces a clear error instead of crashing Angular.

## Verification

Actual test/build logs are in `.cache/ai-import`:
- Full affected Maven reactor `verify`: 256 passed, zero failures/errors, 17 environment-gated skips (273 discovered).
- Follow-up tests passed: three isolated PostgreSQL concurrency/idempotency/rollback tests, two provider acknowledgement/retry tests and the added protected-image mapping test. Across the affected suites, 262 distinct Java tests passed; 14 optional environment-gated tests remain unrun. The disposable database container was removed.
- FastAPI import mapping: 5 passed, including rejection of AI-inferred image references. One existing Starlette/httpx deprecation warning.
- Angular targeted tests: 53 passed, covering permissions, independent review, stale versions/reads, uncertain outcomes, image HTTP contracts, branch administration, mapping, pagination and chatbot workflows.
- Production Angular build passed. Initial bundle: 655.04 kB, 5.04 kB over the existing warning threshold.

Authenticated read-only checks through the updated gateway confirmed both new tools enabled, a successful Branch API response and an existing batch preview with 50 rows, summary and image metadata. The local signing keys are configured and match. Earlier UI checks verified preview, pending approval and execution routes. Browser automation was unavailable for a fresh visual check after the final update.

A live two-user approval/execution run, real image-provider upload and end-to-end Kafka notification delivery were not performed. Automated tests cover these boundaries with mocks and isolated database transactions; these results do not certify every production dependency. No existing batch was approved or executed during live checks.
