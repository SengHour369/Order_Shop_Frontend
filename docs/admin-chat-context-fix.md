# Admin chatbot context and availability correction — 2026-10-21

The admin page now always sends chat to the guarded admin endpoint, independent of a legacy login role label. The backend still requires live administrator authorization. This does not grant additional database permissions.

Exact admin greetings identify the store-management assistant. An ambiguous standalone `all` or `show all` asks which shop records to retrieve without provider inference or database writes. Qualified requests such as `show all orders` continue through permission-controlled tools.

The conversational fallback carries an ADMIN/CUSTOMER mode from the authenticated Java controller into inference. Admin fallback focuses on store management and does not use customer shopping instructions. It cannot invent live records or claim unrestricted SQL access. Customer payment guidance no longer contains the obsolete claim that online payment is unavailable.

Chat has a separate gateway circuit and a bounded 55-second deadline, with a 60-second response limit. This allows intent detection plus a possible conversational fallback without the previous 30-second cutoff. History/model/quota calls remain separate from that chat circuit. The frontend nginx read timeout is 65 seconds.

Deployed the rebuilt AI service, inference service and gateway using the existing local environment and Compose overlays. Other commerce services were not restarted.

Validation: 57 Java tests, 6 inference tests, and 13 admin frontend tests passed. Verified in the live admin UI that hello gives an administrator greeting, all gives a data-category clarification, history loads, and the configured model is displayed. Screenshot: outputs/admin-chat-context-fixed.png.

Live data verification: entered `Show order counts by status` in the restored administrator conversation, expanded View returned details, and verified a successful backend status/count array for CANCELLED, FAILED, PENDING and PROCESSING. This was a read-only request. Screenshot: outputs/admin-chat-live-data.png.
