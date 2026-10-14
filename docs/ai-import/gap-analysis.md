# Excel import gap analysis — 2026-10-14

Inspected Angular at D:/fronend_order and Spring microservices at D:/spring boot/E-Shop before implementation.

| Requirement | Existing code | Remaining work |
|---|---|---|
| Secure parsing | ExcelImportParser, POI, ZIP/content/formula/macro checks | Regression verification |
| Staging/audit/approval | Eleven JPA entities, 20261013 upgrade scripts | Reuse tables and contracts |
| AI assistance | ImportMappingClient, FastAPI import_mapping; headers/error codes only | Advisory mapping and explanation UI |
| Validation/duplicates/references | Fixed ImportTool schemas and bulk catalog validation | Integrate existing deterministic rules |
| Independent version-bound approval | AiImportService locks, revision snapshots, assigned reviewer, edit invalidation | Angular review/correction screens |
| Domain execution and recovery | CatalogImportService, signed proof, transactionally committed receipts and inventory locking | Explicit execution/retry, confirmed row IDs and history |
| Kafka notifications | Lifecycle events, transactional outbox and deduplicating consumer | Delivery regression tests |
| Angular dashboard | Chatbot/RBAC exist, import routes absent | Upload, previews, approval and execution pages plus chatbot entry |
| Authorized staff | Role gate and live permissions | Import-specific staff access without unrelated admin access |
| Branch imports | No Branch service/access contract; registry disables tool | Keep disabled until authoritative branch scope exists |
| Product imports | Existing multipart image requirement; registry disables tool | Approved image attachment contract required before enabling |
| Deployment | Existing migrations and shared signing-key configuration | Document prerequisites; builds do not establish live deployment |

Backend Angular examples and the sibling React dashboard are not this Angular application. Adapt the examples to this app's API base URL, authentication interceptor, live RBAC and change detection. Do not create duplicate tables, arbitrary API tools or cross-service database writes.
