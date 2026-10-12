# Customer wishlist and addresses

## Wishlist

Route: `/account/wishlist`. Component files: `src/app/features/wishlist/`.

Four-column desktop cards, optional list layout, compact mobile rows, search by product name/SKU, category filters when a saved SKU includes a Category attribute, price/name/recent sorting, filtered select-all, individual and bulk removal. Cart actions use the existing Cart API with default SKU, stock guards, in-flight guards and error feedback.

Wishlist records remain account-scoped browser storage, consistent with the existing implementation. A failed storage write does not remove items from the displayed list. Product stock and prices are snapshots; the cart API remains authoritative. Reviews are not fabricated. Preview screenshots use synthetic records and placeholder images; they do not seed customer data.

## Addresses

Route: `/account/addresses`. Component files: `src/app/features/addresses/`.

Full-width stacked cards within the existing account layout, green default highlight, compact edit buttons, action menus and mobile layout. Existing create/edit dialog is retained. Empty, loading, retry, success and error states remain available. Delete requires an explicit confirmation.

Default changes use `PUT /api/v1/addresses/{id}/user/{userId}` with the existing address fields and `is_default: true`, followed by `GET /api/v1/addresses/user/{userId}`. Displayed defaults come from the refreshed server response; failures preserve the previous selection. Existing JWT API handling is unchanged.

The subsequent Add Address implementation extends the backend DTO/entity with label, recipient name, phone, district, commune and delivery notes. Cards display these fields when returned; existing addresses retain Default Address or Address #ID fallbacks. See address-form-design.md for deployment details.

## Verification

Twelve tests cover wishlist filters/sorting, filtered bulk selection, storage failures and account isolation, cart errors/in-flight protection/sign-in routing, address rendering, authoritative default updates, failed updates, delete confirmation and required-field validation. Production Angular build passes. Responsive previews use test fixtures. Live address/cart writes were not exercised against a running backend in this task.

