# Wheel of Founders — Comprehensive Canva Design Brief

This document is the single source for designing all visual assets in Canva. **Part 1** is extracted from the live codebase; **Part 2** is the full design brief for Canva; **Part 3** is the implementation roadmap after designs are ready.

---

# PART 1: ACTUAL APP DATA (FROM CODEBASE)

## 1.1 Onboarding Goal Options (Exact from `UserGoalQuestionnaire.tsx`)

**Question:** *"What brings you here today?"*

**Welcome message (from OnboardingWizard / Mrs. Deer):**
- *"Welcome to your founder journey"*
- *"I'm Mrs. Deer, your quiet coach in the background. Together, we'll turn scattered days into a clear, repeatable rhythm."*
- *"This app isn't about doing more. It's about doing what actually matters, with a calmer mind."*

**Goal options (use exactly in Canva):**

| # | Value (internal) | Label | Description | Emoji |
|---|------------------|--------|-------------|--------|
| 1 | find_purpose | Finding my purpose | I need clarity on what truly matters | 🎯 |
| 2 | build_significance | Build a meaningful business | I want my business to grow and leave a mark | 🌟 |
| 3 | reduce_overwhelm | Reducing overwhelm | I'm drowning in too many small tasks | 🌊 |
| 4 | break_through_stuck | Breaking through stuck | I'm doing everything but still feel stuck | 🚀 |
| 5 | improve_focus | Improving focus | I need better clarity and focus | 🔍 |
| 6 | build_systems | Building systems | I want to systemize and delegate better | ⚙️ |
| 7 | general_clarity | General clarity | I want better decision-making and clarity | 💡 |
| 8 | stay_motivated | Staying motivated | I know what to do, I just struggle to do it consistently | 💪 |
| 9 | find_calm | Finding calm | I'm productive but never feel settled or at peace | 🧘 |

**Onboarding flow (3 steps after goal selection):**
- **Step 1:** Mrs. Deer welcome (avatar 48×48), title "Welcome to your founder journey", copy above.
- **Step 2:** "How your daily loop works" — Dashboard, Morning Plan, Evening Review short descriptions.
- **Step 3:** "Let's set up your first Morning Plan" — CTA button: "Plan my first morning focus →".

---

## 1.2 Current Color Scheme (from codebase)

| Role | Hex | Usage in app |
|------|-----|----------------|
| Primary Navy | `#152b50` | Top nav, headings, primary buttons, left accent bars, theme_color |
| Primary Navy hover | `#1a3565` | Button/link hover |
| Secondary Coral | `#ef725c` | CTAs, active nav, Mrs. Deer accents, focus rings |
| Secondary Coral hover | `#e8654d` | Coral button hover |
| Success Emerald | `#10b981` | Completed tasks, success states, positive stats |
| Background light | `#FAFBFC` | Page background (light) |
| Background dark | `#0F1419` | Page background (dark) |
| Card/surface dark | `#1A202C` | Cards, modals (dark) |
| Text primary light | `#111827` | Headings (gray-900) |
| Text secondary light | `#4A5568` | Body (layout default) |
| Text primary dark | `#E2E8F0` | Headings/body (dark) |
| Border light | `#E5E7EB` (gray-200) | Borders |
| Amber (Mrs. Deer / warmth) | `#F59E0B` (amber-500) | Message bubble left bar, badges |
| Warning | `#f59e0b` | Amber alerts |
| Error | `#ef4444` | Errors, destructive |

---

## 1.3 Typography (from `layout.tsx` and usage)

- **Font:** **Inter** (Google Fonts), used app-wide.
- **H1:** 30px (1.875rem), bold (700) — e.g. "Founder's Lens", "Morning Plan".
- **H2:** 20px (1.25rem), semibold (600) — section titles.
- **H3:** 18px (1.125rem), semibold — card titles.
- **Body:** 16px, regular (400).
- **Body small:** 14px — captions, hints.
- **Caption:** 12px — labels, badges, timestamps.
- **Mrs. Deer messages:** 16px, comfortable line height; can use italic or a slightly warmer style in Canva.

---

## 1.4 Existing Component Styles (summary)

- **Cards:** `border-radius: 12px` (rounded-xl), padding 24px, shadow-lg, white/dark surface. Left accent bar **4px** (coral or navy).
- **Buttons:** `border-radius: 8px`, padding 10px 16px (py-2.5 px-4), font semibold. Primary coral, secondary navy.
- **Inputs:** `border-radius: 8px`, padding 12px 16px, border 1px gray-300; focus ring 2px navy.
- **Mrs. Deer container:** Gradient amber-50 → orange-50, border amber-200, inner bubble white with **4px left bar amber-500**, padding 20px, avatar 36px or 48px.
- **Nav:** Fixed top, height 64px (h-16), navy background, white text; active = coral bg.

