# Unified Product / Excel approval update

20 October 2026. The existing Angular app and sibling `/home/senghour/Desktop/E-Shop` backend were extended; pre-existing workspace edits were preserved.

## Result

Manual Product Create/Edit, Excel imports and AI-staged product drafts now use the existing `AiImportService` approval engine. Manual product forms preserve the current product fields and SKU payloads, stage reviewed image files and submit an exact draft revision for independent review. Save Draft stores a request without changing catalog data.

The new `/admin/my-requests` and `/admin/review-authorization` routes display server-filtered requests with real counts, owner/reviewer IDs, source/entity metadata, revisions and timestamps. Details contains current/proposed changes, actual validation results, stored attachments and request history. Reviewer actions Approve & Execute, Reject and Return to Maker call the existing versioned APIs. Bulk decisions process selected authorized requests sequentially; they stop on errors and display actual execution state. Large executions retain the existing ten-row chunking and expose Continue approved execution.

A returned request links to the existing editable grid, including manually staged product data. Every change creates a new revision and invalidates validation/approval. Makers cannot edit pending or approved requests. Assigned reviewer edits also invalidate approval and require an independent reviewer on resubmission. Rejection preserves the immutable request and does not execute data.

## Backend fields are authoritative

- Product accepts `name`, `description`, `is_active`, `sub_category_id` and nested `skus` in the existing DTO.
- The import registry maps those Product fields to its canonical `name`, `description`, `isActive`, `subCategoryId`, `skus`, and update identity/version fields.
- Price, quantity, barcode, default selection, attributes and inventory are SKU fields. Product has no independent brand, promotion price or stock property, so the screenshot examples were not added as business fields.
- Existing attribute/value IDs are retained in manual edits. Cross-product SKU IDs and cross-SKU attribute/value IDs reject validation. Unsupported SKU/attribute removals reject instead of silently retaining supposedly deleted data.
- New product images use actual stored attachment IDs and checksums. Product update can replace images only through the same reviewed attachment workflow. PNG/JPEG, four files, 5 MiB per file; the default aggregate multipart limit is 22 MiB. Existing workbook parser cell/resource limits remain enforced.
- Existing stock cannot be overwritten by a product request. Existing inventory edits require the registered Inventory flow; new SKU initialization uses the owning Catalog/Inventory service with its permissions.
- Category and Branch updates also return actual before-images. Where older stored requests lack a live snapshot, the UI says Unverified, not Added or Passed.

## Security and execution

Legacy public product create/update/status/delete APIs and attribute mutation APIs return HTTP 409 APPROVAL_REQUIRED before domain mutations. Approved imports continue through signed, revision-bound internal Catalog handlers and idempotent receipts. Product updates force an optimistic version change even when only SKU fields change. Existing inventory state machines and service methods remain authoritative.

The existing `IMPORT_UPLOAD`, `IMPORT_REVIEW`, `IMPORT_APPROVE`, `IMPORT_EXECUTE` and per-tool domain grants are reused. New approval-specific permissions were not invented or auto-granted. Product Create/Edit routes now also require IMPORT_UPLOAD. Nonadministrator reviewers can read only assigned requests; My Requests remains owner scoped even for administrators. Approval revalidates authoritative domain data and permissions.

Execution history uses the server's executions-only filter. Unexecuted drafts/pending/approved requests are excluded from the list. Source, entity, actual filename and approver metadata are included in exports; legacy CREATED row status is labeled Applied where it represents a confirmed update as well as a create. Existing safe idempotent retry behavior remains.

## Changed paths

Frontend:

- `src/app/features/admin/imports/approval-requests.{page.ts,html,css}`, `approval-diff.ts` and tests.
- `src/app/features/admin/imports/ai-imports.api.ts`, editable grid and execution components/templates/tests.
- `src/app/features/admin/products/products.page.ts`, `product-form.html` and tests.
- Route, sidebar and permission policies.

Backend:

- `common-lib/.../imports/ImportTool.java`, `ImportContracts.java`.
- `ai-service/.../model/AiImportBatch.java`, `AiImportRow.java`; batch repository, import service/controller and application multipart limit.
- `catalog-service/.../service/CatalogImportService.java`; Catalog import, Product and attribute controllers.
- `ai-service/src/main/resources/db/upgrade/20261020_unified_product_approval.sql`.
- Existing import integration/unit tests, new ProductApprovalBoundaryTest and `scripts/verify-unified-approval-migration.py`.

## Commands and verification

Frontend:

```sh
npm test -- --include='src/app/features/admin/imports/*.spec.ts' \
 --include='src/app/features/admin/products/product*.spec.ts' \
 --include='src/app/core/auth/import-access.spec.ts' \
 --include='src/app/core/auth/permission*.spec.ts'
npm run build
```

Latest targeted run: **12 test files, 101 tests passed**. Production build passed with the existing initial bundle warning (approximately 749 kB against 650 kB).

Backend, from E-Shop:

```sh
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH \
mvn -pl ai-service,catalog-service -am \
 -Dtest=AiImportWorkflowTest,CatalogImportServiceTest,ProductApprovalBoundaryTest \
 -Dsurefire.failIfNoSpecifiedTests=false package
python3 scripts/verify-unified-approval-migration.py
```

**43 backend tests passed**: 27 import workflow tests, 14 catalog import tests, 2 legacy-boundary tests. Tests cover maker locks, return/edit/resubmit, exact revisions, schema validation, before-images, domain-service SKU forwarding, stock protection, scope, idempotency and rejected/returned requests causing no domain writes. Integration fixtures use H2 and mocked downstream/identity services; these are automated contract/security tests, not a claim of live provider verification.

The actual PostgreSQL 18 migration test passed in a disposable container: applies twice against the existing import schema, preserves request count, and backfills source filename/entity/submission time from real stored records. It never connects to project databases.

## Deployment / remaining limits

Apply the additive AI database migration before deploying the new AI service. Deploy common-lib/AI/Catalog builds and the frontend together: the legacy direct Product endpoints intentionally reject writes, so an old frontend cannot keep using them. Existing accounts need explicit existing import/domain permission grants; none were automatically changed.

The local AI/Catalog/frontend services were subsequently deployed together and the additive migration applied (see backend docs/approval-flow-deployment-fix.md). The Excel template endpoint and visible Import Templates panel were also deployed. An authenticated browser download of product_bulk_create-template.xlsx succeeded and the downloaded workbook was verified as valid XLSX. Independent maker/reviewer approved writes remain unverified. The screenshot layout is implemented using existing UI conventions, but no browser screenshot comparison is claimed. Brand/User handlers, product/SKU deletion approvals, direct live stock edits and arbitrary attachment types are unavailable because no supported registered handlers exist. No fake names, rows, counts, validations, attachments or successful execution responses were inserted.

## Live HTTP continuation — 20 October 2026

Authenticated browser run `5587fcf3-d556-4b8b-b456-70b1bd546df9` completed with 14 passed, 0 failed and 2 blocked steps. The live runner now uses `/api/ai/admin/workflows/catalog` and validates the import field registry and owner-scoped request response. KHQR remains blocked by missing online payment configuration; full automation remains blocked because only drafts, publication and manual read-only executions are supported. Product template downloaded successfully through the authenticated UI. Independent maker/reviewer writes remain unverified. Report: backend `reports/ai-automation/live-http-20261020.json`.
