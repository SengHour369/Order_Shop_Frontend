# Local chatbot performance changes

The local Ollama instance runs qwen2.5:1.5b on CPU. A baseline greeting took 22.71 seconds, including 16.97 seconds to load the model and 2.11 seconds generating ten tokens. Previous inference logs showed 44–64 second routing requests and a provider timeout. Service logs also contained database connection failures, so model tuning alone cannot guarantee every request succeeds.

## Changes

- Ollama chat and routing requests retain the model for 30 minutes after use, avoiding repeated five-minute idle unloads. The first request after an unload/restart still needs a cold load.
- Routing decisions allow 96 output tokens instead of 400; parameter extraction starts at 192 and increases with schema size up to 768 for large admin drafts. Two-stage extraction, schema validation, approved tools and permission checks are preserved.
- English conversation responses allow 192 tokens; Khmer retains 320 to accommodate tokenization differences.
- A shared model slot bounds simultaneous routing/conversation requests per inference process. An overlapping request waits at most one second for admission, then receives a retryable 429 instead of joining a long CPU queue. Cancellation and provider errors release the slot. With multiple inference replicas, each process has its own slot; deployment-level rate limiting must match total Ollama capacity.
- Conversation calls have an overall deadline, and incomplete model responses are rejected.
- Spring preserves busy errors in customer and admin chat. Conversation latency is now logged alongside route latency.
- Exact greetings and thanks have direct English/Khmer replies and do not depend on the model. Any additional business request bypasses this shortcut.
- No private replies are cached. No automatic retry replays a write or bypasses confirmation. Payment verification, inventory rules and authentication remain unchanged.

## Validation

60 inference tests and 47 selected Java tests passed, including overload admission, cancellation cleanup, incomplete responses, routing, permissions and purchase guidance. Both local AI containers were updated. See the local timing records in `.cache/chat-performance/` for measured requests; latency varies with CPU load, answer length and model warm state.

## Measured live checks

Before the direct-greeting shortcut, a warm English greeting through the frontend proxy, gateway and AI service took 3.53 seconds and succeeded. A live product-routing request extracted PRODUCT_SEARCH with query "wireless headphones" in 19.17 seconds. The model remained loaded with a 29-minute remaining lifetime. A Khmer model-generated greeting took 29.76 seconds and was repetitive; the exact-greeting shortcut now supplies a clear Khmer response. General Khmer inference quality still depends on the configured local model.

After the final deployment, full-application direct greetings succeeded in 4.35 seconds (English) and 2.17 seconds (Khmer), with clear bilingual text and no model generation. These measurements include gateway and application overhead.
