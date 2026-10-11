# Cart, order and payment fixes — 2026-10-05

## Root causes and repair

The reported POST `/api/v1/cart/user/id/items?userId=1` returned HTTP 400 because cart 1 retained `checkout_order_id=1` after order 1 was DELIVERED with catalog processing complete. The backend rejected every cart mutation as an active checkout.

`CartServiceImpl` now releases stale locks only when the referenced order belongs to the customer, catalog processing is complete, and the order has a recognized completed status. Active, missing, mismatched and unfinished checkout locks remain protected. The specific stale marker on cart 1 was cleared conditionally; its items, order and payments were preserved.

Payment creation persisted a PENDING transaction but failed while serializing date fields. The payment service's custom Jackson configuration used a plain mapper without Java time support, also truncating error JSON. It now uses Spring's configured mapper builder. The corrected order and payment services were rebuilt and restarted locally.

## Angular changes

- Pending checkout recovery reads the cart without calling the write-locked get-or-create operation.
- Checkout ignores duplicate submissions while busy.
- Order payments expose the existing create-transaction API using the confirmed order total and selected payment method.
- Active/successful payment records block another creation. After an uncertain failure, history must be refreshed before retrying.
- Transaction creation does not transfer money or mark an order paid.

## Evidence

- 43 Angular tests passed; production build passed.
- Six backend checkout integration tests passed, including stale-lock recovery and active-lock protection.
- Two payment JSON regression tests passed.
- Browser verification added stocked SKU 9999 and displayed one item at USD 119. The temporary item was subsequently removed. [UI proof](screenshots/cart-api-fixed.jpg).
- Live inserts through **http://localhost:4200** succeeded: customer login, delivery address, cart creation, SKU addition (201), checkout (201), retry returning the same order, payment creation (200), payment history (200).
- Successful isolated test customer: 10005; cart: 10002; order: 10004; transaction: 10002, **PENDING**, USD 119. No provider charge was attempted.
- Earlier diagnostic customer 10004 has order 10003 and transaction 10001, also PENDING. That transaction was persisted before its malformed response; it was not blindly retried.
- Test records are explicitly named/labeled for testing and were retained for inspection. A first test customer without the required USR permission group received 403; subsequent isolated customers include the existing customer group.

Full request status evidence: [successful API run](checkout-live-test.json), [before payment serialization fix](checkout-live-before-payment-fix.json).

The local-only `scripts/verify-checkout.cjs --insert-test` command creates new test records using the development seed account and current role/group metadata. It must not be used against production. It stores no credentials or tokens in its report and logs out its API sessions.
