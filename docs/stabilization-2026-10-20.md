# Local shop recovery — 20 October 2026

Fixed legacy logout losing its bearer header, guest homepage rendering, Settings navigation, and guest history route gating. Updated stale API/test fixtures and isolated English-language assertions. The test suite uses one worker and a 15-second timeout to accommodate local memory pressure.

Applied the guest-commerce database upgrades and deployed compatible auth, catalog, order, payment, notification, gateway, admin and frontend services. Removed an accidentally duplicated SKU route; the existing CheckoutProductController provides that API.

After the host restarted, saved rollback containers with restart=always claimed service ports. Disabled automatic restart for the saved backups and restored canonical auth/order/payment network membership on e-shop_default. Rebuilt and deployed catalog from corrected source.

Verification: all 460 frontend tests pass across 80 files. Admin login, Settings, storefront settings, SKU lookup, user editor options, reviews, products, orders and payments return HTTP 200. The catalog contains 11 products including the 10 sample products with 50 SKUs. Guest session creation and revocation work; disabled guest features return 403. Unauthenticated admin access remains denied. Browser login opens Settings successfully.

Guest browsing, cart, checkout, payment, reviews and tracking are currently disabled in saved configuration. The homepage now reads these settings before requesting products and offers sign-in when browsing is disabled.

Limitations: Cloudinary image upload credentials are missing. No real payment, order placement, or email delivery was performed. The full backend test run was interrupted; do not treat it as a complete passing backend suite. The corrected catalog production build and live startup passed.

## KHQR HTTP error correction

Direct authenticated HTTP tests found `/api/v1/payments/methods` returning only `CASH_ON_DELIVERY`, while disabled QR endpoints returned generic HTTP 500. Added a conditional fallback controller for disabled automation, returning explicit HTTP 503 with a fixed configuration message for QR, QR image and verification routes. The fallback is absent when real payment automation is enabled. Two backend regression tests pass. The UI checks available methods on 404/503 and stops retrying for an unavailable payment method; all 461 frontend tests pass.

This corrects the error behavior; it does not configure a receiving account, enable payment automation, generate a working payable QR, or verify a bank transfer. Bakong account and mode details must be supplied before enabling online payments.

## Guest ordering enabled

At the user's request, enabled guest browsing, cart, checkout and order tracking through the admin settings API. Left online payment disabled because the merchant account is missing. Anonymous HTTP requests successfully created a guest session, added SKU 3 and previewed a $14.99 Cash on Delivery checkout; the test cart was cleared and session revoked. No order or payment was placed. Reused the existing UUID helper in guest checkout so LAN HTTP does not require crypto.randomUUID.
