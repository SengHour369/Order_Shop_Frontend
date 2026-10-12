# Login reference implementation

The `/auth` page follows the supplied desktop and mobile login composition: a mint welcome panel on desktop, centered branding and welcome text on mobile, email/password icons, remember-username preference, password visibility, recovery, three social-provider buttons, and registration navigation.

English and Khmer remain supported. Language and existing Keycloak sign-in are available through the options icon. Remember me stores the username only; passwords and bearer tokens are not stored by this option.

Google, Facebook and Apple identity providers are not configured in this environment. Their buttons report this instead of pretending authentication succeeded. The existing E-Shop authentication API and Keycloak integration remain in use.

This is not a verified pixel-identical reproduction. The illustration is recreated, responsive spacing adapts to the viewport, and the options icon preserves features absent from the reference. The reference's surrounding labels, phone hardware and OS status bar are presentation framing, not application UI.

## Artwork provenance

Built-in image generation tool; saved asset: `D:\fronend_order\public\images\eshop-login-art.png`.

Final prompt:

> Create a polished photorealistic 3D ecommerce login illustration, landscape 4:3 composition, pale mint background, a low wide mint circular display podium at bottom. Objects grouped in bottom/right: glossy emerald green paper shopping bag with rounded handles and exact white text 'E-Shop', black tablet behind a silver smartphone, cream over-ear headphones on right, small wrapped cream gift with emerald ribbon at front left, small fern in white pot at left. Soft studio daylight, elegant premium catalog render. Empty mint space above, no headings or UI, no other text. This is the bottom artwork for an E-Shop welcome-back login panel matching the user's green/mint reference.

## Checks

Production Angular build; account regression tests; browser checks at 1200×950 and 390×844; password visibility, recovery form, registration/sign-in navigation and unconfigured-provider feedback.
