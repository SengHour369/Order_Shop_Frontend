# Cancel Order dialog

Open **My Orders → View Order Details → Cancel Order** on a pending order.

The dialog follows the supplied reference: centered desktop modal, mobile bottom sheet, warning, five reason options, optional notes with a 500-character counter, Keep Order and red Cancel Order actions. Static text supports English and Khmer. Native dialog semantics provide focus trapping and Escape dismissal; closing and duplicate submissions are blocked during processing. Errors retain the selected reason and notes.

## Existing API extended

`POST /api/v1/orders/user/cancel?userId=<signed-in-user>&id=<order-id>`

```json
{"reason":"BETTER_PRICE","details":"Found a lower price elsewhere."}
```

Approved reasons: CHANGED_MIND, BETTER_PRICE, ORDERED_BY_MISTAKE, SHIPPING_TOO_LONG, OTHER. Notes are optional and limited to 500 characters by both frontend and backend validation. Existing requests with no body or an empty object remain compatible.

The backend verifies the authenticated customer and order ownership, locks the order, and permits cancellation only from PENDING. The screenshot shows Processing, but the implemented business rule deliberately remains PENDING-only. Reasons/notes are saved in the existing cancellation record remark; cancel_reason remains CUSTOMER_REQUESTED for existing reporting compatibility. No database migration is required. Existing transaction, lifecycle notifications and checkout stock compensation are reused. This does not initiate or claim a payment refund.

The frontend uses the returned order response to update the details page; it does not optimistically mark the order cancelled.

## Verification and deployment

15 frontend tests pass (7 cancellation interactions and 8 tracking regressions). Seven backend tests pass (3 cancellation/validation/audit/ownership cases and 4 state-transition cases). Angular production build passes. Browser preview initialization is unavailable, so visual pixel parity and live cancellation were not verified. No customer order was cancelled during testing.

Restart/redeploy order-service with the updated artifact to enable saving reasons and notes. An older running backend ignores the new JSON fields.
