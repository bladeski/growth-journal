# Components

## BaseComponent fundamentals
- Shadow DOM host with template (Pug compiled via `bundle-text:`) and optional styles.
- Handlebars-style placeholders `{{prop}}` in templates become reactive bindings:
  - Text nodes: replaced with `<span data-bind="prop">` and updated on prop changes.
  - Attribute placeholders: tracked with unique markers and updated on prop changes.
- `data-action="event:method"` wires DOM events to instance methods.
- `requiredProps` ensures critical props are present before render.

## Key components
- `JournalApp` (`src/components/JournalApp/JournalApp.ts`): app shell; hydrates i18n, spreads app labels.
- `JournalDay` (`src/components/JournalDay/JournalDay.ts`): per-day view; spreads day labels and aria labels.
- `JournalSection` (`src/components/JournalSection/JournalSection.ts`): renders sections/questions, hydrates rich text editors, passes `i18n` down.
- `RichTextEditor` (`src/components/RichTextEditor/RichTextEditor.ts`): TipTap-based editor; toolbar labels resolved via helper; supports readonly and placeholder.
- Additional building blocks under `src/components/` (Base, JournalLog/Section, etc.) follow the same BaseComponent patterns.

## Props and translation flow
- Components import helper functions from `src/helpers/helpers.ts` (e.g., `getAppLabels`, `getDayLabels`, `getRichTextLabels`) and spread results into `this.props` before `super.render()`.
- `i18n` is passed down (e.g., JournalSection passes `i18n` to each RichTextEditor) to enable localized toolbars and labels.

## Events
- Components emit custom events via `this.emit(name, payload)`; e.g., `RichTextEditor` emits `log-change` with `{ value }`.

## Adding a new component
1. Extend `BaseComponent`, set `static tag`, `static requiredProps` as needed.
2. Create a Pug template and optional CSS; import them with `bundle-text:`.
3. Define prop interface extending `IPropTypes`; include `[key: string]: unknown` if you need extra props.
4. Wire `data-action` handlers and leverage helpers for translations instead of hardcoded strings.
5. Register the element with `customElements.define(tag, Class)`.
