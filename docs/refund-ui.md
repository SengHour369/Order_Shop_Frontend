# Refund UI

The existing `/admin/refunds` and `/admin/refunds/:id` pages follow the supplied refund-management and refund-detail references. Templates and styles are separate from the page logic.

Implemented: summary cards, refund/order search, status and payment filters, date-range controls, paging, detail tabs, five-step status indicator, order/customer/payment/product sections, reason, return details, history, internal remark display, record download and print. Pending refunds can be processed or cancelled after reviewing the amount and remark. Completed records cannot be processed again.

API integration uses refund list/detail/summary/history/process/cancel plus existing order, customer, payment-transaction, inventory, product and return lookups. Approval routes to Return Requests because approval belongs to that API flow. Related data failures do not hide the refund record.

Current API limits: standalone note creation and email sending are not available, so those controls are disabled. Customer evidence images, carrier tracking, customer totals and photos are shown only when supplied; no screenshot sample data is inserted. Customer/payment filters operate on the loaded page. Refund processing updates the order-service record; payment-provider settlement is not implemented by that endpoint.

Validation: production build passes; 51 Angular tests pass. Browser checks confirmed live refund ID search, page changes, catalog SKU enrichment, all detail tabs, and disabled process/reject controls on processed records. No live refund status was changed. Pending actions and status transitions were checked with unit tests. Seed records share request timestamps, so backend paging can overlap records because its sort has no secondary key.

Previews: `docs/screenshots/refund-management-reference.png`, `docs/screenshots/refund-details-reference.png`.
