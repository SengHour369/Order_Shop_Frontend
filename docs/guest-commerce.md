# Guest storefront and checkout

The guest preview has been replaced by persisted backend settings and feature-aware storefront routes.

- Settings → Storefront Access: eight guest feature switches with permission checks and saved backend state.
- Guest product browsing and cart reuse existing components and server pricing.
- `/checkout` selects the existing registered checkout or the new guest contact/address workflow.
- `/guest/orders` and `/guest/orders/:id` show owned confirmations, delivery status and provider-verified KHQR payment state.
- `/admin/guest-reviews` moderates submissions; `/admin/guest-activity` shows guest order creation audit records.
- Existing admin order/payment details identify guest ownership and show the immutable delivery snapshot.

Backend code, architecture, migrations, APIs, retention policy, examples, deployment prerequisites and actual test results are in the sibling [E-Shop guest commerce documentation](../../E-Shop/docs/guest-commerce/README.md).

The guest migrations and compatible services have been deployed locally. Guest browsing, cart, checkout and browser-based order tracking are enabled. Guests can use Cash on Delivery; guest online payment remains disabled until a Bakong receiving account is configured.
