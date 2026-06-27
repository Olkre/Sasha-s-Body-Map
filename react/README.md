# React Body Map

Starter folder for the React implementation of the body map project.

## Purpose

- Wrap pure SVG assets in reusable React components.
- Add props for sizing, colors, selected regions, and interaction states.
- Provide a clean path toward publishing a React package later.

## Current Files

- `MaleFrontBody.tsx`
- `MaleBackBody.tsx`
- `FemaleFrontBody.tsx`
- `FemaleBackBody.tsx`
- `index.ts`

## Notes

- Components are standalone and do not import from the app code.
- Body paths are extracted from the current app source.
- All paths use `currentColor` so the body color can be controlled externally.
