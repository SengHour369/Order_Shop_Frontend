# Add and edit delivery addresses

Routes: `/account/addresses/add` and `/account/addresses/:id/edit`.

The desktop page uses the existing account sidebar and breadcrumbs, a bordered form, label choices and a decorative map illustration. On mobile the sidebar and illustration are hidden and fields stack. English and Khmer use the existing language switcher. The map is not geocoding or a verified delivery location.

The form collects Home/Office/Parents Home/Other, recipient name, phone, country, province/city, district, commune, street, postal code, delivery notes and default selection. Province suggestions include Cambodia's 25 provinces/capital; district and commune remain text inputs because no authoritative location-list API is present. Postal code remains required by the existing backend contract.

## Persistence

Existing endpoints are reused:

- `POST /api/v1/addresses/user/{userId}` creates an address.
- `PUT /api/v1/addresses/{id}/user/{userId}` updates it.
- `GET /api/v1/addresses/user/{userId}` loads only the current account's addresses for editing.

Example request:

```json
{
  "label": "Home",
  "recipient_name": "Customer",
  "phone_number": "+85512345678",
  "country": "Cambodia",
  "city": "Phnom Penh",
  "district": "Chamkar Mon",
  "commune": "Tuol Tumpung Ti Muoy",
  "address_line1": "#123, Street 271",
  "zip_code": "120101",
  "additional_information": "Floor 2",
  "is_default": true
}
```

Successful response uses the existing envelope, with `data` containing the persisted fields and address `id`. The frontend checks the new fields before navigating back to the list, detects outdated servers that omit them, retains entered values after errors, and blocks duplicate submissions.

Backend changes are in `D:/spring boot/E-Shop/auth-service`: Address entity, request/response DTOs and mapper. New nullable columns preserve existing records; legacy update requests preserve new fields when omitted. The existing JWT/ownership checks and endpoints are retained.

## Enable backend changes

The updated auth-service package is built. Restart/redeploy that service to activate the new DTOs and fields. The local configuration uses Hibernate `ddl-auto: update`. Environments without schema auto-update must apply `D:/spring boot/E-Shop/db/migrations/20261012_address_contact_fields.sql` against the auth database before starting the updated service. No live schema migration, service restart or customer data write was performed in this task.

## Checks

20 Angular tests passed across addresses, form, wishlist and account-scoped storage. Two backend tests passed: mapper compatibility and isolated H2 database persistence/reload. Backend package built successfully. Responsive screenshots in `.cache/address-form/` use test data. Live saves against the newly deployed service still require verification after restart.

The final Angular production build also passed (direct Angular CLI, one worker, 1 GB heap).
