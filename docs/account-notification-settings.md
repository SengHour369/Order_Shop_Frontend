# Customer account and notification settings

## Screens
- `/account/settings`: desktop settings navigation and profile card; compact mobile form and sticky save button.
- `/account/notification-settings`: notification channel cards, lifecycle category rows, scheduling section, and responsive save action.
- The existing language selector in Preferences switches the shop between English and Khmer.

## Working actions
Profile uses authenticated `GET /api/v1/user/me/profile` and `PUT /api/v1/user/me/profile`. The backend derives the customer ID from the verified security context; it accepts no target user ID. Only the current active, enabled customer's full name, phone and birth date can change. Password, email, roles and permissions remain unchanged. Invalid or future dates are rejected, and conflicting phone numbers return HTTP 409. No new database columns are required.

Example request:
```json
{"fullName":"Shopper Name","phone":"+85512345678","birthdate":"1998-01-15"}
```
Example response:
```json
{"id":7,"username":"shopper","email":"shopper@example.com","fullName":"Shopper Name","phone":"+85512345678","birthdate":"1998-01-15","status":"ACT"}
```

Primary address comes from the existing customer address API; Edit Address opens address management. Saved profile state changes only after server acknowledgement. Failed saves retain edits. Duplicate submissions and signed-out mutations are blocked.

Notification preferences reuse `GET/PATCH /api/notifications/preferences` with `{"aiEmail":true}`. Despite its legacy name, the existing delivery service applies this flag to order, payment and assistant email events. The existing in-app inbox remains available independently. Saving does not send a test message.

## Explicit availability limits
The reference shows capabilities that the existing services do not implement. Photo upload currently returns success without storing a photo, so Change Photo and Remove are disabled. Gender and nationality have no stored fields. Push, SMS, per-category preference controls, test delivery and Do Not Disturb have no working service support and are disabled with explanatory text. No fake success responses, sample customer identities, or local-only preference persistence were added. Connected Accounts directs users to identity-provider management; deletion directs users to support.

These limitations mean this is not an exact functional or pixel match to the reference. Browser visual verification was unavailable in this session. Restart/deploy the rebuilt auth-service before using profile editing; the Angular build alone cannot activate the new backend endpoint.
