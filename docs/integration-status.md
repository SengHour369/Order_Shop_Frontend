# Integration status

Latest follow-up: [cart/order/payment fixes and authenticated live insert results](cart-order-payment-fix.md). That report supersedes the earlier unverified status for these creation flows.

Verified on 2026-10-05 against the E-Shop source at `D:/spring boot/E-Shop`. Admin-EShop was a reference only; its files were not changed.

## Completed

| Area | Integration work |
| --- | --- |
| Catalog | Category ID lookup, active catalog queries, promotion product pagination and consistent default-SKU pricing |
| Authentication | Shared refresh, safe logout/new-login race handling, signed-in recovery forms and correct Sign In navigation |
| Customer data | Address/order/payment envelope normalization, business-error handling and safe profile field projection |
| Cart and checkout | Server SKU identity and stock checks; pending/retry checkout handling |
| After-sales | Actual customer return/refund routes and authenticated customer identity in return requests |
| Staff promotions | Create/edit, validation, lifecycle actions and numeric SKU assignment/removal |
| Staff activity | Service monitor, session and paginated service audit searches |
| Staff customer data | Password fields removed before presentation; nested envelope failures surfaced |
| Maintainability | Readable formatting, API audit scripts and regression tests |

The source inventory contains **199 distinct method/path routes**. Every route has a structural adapter match or an explicit exclusion/blocker in [the audit](endpoint-audit.md). This is static route coverage: it does not guarantee every request DTO or live operation, and adapters do not imply dedicated UI buttons for all endpoints.

## Validation

- **39 tests passed across six files**, covering HTTP contracts, business errors, request cancellation, refresh races, default SKU behavior and promotion forms.
- Production build completed successfully.
- Browser checks covered guest navigation, sign-in/recovery validation, account pages and responsive wishlist layout. Invalid recovery email kept submission disabled; guest cart navigation redirected to `/auth?returnUrl=%2Fcart`. No signed-in business operation was performed during this verification.
- Latest read-only live checks: gateway health and active promotions returned 200; notifications required login (401). Auth, order and payment OpenAPI documents were available. Catalog OpenAPI returned **504** in the latest run (it returned 200 earlier), so catalog service availability also needs investigation.
- `/api/v1/admin/session` and `/openapi/admin-service` returned **404** on the running gateway. The source includes admin functionality; its running deployment needs investigation.

See [machine-readable live results](live-api-smoke.json). Health and OpenAPI availability do not prove authenticated workflows or provider settlement.

## Remaining backend and verification gaps

1. Profile text updates are blocked: the backend user update method declares a path variable that is absent from its mapping. The UI does not pretend that editing succeeds.
2. Backend user responses include a password field. Angular strips it, but the backend DTO must also be corrected.
3. Bakong exposes QR rendering and transaction checks without a browser-facing order-to-KHQR initiation contract. A transaction record is not proof of payment; the UI never marks it paid locally.
4. Category product queries currently ignore the active-product filter in backend criteria 3. Inactive products cannot be added from product cards, but category totals may include them.
5. Card vaulting, two-factor authentication, cross-device wishlist synchronization and unsupported tax/account preference functions need backend contracts. Unsupported actions remain unavailable.
6. Signed-in end-to-end cart, address, checkout, refund, permissions and provider tests require a disposable account and suitable backend data. These remain unverified; no claim of 100% live endpoint success is made.

Customer return/refund adapters are present; a dedicated customer after-sales submission page remains extension work. Staff processing pages are present. Backend source was not changed as part of this Angular integration task.

## Reproduce

```sh
npm test
npm run build
npm run audit:api -- "D:/spring boot/E-Shop"
npm run smoke:api -- http://localhost:8080
```

UI proof: [desktop storefront](screenshots/storefront-desktop.jpg) and [mobile wishlist](screenshots/wishlist-mobile.jpg). The final browser session reported no console warnings or errors on storefront/sign-in/recovery navigation.
