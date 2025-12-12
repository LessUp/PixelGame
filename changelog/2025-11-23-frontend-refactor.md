# Frontend Design Refactor & Fixes - 2025-11-23

## Design Changes
- **Theme**: Adopted a futuristic dark theme with a refined color palette (`background`, `primary`, `secondary`, etc. CSS variables). Added a subtle animated grid/noise background.
- **Typography**: Standardized on system-ui/Inter with cleaner weights and tracking.
- **Components**:
  - **Button**: Modernized with better hover states, variants (primary, secondary, ghost, danger), and shadow effects.
  - **Card**: Cleaner borders, subtle transparency/backdrop-blur, and reduced heavy shadows.
  - **Input**: Consistent styling with the new theme.
  - **Slider**: Added a custom Slider component for better range input UX.
- **Layout**:
  - **App**: Simplified structure. Header is now transparent/blurred. Sidebar integration is cleaner.
  - **Controls**: Completely grouped and organized tools, actions, and settings into logical Cards. Used clear icons.
  - **Palette**: Improved the color picker and palette grid.
  - **ActionDock**: Updated to match the new glassmorphism style.

## Fixes
- **Store**: Fixed a TypeScript error in `usePixelStore.ts` where the `store` argument was missing when composing slices (`createPixelUiPrefsSlice` and others).
- **Code Quality**: Refactored `Controls.tsx` to reduce clutter and improve readability.

## Technical Details
- Removed hardcoded colors in favor of CSS variables defined in `index.css`.
- Updated `tailwind.css` (via `@import "tailwindcss"`) to use the new theme config.
