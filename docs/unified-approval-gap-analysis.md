# Unified approvals — observed gaps and implementation plan

20 October 2026. Screenshots guide layout only. Existing backend DTOs and registered import schemas define fields and operations.

| Capability | Observed | Change |
| --- | --- | --- |
| Approval engine | `AiImportService`: draft rows, exact revisions, assigned reviewers, changes requested, signed execution proofs, outbox notifications, idempotent domain receipts | Extend; no new approval engine |
| Product contract | `ProductRequest`: name, description, is_active, sub_category_id, skus. SKU DTO owns price, quantity, barcode, attributes and inventory | Preserve DTO structure; no invented product brand/promotion-price/stock fields |
| Manual product create/update | Angular `ProductFormPage` calls live multipart catalog write endpoints | Stage product data/images in existing import engine; submit for independent review |
| Domain imports | Product bulk create/update exist; nested SKUs are not forwarded | Extend registered schema and domain handler to carry and validate real SKU DTOs |
| Before/after | Excel original input preserved, authoritative current values missing | Capture owning-service current snapshot during validation; distinguish input from live before-image |
| Maker editing | Pending and approved revisions can currently be edited | Lock maker edits until returned; retain authorized reviewer revision edits with approval invalidation |
| Review actions | Assigned-reviewer/approve/execute checks exist, but service decision values/reasons need validation | Reject invalid decisions/blank reasons server-side; enforce independent review for every decision |
| Screens | Import grid + execution history exist; no unified My Requests/Review Authorization screens | Add list/detail tabs with server-driven metadata, changes, validations, attachments and history; link existing editor |
| Legacy writes | Public product create/update/status/delete directly invoke service | Reject bypass routes; approved internal import execution remains the write boundary |
| Unsupported entities | Brand/User imports have no registered owning-service handlers | Do not invent working tools or screenshot data |

Implementation sequence: extend backend contracts and security → stage manual products and snapshots → shared review/maker pages → product form wiring and schema-aligned grid → targeted backend/frontend tests/builds. Deployment and authenticated browser acceptance remain distinct checks.