---

## 1.5 List of All Pages / Sections

| Route | Page name | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Founder's Lens, stats, Quick Actions, Mrs. Deer insight |
| `/morning` | Morning Plan | Power List, Decision Log, Mrs. Deer |
| `/emergency` | Emergency | Log a fire (description, severity) |
| `/evening` | Evening Review | Mood, energy, wins, lessons, completion |
| `/weekly` | Weekly | Weekly insights, patterns |
| `/history` | Journey / History | Date navigator, past tasks/reviews |
| `/profile` | Profile | Profile info, Message to Mrs. Deer |
| `/feedback` | Feedback | User feedback |
| `/settings` | Settings | Account, timezone, subscription link, etc. |
| `/settings/timezone` | Timezone | Timezone selector |
| `/settings/subscription-disabled` | Subscription | Manage subscription (when used) |
| `/pricing-disabled` | Pricing | Pricing (when used) |
| `/login` | Login | Email/password, Google, Apple |
| `/admin`, `/admin/*` | Admin | Analytics, experiments (internal) |

**Current navigation (for reference):** Top bar with Dashboard, Morning, Emergency, Evening, Insights (dropdown: Weekly, Journey), Profile (dropdown: Profile, Feedback, Settings, Pricing). Mobile: hamburger → full sidebar. **No bottom nav with + button yet** — that is specified below as a **design proposal** for Canva (e.g. for a future mobile/PWA redesign).

---

# PART 2: COMPLETE DESIGN BRIEF FOR CANVA

## 2.1 App Icon Design

**Primary App Icon** (for iOS/Android home screens)
- **Style:** Simple, recognizable at small sizes, memorable.
- **Elements:** Mrs. Deer (stylized face/antlers) combined with a subtle wheel/mandala or circular motif (e.g. antlers forming an arc or circle).
- **Colors:** Navy `#152b50` background with Coral `#ef725c` accent (e.g. nose, inner ear, or small detail). Optional: cream/white for face.
- **Constraints:** Must read clearly at 32×32 and 192×192.

**Icon variations to produce:**

| Asset | Size | Format | Notes |
|-------|------|--------|--------|
| Main app icon (full color) | 1024×1024 | PNG | App Store |
| Main app icon | 512×512 | PNG | Play Store, PWA |
| Monochrome | 1024×1024 | PNG | Notifications (single color on transparent or white) |
| Adaptive (Android) | Foreground 108dp, background 108dp | PNG | Foreground: deer + circle; background: flat navy or gradient |
| Settings / simplified | 48×48, 96×96 | PNG | Simpler deer silhouette or “W” for Wheel |
| PWA | 192×192, 512×512 | PNG | Same as main icon |
| Favicon | 16×16, 32×32 | PNG or ICO | Simplified mark |
| **SVG master** | Vector | SVG | Single file that scales to all sizes |

---

## 2.2 Mrs. Deer Visual Identity

- **Character:** Warm, wise, motherly deer. Soft, friendly expression (gentle eyes, slight smile). Antlers elegant, not sharp or aggressive.
- **Color palette for Mrs. Deer:** Warm browns, soft corals, cream. Fits on both amber and white backgrounds.

**Expressions to design:**
1. **Welcoming / neutral** — default for dashboard and onboarding.
2. **Thoughtful** — slightly tilted head (for reflection, insights).
3. **Encouraging** — warm smile (after completing morning/evening).
4. **Celebratory** — happy expression (streak, completion).
5. **Concerned / empathetic** — gentle, caring (emergency, tough days).

**Mrs. Deer placements in the app:**
- **Dashboard:** Small avatar (36–48px) next to daily wisdom bubble.
- **Onboarding:** Featured prominently (48px or larger) with welcome message.
- **After completing morning/evening:** Celebration message with Mrs. Deer.
- **Empty states:** Encouraging illustration (e.g. “No tasks yet — start with one”).
- **Settings:** “Message to Mrs. Deer” section with her image.
- **Loading:** Silhouette or antler icon (see Loading screen below).

---

## 2.3 Overall App Structure (for Canva frames)

- **Responsive:** Design for desktop, tablet, and mobile.
- **Target sizes:** Mobile 375×667, Tablet 768×1024, Desktop 1440×900.
- **Loading:** Subtle animation when app opens (see Page 1).

