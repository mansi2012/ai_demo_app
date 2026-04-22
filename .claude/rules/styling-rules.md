---
description: Styling rules for the Angular frontend (Tailwind CSS v3 + plain CSS)
globs:
  - "frontend/**/*.css"
  - "frontend/**/*.html"
  - "frontend/**/*.ts"
---

- Tailwind CSS v3 only — `@tailwind base; @tailwind components; @tailwind utilities;` at the top of `src/styles.css` (NOT the v4 `@import "tailwindcss"` syntax)
- Reusable visual primitives live as `@layer components` classes in `src/styles.css`:
  - `.btn`, `.btn-primary`, `.btn-ghost` — buttons
  - `.form-input`, `.form-label`, `.form-error` — form fields
  - `.card` — card container
  Use these instead of repeating the same Tailwind utility strings across templates. Add new primitives to `styles.css` before reaching for long utility chains in templates.
- Colors come from the `brand` palette in [tailwind.config.js](frontend/tailwind.config.js) (`brand-50` → `brand-700`) plus Tailwind's default palette (`slate`, `rose`, etc.). Never hardcode hex/rgb/hsl in templates or component styles.
- Spacing, sizing, and radius: use Tailwind's default scale (`p-4`, `gap-6`, `rounded-md`, `rounded-xl`) — no arbitrary values like `p-[13px]` without a clear reason.
- Responsive design: mobile-first with Tailwind's built-in breakpoints (`sm` / `md` / `lg` / `xl` / `2xl`). Don't invent custom breakpoints.
- Accessibility: every interactive element needs a visible focus state (the shared `.btn` / `.form-input` classes already handle this — preserve `focus:ring-*` classes when editing).
- No inline `style="..."` attributes.
- No `!important`.
- No component-level SCSS — the project uses plain CSS files and component-scoped classes are rare; prefer Tailwind in the template.
- Primary action = `.btn-primary`, secondary/cancel = `.btn-ghost`. Don't invent new button variants without adding them to `styles.css`.
- Every button and link needs hover, focus, and disabled styling (built into the shared `.btn` class — don't bypass it).
- Container pattern: `mx-auto max-w-5xl px-4` (or `max-w-md` for auth shells). Don't hardcode widths.
