# Blog publish schedule — Founder Energy series

**Cadence:** 2 posts per week — **Tuesday** (new article) + **Friday** (optimize or companion piece)  
**Series:** Founder Energy (time-of-day founder pain → short ritual → Mrs. Deer hook)  
**How publishing works:** Set `date: 'YYYY-MM-DD'` in MDX frontmatter. Posts stay hidden until that date (UTC). Use `draft: true` while writing.

---

## Quick workflow

1. Pick the next **Tuesday** slot from the table below.
2. Create `content/blog/{slug}.mdx` with that `date` (and `draft: true` until ready).
3. Merge to your deploy branch — Vercel rebuilds daily; post goes live on its `date`.
4. **Friday** slot: either ship a new companion post or run the optimization checklist on an existing cluster post.

---

## 8-week calendar (starts Tue Jun 3, 2026)

| Week | Tue — publish | Fri — ship | Focus |
|------|---------------|------------|-------|
| 1 | **Jun 3** — `morning-brain-cant-pick` *(new)* | **Jun 6** — Cross-link `brain-quits-at-7pm` → `founder-burnout-warning-signs`; add CTAs on burnout post | Morning mirror of top post |
| 2 | **Jun 10** — `two-pm-slump-context-debt` *(new)* | **Jun 13** — CTA upgrade on `context-switching-founder-parent` | Midday + transition tax |
| 3 | **Jun 17** — `one-more-thing-before-bed` *(new)* | **Jun 20** — CTA upgrade on `sunday-night-reset` | Night loops / Sunday scaries |
| 4 | **Jun 24** — `small-decisions-after-4pm` *(new)* | **Jun 27** — CTA upgrade on `stop-second-guessing` | Decision fatigue deep dive |
| 5 | **Jul 1** — `pickup-line-productivity-trap` *(new)* | **Jul 4** — Re-share `brain-quits-at-7pm` (social/email; no new URL) | Founder-parent stolen moments |
| 6 | **Jul 8** — `slack-at-10pm-compulsive-fixing` *(new)* | **Jul 11** — CTA upgrade on `founders-fog-decision-clarity` | Can't stop working |
| 7 | **Jul 15** — `monday-morning-dread` *(new)* | **Jul 18** — CTA upgrade on `why-i-built-mrs-deer` | Week-start anxiety |
| 8 | **Jul 22** — `three-minute-parent-founder-switch` *(new)* | **Jul 25** — Internal-link pass across whole Founder Energy cluster | Micro transition ritual |

---

## New post briefs (Tuesday slots)

### 1. `morning-brain-cant-pick` — Jun 3
**Title:** Why Your Morning Brain Can't Pick (The 8 AM Paralysis)  
**Hook:** Open laptop, 47 tabs mentally open, can't choose the first task.  
**Ritual:** Morning Gate — brain dump → one needle → 25-min shield.  
**Widget/CTA:** Morning Canvas / needle distiller funnel.  
**Link from:** `brain-quits-at-7pm`, `founder-burnout-warning-signs`

### 2. `two-pm-slump-context-debt` — Jun 10
**Title:** The 2 PM Slump Isn't Coffee — It's Context Debt  
**Hook:** Fine at 10, useless at 2 — too many role switches.  
**Ritual:** Context ledger + batch low-cog work into one 30-min block.  
**Widget/CTA:** Two-tray / mobile vs laptop framing.  
**Link from:** `context-switching-founder-parent`

### 3. `one-more-thing-before-bed` — Jun 17
**Title:** Why "One More Thing" Before Bed Ruins Tomorrow  
**Hook:** 9 PM "quick check" → midnight replay loop.  
**Ritual:** Hard stop + tomorrow's gate on paper (Evening Reset step 3).  
**Widget/CTA:** `finished_enough_toggle` (same as 7 PM post).  
**Link from:** `brain-quits-at-7pm`, `stop-second-guessing`

### 4. `small-decisions-after-4pm` — Jun 24
**Title:** Why Small Decisions Feel Impossible After 4 PM  
**Hook:** "What's for dinner" level decisions break you.  
**Ritual:** Decision budget — no new choices after 4; pre-decide defaults.  
**Widget/CTA:** Decision logger / parser widget.  
**Link from:** `founders-fog-decision-clarity`

### 5. `pickup-line-productivity-trap` — Jul 1
**Title:** The Pickup Line Productivity Trap  
**Hook:** 12 minutes feels too short to "count."  
**Ritual:** Mobile-tier task list (3 items max, completable on phone).  
**Widget/CTA:** Stolen-moments / mobile tray.  
**Link from:** `context-switching-founder-parent`

### 6. `slack-at-10pm-compulsive-fixing` — Jul 8
**Title:** The Founder Who Can't Stop at 10 PM (Even When They Want To)  
**Hook:** Body on couch, brain still fixing.  
**Ritual:** Compulsive-fixing interrupt — name it, park it, close the loop on paper.  
**Widget/CTA:** Evening reflection / shutdown ritual.  
**Link from:** `founder-burnout-warning-signs` (Sign #5)

### 7. `monday-morning-dread` — Jul 15
**Title:** Monday Morning Dread Is Not a Motivation Problem  
**Hook:** Sunday was fine; Monday inbox feels like an attack.  
**Ritual:** Monday anchor (one win) + parking lot for everything else.  
**Widget/CTA:** Needle mover / weekly bridge.  
**Link from:** `sunday-night-reset`

### 8. `three-minute-parent-founder-switch` — Jul 22
**Title:** The 3-Minute Switch From Parent to Founder  
**Hook:** Kid leaves the room; you still can't focus for 20 minutes.  
**Ritual:** Transition script — physical cue, one sentence intention, timer.  
**Widget/CTA:** Morning/transition tag in Mrs. Deer.  
**Link from:** `context-switching-founder-parent`, `sunday-night-reset`

---

## Friday optimization checklist (existing posts)

Use on the listed post each week (~30 min):

- [ ] Inline widget + bottom `BlogCTA` (match `brain-quits-at-7pm` pattern)
- [ ] **Related Reading** link to the Tuesday new post + one cluster neighbor
- [ ] One pull-quote sized for social (LinkedIn / newsletter)
- [ ] Confirm `description` + FAQ block for SEO

---

## Cluster map (internal linking)

```
brain-quits-at-7pm (anchor — most traffic)
├── founder-burnout-warning-signs (30-day proof)
├── one-more-thing-before-bed
├── stop-second-guessing (2 AM cousin)
└── sunday-night-reset (weekly)

morning-brain-cant-pick
├── monday-morning-dread
└── founders-fog-decision-clarity

context-switching-founder-parent
├── two-pm-slump-context-debt
├── pickup-line-productivity-trap
└── three-minute-parent-founder-switch
```

---

## After week 8

Measure in Acquisition / Vercel analytics:

- Top landing pages (which time-of-day hook wins)
- Blog → signup conversion by post
- Double down on the top 2 hooks; write part 2 only for winners
