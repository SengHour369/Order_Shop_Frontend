# E-Shop endpoint inventory

Generated from current Spring controller annotations and Angular HTTP call sites. Dynamic segments are matched structurally; this does not validate DTOs, authorization, side effects, or live service behavior. See integration-status.md for testing evidence and limitations.

| Method | Route | Static status | Angular source |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/monitor` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/session` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/settings` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/admin/settings` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/ai/execute` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/executions/{id}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/v1/gateway/routes` | Excluded: gateway infrastructure |  |
| POST | `/api/v1/gateway/routes` | Excluded: gateway infrastructure |  |
| PUT | `/api/v1/gateway/routes/{id}` | Excluded: gateway infrastructure |  |
| DELETE | `/api/v1/gateway/routes/{id}` | Excluded: gateway infrastructure |  |
| POST | `/api/v1/gateway/routes/refresh` | Excluded: gateway infrastructure |  |
| GET | `/api/v1/addresses/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| GET | `/api/v1/addresses/user/{userId}/paged` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| GET | `/api/v1/addresses/{id}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| POST | `/api/v1/addresses/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| PUT | `/api/v1/addresses/{id}/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| DELETE | `/api/v1/addresses/{id}/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| POST | `/api/v1/functions/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/functions/get/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/functions/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/functions/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/functions/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/groups/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/groups/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/groups/get/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/groups/update/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| DELETE | `/api/v1/groups/delete/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PATCH | `/api/v1/groups/activate/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/group-permissions/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/group-permissions/get/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/group-permissions/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/group-permissions/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/group-permissions/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/internal/notifications/email` | Excluded: service-to-service API |  |
| POST | `/api/v1/public/register` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| POST | `/api/v1/public/verify` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/resend` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| POST | `/api/v1/public/email/username/login` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/refresh` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/logout` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/forgot-password` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts), [security.page.ts](../src/app/features/account/security.page.ts) |
| POST | `/api/v1/public/reset-password` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| GET | `/api/v1/public/reset-password-page` | Excluded: backend HTML page; Angular supplies reset form |  |
| POST | `/api/v1/public/check-user` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/accounts/register` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/session/login` | Excluded: alternative cookie-session protocol; app uses bearer tokens |  |
| POST | `/api/v1/public/session/verify` | Excluded: alternative cookie-session protocol; app uses bearer tokens |  |
| POST | `/api/v1/public/session/refresh` | Excluded: alternative cookie-session protocol; app uses bearer tokens |  |
| POST | `/api/v1/public/session/logout` | Excluded: alternative cookie-session protocol; app uses bearer tokens |  |
| POST | `/api/v1/user/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id/image` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts) |
| GET | `/api/v1/user/id/user` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts), [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/All` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id/update` | Blocked: backend @PathVariable id is missing from mapping |  |
| POST | `/api/v1/user/id/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/count` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-groups/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-groups/get/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-groups/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-groups/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-groups/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-permissions/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-permissions/get/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-permissions/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-permissions/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user-permissions/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/internal/ai/products/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/skus/{id}` | Excluded: service-to-service API |  |
| POST | `/internal/ai/promotions` | Excluded: service-to-service API |  |
| GET | `/api/v1/brand-logos/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/brand-logos/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/brand-logos/upload` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/internal/catalog/checkouts/quote` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts/{orderId}/confirm` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts/{orderId}/release` | Excluded: service-to-service API |  |
| POST | `/api/v1/categories/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/categories/id/get` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/categories/name` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| POST | `/api/v1/categories/with-subcategories` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/categories/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/categories/id/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/categories/id/icon` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| DELETE | `/api/v1/categories/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/category-icons/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/category-icons/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/category-icons/upload` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/sku` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/product` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/low-stock` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PATCH | `/api/v1/inventory/restock` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/exact` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/inventory/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/inventory/search` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/inventory/history/{inventoryId}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/attributes/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| GET | `/api/v1/attributes/name/{name}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| GET | `/api/v1/attributes` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| DELETE | `/api/v1/attributes/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/attribute-values/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/attribute-values/attribute/{attributeId}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| PUT | `/api/v1/attribute-values/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| DELETE | `/api/v1/attribute-values/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/attribute-values` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| POST | `/api/v1/products/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| POST | `/api/v1/products/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/products/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/products/update/status` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/products/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/product-scanner/scan` | Adapter present; live verification required | [scanner.api.ts](../src/app/features/scanner/scanner.api.ts) |
| POST | `/api/v1/product-scanner/recognize` | Adapter present; live verification required | [scanner.api.ts](../src/app/features/scanner/scanner.api.ts) |
| POST | `/api/v1/admin/promotions` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/admin/promotions/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/promotions/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/promotions` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| DELETE | `/api/v1/admin/promotions/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/admin/promotions/{id}/skus` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/promotions/{id}/skus` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| DELETE | `/api/v1/admin/promotions/{id}/skus/{skuId}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/admin/promotions/{id}/schedule` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/admin/promotions/{id}/activate` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/admin/promotions/{id}/disable` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/promotions/active` | Adapter present; live verification required | [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| GET | `/api/v1/promotions/{id}/products` | Adapter present; live verification required | [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| POST | `/api/v1/subcategories/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/admin/audit-logs` | Adapter present through gateway service-specific audit paths | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/notifications` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/{id}` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/unread-count` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/{id}/read` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/read-all` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/preferences` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/preferences` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/internal/ai/orders/{number}` | Excluded: service-to-service API |  |
| GET | `/api/v1/cancelations/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/cancelations/list` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/cancelations/{orderNo}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/cart/user/id` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/id/get-or-create` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/id/items` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/id/items/cartItemId` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/userId/items/cartItemId` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/userId/clear` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| GET | `/api/v1/orders` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/user/id` | Adapter present; live verification required | [orders.api.ts](../src/app/features/orders/orders.api.ts) |
| POST | `/api/v1/orders/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/number` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/user/detail` | Adapter present; live verification required | [orders.api.ts](../src/app/features/orders/orders.api.ts) |
| POST | `/api/v1/orders/user/history` | Adapter present; live verification required | [orders.api.ts](../src/app/features/orders/orders.api.ts) |
| POST | `/api/v1/orders/status` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/user/cancel` | Adapter present; live verification required | [orders.api.ts](../src/app/features/orders/orders.api.ts) |
| GET | `/api/v1/orders/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/items` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/orders/user/from-cart` | Adapter present; live verification required | [orders.api.ts](../src/app/features/orders/orders.api.ts) |
| GET | `/api/v1/orders/reports/weekly` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/orders/reports/monthly` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/refunds/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| POST | `/api/v1/refunds/list` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/refunds/{refundId}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| POST | `/api/v1/refunds/{refundId}/process` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/refunds/{refundId}/cancel` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/refunds/{refundId}/history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| GET | `/api/v1/refunds/{refundId}/similar-products` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/returns/user` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| GET | `/api/v1/returns/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| POST | `/api/v1/returns/returns` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/returns/{returnId}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| GET | `/api/v1/returns/{returnId}/history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts) |
| POST | `/api/v1/returns/{returnId}/approve` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/returns/{returnId}/reject` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/returns/{returnId}/receive` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/returns/{returnId}/inspect/start` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/returns/{returnId}/inspect/complete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/bakong/get-qr-image` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/bakong/check-transaction` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payments/user/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payments/user/detail` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payments/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/order` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/transaction` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/user/history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payments/reports/monthly` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payment-transactions/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/payment-transactions/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/payment-transactions/no/{transactionNo}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/order/{orderId}` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/customer/{customerId}` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/{id}/status-history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payment-transactions` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| PUT | `/api/v1/payment-transactions/{id}/status` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
