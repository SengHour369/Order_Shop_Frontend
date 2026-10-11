# Customer reference refresh

The supplied desktop and mobile screenshots guide the existing Angular storefront. The customer experience uses E-Shop branding, green actions, pale green backgrounds, navy headings, light borders, and responsive layouts. Customer styles are scoped to `app-root.customer-experience`; the admin and assistant retain their own layouts.

## Updated screens

- Welcome/home and a dedicated category directory at `/categories`.
- Sign in, registration, email verification, forgotten password, and password reset. Registration and reset validate matching passwords. Password visibility and clear transitions between forms are included.
- Catalog, product options and gallery, wishlist, cart, and payment information.
- Checkout now has shipping address, payment provider, and review steps. Order creation is restricted to the review step. Recovery of an uncertain checkout retains its original key.
- Account dashboard, a selectable order list with preview, order detail/status, address cards and editor, notifications, profile settings, security, and searchable help.
- A dedicated notification settings screen at `/account/notification-settings` saves the supported assistant email preference.
- Logout and cancellation use native dialogs, with mobile bottom-sheet styling, Escape dismissal, and native focus handling.

## Service constraints

Screens show available account and service data. Screenshot example names, prices, product ratings, order dates, delivery promises, discounts, and support contacts are not used as live data.

- Cart and order items expose SKU IDs and amounts, rather than complete product names/images. These screens retain accurate SKU descriptions. Missing catalog images use a placeholder.
- Review/Q&A data and submission APIs are absent. Social sign-in, delivery method pricing, coupons, invoice generation, and courier maps/estimated delivery are not wired to invented endpoints.
- Profile text editing, phone verification, 2FA, saved cards, and extra notification channels/schedules are unavailable. Photo upload and the supported email preference remain operational.
- The current return service exposes general staff-style queries and detail operations rather than an ownership-scoped customer return flow. Customer return/refund self-service remains unavailable; no broad return data is fetched for customer views.
- Checkout creates an order and reserves stock; it does not charge the account. Existing pending payment record behavior remains separate from real payment execution.

## Validation

Production build passed. All 69 tests in 16 files passed, including password confirmation and checkout review/recovery checks. Local browser checks cover desktop and mobile layouts, live product browsing, and account navigation. No orders, cancellations, payments, account changes, or notification preference changes are submitted during visual verification.
