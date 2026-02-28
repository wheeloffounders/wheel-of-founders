# Wheel of Founders — Canva Design Brief

Use this document in Canva to create custom illustrations, cards, message bubbles, and screen layouts. All values match the live app so you can design to spec and we can implement with Tailwind later.

---

## 1. Design System Specifications

### 1.1 Color Palette (Hex)

| Role | Hex | Usage |
|------|-----|--------|
| **Primary (Navy)** | `#152b50` | Headers, primary buttons, nav, key headings, left borders on cards |
| **Primary hover** | `#1a3565` | Button hover, link hover |
| **Secondary (Coral)** | `#ef725c` | CTAs, accents, completion/call-to-action buttons, Mrs. Deer warmth |
| **Secondary hover** | `#e8654d` | Coral button hover |
| **Success (Emerald)** | `#10b981` | Completed tasks, success states, positive stats |
| **Background light** | `#FAFBFC` | Page background (light mode) |
| **Background dark** | `#0F1419` | Page background (dark mode) |
| **Card/surface light** | `#FFFFFF` | Cards, inputs, modals |
| **Card/surface dark** | `#1A202C` | Cards, sections (dark mode) |
| **Text primary light** | `#111827` (gray-900) | Headings, primary text |
| **Text secondary light** | `#4A5568` | Body, secondary text |
| **Text primary dark** | `#E2E8F0` | Headings, primary text (dark) |
| **Border light** | `#E5E7EB` (gray-200) | Borders, dividers |
| **Border dark** | `#374151` (gray-700) | Borders (dark) |

**Gradients (for headers, hero, email):**
- Navy gradient: `linear-gradient(135deg, #152b50 0%, #1a3565 100%)`
- Mrs. Deer / warmth: `linear-gradient(to bottom right, #FFFBEB 0%, #FFF7ED 100%)` (amber-50 → orange-50)

### 1.2 Typography

| Element | Font | Size (approx) | Weight | Usage |
|---------|------|----------------|--------|--------|
| **H1** | Inter | 30px (1.875rem) | Bold (700) | Page titles (e.g. "Founder's Lens", "Morning Plan") |
| **H2** | Inter | 20px (1.25rem) | Semibold (600) | Section titles (e.g. "Power List", "Decision Log") |
| **H3** | Inter | 18px (1.125rem) | Semibold (600) | Card titles, subsections |
| **Body** | Inter | 16px (1rem) | Regular (400) | Paragraphs, list content |
| **Body small** | Inter | 14px (0.875rem) | Regular | Captions, hints, metadata |
| **Caption** | Inter | 12px (0.75rem) | Medium (500) or Regular | Labels, badges, timestamps |

**Google Font:** **Inter** (already in use).  
Optional for marketing/Canva-only: **DM Sans** or **Plus Jakarta Sans** for a slightly warmer headline feel; keep Inter for in-app UI.

### 1.3 Component Style Guide

| Component | Dimensions / spacing | Visual treatment |
|-----------|----------------------|-------------------|
| **Card (section)** | Padding: 24px (1.5rem). Gap between cards: 32px (2rem). Max content width: ~768px centered. | White/dark surface, `border-radius: 12px` (rounded-xl), `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` (shadow-lg). |
| **Left accent bar** | 4px wide, full height of card. | Primary sections: Coral `#ef725c`. Secondary sections: Navy `#152b50`. |
| **Button primary (Coral)** | Min height 40px, padding 12px 24px, `border-radius: 8px`. | Background `#ef725c`, text white, font semibold. Hover: `#e8654d`. |
| **Button secondary (Navy)** | Same as above. | Background `#152b50`, text white. Hover: `#1a3565`. |
| **Input field** | Height ~40px, padding 8px 16px, `border-radius: 8px`. | Border 1px `#D1D5DB` (gray-300). Focus: ring 2px `#152b50`. |
| **Badge / pill** | Padding 2px 8px, `border-radius: 9999px` (full). | e.g. `#FEF3C7` bg, `#B45309` text (amber) for “Morning” / “Evening” context. |
| **Avatar (Mrs. Deer)** | 36px or 48px circle. | Centered in bubble; optional soft shadow. |

### 1.4 Mrs. Deer Visual Style

