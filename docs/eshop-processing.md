# E-Shop Processing Guide

This guide explains the intended E-Shop processing architecture, service responsibilities, and current verification status. A described workflow is not automatically a claim that it has been implemented or tested end to end.

## 1. Login and authentication

### Keycloak sign-in

1. The user clicks **Continue with Keycloak** in Angular.
2. Angular redirects to Keycloak using Authorization Code flow with PKCE S256.
3. Keycloak authenticates the user and redirects to the Angular callback.
4. The official browser adapter exchanges the authorization code for tokens.
5. Angular sends the Keycloak access token to `POST /api/v1/public/keycloak/exchange`.
6. Auth Service verifies the token signature, issuer, expiration, audience, and authorized client.
7. Auth Service finds the exact issuer and subject in the external identity mapping table.
8. The linked E-Shop account must be enabled, active, and not deleted.
9. E-Shop issues its existing access and refresh tokens using the local account's identity and roles.
10. Angular uses the E-Shop session for protected API calls.

Matching an email or username does not automatically link accounts. Keycloak roles do not automatically grant E-Shop administrator privileges.

### Existing password sign-in

The existing E-Shop username/password login remains available. It authenticates against the existing local account system and issues E-Shop session tokens.

### Local Keycloak settings

| Setting | Value |
|---|---|
| Angular login | `http://localhost:4200/auth` |
| Keycloak console | `http://localhost:8180/admin/` |
| Realm | `eshop` |
| Public browser client | `eshop-web` |
| Required access-token audience | `eshop-api` |
| Callback | `http://localhost:4200/auth/keycloak/callback` |
| Logout redirect | `http://localhost:4200/auth` |

Use `localhost` consistently. Different hostnames or ports require explicit redirect and origin configuration.

See [Local Keycloak setup](keycloak-local.md) for configuration, identity linking, and limitations. This local setup uses development settings; it is not a production Keycloak deployment.

## 2. Authorization and UI permissions

1. E-Shop identifies the authenticated local user.
2. The backend loads effective permissions from active direct grants and active group memberships/grants.
3. Angular uses the permission snapshot to control mapped menus, routes, and actions.
4. Every protected backend operation must also enforce authorization.
5. Important operations are recorded in audit logs, with request and trace context where available.

Hiding a button is a usability feature, not an authorization boundary. Some sections retain existing role-based guards; permission-based rendering should not be assumed to cover every screen.

## 3. Product and catalog management

Intended processing:

1. An authorized administrator submits product, category, brand, image, price, and variant information.
2. The responsible service validates required fields and referenced records.
3. Catalog data is persisted through the existing catalog implementation.
4. Inventory operations are routed to the existing Inventory module/service.
5. Customer screens display authoritative catalog and availability data.

Product information, pricing, and stock must be revalidated during order creation. Values displayed or submitted by the browser are not authoritative.

## 4. Customer shopping

Intended processing:

1. The customer searches, browses, or scans a product.
2. The application displays matching catalog products.
3. The customer selects a variant and quantity.
4. The customer adds products to the cart.
5. Checkout collects or selects shipping and payment information.
6. The backend validates the requested order using current business-service data.

A scanner or AI recommendation proposes a product match; it does not authorize a purchase or confirm stock.

## 5. Order creation and inventory reservation

Intended processing:

1. Order Service validates the customer and order request.
2. Current product prices, variants, quantities, and availability are checked.
3. Inventory reserves stock using the existing reservation rules.
4. Order Service records the order and its valid initial state.
5. An order-created lifecycle event is recorded and published through existing event infrastructure where applicable.
6. Notification Service handles the configured order-created notification.

If processing fails after a partial operation, compensating actions and reconciliation must resolve the incomplete order or reservation. Avoid distributed database transactions.

## 6. Payment initiation and QR processing

Intended processing:

1. The customer selects an existing supported payment method such as ABA/KHQR.
2. Payment Service loads the authoritative order amount and currency.
3. Payment Service creates a payment attempt through the existing integration.
4. The customer receives the payment instructions or QR code.
5. The customer completes payment using their payment application.
6. Payment Service receives a trusted provider callback or queries the provider verification API.
7. Verification checks the transaction reference, amount, currency, and provider-reported outcome as supported by the integration.
8. Only an authoritative verified outcome may change financial state.

Displaying a QR code, scanning it, returning from a payment application, or clicking **I paid** does not prove that payment succeeded. AI output also cannot prove payment success.

Live Bakong/ABA settlement and callback correctness were not verified as part of the latest Keycloak work.

## 7. Verified payment events and automation

Intended sequence:

```text
Customer creates order
  -> Order validation
  -> Inventory reservation
  -> Payment initiation
  -> Trusted provider verification
  -> Payment state and outbox record committed locally
  -> Kafka event publication
  -> Approved automation routing
  -> Order state transition
  -> Inventory confirmation or release
  -> Customer/admin notification
  -> Optional AI review summary
```

Responsibilities:

| Component | Responsibility |
|---|---|
| Payment Service | Initiate payments and verify actual provider outcomes. |
| Transactional outbox | Persist events with the owning service's local business transaction. |
| Kafka | Deliver domain events between services. |
| Automation routing | Route verified events to approved handlers. |
| Order Service | Enforce valid order-state transitions. |
| Inventory | Enforce reservation, confirmation, and release rules. |
| Notification Service | Process configured notifications and track delivery. |
| AI review | Summarize authoritative data and flag inconsistencies. |

