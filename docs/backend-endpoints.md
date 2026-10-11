# Backend controller inventory

Read from D:/spring boot/E-Shop on 2026-10-04. This inventory lists controller mappings, not a guarantee of public gateway access. Internal service endpoints must stay internal. Inspect the named controller DTOs and service authorization before adding a caller. No backend source was changed.

| Service              | Method | Controller path                       | Source                                                                                                   |
| -------------------- | ------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ai-service           | POST   | /api/ai/execute                       | ai-service/src/main/java/com/example/eshop/ai/controller/AiController.java                               |
| ai-service           | GET    | /api/ai/executions/{id}               | ai-service/src/main/java/com/example/eshop/ai/controller/AiController.java                               |
| api-gateway          | GET    | /api/v1/gateway/routes                | api-gateway/src/main/java/com/example/eshop/gateway/controller/route/GatewayRouteController.java         |
| api-gateway          | POST   | /api/v1/gateway/routes                | api-gateway/src/main/java/com/example/eshop/gateway/controller/route/GatewayRouteController.java         |
| api-gateway          | PUT    | /api/v1/gateway/routes/{id}           | api-gateway/src/main/java/com/example/eshop/gateway/controller/route/GatewayRouteController.java         |
| api-gateway          | DELETE | /api/v1/gateway/routes/{id}           | api-gateway/src/main/java/com/example/eshop/gateway/controller/route/GatewayRouteController.java         |
| api-gateway          | POST   | /api/v1/gateway/routes/refresh        | api-gateway/src/main/java/com/example/eshop/gateway/controller/route/GatewayRouteController.java         |
| auth-service         | GET    | /api/v1/addresses/user/{userId}       | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| auth-service         | GET    | /api/v1/addresses/user/{userId}/paged | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| auth-service         | GET    | /api/v1/addresses/{id}                | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| auth-service         | POST   | /api/v1/addresses/user/{userId}       | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| auth-service         | PUT    | /api/v1/addresses/{id}/user/{userId}  | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| auth-service         | DELETE | /api/v1/addresses/{id}/user/{userId}  | auth-service/src/main/java/com/example/eshop/auth/controller/AddressController.java                      |
| catalog-service      | GET    | /internal/ai/products/{id}            | catalog-service/src/main/java/com/example/eshop/catalog/controller/AiCatalogController.java              |
| catalog-service      | GET    | /internal/ai/skus/{id}                | catalog-service/src/main/java/com/example/eshop/catalog/controller/AiCatalogController.java              |
| catalog-service      | POST   | /internal/ai/promotions               | catalog-service/src/main/java/com/example/eshop/catalog/controller/AiCatalogController.java              |
| common-lib           | GET    | /api/admin/audit-logs                 | common-lib/src/main/java/com/example/eshop/common/audit/AuditLogController.java                          |
| notification-service | GET    | /api/notifications                    | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | GET    | /api/notifications/{id}               | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | GET    | /api/notifications/unread-count       | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | PATCH  | /api/notifications/{id}/read          | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | PATCH  | /api/notifications/read-all           | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | GET    | /api/notifications/preferences        | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| notification-service | PATCH  | /api/notifications/preferences        | notification-service/src/main/java/com/example/eshop/notification/controller/NotificationController.java |
| order-service        | GET    | /internal/ai/orders/{number}          | order-service/src/main/java/com/example/eshop/order/controller/AiOrderController.java                    |
| payment-service      | POST   | /api/v1/bakong/get-qr-image           | payment-service/src/main/java/com/example/eshop/payment/bakong/controller/BakongController.java          |
| payment-service      | POST   | /api/v1/bakong/check-transaction      | payment-service/src/main/java/com/example/eshop/payment/bakong/controller/BakongController.java          |
