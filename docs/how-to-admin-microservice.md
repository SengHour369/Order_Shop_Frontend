# How to add an admin microservice

`admin-service` is a separate Spring Boot process. It lives in `D:\spring boot\E-Shop\admin-service`. The shop browser never calls port 8087. It calls the gateway at `http://localhost:8080`, and the gateway forwards two exact paths to this service: `/api/v1/admin/session` and `/api/v1/admin/monitor`.

This service owns the staff session check. It does not own products, categories, brands, inventory, orders, returns, refunds, payments, or users. Those stay in catalog-service, order-service, payment-service, and auth-service.

## The pattern

Every E-Shop service follows the same six parts.

1. A Maven module whose `artifactId` is the service name, listed in the root `pom.xml`.
2. A Spring Boot application that scans `com.example.eshop.<service>` and `com.example.eshop.common`.
3. Its own Postgres database. It does not read another service's tables.
4. Stateless JWT security from `common-lib`. auth-service is the only service that issues tokens.
5. An Eureka name that matches `spring.application.name`, and a gateway route `lb://<that-name>`.
6. A circuit breaker on that route, with no `StripPrefix`. The public path and the controller path stay the same.

Kafka is only for a service that publishes or consumes events. This admin service does not, so it has no Kafka dependency.

## What was added

| Piece | Where |
| --- | --- |
| Module | `admin-service/` and root `pom.xml` |
| Process | port `8087`, Eureka name `admin-service` |
| Database | `admin_db` on host port `5439` |
| Staff call | `GET /api/v1/admin/session` |
| Monitor call | `GET /api/v1/admin/monitor` |
| Background tick | `AdminMonitorService.tick` every `admin.monitor-delay-ms` (default 30s), table `admin_service_ticks` |
| Process probe | `GET http://localhost:8087/actuator/health` and `/actuator/info` |
| Audit rows for this process | `GET /api/admin/audit-logs/admin` on the gateway, rewritten to `/api/admin/audit-logs` |
| OpenAPI | `GET /openapi/admin-service` |
| Compose | `admin-db` and `admin-service` in `compose.yaml` |

`GET /api/v1/admin/session` returns the signed-in username and authorities from the access token. `ADMIN` and `MANAGER` are allowed. A missing token is 401. Any other role is 403. The response uses `APIResponse` from `common-lib`: `success`, `message`, `status`, `data`.

`GET /api/v1/admin/monitor` returns the latest background tick for the same two roles. The scheduled task and the actuator probe are written in [Background Tasks and Monitoring](background-tasks-and-monitoring.md).

Do not route `/api/v1/admin/**` to this service. These paths already belong to other services:

- `/api/v1/admin/users/**` goes to auth-service
- `/api/v1/admin/promotions/**` goes to catalog-service

## Package layout

```
admin-service/src/main/java/com/example/eshop/admin/
  AdminServiceApplication.java
  config/SecurityConfig.java
  config/AdminMonitorConfiguration.java
  config/AdminSchedulingConfiguration.java
  controller/StaffSessionController.java
  controller/AdminMonitorController.java
  service/StaffSessionService.java
  service/AdminMonitorService.java
  health/AdminMonitorHealthIndicator.java
  dto/StaffSessionResponse.java
  dto/MonitorStatusResponse.java
  model/ServiceTick.java
  repository/ServiceTickRepository.java
```

`AdminServiceApplication` scans common code so JWT validation, the audit log, request ids, and `GlobalExceptionHandler` are the same as the other services. Audit entities stay in `com.example.eshop.common.audit`. This service's own table is `admin_service_ticks`, so `@EntityScan` includes `com.example.eshop.admin.model` and `@EnableJpaRepositories` includes `com.example.eshop.admin.repository`.

## Add the next admin endpoint

1. Put the type in `dto`, the rules in `service`, and the mapping in `controller`.
2. Keep the controller path under a new exact prefix, for example `/api/v1/admin/notes`. Do not reuse a path that catalog, order, payment, or auth already serves.
3. In `SecurityConfig`, allow only `ADMIN` and `MANAGER` unless the call is the shared audit search.
4. In `api-gateway/src/main/resources/application.yml`, add a route with `uri: lb://admin-service`, the same path, a `CircuitBreaker`, and `fallbackUri: forward:/fallback/admin`.
5. Leave the path unchanged. Do not add `StripPrefix`.
6. Add a test that checks 401 without a token, 403 for a customer, and 200 for `ADMIN` and `MANAGER`.
7. Run `mvn -pl admin-service -am test` from `D:\spring boot\E-Shop`.

The gateway test `GatewayRouteConfigurationTest` already requires the route id `admin-service` and forbids a catch-all `/api/v1/admin/**` predicate.

## Run it

From `D:\spring boot\E-Shop`:

```
mvn -pl admin-service -am test
docker compose up -d admin-db admin-service api-gateway discovery-server
```

Set `JWT_SECRET` to the same value the other services use. The service reads that value and does not ship a second signing key.

Call the gateway, not the service port:

```
GET http://localhost:8080/api/v1/admin/session
GET http://localhost:8080/api/v1/admin/monitor
Authorization: Bearer <access token>
```

ShopKart stays at `http://127.0.0.1:4200`. Its dev proxy forwards `/api/**` to the gateway. A direct call to `http://localhost:8087` skips the gateway and is only for debugging this process.
