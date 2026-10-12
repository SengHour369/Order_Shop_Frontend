# Assistant feature review guide

## Folder layout

```text
assistant/
  assistant.api.ts          Shared customer/admin AI API contracts
  assistant.page.*         Existing assistant page
  assistant-product.*      Shared product card used by admin
  customer-chat/
    customer-chat.ts        Floating dialog, conversation state and cart actions
    customer-chat.html      Customer chat UI and product selection
    customer-chat.css       Desktop/mobile dialog styles
    chat-message.ts         Message/product types and catalog response mapping
    customer-chat.spec.ts   Conversation and product-selection tests
  chat-checkout/
    chat-checkout.ts        Cart, address, order confirmation and payment records
    chat-checkout.html      Embedded review and confirmation UI
    chat-checkout.css       Checkout panel styles
    chat-checkout.spec.ts   Checkout and recovery tests
```

## Suggested review order

1. Read `customer-chat/customer-chat.html` for the user flow.
2. Read `customer-chat/chat-message.ts` for catalog-to-UI mapping.
3. Read `customer-chat/customer-chat.ts` for conversation handling and exact SKU/quantity cart requests.
4. Read `chat-checkout/chat-checkout.ts` for cart refresh, explicit confirmation, persisted checkout recovery and verified payment status.
5. Read the adjacent tests for failure and retry behavior.

## API ownership

The components use existing API services in `cart`, `addresses`, `orders` and `payments`. Shared checkout keys are managed by `checkout/checkout-attempt.ts`, also used by the checkout page. Customer AI requests stay on the customer endpoint even when an administrator browses the storefront.

Only an explicit confirmation click submits an order. Online payment is currently unavailable; choosing a provider and placing an order do not charge the customer. Payment records are fetched separately and displayed as returned by the backend.

## Checks

Run `npm test` and `npm run build` from the workspace root. See `docs/customer-ai-chat.md` for behavior, backend integration and verification limitations.
