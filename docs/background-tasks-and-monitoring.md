# Background Tasks and Monitoring

`admin-service` runs one scheduled task. Each tick records that this process is alive in its own database. The browser still calls the gateway at `http://localhost:8080`. The probe stays on the service port `8087`.

This is the same shape the other E-Shop services use for background work: one delay property, one unit of work each tick, and a fixed warning when the tick fails.

The staff session check is unchanged. Products, orders, payments, users, promotions, and groups stay in catalog-service, order-service, payment-service, and auth-service. Their jobs stay there too:

| Service | Scheduled method | Delay property | Default |
| --- | --- | --- | --- |
| notification-service | `EmailNotificationService.deliver` | `notifications.email-delay-ms` | 5000 |
| ai-service | `NotificationOutboxPublisher.publish` | `notifications.outbox-delay-ms` | 2000 |
| catalog-service | `PromotionLifecycleService.synchronize` | `promotions.sync-delay-ms` | 30000 |
| order-service | `CheckoutCoordinator.recover` | `checkout.recovery-delay-ms` | 10000 |
| admin-service | `AdminMonitorService.tick` | `admin.monitor-delay-ms` | 30000 |

## What the admin tick does

1. Read the clock.
2. Delete at most one row in `admin_service_ticks` whose `started_at` is older than `admin.monitor-retention` (default `PT24H`).
3. Insert one new row with `started_at`, `finished_at`, `outcome`, and `detail`.
4. A clean tick stores `SUCCESS` and the detail `tick`.
5. A failed tick stores `FAILED` and the detail `tick failed`, then logs `Admin monitor tick failed`.

The detail is a fixed word. It does not copy the exception text, a query, or a secret. The tick writes only to `admin_db`. It does not publish to Kafka. admin-service still has no Kafka dependency.

`@EnableScheduling` is on `AdminSchedulingConfiguration`. That class is active when `admin.monitor-enabled` is `true`. The default is `true`.

## The pattern

1. Put `@EnableScheduling` on one configuration class.
2. Put the work in one `@Scheduled` method. Wait with `fixedDelayString` and a property, so the next tick starts after the previous one finishes:

```java
@Scheduled(fixedDelayString = "${admin.monitor-delay-ms:30000}")
@Transactional
public void tick() { ... }
```

3. Keep the method `@Transactional`.
4. Do one unit of work. Here that is one insert and at most one delete. A larger backlog drains on later ticks.
5. On failure, store a short fixed detail and log one fixed warning. Leave the exception out of both.
6. Name the delay in milliseconds. Name a retention window as an ISO-8601 duration when the job keeps rows.
7. In `@SpringBootTest`, set `admin.monitor-enabled=false` so the scheduler stays off, then call `tick()` yourself.

## Monitoring

The process probe follows the gateway actuator settings.

1. Depend on `spring-boot-starter-actuator`.
2. Expose `health` and `info` only:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: never
```

3. `AdminMonitorHealthIndicator` uses the same rule as the staff reading:
   - No success row yet means UP. The process just started, so a probe can pass before the first tick.
   - The newest `SUCCESS` row older than three delays means DOWN. With the default delay, that is 90 seconds. Actuator then answers 503.
4. `SecurityConfig` permits `/actuator/health` and `/actuator/info` without a token. Every other path stays authenticated. The response has no component details.
5. Call the probe on the service:

```
GET http://localhost:8087/actuator/health
GET http://localhost:8087/actuator/info
```

The gateway has no `/actuator/**` route. ShopKart does not call these URLs.

## Staff reading

`GET /api/v1/admin/monitor` returns the latest tick inside `APIResponse` (`success`, `message`, `status`, `data`).

`data` contains `startedAt`, `finishedAt`, `outcome`, `detail`, and `healthy`.

| Caller | Result |
| --- | --- |
| No token | 401 |
| Any role other than `ADMIN` or `MANAGER` | 403 |
| `ADMIN` or `MANAGER`, no row yet | 200, `outcome` `STARTING`, `healthy` true |
| `ADMIN` or `MANAGER`, after a tick | 200, `outcome` `SUCCESS` or `FAILED` |

`healthy` follows the probe. A stale `SUCCESS` is still returned, with `healthy` false. The staff call itself stays 200 because it is a reading, not the probe.

The gateway route id `admin-service` lists two exact paths:

```yaml
- Path=/api/v1/admin/session, /api/v1/admin/monitor
```

`uri` stays `lb://admin-service`. The circuit breaker stays `adminServiceCB` with `fallbackUri: forward:/fallback/admin`. There is no `StripPrefix`. These paths stay off the catch-all `/api/v1/admin/**`, because `/api/v1/admin/users/**` belongs to auth-service and `/api/v1/admin/promotions/**` belongs to catalog-service.

```
GET http://localhost:8080/api/v1/admin/monitor
Authorization: Bearer <access token>
```

## Package layout

```
admin-service/src/main/java/com/example/eshop/admin/
  config/AdminSchedulingConfiguration.java
  config/AdminMonitorConfiguration.java
  service/AdminMonitorService.java
  health/AdminMonitorHealthIndicator.java
  controller/AdminMonitorController.java
  dto/MonitorStatusResponse.java
  model/ServiceTick.java
  repository/ServiceTickRepository.java
```

`AdminServiceApplication` scans `com.example.eshop.admin.model` and `com.example.eshop.admin.repository` together with `com.example.eshop.common.audit`.

## Add the next background task

1. Add the entity under `com.example.eshop.admin.model` and the repository under `com.example.eshop.admin.repository`.
2. Add one `@Scheduled` method with its own `fixedDelayString` property.
3. Keep each tick to one row.
4. Log one fixed warning on failure, with no exception text.
5. When staff need to read the result, add a new exact path in `SecurityConfig` and on the `admin-service` gateway route, with the same circuit breaker and no `StripPrefix`.
6. Leave `/actuator/**` off the gateway.
7. Cover the method with `admin.monitor-enabled=false`, including 401, 403, and 200 for `ADMIN` and `MANAGER` when a new HTTP path is added.
8. Run the tests below from `D:\spring boot\E-Shop`.

## Run the check

```
mvn -pl admin-service -am test
mvn -pl api-gateway test -Dtest=GatewayRouteConfigurationTest
```

Set `JWT_SECRET` to the same value the other services use. The service reads that value and does not ship a second signing key. ShopKart stays at `http://127.0.0.1:4200`.

The properties live in `admin-service/src/main/resources/application.yml`:

| Property | Default | Meaning |
| --- | --- | --- |
| `admin.monitor-enabled` | `true` | Turns the scheduler on. Tests set `false`. |
| `admin.monitor-delay-ms` | `30000` | Quiet time after each tick, in milliseconds. |
| `admin.monitor-retention` | `PT24H` | Rows older than this are removed one per tick. |
