import type { UserSituation } from './types'

export const microLessonVariants: Record<UserSituation, string[]> = {
  'incomplete-onboarding': [
    'A few details help Mrs. Deer reflect your journey. Complete your profile so insights feel personal.',
    'Your profile is the lens Mrs. Deer uses. Add a few details so your guidance feels truly yours.',
    'A little profile context goes a long way. Fill it in so your reflections feel tailored, not generic.',
  ],
  'new-user-first-morning': [
    'Start here — plan your first day, get your aha moment in 2 mins',
    'Your first morning plan is the spark. Two minutes now can shape the whole day.',
    "Let's begin gently: one clear morning plan, one stronger day.",
  ],
  'new-user-first-evening': [
    'Start here — plan your first day, get your aha moment in 2 mins',
    'Your first loop starts with a morning plan. Set it now, reflect tonight.',
    'A strong evening starts with a clear morning. Plan your day first.',
  ],
  'morning-done-evening-pending': [
    "You've gathered {{taskCount}} tasks today. Tonight we'll see what they weave into.",
    '{{taskCount}} seeds planted. Evening reflection will show what\'s sprouting.',
    "Your morning set the stage. Tonight, let's see what the day revealed.",
    '{{taskCount}} intentions set. Ready to see what took root?',
  ],
  'evening-done-morning-pending': [
    "Yesterday you closed the loop. This morning: what three things deserve today's focus?",
    'Your evening reflection is done. Now, what one intention will guide today?',
    "Last night's insights are waiting. What's the first thing that deserves your attention?",
    'You reflected well last night. What\'s the one thing that wants your energy today?',
  ],
  'full-loop-completed-first-time': [
    'First full loop complete. This is where Mrs. Deer starts spotting your patterns.',
    'You closed your first full loop. This is where clarity begins to compound.',
    'First loop done. Mrs. Deer can now start tracing your real rhythm.',
  ],
  'first-full-loop-complete': [
    'First full loop complete. This is where Mrs. Deer starts spotting your patterns.',
    'You closed your first full loop. This is where clarity begins to compound.',
    'First loop done. Mrs. Deer can now start tracing your real rhythm.',
  ],
  'missed-yesterday': [
    "You planned yesterday but didn't reflect. Even a one-line evening note keeps the thread.",
    'Yesterday was half a loop. A short reflection tonight helps the learning stick.',
    'Missing one reflection is normal. A quick note tonight reconnects the thread.',
  ],
  'missed-multiple-days': [
    "It's been {{days}} days. No judgment—when you're ready, a one-minute recap is here.",
    '{{days}} days away is okay. Start small today and let momentum return.',
    "You've been away for {{days}} days. No catch-up needed—just one next step.",
  ],
  'consistent-3-days': [
    "Three days of morning and evening. That's not nothing—that's a practice taking root.",
    'Three full loops complete. This is where patterns start to whisper.',
    "You've shown up three days in a row. Mrs. Deer is beginning to notice your rhythm.",
  ],
  'consistent-7-days': [
    "Seven days of showing up. Here's what's compounding: {{personalizedInsight}}",
    'A full week. Your consistency is becoming a quiet superpower.',
    "7 days. Mrs. Deer is seeing the shape of your week—and it's beautiful.",
  ],
  'low-task-completion': [
    'You completed {{completionRate}}% of tasks yesterday. Even one task on a hard day builds momentum.',
    "{{completionRate}}% done. The task you finished? That's where the real work happened.",
    'Some days, one task is the whole win. Today might be that day.',
  ],
  'high-task-completion': [
    "{{completionRate}}% of yesterday's plan done. Tonight's reflection will show what that built.",
    'You moved through yesterday. What one insight will you carry forward?',
    "{{completionRate}}% complete. That's not luck—it's intention.",
  ],
  'struggling-with-specific-task': [
    "You've postponed {{taskType}} {{count}} times. What would make starting feel a little lighter?",
    '{{taskType}} keeps getting delayed. What is one tiny first move that lowers friction?',
    'Noticing a pattern in {{taskType}} is progress. What would make it easier to begin?',
  ],
  'repeated-task-postponement': [
    'You\'ve postponed "{{taskDescription}}" {{count}} times. What would make starting feel a little lighter?',
    '"{{taskDescription}}" keeps moving forward. What tiny version could you do today?',
    'That recurring task might be carrying hidden friction. What would make it simpler?',
  ],
  'high-weekly-postponements': [
    "You've moved {{count}} tasks to tomorrow this week. Are you taking on too much, or is energy low?",
    '{{count}} postponements this week suggests a pattern. What deserves a smaller scope?',
    'A lot got deferred this week. Which one task is worth protecting first?',
  ],
  'needle-mover-avoidance': [
    '{{percentage}}% of your postponed tasks are needle movers - your most important work. What if you scheduled them for your peak hours?',
    '{{percentage}}% of postponed work is high-impact. What would help you start earlier?',
    'Your biggest work is getting delayed most. Could one protected block change that?',
  ],
  'action-plan-block': [
    'You often postpone "{{actionPlan}}" tasks. What would make this type of work feel lighter?',
    '"{{actionPlan}}" tasks seem sticky lately. What is the smallest possible next step?',
    'That action-plan category keeps slowing down. What support or structure would help?',
  ],
  'decision-without-reflection': [
    "You're naming decisions. Tonight, five minutes of reflection turns them into learning.",
    'You are making choices quickly. A short evening reflection will turn them into wisdom.',
    'Decisions are happening. Reflection is what sharpens the next one.',
  ],
  'reflection-without-decision': [
    "You're reflecting—that's gold. Tomorrow morning, one clear decision will sharpen the next day.",
    'Your reflections are strong. Add one clear morning choice to convert insight into motion.',
    'Looking back is working. One forward decision tomorrow will complete the loop.',
  ],
  'power-user': [
    "You've made this a habit. Mrs. Deer is here when you need a nudge or a mirror.",
    'Your consistency is the quiet engine behind everything. Mrs. Deer sees it.',
    'This practice is now part of your rhythm. Mrs. Deer is honored to walk it with you.',
  ],
  'at-risk-churn': [
    "We noticed you stepped away. Whenever you're ready, your loop is here—no catch-up required.",
    'You can return without pressure. Start with one small step and let the rest follow.',
    'No guilt, no backlog. Just reopen your loop from where you are today.',
  ],
}

