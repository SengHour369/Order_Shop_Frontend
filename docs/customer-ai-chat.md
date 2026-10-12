# Customer AI chat

The floating Ask AI button opens a green E-Shop shopping assistant on customer screens. Desktop uses a right-hand panel; mobile uses a full-screen dialog. Native dialog focus handling and Escape dismissal are preserved. The message area scrolls independently of the composer.

Source is grouped into `src/app/features/assistant/customer-chat/` for conversation UI and catalog mapping, and `src/app/features/assistant/chat-checkout/` for cart review and confirmation. Each component's template, styles and tests live beside its implementation. The assistant folder's `README.md` provides a review order and API ownership guide.

## API connection

- Uses the existing `POST /api/ai/chat` endpoint with `message`, `conversationId`, and `language` (`en` or `km`). It never switches to the administrator endpoint when a staff member visits the storefront.
- Retains the server conversation ID for follow-up questions. Closing and reopening keeps the conversation; New chat starts a separate one. Signing out or changing accounts clears private messages and cancels outstanding requests.
- Supports structured clarification/error responses, loading state, bounded prompts, request timeout, and manual retry without duplicating the user's bubble.
- Product cards use the AI catalog contract: product `id`/`name`, SKU `id`, `basePrice`, `effectivePrice`, and `available`. Missing images use the existing placeholder. No sample ratings, delivery promises, or stock values are fabricated.
- Add to Cart calls the existing cart API only after the user clicks, using the returned SKU ID. Order results link to My Orders. AI confirmation requests direct the user to review the action there; the widget does not silently confirm actions.
- Attachments are not offered because the chat API accepts text only. Ollama/model configuration remains on the existing backend.

## Validation

Frontend tests cover customer endpoint selection, language and conversation continuity, duplicate-send protection, exact SKU cart requests, structured clarification, retry (including structured HTTP failures), and clearing/canceling on account changes. Desktop and mobile opening/closing and prompt composition were checked in the browser.

The original HTTP 401/500 failures were traced to stale service images, missing Ollama inference, outdated AI database enum constraints, and a missing live authorization endpoint in the running auth service. Updated services and a data-preserving migration repair those failures.

Live gateway checks returned HTTP 200 for a guest greeting, a general Bluetooth explanation, conversation memory (remembering the user's name), administrator conversation, and real catalog searches. The browser showed a real Ollama reply. Final deployment checks returned `MY_ORDERS` / `OrderList` with five real orders for “Show my orders” and `PRODUCT_SEARCH` / `ProductList` with 20 catalog records for “Find headphones.”

Final automated checks: 74 frontend tests passed, the production frontend build passed, 55 Python inference tests passed, and 36 Java AI service tests passed (plus 13 common-library tests). The inference tests report an existing Starlette/httpx deprecation warning. Additional admin browser verification was stopped by automatic approval review because the account's usage limit was reached; it was not bypassed.

No live cart items, orders, payments, or cancellations were changed during verification.

## Ordering and payment help

The customer assistant distinguishes a new purchase (for example, "order a laptop") from tracking existing orders. Prompt instructions route product purchase requests to catalog search and reserve personal order/payment tools for existing records. Payment success is verified using the payment-status tool, never inferred from a user saying they paid.

An Order & payment shortcut asks "How do I place an order and pay?" Generic checkout and payment-method questions return a grounded CheckoutGuide. The widget's Cart & checkout and Review cart & order here buttons open an embedded checkout panel. Product cards support available SKU selection and quantities, and Add to Cart sends that exact selection to the cart API. Signed-in users can edit quantities, remove items, select a saved address and payment provider, and review the backend total inside chat. Guests are directed to sign in.

Only an explicit Confirm order click submits the checkout API request. Before submission, the panel rereads the cart and requires a fresh review if its items or total changed. It shares the existing persisted CheckoutAttempt key with the checkout page, prevents duplicate clicks and cart edits during unresolved checkout, and reuses the same request after uncertain failures or CHECKOUT_PENDING responses. Closing/reopening chat preserves unresolved checkout recovery. The receipt displays the returned order number and status; payment status is fetched only on explicit refresh.

The guidance follows the current checkout provider list (BAKONG, ABA, ACLEDA, RAZORPAY, SINGE) and explains that payment is completed separately after order placement. The current payment UI explicitly says online payment is not available yet. The assistant explains this limitation and links to Payment Information for records and availability; placing an order does not charge the user. It never asks for card details, PINs, passwords or OTPs.

Validation: 6 customer-widget tests, 5 backend purchase/conversation routing tests, and 32 inference tests passed. The final production frontend build passed. The updated AI services were rebuilt and restarted locally; a gateway request for "How do I place an order and pay?" returned SUCCESS / CheckoutGuide, explained online payment availability correctly, and had no execution ID.

Live gateway verification of "I want to buy headphones" returned SUCCESS / PRODUCT_SEARCH / ProductList using the catalog tool. No purchase, cart write or payment was performed during these checks.

In-chat checkout validation: all 120 frontend tests passed, including 14 customer chat/checkout tests for variant and quantity selection, explicit confirmation, cart changes, duplicate prevention, recovery and payment status. The test runner reported worker shutdown timeouts after all tests passed, then exited successfully. Live authenticated read-only checks loaded four cart items and one saved address. No live order or payment was created. Browser visual verification of this panel remains unverified because the browser tool could not initialize its kernel assets.

## Natural conversation

The backend now separates conversational answers from business operations. Unknown intents and incomplete operations can produce a natural answer or a helpful follow-up instead of the internal “Please clarify the operation and its parameters” text. Incomplete operations never execute. Permission denials and confirmation requirements retain their existing handling.

Conversation history holds at most eight turns for 30 minutes in Redis, scoped to the signed-in user or an unguessable guest conversation ID. Store tool results and credentials are not passed to the general conversational model. Responses with no execution ID do not offer execution-progress checks.

Ollama chooses an operation separately from extracting its parameters. Exact personal read shortcuts such as “Show my orders” use only tools included in the caller's authorized catalog. Compound requests do not qualify for these shortcuts. Schema validation, authorization, and action confirmation still run in the backend.

## Local startup

Run `./scripts/start-local-ai.ps1` from the frontend workspace. It defaults to backend `D:\spring boot\E-Shop` and model `qwen2.5:1.5b`; parameters `-BackendPath`, `-Model`, and `-SkipBuild` are available. The script merges the base, AI, local, and Ollama Compose configurations, downloads the model, builds services sequentially, waits for the AI database, applies the enum constraint migration, and starts the services. It preserves database and model volumes.

Keep all four Compose configurations when restarting the services. The local gateway allows 200 seconds for a complete inference/fallback flow, and the customer widget allows 210 seconds. First model loading can be slow; warm requests are faster. The compact local model is not equivalent to ChatGPT in answer quality or supported features. Attachments and streaming are not implemented.

The host C: drive had about 1 GB free during final checks. Additional models or image builds may require more space. No database volumes were removed.
