# Existing AI chatbot: floating launcher, formatting and daily quota

Updated 2026-10-15 in the actual Angular project at `D:/fronend_order` and backend at `D:/spring boot/E-Shop`.

## Using the chatbot

The existing admin layout displays a fixed AI icon for accounts already allowed to use its assistant. Drag with mouse or touch; Alt + arrow keys move it by keyboard. The launcher stays inside the visible viewport when resized, rotated or affected by a mobile keyboard. Dragging suppresses the following click. Tapping opens the existing `/admin/assistant` route, not a second chatbot instance. Closing returns to the previous admin page. Closing is disabled while a request, confirmation or unsaved structured workflow is active.

The local welcome bubble says **Is there anything I can do to help you?** Its fade starts after exactly 2,000 ms and lasts 180 ms. Reduced-motion users get an immediate transition. It adjusts around viewport edges, does not accept pointer input, and never creates a conversation or an API request. Timers, pointer listeners, viewport listeners and the resize observer are cleaned up on destruction.

The existing admin conversation sidebar, server history, product cards, stock forms, action confirmations and Excel import/approval controls remain. A mobile Conversations button exposes history. The active local conversation survives closing/reopening the page and clears on account change. Server history retains its existing retention policy.

AI responses render headings, emphasis, lists with nesting, blockquotes, links, inline code, tables and fenced code. Code blocks have safe token highlighting and a copy button. HTML is displayed as text; no AI HTML is inserted or executed. Links allow HTTP, HTTPS and mailto only. Tables and code scroll horizontally. English and Khmer use the existing font setup. The admin chat uses its original blue, white and pale-blue colors, restored at the user's request; system dark-mode overrides were removed.

Copy response and Regenerate appear below responses. Regenerate sends a new request key and is subject to quota. It does not confirm an action automatically. Feedback on newly accepted responses is saved to the owning authenticated request record. Historical messages without a request key have feedback disabled. Feedback and New Chat do not consume or reset quota.

The customer chatbot uses the same quota service, safe response renderer and pointer-drag directive; its existing dialog, products, cart and checkout are preserved.

## Acceptance and quota policy

1. Existing JWT security, admin route checks, DTO validation and short-term rate limits run first.
2. The backend obtains the authenticated user ID from `CurrentActor`; the browser cannot select it.
3. A transaction locks that user's durable quota row. On a new Cambodia business day, usage resets to zero.
4. Reusing the same UUID request key with a changed payload returns a conflict. A completed matching request returns its saved response. A running matching request returns a conflict; it cannot invoke tools twice.
5. For a new request, non-administrators must have fewer than five accepted requests. The quota increment and request ledger entry commit before invoking the AI provider or tools. ADMIN and SUPER_ADMIN are unlimited.
6. PostgreSQL is authoritative across replicas, devices and Redis restarts. Redis maintains an atomic daily-counter mirror with expiry at the next business midnight. Redis outages do not remove enforcement or refund usage.
7. Provider results, including a definitive provider failure, are saved for same-key replay. Accepted failures remain charged. A transport retry with an uncertain outcome keeps its key. An explicit retry after a definitive failure or a regeneration uses a new key and may consume another request.

Invalid authentication, malformed/empty/oversized requests, invalid UUID headers and quota rejections do not consume usage. Tool parameter problems discovered after AI processing are accepted AI requests and remain charged. Confirmation of an already proposed action is a continuation, not another AI request. Existing import validation, approval and execution flows are separate from chatbot acceptance and retain their own permissions.

Anonymous storefront chat retains its existing access and IP rate limit. Per-user daily quota applies to authenticated accounts; the feature does not change the existing public-chat authentication policy.

An accepted request left RUNNING after a process crash is not automatically re-executed. Inspect its ledger correlation IDs and existing execution records before resolving it. Preserving idempotency is safer than repeating a potentially committed tool action. Original backend request/trace propagation and tool audit logs remain intact; the quota ledger stores request ID, trace ID, acceptance time, fingerprint, status and response.

## APIs and configuration

`GET /api/ai/quota` requires the existing JWT:

```json
{
  "dailyLimit": 5,
  "used": 3,
  "remaining": 2,
  "unlimited": false,
  "resetAt": "2026-10-16T00:00:00+07:00"
}
```

Existing `/api/ai/chat`, `/api/ai/admin/chat` and `/api/ai/execute` accept `Idempotency-Key: <UUID>`. Keep both key and payload unchanged for an uncertain retry. Older clients without a key are assigned one by the server; they cannot deduplicate separate HTTP retries unless they provide a stable key.

Exhaustion returns HTTP 429 plus `Retry-After`:

```json
{
  "code": "AI_DAILY_LIMIT_EXCEEDED",
  "message": "You have reached your daily AI request limit.",
  "dailyLimit": 5,
  "used": 5,
  "remaining": 0,
  "resetAt": "2026-10-16T00:00:00+07:00"
}
```

`POST /api/ai/feedback` requires the authenticated response owner:

