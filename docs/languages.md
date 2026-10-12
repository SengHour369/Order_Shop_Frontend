# English and Khmer

Use the **English / ខ្មែរ** selector in the admin header, shop header, sign-in form, or standalone assistant header. The choice applies immediately throughout the application, survives reloads, and synchronizes across tabs. No account update or backend request is required.

## Files

- `src/app/core/i18n/language.service.ts`: validated language preference, browser storage, document language, and dictionary lookup.
- `src/app/core/i18n/khmer.ts`: Khmer UI translations, indexed by normalized English copy.
- `src/app/core/i18n/translate.pipe.ts`: template translation with immediate language updates.
- `src/app/core/i18n/language-select.ts`: shared accessible selector.
- `src/index.html` and `src/styles.scss`: Google Fonts loading and the shared font variable. English prefers Inter; Khmer prefers Kantumruy Pro. Both use weights 400, 500, 600, and 700 and a sans-serif fallback.

Navigation, common actions, product forms, detail screens, checkout labels, account forms, scanner controls, and assistant controls use explicit template translations. Catalog records, user-entered text, and chat responses keep their original content. API messages and copy without a dictionary entry fall back to English; this is not automatic machine translation. Existing API enum values, prices, routing, and financial transitions are unchanged. Date and currency formatting remains as previously configured.

For new UI copy, add an English-to-Khmer entry and use `{{ 'English copy' | translate }}` in a component that imports `TranslatePipe`. For attributes, use `[placeholder]="'English copy' | translate"` or `[attr.aria-label]="'English copy' | translate"`. Translate presentation labels rather than record names or API property keys.

## Verification

The language tests cover the default and invalid stored preferences, reload restoration, immediate selector updates, document language, English fallback, required-field markers, cross-tab changes, and unavailable browser storage. Browser checks cover the Khmer product editor and customer home page, font selection, switching back to English, and mobile layout.
