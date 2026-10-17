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

The Dockerfile builds the app and serves it with nginx. Connect nginx to the backend `api-gateway` hostname or update `deploy/nginx.conf`. Use HTTPS at the ingress. Configure allowed origins for the deployed environment separately; the development proxy strips the local Origin header for the existing gateway allowlist. Do not configure the browser to call individual microservices.
