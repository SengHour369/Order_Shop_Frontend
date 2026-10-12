# Customer product details

The `/shop/:id` page follows the supplied product-variants reference with a desktop thumbnail gallery, product summary, variant cards, quantity selector, purchase actions, assistance panel, and information tabs. On mobile, images and thumbnails appear above the product information and the purchase buttons stack vertically. Existing English/Khmer switching is supported.

The component is split into `product.page.ts`, `product.html`, and `product.scss` under `src/app/features/catalog`.

## Data and actions

- Product details use the existing catalog endpoint. SKU attributes supply readable option labels and highlights; unavailable metadata is omitted.
- Selecting a SKU updates its price, discount, image, stock availability, and specifications, and resets quantity to one.
- Add to Cart uses the existing cart API. Buy Now navigates to checkout only after the cart request succeeds. Quantities must be whole numbers between one and the smaller of SKU stock and 99; inactive products and unavailable SKUs cannot be purchased.
- Wishlist uses the existing customer store. Share copies the current product URL and reports clipboard errors.
- Product Details and Specifications show authoritative catalog fields. Reviews and Q&A show empty/help states because no review/question API is connected. Ratings, sold counts, shipping offers, return deadlines, and brand data are not fabricated.

## Verification

The Specifications tab now uses two balanced tables on desktop and a compact eight-row preview on mobile, with an accessible expand/collapse button when more rows exist. Values come from the selected SKU attributes; multiple values render as a list. SKU, barcode (when supplied), and stock availability are included. The selected variant resets mobile expansion. Purchase buttons appear side by side on mobile while Specifications is selected, following the supplied second reference. Unknown specifications are not invented.

Five automated tests cover real variant rendering and gallery switching, quantity and availability guards, cart success and checkout navigation, cart failure handling, and loading another product when route parameters change. The production Angular build passes.

Local administrator sign-in succeeded, but the live catalog returned “catalog is temporarily unavailable — please retry shortly.” Live product/cart integration could not be verified during this change. Desktop (1280px) and mobile (390px) visual checks used an exported Angular test fixture with clearly synthetic data and placeholder images; that fixture is confined to `.cache/product-reference` and is not part of the application. This is not a verified pixel-identical reproduction.

## Reviews reference

The Reviews tab now contains a reusable `reviews/product-reviews` component with a rating summary, distribution bars, search, combined photo/star filters, sorting, review cards, photo links, authoritative verified-purchase badges, and empty/unavailable states. Desktop has a summary sidebar; mobile stacks the summary above the list and hides the product hero while Reviews is selected. UI labels support English and Khmer.

Repository inspection found no customer product-review controller or DTO. The live product page therefore supplies no fabricated records and displays an unavailable state. Write a Review, Helpful, and Reply are explicitly disabled until backend persistence is implemented. The component accepts a typed review collection for future integration; its calculations describe that supplied collection, not an unqueried database total. Review fixtures exist only under `.cache/product-reference`, and no review data was seeded or written to the backend.

Ten product/review tests pass, including rating calculations, combined filters, sorting without mutating input, verified-purchase badges, and unavailable actions. Responsive review screenshots use synthetic records and placeholder photos. Live review submission is not implemented.
