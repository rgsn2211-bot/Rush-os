# Design reference

This folder is the **source of truth for how Rush OS looks and behaves**. It is
reference material, not shipped code.

- `prototype/` — the original Claude Design prototype (React/JSX + mock data + a
  runnable `Rush OS Prototype.html`). Open the HTML in a browser to see the
  intended screens for Worker tablet, Owner desktop, and Owner mobile.
- `screenshots/` — captured screens for quick visual reference.

## Design tokens (already ported into the app)

Extracted from `prototype/ui.jsx` into `src/app/globals.css`:

- Brand navy `#1E3A63`; ink `#1A1F26` / `#4A525C` / `#8A929C`
- Surfaces: bg `#F9F9F9`, card `#FFFFFF`, lines `#E8EAED`
- Semantic green / amber / red / blue (in `oklch`)
- Fonts: **IBM Plex Sans** (UI) and **IBM Plex Mono** (all numbers and money)
- Money: BHD, always 3 decimals (e.g. `1.500`)

## Rule

When building a real screen, match the prototype. Do not redesign without
agreeing the change first. Each production screen should be traceable back to a
prototype file or screenshot here.
