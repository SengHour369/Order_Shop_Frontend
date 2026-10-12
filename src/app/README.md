# Angular project map

Start here when reviewing application code. Files are grouped by feature; page templates, styles and tests stay beside the TypeScript that owns them.

| Folder | What belongs here |
| --- | --- |
| `core/api/` | Gateway HTTP client, API models and response handling |
| `core/auth/` | Login service, route guards and authentication interceptor |
| `core/stores/` | Shared application state, including `customer.store.ts` |
| `features/` | Customer screens and their feature-specific API services |
| `features/admin/` | Admin screens grouped by business function |
| `features/assistant/` | AI API, customer chat and embedded checkout |
| `layouts/` | Customer account layout |
| `shared/components/` | Reusable icons, product cards, status and other UI |
| `shared/utils/` | Conversation IDs and reusable request/page state |
| `app.routes.ts` | Lazy routes and access guards |
| `app.config.ts` | Application providers and HTTP configuration |
| `app.ts` | Application shell and navigation |

## Customer features

Browse `features/home`, `catalog`, `scanner`, `cart` and `checkout` for shopping. Account-related screens live in `account`, `addresses`, `orders`, `payments`, `wishlist`, `notifications` and `after-sales`. The assistant has its own detailed [review guide](features/assistant/README.md).

## Admin features

```text
features/admin/
  api/          Shared admin API service and contract tests
  layout/       Admin navigation and shell
  styles/       Styles reused across admin screens
  dashboard/    Overview and dashboard tests
  products/     Products, product forms, categories and brands
  inventory/    Stock, stock workflows and warehouses
  orders/       Orders, returns and cancellations
  payments/     Payments, refunds, transactions and Bakong
  customers/    Customer records, forms and customer groups
  promotions/   Promotions
  reports/      Reports and report models
  assistant/    Admin AI assistant
  settings/     Settings, users, permissions and operations
```

## Review a feature

1. Find its route in `app.routes.ts`.
2. Open the page/component and its adjacent HTML and CSS, when present. Some existing pages use inline templates.
3. Follow its API service to review request contracts. Shared DTOs are in `core/api/models.ts`.
4. Read adjacent `.spec.ts` files for expected behavior and failure cases.

Keep new feature files with their owners. Put a component in `shared/components` only when it is reused across features; keep feature-specific helpers and state with the feature. `core/stores` is for state shared across the application.

From the project root, use `npm test` for automated checks and `npm run build` for the production build. Project setup and backend integration notes are in the root `README.md` and `docs/`.
