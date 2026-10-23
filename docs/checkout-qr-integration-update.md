# Existing checkout QR integration update — 2026-10-21

The reference image is a workflow reference. This update preserves the existing cart, checkout template, responsive styles, storefront navigation and available payment methods. It extends the existing checkout/payment components and services.

## Existing flow and contracts

- `CartPage` and `CartApi` use the server cart; checkout sends reviewed SKU quantities and expected total.
- `CheckoutPage` owns delivery address and payment selection. `CheckoutAttempt` supplies the retry identity.
- `CheckoutCoordinator` verifies address ownership, serializes checkout against the cart, reserves inventory using authoritative catalog prices and discounts, and rejects changed reviewed prices. Its existing `PENDING` order status represents an unpaid reserved order; `CHECKOUT_PENDING` means reservation recovery is unfinished.
- ABA and KHQR both use the existing Bakong dynamic KHQR adapter. `ORDER_CREATED` triggers QR preparation. No second provider adapter or customer-facing checkout API is added.
- Payment verification checks the provider hash, amount, currency and recipient. The payment record becomes `COMPLETED`, while its transaction uses `SUCCESS`. `OrderAutomation` confirms reserved stock and advances the order to `PROCESSING` through the existing outbox workflow.
- Only provider-confirmed not-found after QR expiry and its grace period causes payment failure and reservation release. Provider outages retain reconciliation.
- The existing success state is inside `PaymentQr`; there is no separate order-success route to reuse. It links to existing order details.

## Changes and reasons

Paths in the frontend table are relative to `Order_Shop_Frontend`.

| File | Change and reason |
| --- | --- |
| `src/app/features/checkout/checkout-attempt.ts` | Retain the active QR order ID alongside the existing checkout key, so revisiting checkout resumes that order. |
| `src/app/features/checkout/checkout.page.ts` | Resume active payment and retain its retry key until payment/order confirmation or safe failed-payment recovery. COD keeps its existing completion path. |
| `src/app/features/checkout/checkout-review.ts` | Clear the old attempt only after successfully restoring the terminal failed/cancelled order's SKU quantities. Existing saved address/payment selections remain available. |
| `src/app/features/payments/checkout-payment.page.ts` | Recheck authoritative payment status before cancellation/restoration; block recovery for pending, paid or review-required outcomes; clear only the matching confirmed checkout. Show the order's actual payment method. |
| `src/app/features/payments/payment-qr.ts` | Distinguish local QR expiry from backend failure; keep reconciling beyond two minutes; hide expired QR; wait for authoritative order confirmation; send paid/cancelled conflicts to review. Reuse the existing success/failure markup and styles. |
| `src/app/core/api/models.ts` | Type the existing backend `OrderResponse.paymentMethod` field. |
| Checkout/payment test files | Cover active-order resume, recovery identity, unknown payments, expiry reconciliation and confirmation timing. |

Backend paths are relative to the neighboring `E-Shop` repository.

| File | Change and reason |
| --- | --- |
| `payment-service/.../automation/PaymentAutomation.java` | Expose the existing authoritative transaction snapshot by order; reject ambiguous multiple attempts. |
| `payment-service/.../automation/PaymentAutomationController.java` | Extend the existing internal snapshot API with an order lookup restricted to `SERVICE_ORDER`. No customer-facing API is duplicated. |
| `order-service/.../automation/PaymentAutomationClient.java` | Read the authoritative snapshot without a callback into the order service while the order row is locked. |
| `order-service/.../automation/QrCancellationGuard.java` | Require matching, expired, definitely failed and unverified payment evidence before cancelling a QR order. Outages and unknown outcomes cannot release potentially paid stock. |
| `order-service/.../service/impl/OrderServiceImpl.java` | Apply the guard to existing customer and administrator cancellation paths. Preserve COD cancellation. |
| `QrCancellationGuardTest`, `PaymentAutomationTest`, `CustomerCancellationTest`, `AiLegacyOrderBoundaryTest` | Add outcome/provider-adapter regression coverage and update service construction for the cancellation guard. |

The cart and checkout HTML/CSS files were not edited for this update. Existing earlier workspace changes are preserved.

## Checkout restoration limits

Address selection points to the saved address, including its existing contact information. Cart recovery preserves SKU variants and quantities without duplicating already-restored lines. The existing checkout has one fixed standard shipping method and automatic catalog promotions; it has no coupon selection or express-shipping control. This update does not invent unsupported options or prices. Retrying reloads the cart quote and the server revalidates reviewed quantities, prices, promotion usage and stock.

