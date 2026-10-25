# E-Shop endpoint inventory

Generated from current Spring controller annotations and Angular HTTP call sites. Dynamic segments are matched structurally; this does not validate DTOs, authorization, side effects, or live service behavior. See integration-status.md for testing evidence and limitations.

| Method | Route | Static status | Angular source |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/monitor` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/live-tests/runs` | Adapter present; live verification required | [live-tests.page.ts](../src/app/features/admin/live-tests/live-tests.page.ts) |
| GET | `/api/v1/admin/live-tests/runs/{id}` | Adapter present; live verification required | [live-tests.page.ts](../src/app/features/admin/live-tests/live-tests.page.ts) |
| POST | `/api/v1/admin/live-tests/runs` | Adapter present; live verification required | [live-tests.page.ts](../src/app/features/admin/live-tests/live-tests.page.ts) |
| GET | `/api/v1/admin/session` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/admin/settings` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/admin/settings` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/storefront/access-settings` | Adapter present; live verification required | [storefront-access.service.ts](../src/app/core/storefront/storefront-access.service.ts) |
| GET | `/api/v1/admin/storefront/access-settings` | Adapter present; live verification required | [storefront-access-settings.ts](../src/app/features/admin/settings/storefront-access-settings.ts) |
| PUT | `/api/v1/admin/storefront/access-settings` | Adapter present; live verification required | [storefront-access-settings.ts](../src/app/features/admin/settings/storefront-access-settings.ts) |
| GET | `/api/ai/admin/info` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/admin/conversations` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/admin/conversations/{id}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| PATCH | `/api/ai/admin/conversations/{id}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| POST | `/api/ai/visual-search` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| POST | `/api/ai/tools/{tool}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| POST | `/api/ai/confirm/{id}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| POST | `/api/ai/chat` | Review required |  |
| POST | `/api/ai/admin/chat` | Review required |  |
| POST | `/api/ai/execute` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/executions/{id}` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/imports/tools` | Review required |  |
| GET | `/api/ai/imports` | Review required |  |
| GET | `/api/ai/imports/requests` | Review required |  |
| POST | `/api/ai/imports/manual-product` | Review required |  |
| POST | `/api/ai/imports/{id}/rows/{rowId}/images` | Review required |  |
| POST | `/api/ai/imports/{id}/rows/{rowId}/images/{imageId}/detach` | Review required |  |
| GET | `/api/ai/imports/{id}/images/{imageId}` | Review required |  |
| POST | `/api/ai/imports/{id}/analyze` | Review required |  |
| GET | `/api/ai/imports/{id}/preview` | Review required |  |
| PATCH | `/api/ai/imports/{id}/sheets/{sheetId}` | Review required |  |
| POST | `/api/ai/imports/{id}/sheets/{sheetId}/rows` | Review required |  |
| PATCH | `/api/ai/imports/{id}/rows/{rowId}` | Review required |  |
| PATCH | `/api/ai/imports/{id}/rows/{rowId}/skip` | Review required |  |
| POST | `/api/ai/imports/{id}/validate` | Review required |  |
| POST | `/api/ai/imports/{id}/submit` | Review required |  |
| POST | `/api/ai/imports/{id}/approve` | Review required |  |
| POST | `/api/ai/imports/{id}/reject` | Review required |  |
| POST | `/api/ai/imports/{id}/request-changes` | Review required |  |
| POST | `/api/ai/imports/{id}/execute` | Review required |  |
| GET | `/api/ai/imports/{id}/executions` | Review required |  |
| GET | `/api/ai/imports/{id}/history` | Review required |  |
| GET | `/api/ai/imports/{id}/original` | Review required |  |
| GET | `/api/ai/imports/{id}/report` | Review required |  |
| POST | `/api/ai/knowledge` | Review required |  |
| GET | `/api/ai/admin/memory` | Review required |  |
| GET | `/api/ai/admin/memory/{id}` | Review required |  |
| DELETE | `/api/ai/admin/memory/{id}` | Review required |  |
| POST | `/api/ai/feedback` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/quota` | Adapter present; live verification required | [assistant-quota.ts](../src/app/features/assistant/assistant-quota.ts) |
| POST | `/api/ai/voice/transcriptions` | Adapter present; live verification required | [assistant.api.ts](../src/app/features/assistant/assistant.api.ts) |
| GET | `/api/ai/voice/config` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| GET | `/api/ai/voice/usage` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions/{id}/transcript` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| GET | `/api/ai/voice/sessions/{id}` | Review required |  |
| POST | `/api/ai/voice/sessions/{id}/connected` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions/{id}/end` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions/{id}/tools` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions/{id}/displayed-products` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| POST | `/api/ai/voice/sessions/{id}/selection` | Adapter present; live verification required | [live-voice.ts](../src/app/features/assistant/customer-chat/live-voice.ts) |
| GET | `/api/ai/admin/workflows/templates` | Review required |  |
| POST | `/api/ai/admin/workflows/propose` | Review required |  |
| GET | `/api/ai/admin/workflows` | Review required |  |
| GET | `/api/ai/admin/workflows/catalog` | Review required |  |
| GET | `/api/ai/admin/workflows/{id}` | Review required |  |
| POST | `/api/ai/admin/workflows` | Review required |  |
| PUT | `/api/ai/admin/workflows/{id}` | Review required |  |
| POST | `/api/ai/admin/workflows/validate` | Review required |  |
| POST | `/api/ai/admin/workflows/{id}/publish` | Review required |  |
| GET | `/api/ai/admin/workflows/{id}/versions` | Review required |  |
| POST | `/api/ai/admin/workflows/versions/{id}/execute` | Review required |  |
| GET | `/api/ai/admin/workflows/summary` | Review required |  |
| GET | `/api/ai/admin/workflows/executions` | Review required |  |
| GET | `/api/ai/admin/workflows/executions/{id}/logs` | Review required |  |
| GET | `/api/ai/admin/workflows/executions/{id}` | Review required |  |
| POST | `/api/ai/admin/workflows/executions/{id}/cancel` | Review required |  |
| POST | `/api/ai/admin/workflows/executions/{id}/rerun` | Review required |  |
| POST | `/api/ai/admin/workflows/executions/{id}/reconcile` | Review required |  |
| GET | `/api/v1/gateway/routes` | Excluded: gateway infrastructure |  |
| POST | `/api/v1/gateway/routes` | Excluded: gateway infrastructure |  |
| PUT | `/api/v1/gateway/routes/{id}` | Excluded: gateway infrastructure |  |
| DELETE | `/api/v1/gateway/routes/{id}` | Excluded: gateway infrastructure |  |
| POST | `/api/v1/gateway/routes/refresh` | Excluded: gateway infrastructure |  |
| GET | `/api/v1/addresses/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| GET | `/api/v1/addresses/user/{userId}/paged` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| GET | `/api/v1/addresses/{id}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts), [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/addresses/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| PUT | `/api/v1/addresses/{id}/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| DELETE | `/api/v1/addresses/{id}/user/{userId}` | Adapter present; live verification required | [addresses.api.ts](../src/app/features/addresses/addresses.api.ts) |
| GET | `/internal/commerce/addresses/{id}/owner/{userId}` | Excluded: service-to-service API |  |
| GET | `/api/v1/user/me/profile` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts) |
| PUT | `/api/v1/user/me/profile` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts) |
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
| POST | `/internal/commerce/guest/contact-code` | Excluded: service-to-service API |  |
| POST | `/internal/notifications/guest-email` | Excluded: service-to-service API |  |
| GET | `/internal/authorization/import-reviewers/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/authorization/api-access` | Excluded: service-to-service API |  |
| GET | `/internal/authorization/me` | Excluded: service-to-service API |  |
| GET | `/api/v1/user/access` | Adapter present; live verification required | [permission.service.ts](../src/app/core/auth/permission.service.ts) |
| GET | `/internal/authorization/users/{id}/active` | Excluded: service-to-service API |  |
| GET | `/internal/ai/users` | Excluded: service-to-service API |  |
| POST | `/internal/notifications/email` | Excluded: service-to-service API |  |
| POST | `/api/v1/public/register` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| POST | `/api/v1/public/verify` | Review required |  |
| POST | `/api/v1/public/resend` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| POST | `/api/v1/public/email/username/login` | Review required |  |
| POST | `/api/v1/public/refresh` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/logout` | Review required |  |
| POST | `/api/v1/public/forgot-password` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts), [security.page.ts](../src/app/features/account/security.page.ts), [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/public/reset-password` | Adapter present; live verification required | [account.page.ts](../src/app/features/account/account.page.ts) |
| GET | `/api/v1/public/reset-password-page` | Excluded: backend HTML page; Angular supplies reset form |  |
| POST | `/api/v1/public/check-user` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/accounts/register` | Adapter present; live verification required | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/second-factor` | Review required |  |
| POST | `/api/v1/public/session/login` | Excluded: alternative cookie-session protocol; app uses bearer tokens | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/session/verify` | Excluded: alternative cookie-session protocol; app uses bearer tokens | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/session/second-factor` | Excluded: alternative cookie-session protocol; app uses bearer tokens | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/session/refresh` | Excluded: alternative cookie-session protocol; app uses bearer tokens | [auth.service.ts](../src/app/core/auth/auth.service.ts) |
| POST | `/api/v1/public/session/logout` | Excluded: alternative cookie-session protocol; app uses bearer tokens |  |
| GET | `/api/v1/user/approval-options` | Adapter present; live verification required | [ai-imports.api.ts](../src/app/features/admin/imports/ai-imports.api.ts) |
| POST | `/api/v1/user/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id/image` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts) |
| GET | `/api/v1/user/id/user` | Adapter present; live verification required | [profile.api.ts](../src/app/features/account/profile.api.ts), [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/All` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id/update` | Blocked: backend @PathVariable id is missing from mapping | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/id/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/count` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/user/{id}/details` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/user/{id}/details/activity` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/user/editor-options` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/user/{id}/editor` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| PUT | `/api/v1/user/{id}/editor` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/user/{id}/editor/photo` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
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
| GET | `/api/v1/public/keycloak/config` | Adapter present; live verification required | [keycloak.service.ts](../src/app/core/auth/keycloak.service.ts) |
| POST | `/api/v1/public/keycloak/exchange` | Adapter present; live verification required | [keycloak.service.ts](../src/app/core/auth/keycloak.service.ts) |
| GET | `/internal/ai/inventory/{skuId}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/inventory/low-stock` | Excluded: service-to-service API |  |
| GET | `/internal/ai/promotions/{id}` | Excluded: service-to-service API |  |
| POST | `/internal/ai/promotions/{id}/disable` | Excluded: service-to-service API |  |
| GET | `/internal/ai/products` | Excluded: service-to-service API |  |
| GET | `/internal/ai/products/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/skus/{id}` | Excluded: service-to-service API |  |
| POST | `/internal/ai/promotions` | Excluded: service-to-service API |  |
| GET | `/api/v1/branches` | Adapter present; live verification required | [branches.page.ts](../src/app/features/admin/imports/branches.page.ts) |
| POST | `/api/v1/branches` | Adapter present; live verification required | [branches.page.ts](../src/app/features/admin/imports/branches.page.ts) |
| GET | `/api/v1/branches/{id}/access` | Adapter present; live verification required | [branches.page.ts](../src/app/features/admin/imports/branches.page.ts) |
| PUT | `/api/v1/branches/{id}/access` | Adapter present; live verification required | [branches.page.ts](../src/app/features/admin/imports/branches.page.ts) |
| PUT | `/api/v1/branches/{id}/inventory/{inventoryId}` | Adapter present; live verification required | [branches.page.ts](../src/app/features/admin/imports/branches.page.ts) |
| GET | `/api/v1/brand-logos/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/brand-logos/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/brand-logos/upload` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/internal/catalog/checkouts/{orderId}` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts/quote` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts/{orderId}/confirm` | Excluded: service-to-service API |  |
| POST | `/internal/catalog/checkouts/{orderId}/release` | Excluded: service-to-service API |  |
| POST | `/internal/ai/imports/validate` | Excluded: service-to-service API |  |
| POST | `/internal/ai/imports/validate-bulk` | Excluded: service-to-service API |  |
| POST | `/internal/ai/imports/execute-product` | Excluded: service-to-service API |  |
| POST | `/internal/ai/imports/execute` | Excluded: service-to-service API |  |
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
| GET | `/api/v1/products/sku/{id}` | Review required |  |
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
| GET | `/api/v1/storefront/products/{id}/reviews` | Review required |  |
| GET | `/api/v1/products/{id}/reviews` | Review required |  |
| POST | `/internal/commerce/guest/reviews` | Excluded: service-to-service API |  |
| POST | `/api/v1/products/{id}/reviews` | Adapter present; live verification required | [product-reviews.ts](../src/app/features/catalog/reviews/product-reviews.ts) |
| GET | `/api/v1/admin/guest-reviews` | Adapter present; live verification required | [guest-review-moderation.page.ts](../src/app/features/admin/settings/guest-review-moderation.page.ts) |
| PUT | `/api/v1/admin/guest-reviews/{id}` | Adapter present; live verification required | [guest-review-moderation.page.ts](../src/app/features/admin/settings/guest-review-moderation.page.ts) |
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
| POST | `/api/v1/products/reports/sku-categories` | Review required |  |
| GET | `/api/v1/storefront/categories` | Review required |  |
| GET | `/api/v1/storefront/categories/name` | Review required |  |
| GET | `/api/v1/storefront/categories/{id}` | Review required |  |
| GET | `/api/v1/storefront/products` | Adapter present; live verification required | [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| GET | `/api/v1/storefront/products/{id}` | Adapter present; live verification required | [catalog.api.ts](../src/app/features/catalog/catalog.api.ts) |
| GET | `/api/v1/storefront/skus/{id}` | Review required |  |
| POST | `/api/v1/subcategories/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/create` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/update` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/subcategories/delete` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/admin/audit-logs` | Adapter present through gateway service-specific audit paths | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/${automation.api-path:/api/v1/orders/automation}/events` | Review required |  |
| GET | `/${automation.api-path:/api/v1/orders/automation}/events/{id}/logs` | Review required |  |
| GET | `/${automation.api-path:/api/v1/orders/automation}/reviews` | Review required |  |
| POST | `/${automation.api-path:/api/v1/orders/automation}/events/{id}/retry` | Review required |  |
| GET | `/api/notifications/admin/delivery` | Adapter present; live verification required | [automation.api.ts](../src/app/features/admin/automation/automation.api.ts) |
| GET | `/internal/commerce/notifications/{orderId}` | Excluded: service-to-service API |  |
| GET | `/api/notifications` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/{id}` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/unread-count` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/{id}/read` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/read-all` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| GET | `/api/notifications/preferences` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| PATCH | `/api/notifications/preferences` | Adapter present; live verification required | [notifications.api.ts](../src/app/features/notifications/notifications.api.ts) |
| POST | `/api/v1/orders/automation/orders/{id}/review` | Adapter present; live verification required | [automation.api.ts](../src/app/features/admin/automation/automation.api.ts) |
| GET | `/internal/ai/orders/automation/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/commerce/orders/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders/{number}/cancel-preview` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders/{number}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders/latest` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders/admin` | Excluded: service-to-service API |  |
| GET | `/internal/ai/orders/summary` | Excluded: service-to-service API |  |
| GET | `/internal/ai/returns` | Excluded: service-to-service API |  |
| GET | `/internal/ai/returns/admin` | Excluded: service-to-service API |  |
| GET | `/internal/ai/shopping/cart` | Excluded: service-to-service API |  |
| POST | `/internal/ai/shopping/cart/{action}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/shopping/checkout-preview` | Excluded: service-to-service API |  |
| GET | `/internal/ai/shopping/reviews/{id}` | Excluded: service-to-service API |  |
| POST | `/internal/ai/shopping/orders/{id}` | Excluded: service-to-service API |  |
| GET | `/api/v1/cancelations/summary` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/cancelations/list` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/cancelations/{orderNo}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/cart/user/id` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/id/get-or-create` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| POST | `/api/v1/cart/user/id/items` | Review required |  |
| POST | `/api/v1/cart/user/id/items/cartItemId` | Review required |  |
| POST | `/api/v1/cart/user/userId/items/cartItemId` | Review required |  |
| POST | `/api/v1/cart/user/userId/clear` | Adapter present; live verification required | [cart.api.ts](../src/app/features/cart/cart.api.ts) |
| GET | `/api/v1/returns/user` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [after-sales.api.ts](../src/app/features/after-sales/after-sales.api.ts), [customer-returns.api.ts](../src/app/features/orders/returns/customer-returns.api.ts) |
| GET | `/api/v1/returns/user/{returnId}` | Adapter present; live verification required | [customer-returns.api.ts](../src/app/features/orders/returns/customer-returns.api.ts) |
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
| GET | `/api/v1/orders/reports/sales-details` | Adapter present; live verification required | [sales-report.page.ts](../src/app/features/admin/reports/sales-report.page.ts) |
| GET | `/api/v1/guest/cart` | Review required |  |
| POST | `/api/v1/guest/cart/items` | Review required |  |
| PATCH | `/api/v1/guest/cart/items/{id}` | Review required |  |
| DELETE | `/api/v1/guest/cart/items` | Review required |  |
| DELETE | `/api/v1/guest/cart/items/{id}` | Review required |  |
| POST | `/api/v1/guest/contact/code` | Review required |  |
| POST | `/api/v1/guest/contact/verify` | Review required |  |
| GET | `/internal/commerce/guest-orders/{id}/notice` | Excluded: service-to-service API |  |
| POST | `/api/v1/guest/checkout/preview` | Review required |  |
| POST | `/api/v1/guest/orders` | Review required |  |
| GET | `/api/v1/guest/orders` | Review required |  |
| POST | `/api/v1/guest/orders/{id}/access` | Review required |  |
| GET | `/api/v1/guest/orders/{id}` | Review required |  |
| POST | `/api/v1/guest/orders/{id}/payments` | Review required |  |
| GET | `/api/v1/guest/orders/{id}/payment-image` | Adapter present; live verification required | [guest.api.ts](../src/app/core/storefront/guest.api.ts) |
| GET | `/api/v1/guest/orders/{id}/payment-status` | Review required |  |
| POST | `/api/v1/guest/reviews` | Review required |  |
| POST | `/api/v1/guest/session` | Adapter present; live verification required | [guest.api.ts](../src/app/core/storefront/guest.api.ts) |
| DELETE | `/api/v1/guest/session` | Review required |  |
| POST | `/api/v1/payments/orders/{id}/bakong-app` | Adapter present; live verification required | [payment-qr.ts](../src/app/features/payments/payment-qr.ts) |
| GET | `/api/v1/payments/orders/{id}/qr/image` | Review required |  |
| GET | `/api/v1/payments/orders/{id}/qr` | Review required |  |
| POST | `/api/v1/payments/orders/{id}/verify` | Adapter present; live verification required | [checkout-payment.page.ts](../src/app/features/payments/checkout-payment.page.ts) |
| GET | `/internal/commerce/guest-orders/{id}/qr/image` | Excluded: service-to-service API |  |
| GET | `/internal/commerce/guest-orders/{id}/qr` | Excluded: service-to-service API |  |
| GET | `/internal/commerce/payments` | Excluded: service-to-service API |  |
| GET | `/internal/commerce/payments/{id}` | Excluded: service-to-service API |  |
| POST | `/api/v1/bakong/get-qr-image` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/bakong/check-transaction` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/internal/ai/payments/revenue` | Excluded: service-to-service API |  |
| GET | `/internal/ai/payments/{id}` | Excluded: service-to-service API |  |
| GET | `/internal/ai/payments/admin` | Excluded: service-to-service API |  |
| POST | `/api/v1/payments/user/id` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payments/user/detail` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payments/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/order` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/transaction` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payments/user/history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payments/methods` | Adapter present; live verification required | [payment-qr.ts](../src/app/features/payments/payment-qr.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payments/reports/breakdown` | Adapter present; live verification required | [payment-report.page.ts](../src/app/features/admin/reports/payment-report.page.ts) |
| GET | `/api/v1/payments/reports/monthly` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| POST | `/api/v1/payment-transactions/get/all` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/payment-transactions/{id}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
| GET | `/api/v1/payment-transactions/no/{transactionNo}` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/order/{orderId}` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/customer/{customerId}` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| GET | `/api/v1/payment-transactions/{id}/status-history` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts), [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| POST | `/api/v1/payment-transactions` | Adapter present; live verification required | [payments.api.ts](../src/app/features/payments/payments.api.ts) |
| PUT | `/api/v1/payment-transactions/{id}/status` | Adapter present; live verification required | [admin.api.ts](../src/app/features/admin/api/admin.api.ts) |
