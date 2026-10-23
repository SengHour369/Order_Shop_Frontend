# Native E-Shop UI in chat — 22 October 2026

## Repository inventory and reuse

Frontend: Angular 22 at `/home/senghour/Desktop/Order_Shop_Frontend`. Backend: Spring microservices at `/home/senghour/Desktop/E-Shop`. Both contained substantial uncommitted work before this change; it was retained. No AGENTS.md was found under Desktop.

| Capability | Actual files inspected | Findings / choice |
| --- | --- | --- |
| Admin conversation | `src/app/features/admin/assistant/admin-assistant.{page.ts,html,css}` | Existing light/blue workspace, conversation history, confirmation controls and product draft UI. Integrate renderer into its message stream. |
| Existing results | `src/app/features/assistant/{assistant.api.ts,assistant-result.ts,assistant-product.ts,chat-order.ts}` | Generic recursive fact cards; product cards and customer order detail already present. Generic cards are not native tables/forms. |
| Orders | `src/app/features/admin/orders/{orders.page.ts,order-detail.html,order-detail.css}` | Reuse actual OrdersPage and OrderDetailPage with component selectors and embedded inputs, preserving routed usage. Native filters, status badges, export and paging retained. View emits selected ID in embedded mode. |
| Domain API | `src/app/features/admin/api/admin.api.ts` | Reuse orders, summary, order, orderItems and order-payment calls. JWT/domain service authorization remains required on each request. |
| Products | `src/app/features/admin/products/{products.page.ts,product-form.html,catalog-detail.ts}` | Standalone forms exist; current chat product draft uses ngModel and is not the required shared reactive product form. Further extraction needed. |
| Customers / users | `src/app/features/admin/customers/`, `src/app/features/admin/settings/user-edit.page.ts` | Existing native pages; no new registered embedded forms in this slice. |
| Automation | `src/app/features/admin/ai-automation/workflows.page.ts`, `docs/ai-automation-gap-analysis.md` | Existing five-step draft editor; prior report records publication/engine limitations. No claim of new execution capability. |
| Backend routing | `ai-service/.../service/{AiRouterService,AiToolExecutor,AiChatPresenter,AiChatStateService}.java`, `registry/AiToolRegistry.java` | Registry has ADMIN_ORDER_LIST with ORDER_VIEW_ALL; executor calls existing order integration. Presenter is the correct place to select views after execution. |
| Inference | `ai-inference/app/providers/`, `ai-inference/README.md` | Existing Gemini support; preserved. Not a verified Khmer transcription integration. |
| Access | `src/app/core/auth/{permission.service.ts,can-access.directive.ts}`, existing backend registry checks | Customer responses never select admin order presentation. Embedded detail mutation is disabled pending confirmation policy integration. |

## Implemented contract and endpoint connections

Backend adds `dto/ChatPresentation.java`, extends `dto/AiChatResponse.java` compatibly, and updates `service/AiChatPresenter.java`. A successful administrator ADMIN_ORDER_LIST execution selects schema `1.0`, block `orders.list`. No model-specified class, HTML or URL is consumed. The original five-argument response constructor is retained for other callers.

Angular adds `chat-presentation.ts` and `chat-ui-renderer.ts`. Explicit template switch is the component registry. Unsupported versions/kinds show visible errors without dumping payloads. AssistantApi carries the presentation into stored turn results; admin chat prioritizes it over generic cards. Native screen re-fetches using existing authenticated API clients; it does not trust model records as authoritative.

Connected existing domain routes: `/api/v1/orders/get/all`, `/api/v1/orders/id/`, existing order items/summary and paymentByOrder APIs through AdminApi. Chat endpoint remains `/api/ai/admin/chat`.

## Verification

- `npm run build`: passed; existing initial bundle budget warning (approximately 772 kB versus 650 kB).
- `npm test -- --include='src/app/features/assistant/chat-ui-renderer.spec.ts' --include='src/app/features/admin/assistant/admin-assistant.spec.ts' --include='src/app/features/admin/orders/order-detail.spec.ts'`: passed, 24 tests across 3 files.
- Backend: `JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 PATH=/usr/lib/jvm/java-17-openjdk-amd64/bin:$PATH mvn -pl ai-service -am -Dtest=AiChatPresentationTest -Dsurefire.failIfNoSpecifiedTests=false test`: passed, 2 tests. Default Maven Java initially failed release 17 compilation; selecting installed JDK 17 resolved it.
- Tests use fixtures only in test files. No production mock records added.
- No live authenticated browser/E2E or screenshot verification performed. Component rendering tests do not establish a deployed vertical slice. Restart/redeploy ai-service and frontend together to use the new contract.

## Remaining requirements — not complete

1. Native Orders search currently filters the fetched page, matching the existing screen. Global server search/sort and propagation of prompt status/date filters into presentation state remain necessary. The native re-fetch currently shows all orders rather than preserving a filtered AI result.
2. Direct order-detail prompt mapping, server-side selected-record follow-ups and presentation reconstruction for server-restored conversation history remain missing. View from the embedded table works in the current conversation.
3. Product create/edit shared reactive forms, lookups, backend drafts/concurrency/approval/idempotency and successful returned-ID UI remain unimplemented by this change. Existing product draft flow is preserved, not certified against the new requirements.
4. Other admin domain tables/forms, workflow graph/tools/approvals/executions and customer-scoped renderer coverage remain missing.
5. Khmer/English provider transcription, permission/cancel/error UX and real audio verification remain missing. Existing browser speech code is not evidence of verified Khmer support.
6. Full ownership/RBAC integration tests, provider-outage tests, responsive/accessibility browser verification, safe DTO field filtering audit and complete release gates remain outstanding.

This is the initial protocol/native-orders implementation, not completion of the attached master specification.

## Inventory extension

Registered `inventory.list` and `inventory.low-stock` in the backend presenter and explicit Angular renderer. Reused `src/app/features/admin/inventory/inventory-reference.page.ts` with embedded inputs and lifecycle initialization. Low-stock presentation initializes the existing `LOW_STOCK` filter; search, warehouse/status, paging, summary and CSV export use existing AdminApi. No fabricated KPI values/trends or production fixture records were introduced. Adjustment links still navigate to the existing authorized stock workflow; embedded adjustments, category/image enrichment and live browser verification remain outstanding. Frontend production build passed (initial-bundle warning remains); focused renderer/admin tests passed, 17 tests.

## Corrected Create Product UI

Removed the chatbot-specific product editor and direct `AdminApi.createProduct` path from `admin-assistant.page.ts`. Chat now mounts the actual `ProductFormPage` / `product-form.html`, with supported prompt prefill, genuine category/subcategory lookups, native SKU/image controls, existing validation, and the existing staged approval service. Embedded Cancel closes the panel; Save Draft/Submit report the returned request ID in the conversation instead of navigating away or claiming that a live product already exists. The routed editor keeps its original navigation behavior. Product-form initialization moved to ngOnInit so embedded inputs are available and unrelated route IDs/duplicate parameters are ignored. Production build passed; 21 focused tests passed across native editor, embedded editor and admin chat. Live browser verification remains outstanding.

## Provider-independent order commands

Known admin order commands now open the native table directly or call the existing registered ADMIN_ORDER_LIST tool with an explicit date, bypassing intent inference. Direct order-number lookups use AdminApi.orderByNumber and render native in-chat details. The existing dated tool returns at most 20 records; these responses are retained as a visibly bounded, server-filtered result set with local paging. They are not silently replaced by an unfiltered list or presented as the full day’s count. General AI prompts still depend on provider availability. Focused tests: 24 passed.
