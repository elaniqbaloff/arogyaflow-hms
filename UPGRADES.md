# Dependency upgrade notes

This file tracks where the project sits versus the latest releases, so future
upgrades are a deliberate choice rather than guesswork. Versions below are
current as of June 2026 — re-check npm before acting on Tier 2/3.

---

## ✅ Tier 1 — DONE (low risk)

Applied in this build:

| Package | Was | Now |
|---|---|---|
| `lucide-react` | `^0.395.0` | `^1.17.0` |
| `vite` | `^5.3.1` | `^8.0.0` |
| `@vitejs/plugin-react` | `^4.3.1` | `^6.0.0` |

Why: the old `^0.395.0` lucide range was locked to `0.395.x`, so newer icons
(`IdCard`, `Venus`, `NotebookPen`, …) could never install — that is what broke
the build. Moving to lucide v1 unlocks the full current icon set, and those
nicer icons have now been restored on the patient screen. Vite 5→8 and the
matching plugin v6 are a clean bump for this project (the config is trivial).

### Run after pulling this build
```bash
npm install
npm run build      # or: npm run dev
```

### ⚠️ Node.js requirement (important)
Vite 7 and 8 require **Node.js 20.19+ or 22.12+**. Check yours:
```bash
node --version
```
If it is older, either update Node (recommended — install the latest 22 LTS),
**or** revert just the two Vite lines in `package.json` back to the Vite 5 line
and reinstall — nothing else in Tier 1 depends on Vite 8:
```jsonc
// package.json fallback (keeps the lucide fix, drops the Vite bump)
"@vitejs/plugin-react": "^4.3.1",
"vite": "^5.3.1"
```
lucide v1 keeps React 16/17/18 support, so it works on the current React 18
without touching anything else. If npm prints a peer-dependency warning, it is
safe to ignore (icons are plain SVG components) or use `--legacy-peer-deps`.

---

## ⏳ Tier 2 — when you have time to test (moderate effort)

Each is one major version with a supported upgrade path. Do them one at a time
and click through the app after each.

### React 18 → 19  (`react` / `react-dom` → `^19.2.7`)
- Run the official codemods: `npx codemod@latest react/19/migration-recipe`
- Review the React 19 upgrade guide for removed APIs.
- Watch for: legacy lifecycle methods, string refs, `ReactDOM.render` (already
  not used here — this app uses `createRoot`).

### react-router-dom 6 → 7  (`^7.15.0`)
- v7 is mostly drop-in for this app's declarative `<Routes>`/`<Route>` usage.
- Note: v8 is expected soon; staying on v7 for now is fine.
- Optional later: migrate `react-router-dom` imports to the unified
  `react-router` package.

### recharts 2 → 3  (`^3.0.0`)
- Used only in `src/pages/Dashboard.jsx` and `src/pages/Reports.jsx`.
- Check chart props/tooltip APIs after upgrading; visually confirm the
  dashboard and reports charts still render.

---

## ⏳ Tier 3 — only with a dedicated styling pass (high effort)

### tailwindcss 3 → 4  (`^4.1.0`)
This is the big one. Tailwind v4 is a CSS-first rewrite:
- `@tailwind base/components/utilities` → `@import "tailwindcss";` in
  `src/index.css`.
- The PostCSS plugin moves: install `@tailwindcss/postcss` and update
  `postcss.config.js`.
- `tailwind.config.js` is no longer auto-loaded. Either:
  - keep it via `@config "../tailwind.config.js";` at the top of `index.css`
    (fastest, lowest-risk bridge), **or**
  - port the custom theme (the `brand`/`gold` palettes, `cream`/`sand`/`ink`
    colors, `Fraunces`/`Outfit` fonts, `card`/`lift` shadows, `xl2` radius,
    and the `fade-in`/`slide-up`/`toast-in` animations) into a CSS `@theme`
    block.
- Requires modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+).
- Recommended: run `npx @tailwindcss/upgrade` on a branch, then **visually
  review every screen** — v4 can silently drop styles.

Tailwind 3.4 is still maintained, so there is no urgency here.

---

## How to upgrade later (general recipe)
```bash
# see exactly what is outdated
npm outdated

# bump one package at a time, then build + click through the app
npm install <pkg>@latest
npm run build
```
Do Tier 2 before Tier 3. Commit (or snapshot the demo data) before each step.
