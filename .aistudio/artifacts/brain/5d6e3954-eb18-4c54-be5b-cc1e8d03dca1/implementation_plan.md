# Implementation Plan: Eliminate App Blurriness & Visual Polish

Eliminated blurry text, fuzzy glow filters, and backdrop blur across the entire application, preloading **Plus Jakarta Sans** with high-clarity rendering, while preserving the user's preferred soft grey aesthetic and vibrant accounting color accents.

---

## 1. Scope of Changes Completed

### A. Direct Typography Preload & Font Rendering (`index.html` & `src/index.css`)
- [x] **Preloaded Google Fonts**: Added `<link rel="preconnect">` and `<link rel="stylesheet">` directly to `index.html` for **Plus Jakarta Sans** and **JetBrains Mono**, preventing delayed or pixelated fallback font swapping.
- [x] **Sharp Subpixel Text Rendering**: Added `text-rendering: optimizeLegibility;`, `font-feature-settings: "cv02", "cv03", "cv04", "cv11";`, and sharp system font fallbacks in `src/index.css`.
- [x] **Optimized Soft Grey Hierarchy**: Set text contrast cleanly to `#CBD5E1` for headings and `#94A3B8` / `#8B9BB4` for descriptive text, preventing dim/washed-out text on pitch-black screens.

### B. Eradication of Diffuse Drop-Shadow & Text-Shadow Glows
- [x] **Removed Text Gradient Drop-Shadows**: Stripped `filter: drop-shadow(...)` from `.text-gradient`, `.text-fading-smart`, `.text-purple-green-fade`, and other text classes that caused smeared fuzzy characters on mobile GPUs.
- [x] **Removed Lucide Icon Drop-Shadows**: Stripped `filter: drop-shadow(0 0 6px ...)` from all `svg.lucide` icons so icons render with clean geometric vectors.
- [x] **Removed Link Text Shadows**: Removed `text-shadow: 0 0 12px ...` from hyperlinks and table buttons.
- [x] **Clean Button & Select Shadows**: Replaced diffuse multi-layer glows with clean 1px borders and crisp 2px elevation shadows.

### C. Elimination of Heavy Backdrop-Blur (`src/index.css` & `src/App.tsx`)
- [x] **Disabled Backdrop-Blur Globally**: Replaced `backdrop-filter: blur(...)` with `backdrop-filter: none !important;` across `.glass-panel` and all modal overlays, stopping Android Chrome compositor downsampling.
- [x] **Removed Animated Blur Background Blobs**: Removed the 600px `blur-3xl` animated gradient elements in `src/App.tsx` that forced continuous mobile GPU layer re-rasterization.

### D. Screen Polish & Decimal Alignment
- [x] **Dashboard KPI Metric Cards (`src/pages/Dashboard.tsx`)**: Polished metric card text with `tabular-nums` and clean borders without glowing hover blur.
- [x] **Recent Transactions & Truck Table Cleanup**: Removed obsolete receipt proof badges/modals from Dashboard and Truck Dashboard.
- [x] **Tables Tabular Alignment**: Enforced `tabular-nums font-mono font-bold` on currency and numerical cells in Customer Dashboard, Deliveries, Ledger, and Truck Dashboard for rock-solid vertical decimal alignment.

---

## 2. Verification
- `compile_applet`: Build succeeded with 0 errors.
- `lint_applet`: `tsc --noEmit` passed with 0 errors.
- Dev server restarted and running on port 3000.
