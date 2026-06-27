# Body Map

Starter workspace for an open source body map project built from pure SVG assets.

## Structure

```text
body-map/
  README.md
  react/
  svg/
    female-back.svg
    female-front.svg
    male-back.svg
    male-front.svg
```

## Goals

- Keep the source assets as plain SVG.
- Make the files easy to edit in code or vector tools.
- Use these starter bodies as the base for future interactive regions, muscle groups, pain points, or training overlays.

## Current Assets

- `svg/male-front.svg`: extracted male front body from the app source.
- `svg/male-back.svg`: extracted male back body from the app source.
- `svg/female-front.svg`: extracted female front body from the app source.
- `svg/female-back.svg`: extracted female back body from the app source.
- `react/`: React wrappers for the same front and back body assets.

## Notes

- These SVGs were derived from the live body map code in the app, so they match the current body artwork instead of the earlier placeholder silhouettes.
- The raw SVG files use a neutral fill color for easy editing and export workflows.
- The React components use `currentColor`, so you can recolor them with CSS or inline styles.
- Each React component generates a unique `clipPath` ID at runtime to avoid collisions when multiple bodies render on the same page.
- Every path includes `data-muscle` and `data-muscle-id` so consumers can attach hover, selection, tooltip, and analytics behavior without relying on CSS classes.

## Next Ideas

- Split SVGs into named body regions.
- Export a metadata map from muscle IDs to labels.
- Add framework-agnostic package packaging around `svg/` and `react/`.
- Add an MIT license.
- Publish as its own repository or package once the asset set is stable.
