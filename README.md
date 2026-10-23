# E-Shop Angular frontend

Angular 22 standalone shop for the E-Shop microservice backend. Admin-EShop was used as a reference; the Angular adapters follow the current backend controllers and DTOs. Requests go through the gateway.

## Run

Requires a supported Node version from `package.json` (developed with Node 24.21).

Run `bash run-local.sh` to select the version in `.nvmrc` from nvm or a local installation and start the frontend. With nvm, run `nvm install` first.
Production builds leave Google Fonts as browser requests so building does not require access to Google's font servers.

```sh
npm ci
npm start
npm run build
npm test
```

Open http://127.0.0.1:4200. Start the backend separately. The development proxy in `proxy.conf.js` forwards `/api/**` to localhost:8080. Sign in with a verified active account. Catalog access requires authentication in the current backend. No test credentials or simulated orders are embedded.

## Structure

```text
src/app/core/api/        Gateway client, DTOs, response normalization and tests
src/app/core/auth/       In-memory login, guards and shared token refresh
src/app/core/stores/     Shared application state
src/app/features/       Lazy customer and staff pages with feature API adapters
src/app/features/admin/ Admin screens grouped by business function
src/app/shared/components/ Reusable UI components
src/app/shared/utils/   Shared utilities and request state
src/app/app.routes.ts   Feature routes and access guards
src/environments/       Gateway configuration
scripts/                Source endpoint audit and read-only live availability checks
docs/                   Endpoint inventory, verification results and screenshots
deploy/nginx.conf       Production SPA routing and gateway proxy
```

See the [Angular project map](src/app/README.md) for the folder layout and suggested review order.

Customer pages cover storefront, catalog, SKU selection, cart, checkout, orders, addresses, payments, notifications, account settings, security, wishlist, AI assistant and product finder. Staff pages cover catalog editing, inventory, orders, returns, cancellations, refunds, payments, transactions, customers, groups, permissions, reports, settings, promotions and service activity. Backend role checks remain authoritative.

## Integration conventions

- Match backend request field names, HTTP methods and pagination exactly. Cart `product_id` is a SKU ID.
- Normalize envelope failures, including business errors returned with HTTP 200. Display server errors without reporting false success.
- Keep access and refresh tokens in memory. Concurrent 401 responses share a refresh; logout or a new login cannot be overwritten by a stale refresh. A reload requires login.
- Preserve checkout keys and request payloads in session storage for retries. Pending checkout is not successful settlement.
- Use server prices and stock. Wishlist snapshots are stored per browser; adding to cart validates with the server.
- Keep code formatted with separate statements and readable templates. Tests exercise request contracts and important UI behavior.

## Verification

```sh
npm run audit:api -- "D:/spring boot/E-Shop"
npm run smoke:api -- http://localhost:8080
```

See [integration status](docs/integration-status.md), [source endpoint audit](docs/endpoint-audit.md) and [live availability results](docs/live-api-smoke.json). Source route matching and local tests do not prove authenticated or payment-provider behavior. Some endpoints have adapters without dedicated UI actions; internal and unsupported endpoints are identified in the audit.

## Deployment

The Dockerfile builds the app and serves it with nginx. Connect nginx to the backend `api-gateway` hostname or update `deploy/nginx.conf`. Use HTTPS at the ingress. Configure allowed origins for the deployed environment separately; the development proxy preserves the browser Origin. Configure `GATEWAY_CORS_ORIGINS` on both gateway and auth service to include the frontend scheme, host, and exact port. Preview URLs with temporary ports (for example `http://172.18.0.1:37265`) also need their exact origin in the backend `.env.local` allowlist; restart auth-service and api-gateway after changing it. A new preview port needs a corresponding configuration update. Do not strip or rewrite the browser Origin to bypass this check. Local HTTP requires `AUTH_COOKIE_SECURE=false`; production HTTPS must use secure cookies. Do not configure the browser to call individual microservices.

### Grafana monitoring

See [Grafana deployment](deploy/grafana/README.md) for a standalone Compose setup with persistent storage, required admin credentials, a provisioned Prometheus datasource and a target-health dashboard. An existing, container-reachable Prometheus server is required.

## Jenkins CI

See [Jenkins setup](docs/ci/jenkins.md) for agent requirements, multibranch job configuration, test reports, artifacts, and optional Docker image builds.

### Login fails after restarting or changing preview URL

Check the exact URL used by the browser without sending credentials:

```sh
npm run check:auth -- http://172.18.0.1:37265
```

HTTP 401 from this check means the origin was accepted and no session cookie was supplied; it does not test the username/password. HTTP 403 indicates an origin/security rejection. Keep the browser's exact origin (scheme, host, and port) in `GATEWAY_CORS_ORIGINS` on both backend services. Preserve existing allowed origins and recreate **both** `api-gateway` and `auth-service` with the environment files used by your deployment. A plain container restart does not apply changed environment variables. A new temporary preview port requires an updated exact origin; use a stable frontend URL when possible.

HTTP 502 indicates a proxy/backend connectivity failure. The Docker frontend nginx configuration resolves `api-gateway` through Docker DNS every five seconds so gateway recreation does not leave a stale upstream address. This configuration is included on the next frontend image build.
