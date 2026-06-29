# React Body Map

Starter folder for the React implementation of the body map project.

## Purpose

- Wrap pure SVG assets in reusable React components.
- Add props for sizing, colors, selected regions, and interaction states.
- Provide a clean path toward publishing a React package later.
- Keep the React source grouped under `react/components/` instead of the repo root.

## Current Files

- `MaleBody.tsx`
- `FemaleBody.tsx`
- `BodyMapDemo.tsx`
- `index.ts`

## Notes

- Components are standalone and do not import from the app code.
- Body paths are extracted from the current app source.
- All paths use `currentColor` so the body color can be controlled externally.
- Each path carries `data-muscle` and `data-muscle-id` metadata for interaction logic.
- `MaleBody` and `FemaleBody` render front and back side by side as the default whole-body views.
- `BodyMapDemo` now demonstrates app-like interaction states: hover labels, click selection, body transitions, and shockwave/ripple feedback.
