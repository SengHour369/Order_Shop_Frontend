# Customer order tracking

Open **My Orders → Track Order**, or `/account/orders/:id/track` while signed in.

## Design and behavior

The desktop screen follows the reference with an account sidebar, breadcrumbs, five progress milestones, tracking details, delivery information, and order items. Mobile hides the sidebar and stacks the cards. English and Khmer static text use the existing language service.

The page calls the existing authenticated OrdersApi.detail endpoint. Shipping addresses come from the signed-in account address list and are matched against the order shipping_address_id. Refresh Status reloads the order. Invalid IDs, unavailable orders, address failures, and replaced route requests are handled separately.

## Data boundaries

The current order API supplies the current status and order creation/update timestamps, but no courier coordinates, driver, tracking number, estimated arrival, or timestamped status history. These fields explicitly show unavailable states. The general updated_at timestamp is labeled Last updated; it is not represented as a delivered-at timestamp. Intermediate milestone dates are not fabricated. Progress is derived from current status; cancelled, failed, and refunded orders do not appear as completed shipments.

Order items use their actual SKU IDs, quantities, and order prices. The order response does not supply names or photos, so neutral item icons are shown. No payment, inventory, or order mutation is performed by this page.

A future courier integration must expose authorized shipment information and historical events before a live map, driver contact, intermediate timestamps, or delivery confirmations can be displayed.

## Verification

Eight focused Angular tests pass: real data rendering, no invented timestamps, exceptional statuses, pending status, address failures, route request cancellation, invalid IDs/API errors/retry, and Khmer labels. Production Angular build passes. Browser visual verification could not run because the browser automation runtime failed to initialize; pixel parity has not been confirmed.