```json
{"requestKey":"11111111-1111-4111-8111-111111111111","rating":"up"}
```

Only `up`/`down` are valid. Unknown or another user's request keys return 404.

Defaults in `ai-service/src/main/resources/application.yml` and `compose.ai.yaml`:

```properties
AI_DAILY_REQUEST_LIMIT=5
AI_BUSINESS_TIMEZONE=Asia/Phnom_Penh
```

Apply `ai-service/src/main/resources/db/upgrade/20261015_ai_daily_quota.sql` through the owning database's migration process. It adds `ai_daily_quota` and `ai_quota_request`, including feedback and correlation fields. No existing business data is deleted.

The local migration was applied and AI Service updated to `e-shop-ai-service:chat-quota-20261015`. The local Compose override is `.cache/ai-import/runtime/chat-quota/compose.chat-quota.yaml`, layered after the existing original files and import override. Preserve the private import-signing env file when restarting. Production should use the standard image build and managed migrations.

## Verification

- Final Angular chat/import/permission regression run: 86 tests passed. Changed-area regressions and launcher edge/timer tests also passed.
- Affected common-lib/ai-service Maven `verify` passed: AI Service had 89 passing tests and two optional seed tests skipped. Existing orchestration, import, security and outbox tests passed.
- Final quota/feedback/HTTP run: 46 tests passed, including eight quota tests on H2 and the same eight against disposable PostgreSQL. Tests cover five accepts/sixth rejection, independent users, both admin roles, simultaneous requests, midnight reset, durable usage, retry replay, failures and feedback ownership.
- Production Angular build passed. The initial bundle is 669.74 kB, exceeding the existing 650 kB warning threshold by 19.73 kB; the build error threshold is not exceeded.
- Live gateway check with the already authorized local admin account confirmed `dailyLimit=5`, `unlimited=true`, Cambodia-midnight reset, successful greeting, matching replay conversation ID and saved feedback. No business tool mutation was performed. The disposable PostgreSQL container was removed.
- No fresh manual/browser visual check was performed. DOM rendering and pointer behavior were verified with tests, and responsive CSS compiled successfully; this is not pixel-perfect visual certification or a live real-user quota consumption check.

## Files changed for this request

Angular (`D:/fronend_order`):

- `src/app/features/admin/layout/admin-layout.ts`
- `src/app/features/admin/assistant/admin-assistant.page.ts`
- `src/app/features/admin/assistant/admin-assistant.html`
- `src/app/features/admin/assistant/admin-assistant.css`
- `src/app/features/admin/assistant/admin-assistant.spec.ts`
- `src/app/features/assistant/assistant.page.ts`
- `src/app/features/assistant/assistant.html`
- `src/app/features/assistant/assistant.page.spec.ts`
- `src/app/features/assistant/assistant.api.ts`
- `src/app/features/assistant/assistant-quota.ts`
- `src/app/features/assistant/assistant-quota.spec.ts`
- `src/app/features/assistant/rich-message.ts`
- `src/app/features/assistant/rich-message.spec.ts`
- `src/app/features/assistant/floating/drag-launcher.ts`
- `src/app/features/assistant/floating/floating-assistant.ts`
- `src/app/features/assistant/floating/floating-assistant.spec.ts`
- `src/app/features/assistant/floating/launcher-state.ts`
- `src/app/features/assistant/customer-chat/customer-chat.ts`
- `src/app/features/assistant/customer-chat/customer-chat.html`
- `src/app/features/assistant/customer-chat/customer-chat.css`
- `src/app/features/assistant/customer-chat/customer-chat.spec.ts`
- `docs/assistant/chat-ui-and-quota.md`

Backend (`D:/spring boot/E-Shop`):

- `ai-service/src/main/java/com/example/eshop/ai/controller/AiController.java`
- `ai-service/src/main/java/com/example/eshop/ai/controller/AiQuotaController.java`
- `ai-service/src/main/java/com/example/eshop/ai/service/AiQuotaService.java`
- `ai-service/src/main/java/com/example/eshop/ai/model/AiDailyQuota.java`
- `ai-service/src/main/java/com/example/eshop/ai/model/AiQuotaRequest.java`
- `ai-service/src/main/java/com/example/eshop/ai/repository/AiDailyQuotaRepository.java`
- `ai-service/src/main/java/com/example/eshop/ai/repository/AiQuotaRequestRepository.java`
- `ai-service/src/main/resources/application.yml`
- `ai-service/src/main/resources/db/upgrade/20261015_ai_daily_quota.sql`
- `ai-service/src/test/java/com/example/eshop/ai/AiOrchestrationTest.java`
- `ai-service/src/test/java/com/example/eshop/ai/service/AiQuotaServiceTest.java`
- `ai-service/src/test/java/com/example/eshop/ai/service/AiQuotaPostgresTest.java`
- `compose.ai.yaml`

No dependencies were added. Other pending changes in both repositories predate this request and were preserved.