---

## 2.4 PAGE 1: Loading / Animation Screen

- **Purpose:** First screen while app loads.
- **Content:** Simple, elegant loading state.
  - Mrs. Deer silhouette or antler icon gently pulsing (or soft fade in/out).
  - Warm coral `#ef725c` accent (e.g. icon color or glow).
  - Optional: “Wheel of Founders” text fades in after 0.5–1s.
- **Background:** Navy `#152b50` or soft gradient (navy → dark blue).
- **Export:** Static frame for “loading” state; animation can be implemented in code later.

---

## 2.5 PAGE 2: Onboarding — Goal Selection

**Mrs. Deer welcome message (use verbatim):**
> *"Hi there founder. Let's build something that works for you."*

(Or use the existing in-app copy: *"Let's get to know you"* / *"This helps us personalize your experience"*.)

**Goal options (use exact options from Part 1):**

Design **one card per goal** with:
- **Icon/emoji** (or custom icon in same spirit): 🎯 🌟 🌊 🚀 🔍 ⚙️ 💡 💪 🧘
- **Label** (e.g. “Finding my purpose”)
- **Description** (e.g. “I need clarity on what truly matters”)

**Layout:**
- Clean card layout, **12px corner radius**.
- Each option: icon/emoji on left, label + description on right; full-width tappable card.
- **Selected state:** Coral `#ef725c` border (2px), light amber/peach background (e.g. amber-50).
- **Unselected state:** Light gray border, white/dark surface, navy text.

**Header:** Mrs. Deer avatar (48px) + “Let's get to know you” + “This helps us personalize your experience”.  
**Footer:** “Skip for now” (text link) + “Continue” (coral button with arrow).

---

## 2.6 PAGE 3: Main App — Bottom Navigation with + Button (Design Proposal)

**Note:** The app currently uses a **top navigation bar**. This section describes a **proposed** mobile-first bottom navigation for Canva (and possible future implementation).

**Bottom navigation bar:**

```
[Insights]      [ ➕ ]      [Profile]
  icon           icon         icon
 Insights       Today       Profile
```

- **Left: INSIGHTS** — Chart/graph icon above label “Insights”.
- **Center: CIRCULAR + BUTTON (FAB)**
  - **Shape:** Perfect circle.
  - **Color:** Coral `#ef725c`.
  - **Icon:** White “+” symbol.
  - **Size:** 56×56 px (slightly larger than other nav icons).
  - **Shadow:** `0 4px 8px rgba(0,0,0,0.15)`.
  - **Tap state:** Gentle scale (e.g. 0.95 → 1) or subtle bounce (design as “pressed” frame in Canva).
- **Right: PROFILE** — Deer head or person icon above “Profile”.

**What each tab shows (for Canva frames):**

- **INSIGHTS TAB:** Dashboard overview (stat cards), weekly insight (Mrs. Deer bubble), monthly insight (patterns). Reuse dashboard + weekly layout from existing brief.
- **TODAY (+ BUTTON):** Tapping + opens a **bottom sheet or circular menu** with 3 options:
  - ☀️ **Morning Reflection** — coral accent; short description; e.g. “Set today’s priorities”.
  - 🆘 **Emergency Check-in** — amber/red accent; “Log a fire”.
  - 🌙 **Evening Review** — navy accent; “Close the loop”.
  Each with label + estimated time (e.g. “~2 min”).
- **PROFILE TAB:** Settings, History, Subscription, Help/Support, “Message to Mrs. Deer” with her image. List or card layout.

---

## 2.7 Design System Specifications (for Canva)

**Color palette (hex):**
- Primary Navy: `#152b50`
- Primary hover: `#1a3565`
- Primary Coral: `#ef725c`
- Coral hover: `#e8654d`
- Success: `#10b981`
- Background light: `#f9fafb` (or `#FAFBFC` for consistency with app)
- Background dark: `#0F1419` (or `#1f2937` for slightly lighter dark)
- Text dark: `#111827`
- Text light (on dark): `#f9fafb` / `#E2E8F0`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Gray scale: gray-100 to gray-700 for borders and cards.

**Typography:**
- Font: **Inter** (Google Fonts).
- H1: 30px, bold.
- H2: 20px, semibold.
- H3: 18px, medium/semibold.
- Body: 16px, regular.
- Caption: 12–14px, regular.
- Mrs. Deer messages: 16px, optional italic or warm style.

