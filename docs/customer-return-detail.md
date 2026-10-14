# Customer Return Detail

Open **My Orders → My Returns → a return request**. The signed-in routes are `/account/returns` and `/account/returns/:id`.

## Screen

The supplied reference guides the desktop two-column cards and mobile stacked layout: return status/progress, returned product, reason/type/date, order link, refund information, shipping instructions, customer images, and chronological return history. Account sidebar and breadcrumbs are hidden on small screens; My Orders remains selected for desktop return pages. English and Khmer static labels use the existing language service and fonts.

Product information is loaded separately from the return record. Catalog failure does not block the screen; catalog enrichment has a five-second timeout and is cancelled on route changes. The product title/image are current catalog data, while the requested return amount comes from the return service. Quantity, purchased color, images submitted by customers, shipping address/instructions, refund method/account and expected refund date are not present in the current return contract and are not fabricated.

## Customer read APIs

The new read-only endpoints reuse Order, Return, Refund, and ReturnStatusHistory repositories in order-service. No schema migration, payment operation, inventory update or AI dependency is introduced.

- `GET /api/v1/returns/user?userId=7&page=0` returns an envelope containing a Spring page of customer return summaries.
- `GET /api/v1/returns/user/RET-EXAMPLE?userId=7` returns a detail envelope.

JWT authentication and CurrentCustomer enforce the supplied userId. Listing requires both the return customer and linked order owner to match. Detail access checks ownership before retrieving history or refund data. A refund is exposed only when its customer and order also match. Internal staff actor names and remarks are omitted from the customer projection.

Example detail response (illustrative values):

```json
{
  "code":"200",
  "message":"Customer return retrieved",
  "data":{
    "return_id":"RET-EXAMPLE",
    "order_id":1,
    "order_no":"ORD-EXAMPLE",
    "order_date":"2026-10-05T10:00:00",
    "product_id":3,
    "return_type":"REFUND",
    "reason":"Left side has no sound",
    "status":"APPROVED",
    "amount":179.99,
    "requested_at":"2026-10-06T10:00:00",
    "history":[
      {"status":"APPROVED","changed_at":"2026-10-07T09:00:00"},
      {"status":"REQUESTED","changed_at":"2026-10-06T10:00:00"}
    ],
    "refund":null
  }
}
```

Actual history timestamps drive the milestone dates. If placement history is absent, requested_at supplies the factual placement event. No Under Review timestamp is inferred from REQUESTED. RECEIVED and INSPECTING remain approved work in progress; COMPLETED maps to Processed. Rejected/cancelled returns do not show successful progress. A refund record marked PROCESSED is displayed as Processed and does not by itself light the Refunded milestone or claim provider verification.

## Verification and rollout

25 frontend tests passed (10 return, 8 tracking and 7 cancellation). Eight return backend tests passed, including an isolated H2 repository ownership test; the 7 existing cancellation/transition regression tests also passed during implementation. Production Angular build and order-service packaging passed.

No real customer return/refund was changed or seeded. Live browser verification was unavailable because the browser automation runtime could not initialize, so exact pixel matching and live API checks remain unverified.

Restart/redeploy the updated order-service artifact before using the new pages. Existing deployments do not have these customer read endpoints. The API gateway already routes `/api/v1/returns/**` to order-service.
