# Admin detail pages

Reference: `SengHour369/Order_Shop`, `Admin-EShop(frontend)`, commit
`3b47d19f1b99ce127c4d0ecae1cb9bf726bd4125`.

The React source was inspected before updating the Angular screens. Brands means
the reference Brands module; in this backend its records are catalog subcategories.

| Screen | Reference source | Angular route |
| --- | --- | --- |
| Customer / user | `features/customers/components/CustomerDetail.jsx` | `/admin/customers/:id` |
| Payment | `features/payments/pages/PaymentDetailPage.jsx` | `/admin/payments/:orderId` |
| Order | `features/orders/components/OrderDetail.jsx` | `/admin/orders/:id` |
| Product | `features/products/pages/ProductDetailPage.jsx` | `/admin/products/view/:id` |
| Category | `features/categories/pages/CategoryDetailPage.jsx` | `/admin/categories/view/:id` |
| Brand | `features/brands/pages/BrandDetailPage.jsx` | `/admin/brands/view/:id` |

## Layout and controls

- Category and brand details share the reference two-column information/image
  layout, field grid, description panel, breadcrumbs, back link and edit link.
- Product details use General Information, individual variant cards with default
  badges, price/inventory/warehouse fields, attribute chips, Status & Organization
  and Product Images. The source's extra-wide breakpoint is preserved.
- Customer details use the profile/contact card, order/spending metrics and order
  history. History is fetched with the existing admin order API's customer filter,
  with pagination, request cancellation and separate loading/error handling.
- Payment details use amount/status, Transaction Info, Action Panel, Associated
  Order, Payment Method and Payment Timeline. Refresh reads Payment Service;
  Review Callback opens the existing trusted-verification screen.
- Order details use the header/status, four summary cards, ordered items, payment
  information and timeline. Print Invoice opens the browser print dialog; Download
  Invoice downloads an escaped HTML invoice using the loaded order data. Neither
  action changes payment state.

Templates live beside their feature code. `styles/details.css` contains the shared
reference colors, typography, spacing, cards and responsive rules. `CatalogDetail`
is shared by category and brand details rather than duplicating their markup.

## Service data

Order details compose the existing order, order-items, customer, address and
order-payment endpoints. Optional service failures leave the order visible and
report which information could not load. No user ID is defaulted to `1`.

Customer history uses `POST /api/v1/orders/get/all` with:

```json
{"page":1,"size":10,"criteria_type":1,"criteria_value":"7"}
```

The payment detail route retains the existing **order ID** contract because it calls
`POST /api/v1/payments/order/?orderId=...`. Payment IDs are displayed independently.

## Deliberate data-safety differences from the reference

The reference includes static customer mock data, some buttons without handlers,
assumed card digits, status defaults, and timeline text claiming a Bakong callback
without callback evidence. These are not presented as real service data here.
Missing status, stock, timestamps, spending and images remain visibly unavailable.
Unknown/refunded payment states remain unchanged; a pending payment amount is not
shown as money paid. No UI action can mark payment successful.

## Validation

- Final Angular production build: passed.
- Final automated suite: 142 tests across 29 files, passed.
- Added regression coverage for customer-history API criteria, order-service data
  composition, partial payment-service failure, payment/order ID separation,
  unpaid amounts and preservation of refunded/unknown payment states.
- Browser checked live product, category and brand records. Category detail was
  also checked at a 390px mobile width. Screenshots are in `docs/screenshots`.
- Live customer list returned `auth is temporarily unavailable` after retry.
  This prevents claiming full live verification of customer details.
- Live Order and Payment lists returned zero records, so their populated detail
  states were covered by automated service-data tests rather than live transactions.

This is a source-based implementation, not a measured claim of 100% pixel identity
or a guarantee of backend availability.
