# Refunds, returns, and Bakong verification

Reference: [Order_Shop admin frontend](https://github.com/SengHour369/Order_Shop/tree/main/Admin-EShop%28frontend%29), specifically `RefundsPage.jsx`, `ReturnsPage.jsx`, `ReturnsTable.jsx`, `ReturnDetailsPage.jsx`, and `BakongCallbackPage.jsx`.

The Angular refund list now follows the reference heading, criterion search, refresh/filter toolbar, seven-column table, card styling, and responsive layout. Criteria map to the existing backend contract (0 all, 1 refund ID, 2 order number, 3 customer name, 4 status, 5 date range). Statistics use service data rather than the reference's illustrative values. Customer/payment enrichment and refund detail/action screens remain connected to existing APIs.

The return list follows the reference four summary cards, status/type filters, nine table columns, and pagination. Return details include the five-stage progress indicator and the reference three-card/two-column arrangement. Existing approval, rejection, receipt, and inspection actions remain in place. The frontend rejects actions outside their valid state and reloads history after an update; the backend remains authoritative.

The callback screen follows the reference main-content/sidebar arrangement, Callback Information, Payment Information, provider response, and Process Action cards. Load records by transaction ID or order ID. A 32-character hexadecimal MD5 can also be supplied directly. The existing authenticated `/api/v1/bakong/check-transaction` endpoint performs a provider lookup. Its full response is retained: `data` is transaction detail, not a generic shop envelope. Verification history is explicitly limited to this browser session, not presented as a persistent audit log. QR previews use the existing image endpoint and release object URLs when the screen closes.

## Deliberate differences and payment limits

The React reference submits a chosen SUCCESS/FAILED/PENDING status and then displays that choice as the payment status. This conflicts with the requirement that payment success must be provider-verified. The Angular screen has no manual financial-status override. A raw MD5 lookup is diagnostic; it does not itself reconcile an order, prove its amount/recipient, or change its financial state. Recorded payment status is displayed separately and is never derived from local callback history. Missing provider fields are shown as unavailable rather than fabricated.

Backend inspection found `order-service/.../RefundServiceImpl.processRefund` changes a refund record to PROCESSED and writes status history, but has a TODO for payment-service synchronization and no provider refund call. This UI work does **not** implement or claim customer refund settlement. The detail UI states that record processing and provider settlement are separate. A complete automatic refund workflow still needs an authoritative provider refund integration, idempotent settlement events, reconciliation, and backend tests. No real payment, refund, or status-changing callback was submitted during this change.

The shared Angular navigation remains the existing application shell. This is a source-based implementation, not a measured claim of 100% pixel identity with a running reference app.

## API examples

Refund search: `POST /api/v1/refunds/list` (use the path in AdminApi as the authority) with criterion type 2 and an order number. The Angular client retains the existing request field spelling and pagination contract.

Bakong lookup: `POST /api/v1/bakong/check-transaction`

```json
{"md5":"00000000000000000000000000000000"}
```

An illustrative negative provider response is preserved intact:

```json
{"responseCode":1,"responseMessage":"Transaction not found","errorCode":1,"data":null}
```

Neither HTTP 200 nor responseCode 0 alone marks an order paid in the admin UI.

## Validation and running-service limitation

Production Angular build passed. All 137 tests in 27 files passed, including real HTTP-client Bakong response preservation, malformed MD5 rejection, duplicate-request prevention, provider failure/retry, unchanged financial state after diagnostic lookup, explicit refund search criteria, and return state/action/history checks.

Signed-in local admin browser checks confirmed refund/return API list loading, empty database states, filtering controls, desktop layout, mobile callback controls, and malformed MD5 validation. Screenshots are in `docs/screenshots/{refunds-reference,returns-reference,bakong-reference,bakong-reference-mobile}.jpg`. No populated return detail was available for a live lifecycle test; that behavior is covered by automated tests.

A diagnostic lookup of the nonexistent all-zero MD5 (under the earlier production-connectivity authorization) failed through the running backend: the gateway returned payment-unavailable/503 at about 5 seconds, and a direct authenticated request to port 8084 exceeded 35 seconds. This is not an invalid-input frontend failure. Payment Service's current source defines 5-second connection/10-second read timeouts, but the deployed behavior could not be refreshed or inspected further because both normal and explicit Docker Desktop context queries hung. No Docker Desktop restart, broad service restart, configuration change, or settlement action was performed. Live provider verification remains unverified; resolve the running service/provider connectivity and deployment before accepting the financial flow.
