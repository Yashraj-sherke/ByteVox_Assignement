# ReportCraft design direction

The interface follows an enterprise reporting direction: report lists, visible source metadata, readable figures, restrained surfaces, and direct access to calculation evidence.

## References

- [UI UX Pro Max typography](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/data/typography.csv): the Financial Trust pairing informed the choice of IBM Plex Sans. IBM Plex Mono is reserved for compact comparison values.
- [UI UX Pro Max styles](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/src/ui-ux-pro-max/data/styles.csv): Data-Dense Dashboard and Financial Dashboard informed the neutral surfaces, blue data marks, row highlighting, and readable table density.
- [Brad Traversy's design resources](https://github.com/bradtraversy/design-resources-for-developers#fonts): Google Fonts supplies the typefaces. The font stylesheet uses `display=swap`, with system fallbacks when offline.

## Implementation

`client/src/design-system.css` centralizes the current typography, palette, data presentation, focus styles, and theme refinements. It loads after the existing layout stylesheet. Chart colors share the theme tokens instead of hardcoded purple values.

Use blue for actions and data; reserve red for destructive actions and green for successful status. Avoid invented trends or placeholder business metrics. Keep touch controls usable, tables horizontally scrollable, and motion optional through `prefers-reduced-motion`.
