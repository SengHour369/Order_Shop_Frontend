# Product creation UI reference

Reference: https://github.com/SengHour369/Order_Shop/tree/main/Admin-EShop(frontend)
Inspected commit: 3b47d19f1b99ce127c4d0ecae1cb9bf726bd4125

The Angular product form follows `src/features/products/pages/AddProductPage.jsx`, with its actual Card, Input, Button, SearchableSelect, and ImageUploadInput components as the visual source. The older generic `components/ProductForm.jsx` is not the active page reference.

Implemented the 12-column desktop layout (7 columns of basic information and SKU cards, 5 columns of images), 24px gaps/card padding, uppercase section headings, indigo save button, searchable category/sub-category controls, boolean active status, per-SKU price/inventory/warehouse/default selection, switchable attribute groups and values, image upload/previews/removal, and a stacked layout for smaller screens. Removed the unrelated pricing panel, disabled placeholder controls, table-based variant editor, generator toolbar, and product summary from this screen.

Existing backend request contracts and validation are preserved. Image copy intentionally advertises the actual accepted formats and limits: PNG/JPG/WEBP, 5 MB each, at most six images. Reference source advertises SVG/GIF and an unenforced pixel limit; those claims are not carried over. Inventory initially remains 1, as in the existing Angular business logic. The shared sidebar/topbar remain the existing application layout.

Verification: production build; category selector and SKU regression tests; signed-in local browser checks of category search across 101 database records, dependent sub-category choices, SKU add/remove and attribute toggle; desktop and 390px mobile layout checks. No product was created by the live browser check. Current seeded Laptops category has no sub-categories, and the screen correctly reports that empty state rather than inventing selectable data.

Desktop proof: `docs/screenshots/product-create-repository-match.jpg`. This is a source-based implementation and visual inspection, not a measured claim of 100% pixel identity with a running reference application.
