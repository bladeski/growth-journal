# Styling

## Global styles
- Core styles in `src/styles/`: `base.css`, `styles.css`, `vars.css`.
- Use `vars.css` tokens for colors, spacing, and typography to keep themes consistent.

## Component styles
- Components import CSS via `bundle-text:` and pass it to `BaseComponent` so styles are scoped to each shadow DOM.
- Prefer component-scoped styles for UI parts; keep only truly global resets/utilities in `src/styles/`.

## Rich text editor specifics
- Toolbar buttons use classes like `.bold`, `.italic`, `.underline`, with active/disabled states toggled via component logic.
- Editor content gets `class="editor-content"`; empty state toggles an `empty` class for placeholder styling.

## Tips
- Avoid hardcoding colors; rely on variables from `vars.css`.
- Keep spacing/typography consistent across components; share small utilities in global CSS when needed.
- When adding new UI, co-locate styles with the component to benefit from shadow DOM scoping.