Pending payment cannot be cancelled just because the customer closes the QR screen or the local timer reaches zero. Return/retry remains blocked until the backend establishes an unpaid outcome. After a definite failure, recovery restores the cart and clears the old checkout identity; the next reviewed checkout is a new attempt. Retrying an unknown attempt resumes the same order.

## Validation

- Frontend production build and targeted cart, checkout and payment tests.
- Backend checkout integration, order automation, cancellation guard, customer cancellation, payment automation and Bakong evidence policy tests.
- ABA and KHQR generation/replay tests use the existing adapter with mocked provider output; no live transfer was made.
- Cart/checkout layout and styles are unchanged in this update. No authenticated desktop/mobile browser comparison or live bank-payment verification is claimed.
- Changes are local, not deployed. Deploy order-service and payment-service together for the internal snapshot lookup.

## Browser correction — 2026-10-21

A follow-up review found that order details still linked QR customers to account payment management. That link now opens the dedicated QR payment screen. Checkout also uses the order's authoritative payment method when routing, refuses a QR-to-COD mismatch, and retains an unavailable saved QR choice instead of silently selecting cash. Existing success-page buttons use Angular navigation, and long order numbers wrap within the receipt on mobile.

Validation for this correction:

- Production build passed; initial bundle remains above the warning budget (760.20 kB versus 650 kB).
- 52 targeted frontend tests passed, including actual radio selection and Process Checkout button clicks for ABA and KHQR.
- A browser test served the production application against an isolated fixture backend on loopback. No requests were forwarded to the real shop or bank.
- Clicked KHQR then Process Checkout and observed `/checkout/payment/990001`, not order details; verified progress steps, QR card, amount, countdown and verification notice.
- Observed verified success with receipt and View Order Details / Continue Shopping actions.
- Observed failed payment, clicked Return to Checkout, and confirmed the same test address, item quantity and KHQR selection remained.
- At 390 × 844 the document width was 390 px; Cancel Payment fit within the viewport. Screenshots are under `outputs/checkout-correction/` and explicitly use a non-payable TEST QR.
- The real preview at port 35739 currently receives only COD from payment-service. Its running payment container has no Bakong account configured and online automation is not enabled. Live KHQR cannot be validated until the store's existing verified payment configuration is supplied. The UI does not fabricate a payable QR or enable unsupported methods.

## Live payment choices restored

The existing `env` file does contain a Bakong account and enables commerce automation; `.env.local` selects individual KHQR. Earlier diagnosis of missing payment configuration applied to the running containers, not the stored configuration. The running Order and Payment services had been recreated using only `compose.yaml`, leaving automation disabled and the payment account empty.

Recreated Kafka, Order and Payment using the existing environment files and coordinated local/automation overlays, without rebuilding images or creating an order. Gateway OpenAPI returned 200 for Order and Payment. The authenticated live methods endpoint now returns COD, BAKONG, ABA and KHQR. The checkout collapses the BAKONG/KHQR aliases into one visible KHQR option, retaining an in-progress legacy BAKONG attempt when necessary.

Verified on the actual preview at `http://192.168.18.176:35739/checkout`: Cash on Delivery, ABA Pay (QR), and KHQR (QR) are visible. Screenshot: `outputs/checkout-correction/live-payment-methods.png`. The user's cart remains empty and Process Checkout remains disabled until items are added. No order, cart item or bank transfer was created during this verification.

## Pending QR screen cancellation corrected

`Cancel Payment` now invokes a separate `leavePayment` handler, rather than the terminal failed-payment restoration handler. It saves the active order reference and returns to checkout without treating a pending provider result as an error. Checkout reads the existing order's items, total, address and payment method into a read-only review and offers Resume Payment, which navigates directly to the same order. It does not repost checkout or restore reserved items into the live cart while payment is uncertain.

A visible note explains that closing the QR screen does not revoke the bank QR: the existing order and reservation remain pending reconciliation. Definitive failed/expired payment recovery continues to use the backend cancellation guard and cart restoration. No backend security or payment-evidence check was removed.

Verified in the actual browser on the existing pending $1 KHQR order 11: Cancel Payment → `/checkout` with the saved item/address/KHQR; Resume Payment → `/checkout/payment/11`; Cancel Payment → saved checkout again. No new checkout order or bank transfer was created. Screenshot: `outputs/checkout-correction/live-cancel-return.png`. Production build and all 46 targeted checkout/payment tests passed.
