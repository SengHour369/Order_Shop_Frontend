# Checkout UI and flow verification — 2026-10-20

Customer QR checkout now navigates to `/checkout/payment/:id`, outside the account sidebar and order-detail dialog. Cash-on-delivery continues to order details. The payment screen renders verified success, pending QR, expired/failed payment, and review-required evidence separately.

Cancel Payment, Return to Checkout, and Try Again reload the authoritative order, cancel only a pending order, restore missing SKU quantities only after a failed/cancelled order response, and then navigate to checkout. Restoration uses deterministic idempotency keys. The saved delivery address and supported payment method are reapplied. A failed cancellation or restoration keeps the user on the payment screen with an error. Stock release may finish asynchronously; retry remains available. Continue Shopping navigates to `/shop`.

Validation:
- Production Angular build passed (initial bundle budget warning remains).
- 24 tests across checkout, payment verification, cart restoration, and payment-page recovery passed.
- Browser checks used an isolated local fixture server serving the production build, with synthetic customer/order responses and a non-payable test QR. No real customer order or bank payment was created.
- Verified desktop checkout at 1280×900 and mobile at 390×844; observed and corrected inherited label margins and radio minimum heights.
- Clicked Process Checkout → QR, Cancel Payment → checkout with all four fixture products and ABA preserved; failed-payment Try Again → restored checkout; verified-success Continue Shopping → `/shop`.
- Screenshots: `outputs/checkout-ui/desktop-checkout.png`, `mobile-checkout.png`, `mobile-success.png`, `mobile-failed.png`.

Limits: live backend cancellation/stock-release timing and bank settlement were not exercised. Fixture product images use placeholders. Only payment methods returned by the shop are offered. Card payment, express delivery and coupon controls from the reference are not invented when their supporting checkout API is unavailable. This is not a claim of a 100% pixel match.
