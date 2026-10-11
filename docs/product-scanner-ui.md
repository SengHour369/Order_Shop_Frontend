# Product scanner

Open `/scanner` after signing in, or use the camera button in the shop search bar or mobile navigation.

The responsive scanner supports explicit camera permission, camera switching, supported-device torch control, gallery upload, native camera capture, and manual SKU/barcode or product-name lookup. Barcode capture uses the browser's BarcodeDetector when available. Camera tracks stop when leaving the camera or page.

Photos use the existing multipart `/api/v1/product-scanner/recognize` endpoint. The frontend accepts JPEG, PNG and WebP uploads up to 4,000 MB (4,194,304,000 bytes, matching Spring's MB units). Browser previews are skipped above 20 MB. Uncertain matches require selection. Product results resolve current catalog price, SKU and availability before cart actions; unavailable products cannot be added.

The backend accepts a 4,000 MB file with a 4,001 MB multipart request limit for form overhead and a zero-byte memory threshold. Files over 1,500,000 bytes use disk-cached image decoding with subsampling and a JPEG output bounded to 1,500,000 bytes for AI processing. WebP decoding uses TwelveMonkeys ImageIO 3.13.0. The dedicated scanner upload gateway route allows up to one hour and avoids the catalog's six-second circuit breaker timeout. Temporary disk space is still required for the upload and decoder cache.

These backend source changes require rebuilding/restarting catalog-service and api-gateway. An actual 4 GB transfer has not been verified. Boundary tests use file-size metadata rather than allocating gigabytes; the normalization test uses a real small PNG fixture.

## Backend limitation

The current Ollama provider's `identify_products` method explicitly returns a vision-unavailable error. Photo identification therefore requires a configured vision-capable backend provider. The UI handles unavailable recognition and offers manual search; it does not invent matches.

## Verification

- Production Angular build passed.
- Full automated suite passed: 110 tests, including 13 scanner tests.
- Authenticated live SKU lookup returned an actual catalog product, price and unavailable-stock status.
- Physical camera, browser barcode decoding and visual layout have not been verified live: the browser automation runtime failed to initialize.

## 4,000 MB change validation

- Production frontend build passed.
- 14 frontend scanner tests passed, including acceptance at the limit, rejection above it, and skipping large previews.
- 13 backend scanner service tests passed, including normalization to a bounded AI image without calling MultipartFile.getBytes().
- WebP decoder reference: https://github.com/haraldk/TwelveMonkeys/releases
