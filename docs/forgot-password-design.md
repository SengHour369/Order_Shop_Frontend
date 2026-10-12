# Password recovery reference

The shared account page now has a dedicated forgot-password desktop and mobile layout, available at `/auth?mode=Forgot%20password`. It includes the mint information panel, secure-recovery illustrations, an email field with mail icon, reset button, Google option and return-to-sign-in action. English and Khmer are supported; existing login, registration and Keycloak features are preserved.

The existing backend accepts **email only** and sends a **reset link**. The labels intentionally describe that real behavior rather than promising username lookup or a verification-code flow. The client calls `POST /api/v1/public/forgot-password` with `{ "email": "customer@example.com" }`. Its success message does not disclose whether an account exists. Google remains unconfigured and reports that when selected. No real reset emails were triggered during UI verification.

Five account tests pass, covering the existing forms, username preference, reset payload and generic success, and reset-delivery errors. The production Angular build passes. The generated illustrations are recreations, so this is not a verified pixel-identical copy.

## Generated assets

Both assets use the built-in image-generation tool and are saved in the project.

- `D:\fronend_order\public\images\eshop-forgot-scene.png`
- `D:\fronend_order\public\images\eshop-forgot-envelope.png` (transparent background)

Desktop prompt:

> Generate a premium photorealistic 3D password-reset illustration, landscape 4:3. Pale mint studio background. At bottom center an open rich emerald green envelope containing a white rounded square card with a green padlock. A small floating white rounded password pill with five dark dots to its left, leafy green houseplant in a white pot behind right, all on a low pale mint circular display podium. Soft daylight, subtle shadows, elegant ecommerce aesthetic matching green E-Shop. Leave upper half relatively empty. No words, no labels, no interface.

Mobile prompt:

> Square 3D password recovery icon for premium ecommerce app, isolated on fully transparent background. Open rich emerald green envelope with a white rounded square card rising out of it, the card displays a dark green padlock. Pale mint circular halo behind the envelope, three small dark green notification rays at upper right. Soft realistic shadows, clean elegant studio render, straight-on view, centered, generous transparent padding. No plant, no podium, no text or UI.