**Components:**
- **Cards:** 12px radius, 16px padding, subtle shadow.
- **Buttons:** 8px radius, 10px 16px padding, bold/semibold text.
- **Inputs:** 8px radius, 12px padding, light border; focus ring 2px navy.
- **Badges:** ~16px height, 4px radius, colored backgrounds (amber for context labels).
- **Mrs. Deer bubbles:** Gradient background (amber-50 → orange-50), inner bubble 16px radius, **4px left accent bar** (amber or coral).

---

## 2.8 Deliverables Checklist (Canva)

- [ ] **Mrs. Deer character sheet** — 5+ expressions (welcoming, thoughtful, encouraging, celebratory, empathetic).
- [ ] **App icon set** — All sizes and variations (1024, 512, monochrome, adaptive, PWA, favicon, SVG master).
- [ ] **Loading animation screen** — One static frame (navy + coral, Mrs. Deer or antlers).
- [ ] **Onboarding goal selection** — Screen with 9 options from Part 1, selected/unselected states.
- [ ] **Bottom navigation** — Bar with Insights | + (FAB) | Profile; optional “Today” expanded menu (3 options).
- [ ] **Insights tab** — Expanded view (dashboard + weekly/monthly).
- [ ] **Today (+) expanded menu** — 3 options: Morning (coral), Emergency (amber/red), Evening (navy).
- [ ] **Profile tab** — Layout with Settings, History, Subscription, Help, Message to Mrs. Deer.
- [ ] **Morning reflection screen** — Power List + Decision Log + Mrs. Deer (one key frame).
- [ ] **Evening review screen** — Mood/energy, wins/lessons, completion + Mrs. Deer.
- [ ] **Emergency check-in screen** — Form + severity + short Mrs. Deer tip.
- [ ] **Dashboard cards** — Stat card, insight card, streak card (navy/coral/emerald accents).
- [ ] **Color palette reference** — One page with all hex swatches and names.
- [ ] **Typography reference** — One page with H1, H2, H3, body, caption, Mrs. Deer message sample.
- [ ] **Sample Mrs. Deer message bubbles** — Success, encouragement, empathy (3 variants).
- [ ] **Empty states** — 1–2 illustrations with Mrs. Deer (e.g. “No tasks yet”, “No history yet”).

---

## 2.9 Export Requirements

**Formats:**
- **PNG** with transparency for raster assets (icons, Mrs. Deer, illustrations).
- **SVG** for logo, icons, and scalable graphics.
- **WebP** optional for large illustrations (smaller file size).

**Sizes:**
- **Mobile:** 375×667 px.
- **Tablet:** 768×1024 px.
- **Desktop:** 1440×900 px.
- **App icons:** As in 2.1 table (16, 32, 72, 96, 128, 144, 152, 192, 384, 512, 1024).
- **Mrs. Deer avatar:** 72×72, 144×144 (2x).
- **Icons:** 24×24, 48×48 (1x and 2x).
- **Illustrations:** 200–400 px width for in-app use; larger for hero/empty states if needed.

---

# PART 3: IMPLEMENTATION ROADMAP

After Canva designs are complete:

1. **Convert designs to Tailwind CSS** — Map each screen and component to utility classes (e.g. `bg-[#152b50]`, `rounded-xl`, `border-l-4 border-[#ef725c]`).
2. **Update components** — Apply new visuals to `AICoachPrompt`, `MrsDeerAdaptivePrompt`, `OnboardingWizard`, `UserGoalQuestionnaire`, cards, buttons.
3. **Implement loading animation** — Use Canva loading frame as reference; implement pulse or fade in code (e.g. CSS or Lottie).
4. **Add bottom navigation with + button** (optional) — If product decision is to move to bottom nav, implement FAB and “Today” menu; keep existing top nav as fallback for desktop.
5. **Apply Mrs. Deer illustrations** — Replace or supplement `/mrs-deer.png` with new expressions; use in dashboard, onboarding, empty states, settings.
6. **Replace app icons** — Generate and drop in all sizes from Canva/SVG into `public/` and update `manifest.json` and meta tags.
7. **Test** — iOS, Android (or PWA), desktop; light and dark mode; touch targets (min 44px).

---

**Quick reference — hex codes**

```
#152b50  Primary Navy
#1a3565  Navy hover
#ef725c  Coral
#e8654d  Coral hover
#10b981  Emerald
#FAFBFC  Background light
#0F1419  Background dark
#1A202C  Card dark
#E2E8F0  Text (dark mode)
#4A5568  Text secondary (light)
#111827  Text primary (light)
#f59e0b  Amber (Mrs. Deer)
```

Use this document as the single source for Canva. After design, the same file plus implementation notes can drive Tailwind and component updates.
