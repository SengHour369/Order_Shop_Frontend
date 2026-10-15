# Customer chatbot floating launcher

The existing `CustomerChat` dialog remains the only customer chatbot. Its green launcher now shows a local welcome bubble for two seconds, then fades it out over 180 ms. Reduced-motion users get an immediate hide. Opening chat dismisses the welcome permanently for that widget visit. The welcome never enters conversation history and does not invoke an API.

The launcher reuses `DragLauncher`, which supports mouse/touch pointer capture, a movement threshold to suppress accidental clicks, Alt + arrow-key movement, fixed positioning and visual viewport clamping. Its existing bottom-right desktop/mobile spacing and green appearance are preserved.

The bubble prefers a position beside the button and moves above or below it when needed. A resize observer measures the text; coordinates stay inside viewport edges. The bubble accepts no pointer events. Its timer and observer are cleaned up automatically.

The existing launcher is hidden while its dialog is open. Closing, including native dialog close/Escape, restores it, clamps it after viewport changes and restores keyboard focus. Existing messages, conversation ID, APIs, auth, quota, product cards, cart and checkout are unchanged.

Changed files under `D:/fronend_order`:

- `src/app/features/assistant/customer-chat/customer-chat.ts`: lifecycle integration and launcher focus restoration.
- `src/app/features/assistant/customer-chat/customer-chat.html`: existing launcher bindings and local bubble.
- `src/app/features/assistant/customer-chat/customer-chat.css`: hidden state and drag cursor; original palette retained.
- `src/app/features/assistant/customer-chat/customer-chat.spec.ts`: reuse, no automatic request, focus and touch regression tests.
- `src/app/features/assistant/floating/launcher-welcome.ts`: local-only hint component, timeout and viewport placement.
- `src/app/features/assistant/floating/launcher-welcome.spec.ts`: exact timer, viewport corners, dismissal and cleanup.
- `docs/assistant/customer-floating-launcher.md`: implementation notes.

Verification: 24 targeted customer, launcher and checkout tests passed. Build output is recorded in `.cache/ai-import/customer-launcher-build.log`. No backend changes or new dependencies were needed. No manual browser visual check was performed.
