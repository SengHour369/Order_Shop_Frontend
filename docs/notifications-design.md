# Customer Notifications

Route: `/account/notifications`. The reference guides the desktop heading/actions, category tabs, rows with colored icons, unread dots, timestamps, and compact mobile list. Mobile hides the account sidebar and breadcrumbs. Notification settings remain available from the gear button; mark-all remains accessible on mobile as an icon button.

## Data and actions

The existing notification service APIs are reused without backend changes:

- GET `/api/notifications?page=1&size=20` loads a page.
- GET `/api/notifications/unread-count` supplies the global unread count in the heading/sidebar.
- PATCH `/api/notifications/{id}/read` marks an owned notification read.
- PATCH `/api/notifications/read-all` marks all of the account notifications read, including other pages.

Rows open a native dialog and mark unread notices read after server acknowledgment. Failed mutations retain unread state and show retryable errors. Successful mutations update local rows directly and refresh the global unread count, avoiding a full list reload. Duplicate mutations and pagination during mutations are blocked. Failed page loads preserve the previous page number and rows. Failed unread-count requests show an unknown count, not zero. Requests/timers are disposed when the page is destroyed.

Category tabs use structured type/resourceType fields: Orders includes order/payment/return/refund events; Promotions, Account, and System handle their corresponding metadata; unknown events appear in System. Counts/filtering apply to the current loaded page, with an explicit note when there are multiple pages. The backend currently emits commerce and AI event types; zero-count promotion/account tabs are valid. No example notifications are seeded.

The notification DTO has no product image. No invented thumbnails, payment claims, product lookups or delivery estimates are added. Backend titles/messages remain unchanged. Static UI labels and relative timestamps support English and Khmer. Only recognized order, product, and return resource IDs create internal detail links; arbitrary URLs are ignored.

## Verification

11 focused tests passed for rendering/counts, classification, acknowledgment, failures/retry, duplicate suppression, pagination, safe links, localization, signed-out behavior and count errors. Angular production build verifies the page and shared account layout. Live read mutations and exact visual parity have not been verified; the browser preview runtime was unavailable during this work. No real notifications were modified by tests.
