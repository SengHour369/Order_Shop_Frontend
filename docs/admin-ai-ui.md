# Admin chatbot workspace

Open `/admin/assistant?view=chat` as an administrator. Customer chat remains separate.

## Connected UI

The blue workspace follows the supplied reference: searchable Recent/Pinned conversations, user and assistant bubbles, processing feedback, action previews, confirmation/edit/cancel buttons, and a bottom composer. The expandable AI Assistant navigation opens Chat Bot, Control Center, Conversations, Tool Execution, Tools, Permissions and Settings.

- Normal chat uses `/api/ai/admin/chat`; English and Khmer replies use the configured Ollama model.
- History uses `GET /api/ai/admin/conversations`, transcript retrieval and PATCH title updates. History expires after the server retention window. Pins and structured workflow results last for the current visit.
- Model information uses `GET /api/ai/admin/info`. The UI never claims the model is online based only on a hardcoded label.
- AI write previews use server-issued confirmation IDs. Confirm calls `POST /api/ai/confirm/{id}` once; cancellation submits no mutation. Running confirmations poll the owner-scoped execution endpoint for up to one minute, then offer manual status checks.
- Create product opens an editable form and preview. A message beginning with `Create product` can prefill explicit name, price, color, storage, quantity and branch values. This prefill is deterministic, not an AI extraction claim. The admin selects a real catalog category/brand and uploads real product images. Confirm sends the existing multipart product creation API, including default SKU attributes and initial inventory. Additional variants can be managed in the product editor.
- Stock in reviews the existing inventory record ID and units before calling the restock API. Product and stock writes show Processing, Completed, Failed or Check result. Unknown network outcomes block blind retry.
- Text attachments support TXT/MD/CSV/JSON under 12 KB within the existing 4,000-character prompt limit.
- Control Center opens workflows. Tool Execution shows submitted structured/confirmed writes from this visit. Tools documents connected capabilities. Permissions explains server-enforced access and links to user management. Settings selects reply language and shows actual configured model information.

## Validation

`npm test` runs the Angular/Vitest suite with two workers to fit alongside Ollama and Docker. Workflow tests cover live-contract request shapes, preview-before-submit, initial inventory flag, variant attributes, duplicate prevention, ambiguous failures, server confirmations, cancellation, and chat failure recovery. `npm run build` verifies production compilation.

No new backend endpoints are needed for these workflows; existing chat/history/model/confirmation/catalog/inventory APIs are used. Product creation and stock-in results shown in chat are local to the current visit; the resulting products/inventory are persisted by their management services.

Live validation: approved local admin sign-in and a real Ollama conversational reply succeeded. Backend greeting/capability questions now route to conversation instead of business-operation clarification. Conversation IDs work on LAN HTTP where crypto.randomUUID is unavailable. Final validation: 97 frontend tests, 36 focused backend tests, and production build passed. Catalog-dependent live writes remain unverified; the local backend services restarted during the browser check. Automated workflow tests verify request contracts and preview/confirmation behavior.

After catalog recovery, the live product prompt populated real catalog choices and reached the review screen with Confirm create, Edit details and Cancel. No live product or stock mutation was submitted. Responsive DOM sizing was checked at 390px without horizontal overflow. A final contrast fix preserves the green confirmation button when hovered under the admin shell.