- **Container (message card):**  
  - Background: gradient from warm off-white to very light peach (`#FFFBEB` → `#FFF7ED`).  
  - Border: 1px `#FCD34D` (amber-200) or amber-500 at 40% opacity in dark.  
  - Border radius: 12px outer, 8px inner message area.  
  - Padding: 24px outer, 20px inner around text.  
- **Message bubble (inner):**  
  - Background: white (light) or `#0F1419` (dark).  
  - Left accent: 4px solid `#F59E0B` (amber-500).  
  - Padding: 20px; shadow subtle.  
- **Avatar:**  
  - 36px (small) or 48px (large) circle.  
  - Suggest: warm, friendly deer character; soft lines; not cartoonish. Optional small sparkle or “coach” badge.  
- **Context label (e.g. “Morning”, “Evening Reflection”):**  
  - Small pill: bg amber-100, text amber-700 (or dark equivalents).  

---

## 2. Key Page Layouts (for Canva frames)

### 2.1 Dashboard (Home)

- **Layout:** Single column, max width ~768px, centered. Top padding ~80px (below nav).
- **Header:** H1 “Founder’s Lens”, navy `#152b50`, 30px bold. Short subtitle gray-600, 16px.
- **Stats row:** 4–6 stat cards in a grid (2 cols mobile, 3–4 desktop). Each card: white/dark surface, 16px padding, 12px radius, left border 4px — mix navy and coral and emerald for variety.
- **Section: “Quick Actions”:** 2–4 buttons; primary coral, secondary gray or navy.
- **Section: Mrs. Deer / Insights:** Full-width card using Mrs. Deer container style above; avatar left, message right; H2 “Founder’s Lens: Today’s Perspective” or “Mrs. Deer’s Reflection”.
- **Colors by section:** Header navy; stat cards use navy/coral/emerald left borders; body text gray-700/800; backgrounds #FAFBFC (light) or #0F1419 (dark).

**Typography hierarchy:** H1 30px bold → H2 20px semibold → H3 18px semibold → body 16px → caption 12–14px.

**Interactive states (for specs):**  
- Buttons: default, hover (darker), disabled (opacity 0.7).  
- Cards: default; optional hover slight lift (shadow increase).

---

### 2.2 Morning Plan

- **Layout:** Same single column, max ~768px. Same top padding.
- **Header:** H1 “Morning Plan”, navy; date and “Power List” subheading.
- **Section 1 – Power List:** Card, padding 24px, left border coral 4px. H2 with Target icon in coral. List of 3 task rows; each row: checkbox, title, optional “Needle mover” badge. Add-task row: dashed border, coral on hover.
- **Section 2 – Decision Log:** Card, left border navy 4px. H2 with Zap icon in navy. Input + type chips (Strategic / Tactical).
- **Section 3 – Mrs. Deer (if present):** Same Mrs. Deer card as dashboard.
- **Footer actions:** Primary button coral “Save plan”; secondary “Cancel” or outline.

**Colors:** Navy for headings and decision section; coral for Power List accent and primary CTA; emerald for completed checkmarks.

**Interactive states:** Checkbox unchecked (gray) / checked (emerald). Buttons: coral primary hover #e8654d; navy secondary hover #1a3565. Input focus: ring 2px #152b50.

---

### 2.3 Evening Review

- **Layout:** Same column and padding.
- **Header:** H1 “Evening Review” or “Today’s Journey”, navy. Subtitle encouraging reflection.
- **Mood / Energy:** Row of 5 options (e.g. Tough → Great). Selected: coral or navy fill; unselected: gray outline.
- **Wins / Lessons:** Two text areas or list inputs; card style, left border coral or navy.
- **Completion summary:** Circular or list of morning tasks with checkmarks; emerald for completed.
- **Mrs. Deer block:** Same style as dashboard/morning.

**Typography:** Same hierarchy. Celebratory tone: slightly larger body or short H2 for “What you accomplished”.

**Interactive states:** Mood/energy pills: default outline, selected filled (coral/navy). Buttons same as rest of app.

---

### 2.4 Login

- **Layout:** Centered card, max width 400px. Padding 32px. Left border 4px navy.
- **Header:** “Welcome Founder”, navy H1. Subtitle gray-600.
- **Social buttons:** Full width, height ~48px, rounded 8px — Google (white/gray border), Apple (black).
- **Divider:** “or” with lines; gray-400.
- **Email / Password:** Standard input style; focus ring navy.
- **Buttons:** Log In coral; Sign Up navy. Same sizes as elsewhere.

