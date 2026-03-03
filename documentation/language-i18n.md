# Language and i18n

## Overview
- Dictionaries live under `src/data/dictionary/<locale>/resources.<locale>.json` (16 locales: cs, da, de, el, en, es, fi, fr, hi, it, nb, nl, pl, pt, sv, zh).
- Built dictionaries are emitted to `dev-dist/data/dictionaries/` via `yarn run build:dictionaries:dev` (uses `scripts/build-dictionaries.js`).
- Translation lookup is handled by `t(i18n, key)` in `src/i18n/i18n.ts`; `helpers.ts` provides `tr(i18n, key, fallback)`-style helpers for convenience.

## Label helper functions (keep components translation-free)
- `getAppLabels(i18n)`
- `getDayLabels(i18n)`
- `getDayEntryAriaLabel(i18n)`
- `getRichTextLabels(i18n)`

Components call these helpers and spread the result into `this.props` before rendering, keeping translation selection out of the components themselves.

## Adding or updating translations
1. Add the new key to **all** locale files under `src/data/dictionary/<locale>/resources.<locale>.json`.
2. If the key is used by a component, expose it via a helper in `src/helpers/helpers.ts` so the component stays translation-free.
3. Rebuild dictionaries: `yarn run build:dictionaries:dev`.
4. Run tests: `yarn test` (or the project’s configured test command) to ensure no regressions.

## Runtime behavior
- Components render templates with handlebars-style `{{prop}}` placeholders. Props are populated with translated strings before calling `super.render()`.
- Attribute and text bindings are reactive via `BaseComponent`; when `i18n` changes on a component, calling `render()` or `updateBindings()` updates the translated labels in place.

## Tips
- Prefer adding a sensible English fallback when introducing new keys (see `tr` usage in helpers).
- Keep translations in dictionaries; avoid hardcoded strings in templates or components.