Use existing event contracts and implementations. Consumers must be idempotent because events can be delivered more than once.

## 8. Order states and stock outcomes

Business services own the exact state machine. Do not assume that every service uses the same state names.

| Verified outcome | Expected handling, subject to existing business rules |
|---|---|
| Payment succeeded | Apply the valid paid-order transition and confirm the reservation. |
| Payment failed | Record failure and release or retain the reservation according to retry rules. |
| Payment expired | Apply expiry rules and release eligible reservations. |
| Order cancelled | Validate cancellation eligibility and compensate eligible reservations/payments. |
| Outcome unknown | Keep financial status unresolved and schedule provider reconciliation. |
| Conflicting or late event | Check current authoritative state and route discrepancies for review. |

Do not blindly overwrite a newer state with an older event. A network timeout does not establish payment failure.

## 9. Notification processing

Intended notification lifecycle:

1. A configured order, payment, cancellation, return, or account event occurs.
2. The responsible service records the appropriate notification/event through its existing outbox mechanism.
3. Notification processing selects the configured recipients and channels.
4. Delivery is attempted.
5. Delivery status and failures are recorded.
6. Transient failures are retried under the configured policy.
7. Administrators inspect unresolved delivery failures.

An order or payment must not depend on an AI provider being online to send its configured notifications. Notification delivery failure must not undo an authoritative successful payment.

## 10. AI assistant processing

Intended processing:

1. The customer or administrator sends a message.
2. The existing AI router identifies the request and proposes an approved tool where applicable.
3. Tool execution validates authentication, permissions, parameters, and business rules.
4. Reads obtain authoritative product, order, payment, inventory, or notification data.
5. Mutating operations follow the required confirmation and business-service workflow.
6. The assistant presents the result or requests missing information.
7. Review processing may flag inconsistent records for administrator investigation.

AI must not call arbitrary APIs, invent payment success, bypass permissions, or independently perform financial state transitions. Core commerce processing must continue when the AI provider is unavailable.

## 11. Returns, cancellations, and refunds

Intended processing:

1. The customer submits a cancellation or return request against an eligible order.
2. The backend checks ownership, order state, item eligibility, and business policy.
3. The request is reviewed or automatically processed only where the existing rules permit it.
4. Required approvals are recorded.
5. Refund initiation uses the existing payment integration and its supported capabilities.
6. Provider callbacks or verification APIs establish the actual refund outcome where supported.
7. Order, return, refund, and inventory records are updated through valid transitions.
8. Configured customer/admin notifications are sent.

Approving a return or requesting a refund is not the same as completing a refund. Payment-provider capabilities and the actual implementation must be checked before claiming automatic refunds work.

## 12. Failure recovery and reconciliation

Required reliability behavior:

- **Idempotency:** repeated requests or events must not create duplicate payments, stock movements, orders, or notifications.
- **Bounded retries:** retry transient failures with backoff and a defined limit.
- **Dead-letter handling:** retain failed messages and failure details for authorized inspection and controlled replay.
- **Reconciliation:** compare unresolved local records with authoritative provider and business-service data.
- **Compensation:** repair partial workflows through business actions, such as releasing an eligible reservation.
- **Observability:** preserve request IDs, trace IDs, audit logs, execution logs, and meaningful error responses.

These are architecture requirements. Their presence and coverage must be verified separately in each consumer and workflow.

## 13. Logout and session behavior

1. Angular calls the E-Shop logout endpoint.
2. E-Shop revokes the refresh token.
3. Angular clears its in-memory session.
4. For a Keycloak sign-in, the browser also ends the Keycloak session.

Existing access tokens follow the application's existing expiration behavior. The current exchange integration does not implement Keycloak-initiated backchannel logout or continuous synchronization of Keycloak account status. E-Shop's local account status remains authoritative for its local authorization rules.

## 14. Current verified status

Verified during the latest Keycloak integration work:

- Local Keycloak server, realm, public browser client, and PKCE configuration.
- Angular sign-in option and callback UI in English and Khmer.
- Real browser Keycloak authentication and callback.
- Backend verification of the real Keycloak token before explicit identity lookup.
- Safe rejection of the unlinked Keycloak identity.
- Live gateway responses: forged access token **401**, empty access token **400**.
- Existing local admin password login, permission lookup, and logout.
- **166 Angular tests** and production build passed.
- **13 selected backend tests** passed, covering signature verification, token claims, identity persistence, account restrictions, error handling, and existing authorization checks.

### Pending admin identity approval

The proposed link is:

| Keycloak identity | Existing E-Shop account |
|---|---|
| `eshop-admin`, subject `72c15889-5991-44de-92c6-64d32b146301` | Local admin ID `1` |

Automatic approval review blocked this link because it grants administrator access to that Keycloak identity. It remains unlinked pending explicit approval. Successful E-Shop administrator access through Keycloak has therefore not yet been verified.

### Workflows requiring separate verification

The latest authentication checks do not establish end-to-end correctness for product scanning, checkout, live payments, callbacks, Kafka automation, stock compensation, notification delivery, or refunds. Verify those implementations and their failure paths before treating the whole system as production-ready.

## Related documentation

- [Local Keycloak configuration and API examples](keycloak-local.md)
- [Group and user permissions](group-permissions.md)
- [AI chat performance](chat-performance.md)