**Colors:** Card white; border navy; primary actions coral and navy; text gray-700/900.

---

### 2.5 Emergency (Firefighter)

- **Layout:** Same single column.
- **Header:** H1 with flame icon, navy. Subtitle supportive.
- **Form card:** Left border coral 4px (urgency). Description text area, severity chips (Hot / Warm / Contained).
- **Mrs. Deer or short tip:** Optional small insight card below.

**Colors:** Coral for urgency and primary action; navy for headings; severity can use coral/gray/emerald.

---

## 3. Export Requirements for Canva

### 3.1 Asset Sizes

| Asset | Size | Format | Notes |
|-------|------|--------|--------|
| **Logo (primary)** | 192×192 px (favicon/app icon), 512×512 px (high-res) | PNG (with transparency if needed) | Works on light and dark; simplify for 192. |
| **Logo (horizontal)** | Height 40px (width flexible), or 200×60 px | PNG or SVG | For nav/header. |
| **Mrs. Deer avatar** | 72×72 px, 144×144 px (2x) | PNG | Friendly deer; works on amber and white. |
| **Mrs. Deer illustration** | 200×200 px to 400×400 px | PNG | Optional for empty states or onboarding. |
| **Icon set** | 24×24 px (1x), 48×48 px (2x) | PNG or SVG | Target, Zap, Moon, Flame, etc.; stroke style. |
| **Dashboard stat icons** | 24×24 px or 32×32 px | PNG or SVG | Brain, Target, Shield, TrendingUp, Flame. |
| **Empty state / onboarding** | 240×240 px or 320×320 px | PNG | Simple illustration for “No tasks yet”, etc. |

### 3.2 Image Formats

- **PNG:** Icons, avatars, illustrations when you need transparency or soft edges.  
- **SVG:** Icons and logo when possible (scalable, small file size).  
- **JPG:** Avoid for UI; only for photos if ever used.  
- **WebP:** Optional export from Canva for illustrations to reduce size.

### 3.3 SVG / Custom Shapes (if you export from Canva or design tools)

- **Left accent bar:** Rectangle 4px × full height; no radius.  
- **Rounded card:** Rectangle with corner radius 12px.  
- **Pill badge:** Rectangle with corner radius 9999px (or half of height).  
- **Message bubble:** Rectangle 12px radius; optional tail (small triangle) bottom-left for “Mrs. Deer speaking”.

---

## 4. Canva Deliverables Checklist

Use this brief to create in Canva:

- [ ] **Custom Mrs. Deer character** — warm, supportive deer (avatar 72×72, optional full illustration).  
- [ ] **Dashboard cards** — 2–3 variants: navy left bar, coral left bar, emerald left bar; same padding and radius.  
- [ ] **Warm message bubbles** — gradient background (amber-50 → orange-50), inner white bubble with amber left bar; 36px avatar.  
- [ ] **Morning flow screen** — one key frame: header + Power List card + Decision card + primary coral button.  
- [ ] **Evening flow screen** — one key frame: header + mood row + wins/lessons + completion summary.  
- [ ] **Logo variations** — icon only (192, 512), horizontal lockup (for nav), optional dark-mode version.  
- [ ] **Button set** — primary coral, secondary navy, optional ghost/outline; show default + hover.  
- [ ] **Color palette page** — swatches with hex codes for handoff.  
- [ ] **Typography page** — H1, H2, H3, body, caption samples in Inter.

---

## 5. Quick Reference — Hex Codes

```
#152b50  Primary (Navy)
#1a3565  Primary hover
#ef725c  Secondary (Coral)
#e8654d  Coral hover
#10b981  Success (Emerald)
#FAFBFC  Background light
#0F1419  Background dark
#1A202C  Card dark
#E2E8F0  Text primary dark
#4A5568  Text secondary light
#111827  Text primary light (gray-900)
```

Use this document as the single source of truth for Canva. After you design, we can map these to Tailwind classes (e.g. `bg-[#152b50]`, `rounded-xl`, `border-l-4 border-[#ef725c]`) for implementation.
