# Debugging white space above colored headers

## Root cause (fixed)

On **Morning / Evening / Emergency**, the white band was primarily **parent padding** on the page wrapper (`paddingTop: spacing['xl']` / `3xl` plus `py-8`), not missing `env(safe-area-inset-top)`.

- `PageHeader` is full-bleed horizontally (`w-screen` + centering) but still sits **in the document flow** inside that padded container.
- Top padding on the parent pushes the entire header block down, exposing **`body`’s white background** above it.

`MainWithPadding` already uses `pt-0` on these routes; the extra gap was the **inner** `div` around the page content.

## Quick checklist

| Check | What to look for |
|--------|-------------------|
| **html/body margin** | `globals.css` sets `margin: 0` on `html` and `body`. |
| **Safe area** | `viewport-fit=cover` in `app/layout.tsx`; `.page-header-bleed` uses `env(safe-area-inset-top)`. |
| **Element above header** | `AppHeader` returns `null` on `/morning`, `/evening`, `/emergency`. |
| **Wrapper padding** | No top padding on the outer `max-w-3xl` wrapper when `PageHeader` is first. |

## Live metrics on device

Add to any URL:

```text
?safeAreaDebug=1
```

A panel at the bottom shows:

- Measured `safe-area-inset-top` (probe element)
- `html` / `body` margin and padding
- `visualViewport` offset
- `main` first child `offsetTop` (non-zero ⇒ extra top offset from layout/padding)

## Status bar (iOS)

`apple-mobile-web-app-status-bar-style` is `black-translucent` so content can draw under the status bar; the header background + `.page-header-bleed` should fill that region when insets apply.
