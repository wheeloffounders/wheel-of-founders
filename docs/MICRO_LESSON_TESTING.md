# Micro-Lesson System – Testing Checklist

Use this checklist to verify the micro-lesson system behaves correctly across situations and UI.

---

## Situation detection

- [ ] **New user first morning** – New user (no morning tasks, no evening reviews) sees `new-user-first-morning` on first visit to `/morning`.
- [ ] **New user first evening** – New user sees `new-user-first-evening` on first visit to `/evening`.
- [ ] **Morning done, evening pending** – User who did morning today but has not done evening sees `morning-done-evening-pending` on `/evening` (message includes task count).
- [ ] **Evening done, morning pending** – User who did evening yesterday but not morning today sees `evening-done-morning-pending` on `/morning`.
- [ ] **Full loop completed first time** – User who just completed first ever morning + evening for the same day sees `full-loop-completed-first-time` on `/evening`.
- [ ] **Missed yesterday** – User who did morning yesterday but no evening yesterday sees `missed-yesterday` on `/morning`.
- [ ] **Missed multiple days** – User who hasn’t logged in for 3+ days sees `missed-multiple-days` (message includes `{{days}}`).
- [ ] **Consistent 3 days** – User with 3-day evening streak sees `consistent-3-days`.
- [ ] **Consistent 7 days** – User with 7-day evening streak sees `consistent-7-days` (message includes personalized insight).
- [ ] **Low task completion** – User with &lt;50% of yesterday’s tasks completed sees `low-task-completion` (message includes `{{completionRate}}`).
- [ ] **High task completion** – User with &gt;80% of yesterday’s tasks completed sees `high-task-completion`.
- [ ] **Struggling with specific task** – User with same action_plan repeatedly incomplete sees `struggling-with-specific-task` (message includes task type and count).
- [ ] **Decision without reflection** – User with recent decisions but no matching evening reviews sees `decision-without-reflection`.
- [ ] **Reflection without decision** – User with evening reviews but no matching morning plans sees `reflection-without-decision`.
- [ ] **Power user** – User with 14+ day streak or 14+ evening reviews sees `power-user`.
- [ ] **At-risk churn** – User who had early engagement then 5+ days gap sees `at-risk-churn`.

---

## UI and behavior

- [ ] **Dismiss** – Dismiss button hides the lesson for the rest of the view.
- [ ] **Dismiss persists** – After dismissing, refresh the page; lesson stays hidden for that calendar day (localStorage by date).
- [ ] **Tokens** – Messages show real numbers (e.g. `{{taskCount}}`, `{{completionRate}}`, `{{days}}`, `{{taskType}}`, `{{count}}`) instead of raw placeholders.
- [ ] **Impressions** – Each time a lesson is shown, a row is written to `micro_lesson_impressions` (situation, lesson_message, viewed_at).
- [ ] **Action links** – Action buttons (e.g. “Set reminder”, “Evening reflection”) go to the correct routes and are tappable.
- [ ] **Action tracking** – Clicking an action link sends `action_taken: true` for the latest impression (POST `/api/micro-lesson`).
- [ ] **Completed evening** – Saving an evening review updates the latest impression with `completed_evening: true`.

---

## Responsiveness

- [ ] **Mobile** – Text wraps; dismiss and action are easy to tap; no horizontal overflow.
- [ ] **Desktop** – Layout and spacing look correct; coral left border and navy-tinted background visible.

---

## Notes

- Detection runs server-side in GET `/api/micro-lesson?page=morning|evening`.
- When multiple situations apply, the one with the **lowest priority number** is shown.
- Dismiss key format: `micro_lesson_dismissed_{page}_{dateString}` (e.g. `micro_lesson_dismissed_morning_Wed Mar 05 2026`).
