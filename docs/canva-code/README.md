# Wheel of Founders — Canva Code Usage

## What’s in this folder

- **`wheel-of-founders-canva-code.html`** — Single HTML file you can paste into Canva’s “Code for me” (or open in a browser to preview). It includes:
  - Design system (colors, typography)
  - Dashboard cards (12px radius, 4px left accent)
  - Mrs. Deer message bubbles (gradient amber → orange)
  - Buttons with hover states
  - 9 onboarding goal cards (exact app copy)
  - 5 Mrs. Deer expression placeholders
  - Bottom nav with + FAB

## How to use in Canva

1. **Open Canva** and go to the project where you want this design.
2. **Use “Code” / “Code for me”** (or equivalent) and paste the **entire contents** of `wheel-of-founders-canva-code.html`.
3. **Upload your Mrs. Deer images** in Canva (one per expression: welcoming, thoughtful, encouraging, celebratory, empathetic).
4. **Replace placeholders:**
   - In the code, find every `<img src="" ...>` and set `src` to your uploaded image URL or the path Canva gives you.
   - Or: after generation, in Canva’s UI replace the placeholder elements with your uploaded images.

## Where your images go

| Location in the file | Use this Mrs. Deer expression |
|----------------------|-------------------------------|
| First message bubble (avatar) | **Welcoming** (login/onboarding) |
| Second message bubble (avatar) | **Thoughtful** or **Encouraging** (morning/evening) |
| Expression block 1 | Welcoming |
| Expression block 2 | Thoughtful |
| Expression block 3 | Encouraging |
| Expression block 4 | Celebratory |
| Expression block 5 | Empathetic |

Search for: `UPLOAD`, `PLACEHOLDER`, `Replace the img src`, `expression-img`.

## Swapping expressions by context

- **Login / onboarding:** Use the **Welcoming** avatar in the first bubble and in the goal-selection header.
- **Morning prompts:** Use **Thoughtful** in the bubble that says “Morning” context.
- **Evening reflection:** Use **Encouraging** in the “Evening Reflection” bubble.
- **Streaks / wins:** Use **Celebratory** in celebration modals or cards.
- **Emergency / tough day:** Use **Empathetic** in the emergency or low-energy message.

In code: change the `src` of the corresponding `.mrs-deer-avatar img` or `.expression-img img` to the URL of the expression you want.

## Customizing in Canva after generation

- **Colors:** Edit the `:root` block at the top of the `<style>` section. Variables: `--navy`, `--coral`, `--emerald`, `--amber-50`, `--orange-50`, etc. Or use Canva’s color picker on the generated elements.
- **Fonts:** The file uses **Inter** (Google Fonts). To change, replace the `link` href in `<head>` and the `font-family` in `body` and `.typography-sample`.
- **Layouts:** Adjust `max-width` on sections (e.g. `max-width: 800px`), padding (e.g. `padding: 32px`), and grid (e.g. `grid-template-columns` in `.goals-grid` and `.expressions-grid`).
- **Radii:** `--radius-card: 12px` and `--radius-button: 8px`. Change these to match Canva or Tailwind later.

## Export and Tailwind

- The layout and spacing are chosen to align with the Tailwind-based app (e.g. `rounded-xl` = 12px, `border-l-4`, padding 24px).
- After you’re happy in Canva, you can export assets (Mrs. Deer images, icons) and we can map the same structure to Tailwind classes (e.g. `bg-[#152b50]`, `rounded-xl`, `border-l-4 border-[#ef725c]`) in the real app.

## Preview in browser

Open `wheel-of-founders-canva-code.html` in a browser to see the full layout. Image placeholders will show emoji fallbacks until you set `src` to your Mrs. Deer assets.
