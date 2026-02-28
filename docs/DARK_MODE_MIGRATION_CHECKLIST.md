# Dark Mode Migration Checklist

- [x] CSS variables defined in globals.css
- [x] Migration docs created (CLASS_MIGRATION.md)
- [ ] No `text-gray-*` classes remain (in progress)
- [ ] No `bg-white` classes remain (use `bg-card`)
- [ ] No `border-gray-*` classes remain (use `border-primary` / `border-secondary`)
- [x] Dark mode toggle works everywhere
- [ ] All text readable in both modes

## Pages
- [x] Dashboard (app/page.tsx)
- [x] Morning (app/morning/page.tsx)
- [ ] Evening (app/evening/page.tsx) - uses Card/design tokens
- [x] Emergency (app/emergency/page.tsx)
- [x] History/Journey (app/history/page.tsx)
- [x] Settings (app/settings/page.tsx)
- [x] Weekly insights (app/weekly/page.tsx)
- [x] Monthly insights (app/monthly-insight/page.tsx)
- [x] Quarterly insights (app/quarterly/page.tsx)
- [x] Settings/notifications, Settings/timezone
- [x] Admin page

## Components migrated
- [x] InfoTooltip, MonthlyTrends, TransformationPairs, MonthlyWisdom
- [x] StreakCelebrationModal, OnboardingWizard
- [x] MrsDeerFeedbackPrompt, MrsDeerAdaptivePrompt
- [x] NotificationPrompt, AICoachPrompt, FloatingBugButton
- [x] CelebrationHeader, WinSelector, WinReflection, ExpandableData
- [x] TrajectoryStats, DefiningMoments, TrajectoryWisdom
- [x] MonthlyPreview, MonthlyIntention, QuarterlyPreview, QuarterlyIntention
- [x] SkeletonLoader, CelebrationModal, DecisionExplanationModal
- [x] SpeechToTextInput, FeedbackPopUp

## Remaining (lower priority)
- Navigation, MobileSidebar (white text on navy - intentional)
- Login, profile, subscription-disabled (auth/billing flows)
- Admin analytics, experiments (admin-only)
- VideoTemplates, HistoryAccessGate, UserGoalQuestionnaire
