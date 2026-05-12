/**
 * Single registry for blog → interactive widget → auth reassurance → morning handoff.
 *
 * To add a funnel:
 * 1. Extend `InteractiveFunnelId` with a new slug (kebab or snake_case, stable in URLs).
 * 2. Add an entry to `BLOG_INTERACTIVE_FUNNELS` with copy, placeholders, and `handoffContext`
 *    (the `?context=` value the rest of the app already understands).
 * 3. In MDX: `<InteractiveTemplate context="your_slug" />` (optional `placeholders` override).
 *
 * `widgetType` drives UI: `list` (three lines), `roadmap_vote` (cards), `reframer` (guilt mirror),
 * `diagnostic` (burnout scan), `narrative_audit` (multi-step Mrs. Deer), `stress_tester` (delegation),
 * `continuity_mapper` (legacy / values), `gap_analyzer` (fulfillment / Success Paradox),
 * `loop_builder` (discipline / habit loop), `distiller` (needle-mover sifting),
 * `decision_logger` (Virtual Co-Founder / decision clarity bench),
 * `alignment_check` (mission drift / purpose filter),
 * `meaning_mapper` (success hangover / meaning experiment lab),
 * `bridge_engineer` (vision → daily brick / vision bridge), etc.
 */

export type MorningHandoffContext =
  | 'eos'
  | 'energy'
  | 'decision'
  | 'delegation'
  | 'values'
  | 'momentum'
  /** Blog shutdown / presence handoffs (Finished Enough toggle). */
  | 'boundaries'

/** Aligns with the three-tier matrix: momentum, offload cognitive load, protect boundaries, legacy / purpose. */
export type BlogFunnelFamily =
  | 'momentum_builder'
  | 'cognitive_offloader'
  | 'boundary_protector'
  | 'legacy_builder'

export type InteractiveWidgetType =
  | 'list'
  /** Future: Battery draining vs charging buckets */
  | 'triage'
  /** Future: label the single revenue / growth mover */
  | 'leverage'
  /** Future: my plate / spouse plate / automate */
  | 'delegation'
  /** Single-select roadmap cards (e.g. product co-design vote). */
  | 'roadmap_vote'
  /** Two-step guilt → reframe reflection (safe release valve). */
  | 'reframer'
  /** Symptom-weighted burnout archetype scan (live diagnostic). */
  | 'diagnostic'
  /** Multi-step Mrs. Deer narrative (energy / early-warning scan). */
  | 'narrative_audit'
  /** Delegation limb-vs-baby stress test (Minimum Viable Handoff triage). */
  | 'stress_tester'
  /** Legacy / succession continuity (values → systems over heroes). */
  | 'continuity_mapper'
  /** Scoreboard vs. internal battery (Success Paradox / Hollow Winner). */
  | 'gap_analyzer'
  /** Trigger → tiny habit → celebration (discipline loop designer). */
  | 'loop_builder'
  /** Brain dump → primary needle-mover → momentum vs maintenance triage. */
  | 'distiller'
  /** Topic → two paths → reasoning + review date (decision clarity bench). */
  | 'decision_logger'
  /** Shiny object → persona fit → talent signal (mission alignment filter). */
  | 'alignment_check'
  /** Hollow win → evolving values → meaning experiment (success hangover). */
  | 'meaning_mapper'
  /** Big vision → translating task → smallest daily brick (vision-to-execution). */
  | 'bridge_engineer'
  /** Three-step shutdown: itch → presence vs profit → minimum “finished enough”. */
  | 'shutdown_ritual'

export type InteractiveFunnelId =
  | 'eos'
  | 'energy'
  | 'decision'
  | 'solo_founder_burnout'
  | 'inbox_zero_trap'
  | 'partnering_spouse'
  | 'sunday_reset'
  | 'context_switch'
  | 'post_trip'
  | 'product_co_design'
  | 'founder_guilt_audit'
  | 'burnout_diagnostic'
  | 'burnout_whisperer'
  | 'delegation_stress_test'
  | 'legacy_continuity_mapper'
  | 'fulfillment_gap_analyzer'
  | 'discipline_loop_designer'
  | 'needle_mover_distiller'
  | 'decision_clarity_bench'
  | 'mission_drift_filter'
  | 'success_hangover_lab'
  | 'vision_bridge_builder'
  | 'finished_enough_toggle'

/** Celebration cue for discipline loop builder. */
export type DisciplineCelebrationId = 'stretch' | 'shoulder_drop' | 'breath'

/** Heavy-day pattern for fulfillment gap analyzer. */
export type FulfillmentHeavyFactor = 'small_decisions' | 'maintenance_firefighting' | 'seven_pm_crash'

/** Dependence tier for legacy continuity mapper widget. */
export type LegacyContinuityDependence = 'crumble' | 'stable_gap' | 'thrive'

/** Burnout diagnostic archetypes (maps article: Firefighter / Hollow Winner / Architect). */
export type BurnoutArchetypeId = 'firefighter' | 'winner' | 'architect'

export type DiagnosticSymptom = {
  id: string
  label: string
  /** Each selected symptom adds one vote to this archetype. */
  archetype: BurnoutArchetypeId
}

export type DiagnosticArchetypeProfile = {
  displayName: string
  shortLabel: string
  /** CSS color for ring segment */
  ringColor: string
  /** One-line first move shown in widget blueprint */
  firstRecoveryMove: string
  /** Mrs. Deer line on Morning Canvas after hydrate */
  morningNudge: string
}

/** Options for `widgetType: 'roadmap_vote'` (Amy-style persona cards). */
export type RoadmapVoteOption = {
  id: string
  personaTitle: string
  personaDescription: string
  /** Short product promise for the primary CTA, e.g. “Evening Catch-up”. */
  featureName: string
  /** Mrs. Deer line shown immediately after the card is selected. */
  selectionFeedback: string
  /** Morning canvas nudge after signup + hydrate. */
  morningCanvasNudge: string
  /** First Needle Mover seed line when the plan hydrates. */
  seedTaskLine: string
}

/** Pattern library for `widgetType: 'reframer'` (keyword match → compassionate reframe). */
export type ReframerPattern = {
  id: string
  patternLabel: string
  keywords: string[]
  reframePrompt: string
}

export type BlogInteractiveFunnelConfig = {
  id: InteractiveFunnelId
  family: BlogFunnelFamily
  widgetType: InteractiveWidgetType
  /** Passed as `?context=` so morning + warm auth reuse existing hooks. */
  handoffContext: MorningHandoffContext
  microPlannerLabel: string
  title: string
  subtitle: string
  placeholders: [string, string, string]
  strategicSummary: string
  /** Shown on auth pages when `?funnel=` matches `id`. */
  signupReassurance: string
  /** Notes for future morning canvas behavior (documentation only for now). */
  morningDestinationNote?: string
  /** When set, overrides generic context nudge on the Morning Canvas (blog funnel continuity). */
  morningNudge?: string
  /** Overrides generic “draft plan” toast after `pending_plan` hydrate when `microPlannerLabel` is still “Micro-Planner”. */
  pendingHydrateToastPhrase?: string
  /** When `widgetType` is `roadmap_vote`, drives card UI + handoff payloads. */
  roadmapVoteOptions?: RoadmapVoteOption[]
  /** When `widgetType` is `reframer`, drives guilt→belief mirror + reframes. */
  reframerPatterns?: ReframerPattern[]
  /** Labels for the two reflection fields (defaults used if omitted). */
  reframerLabels?: { guilt: string; belief: string }
  /** Full toast line after hydrate (bypasses `pendingHydrateToastPhrase` wrapper). */
  pendingHydrateToastFull?: string
  /** Symptom pills for `widgetType: 'diagnostic`. */
  diagnosticSymptoms?: DiagnosticSymptom[]
  /** Archetype copy keyed by `BurnoutArchetypeId`. */
  diagnosticArchetypes?: Record<BurnoutArchetypeId, DiagnosticArchetypeProfile>
}

export const BLOG_INTERACTIVE_FUNNELS: Record<InteractiveFunnelId, BlogInteractiveFunnelConfig> = {
  eos: {
    id: 'eos',
    family: 'momentum_builder',
    widgetType: 'list',
    handoffContext: 'eos',
    microPlannerLabel: 'Micro-Planner',
    title: 'Sketch your three Needle Movers',
    subtitle: 'Start here. Mrs. Deer will carry this into your morning plan after signup.',
    placeholders: [
      'Review Level 10 agenda and top blockers',
      'Finalize this week’s Rocks owner + due dates',
      'Clear in-tray to zero before noon',
    ],
    strategicSummary:
      "You've just mapped your top Rocks for the day. Mrs. Deer will hold these in the Founder's Vault for you.",
    signupReassurance:
      'Mrs. Deer keeps my weekly rhythm visible so I stop firefighting and actually move the Rocks.',
    morningDestinationNote: 'Needle Movers pre-filled from Rocks-oriented slots.',
    pendingHydrateToastPhrase: 'EOS plan',
  },
  energy: {
    id: 'energy',
    family: 'boundary_protector',
    widgetType: 'list',
    handoffContext: 'energy',
    microPlannerLabel: 'Micro-Planner',
    title: 'Sketch your three Needle Movers',
    subtitle: 'Start here. Mrs. Deer will carry this into your morning plan after signup.',
    placeholders: [
      'Schedule deep work during my peak battery window',
      'Delegate one energy-draining task today',
      'Set a hard offline time for tonight',
    ],
    strategicSummary: 'These moves align with your peak battery. Ready to protect this window?',
    signupReassurance:
      "I used to work until midnight. Mrs. Deer helped me draw a hard line so I actually get to be present for bedtime.",
    morningDestinationNote: 'Opens with energy-mapped tasks to protect the calendar.',
    pendingHydrateToastPhrase: 'energy plan',
  },
  decision: {
    id: 'decision',
    family: 'cognitive_offloader',
    widgetType: 'list',
    handoffContext: 'decision',
    microPlannerLabel: 'Micro-Planner',
    title: 'Sketch your three Needle Movers',
    subtitle: 'Start here. Mrs. Deer will carry this into your morning plan after signup.',
    placeholders: [
      'Name the one one-way door decision today',
      'Write the friction point draining mental energy',
      'Move one non-essential into the parking lot',
    ],
    strategicSummary:
      "You've turned mental fog into clear direction. Mrs. Deer can now help you hold the line on execution.",
    signupReassurance:
      'Naming the one-way door and parking the noise finally stopped the 2 AM spin cycle for me.',
    morningDestinationNote: 'Highest-clarity / closure task emphasized at top when leverage mode ships.',
    pendingHydrateToastPhrase: 'decision plan',
  },
  solo_founder_burnout: {
    id: 'solo_founder_burnout',
    family: 'boundary_protector',
    widgetType: 'triage',
    handoffContext: 'energy',
    microPlannerLabel: 'Energy map (draft)',
    title: 'Name one drain, one charge, and a boundary',
    subtitle:
      'You are drafting an energy map, not a generic to-do list. Mrs. Deer will carry this into your morning plan after signup.',
    placeholders: [
      'Task or commitment that will drain my battery tomorrow',
      'One move that actually recharges me (even 20 minutes)',
      'Hard boundary I am drawing—time, scope, or people',
    ],
    strategicSummary:
      'You have separated drain, recharge, and boundary—Mrs. Deer will help you guard that line on the canvas.',
    signupReassurance:
      'I used to work until midnight. Mrs. Deer helped me draw a hard line so I actually get to be present for bedtime.',
    morningDestinationNote: 'Pre-fill with energy-mapped tasks; future UI: explicit drain vs charge columns.',
    morningNudge:
      'Your energy map from the article is here. Protect your battery—honor the recharge you named and hold that boundary before the day runs away with both.',
  },
  inbox_zero_trap: {
    id: 'inbox_zero_trap',
    family: 'cognitive_offloader',
    widgetType: 'leverage',
    handoffContext: 'eos',
    microPlannerLabel: 'Leverage filter (draft)',
    title: 'Separate motion from leverage',
    subtitle:
      'Three honest lines: what feels productive, what actually moves revenue or growth, and what you will protect.',
    placeholders: [
      'Easy admin or inbox task I grab first when I am avoiding the hard thing',
      'The one revenue or growth needle mover I owe myself tomorrow',
      'What I will batch, defer, or drop so the needle mover wins',
    ],
    strategicSummary:
      'You have named the trap, the mover, and the protection—Mrs. Deer will keep leverage at the top tomorrow.',
    signupReassurance:
      'It stopped me from doing easy admin tasks first. I now tackle my biggest needle mover during naptime.',
    morningDestinationNote: 'Future: force-pick one labeled leverage slot; for now handoff uses EOS-style Rocks focus.',
    morningNudge:
      "Let's tackle your leverage needle mover before the inbox opens—don't let fake-work email steal the first win.",
  },
  partnering_spouse: {
    id: 'partnering_spouse',
    family: 'momentum_builder',
    widgetType: 'delegation',
    handoffContext: 'eos',
    microPlannerLabel: 'Delegation parser (draft)',
    title: 'Split tomorrow’s plates before the day argues for you',
    subtitle:
      'Clarify what stays with you, what belongs with your spouse, and what leaves both plates entirely.',
    placeholders: [
      'Stays on my plate tomorrow (non-negotiable owner: me)',
      'Belongs on my spouse’s plate (they own the outcome)',
      'Automate, drop, or park so it stops stealing evening peace',
    ],
    strategicSummary:
      'Ownership is visible before breakfast—Mrs. Deer can mirror this split in your shared daily run.',
    signupReassurance:
      'We stopped having late-night logistics arguments. We sync via Mrs. Deer and know who is doing what.',
    morningDestinationNote: 'Future: paired labels; for now tasks land as a clear split list on the canvas.',
    morningNudge:
      'You split the plates in the article—keep ownership this clear on the canvas so tonight stays peaceful.',
  },
  sunday_reset: {
    id: 'sunday_reset',
    family: 'boundary_protector',
    widgetType: 'triage',
    handoffContext: 'decision',
    microPlannerLabel: 'Sunday reset (draft)',
    title: 'From brain dump to Monday intention',
    subtitle:
      'Dump what is swirling, name what you are parking on purpose, and lock the one win that makes tomorrow feel doable.',
    placeholders: [
      'Themes on my mind rolling into the week (worries, loose ends, open loops)',
      'What I am intentionally parking until later this week',
      'The one thing that would make Monday feel like a win',
    ],
    strategicSummary:
      'You turned noise into one clear intention—Mrs. Deer will carry that Monday win onto your canvas.',
    signupReassurance: 'I used to dread Monday mornings. Now I start with total clarity.',
    morningDestinationNote: 'Future: brain-dump → single intent picker; handoff uses decision context today.',
    morningNudge:
      "Sunday resets are about clearing space. You've already done the hard work of deciding; now go enjoy your evening.",
  },
  context_switch: {
    id: 'context_switch',
    family: 'cognitive_offloader',
    widgetType: 'delegation',
    handoffContext: 'energy',
    microPlannerLabel: 'Context audit (draft)',
    title: 'Split laptop deep work from mobile-friendly tasks',
    subtitle:
      "Sort your load into 'Laptop Deep Work' and 'Mobile Stolen Moments' so you always know what to grab next.",
    placeholders: [
      'Deep work / laptop task I am protecting first (real focus)',
      'Admin, DMs, or networking I can do on mobile in small gaps',
      'Kid-schedule anchor or transition I am planning around today',
    ],
    strategicSummary:
      'Laptop versus pocket is visible—Mrs. Deer will help you match tasks to the windows you actually get.',
    signupReassurance:
      'Mrs. Deer helps me maximize those small 20-minute naptime windows.',
    morningDestinationNote: 'Future: two-column triage UI; handoff uses energy context today.',
    morningNudge:
      "I've tagged your mobile-friendly tasks for today. You can knock those out whenever you're away from the desk.",
  },
  post_trip: {
    id: 'post_trip',
    family: 'momentum_builder',
    widgetType: 'leverage',
    handoffContext: 'eos',
    microPlannerLabel: 'Re-entry matrix (draft)',
    title: 'Triage re-entry after being away',
    subtitle:
      'Separate fires from backlog noise—then pick one needle mover before the easiest busywork wins.',
    placeholders: [
      'Urgent fire or must-handle re-entry item',
      'Loud backlog item that can actually wait',
      'Long-term project touch I will protect after the fire is out',
    ],
    strategicSummary:
      'You named the fire, the wait, and the longer arc—Mrs. Deer will help you lead with impact, not panic.',
    signupReassurance:
      'The best way to handle a backlog is one needle mover at a time.',
    morningDestinationNote: 'Future: urgent vs long-term matrix; handoff uses EOS-style Rocks focus today.',
    morningNudge:
      "Re-entry is hard. Let's focus on one high-impact fire first, then we'll find your rhythm again.",
  },
  product_co_design: {
    id: 'product_co_design',
    family: 'momentum_builder',
    widgetType: 'roadmap_vote',
    handoffContext: 'decision',
    microPlannerLabel: 'Roadmap vote (draft)',
    title: 'Where is the friction today?',
    subtitle:
      'Pick the pattern that hits home. Mrs. Deer will prioritize the right tool in your morning plan to help you break the loop.',
    placeholders: ['', '', ''],
    strategicSummary:
      'The system should bend to you—select the profile that fits and we will start with the feature built for that moment.',
    signupReassurance:
      'I sent one honest late-night message and the roadmap moved. That is co-design—not a ticket into the void.',
    morningDestinationNote: 'Roadmap vote hydrates a seeded Needle Mover + contextual nudge.',
    morningNudge:
      'Your friction pick is here—the loop works when the product meets you where you actually are.',
    pendingHydrateToastPhrase: 'roadmap vote',
    roadmapVoteOptions: [
      {
        id: 'forgetful_founder',
        personaTitle: 'The Overwhelmed Re-entry',
        personaDescription: 'I miss my evening reflections and feel behind.',
        featureName: 'Evening Catch-up',
        selectionFeedback:
          'Evening Catch-up exists so you can close the right day—even after midnight—without carrying shame into tomorrow.',
        morningCanvasNudge:
          'Re-entry feels heavy—start by closing yesterday’s reflection with Evening Catch-up before you stack new intent.',
        seedTaskLine:
          'Tonight: use Evening Catch-up to finish the reflection you missed—right date, no shame.',
      },
      {
        id: 'overthinker',
        personaTitle: 'The Decision Loop',
        personaDescription: "I'm stuck second-guessing my next move.",
        featureName: 'Smart Decision Log',
        selectionFeedback:
          'Smart Decision Log pulls starter prompts from your real tasks so you are not staring at an empty box.',
        morningCanvasNudge:
          'Second-guessing is loud—open Smart Decision Log, pick one suggested prompt, and ship the decision in one sentence.',
        seedTaskLine:
          'Today: Smart Decision Log—pick one suggested prompt and decide out loud in one sentence.',
      },
      {
        id: 'pattern_seeker',
        personaTitle: 'The Stalled Momentum',
        personaDescription: 'I keep postponing the same high-impact task.',
        featureName: 'Postponement Patterns',
        selectionFeedback:
          'When the same needle mover slides, Mrs. Deer asks what would make starting lighter—before you reschedule again.',
        morningCanvasNudge:
          'Same task, new day—when it slips again, answer the lighter-start prompt honestly before you bump the date.',
        seedTaskLine:
          'Today: first time this task moves—pause and answer what would make starting 10% lighter.',
      },
    ],
  },
  founder_guilt_audit: {
    id: 'founder_guilt_audit',
    family: 'boundary_protector',
    widgetType: 'reframer',
    handoffContext: 'energy',
    microPlannerLabel: 'Guilt Audit',
    title: 'The Guilt Audit',
    subtitle:
      'Vague guilt is heavy. Specific guilt is workable. Give your guilt a name so we can reframe it.',
    placeholders: ['', '', ''],
    strategicSummary:
      'Nothing here is graded—only witnessed. Small honesty trains your nervous system toward recovery.',
    signupReassurance:
      "Join founders learning that self-worth isn't earned by exhaustion. Your recovery is a shared strategy, not a burden.",
    morningDestinationNote: 'Hydrates gentle Needle Movers + energy context; pattern id stored for future personalization.',
    morningNudge:
      "Check-in: Is that 'Timeline Tyranny' or 'Financial Anxiety' talking today? Let's protect your energy first.",
    pendingHydrateToastFull:
      "Mrs. Deer loaded your Guilt Audit. Let's make today feel a little lighter.",
    reframerLabels: {
      guilt: 'I feel guilty when…',
      belief: 'Because I believe…',
    },
    reframerPatterns: [
      {
        id: 'earned_rest_disbeliever',
        patternLabel: 'The Earned Rest Disbeliever',
        keywords: [
          'deserve',
          'earned',
          'suffer',
          'struggle',
          'lazy',
          'ease',
          'rest',
          'enough pain',
          'should be struggling',
        ],
        reframePrompt:
          "Ease isn't cheating—it's how your body rebuilds. What if recovery didn't require suffering as proof?",
      },
      {
        id: 'comparative_sufferer',
        patternLabel: 'The Comparative Sufferer',
        keywords: ['worse', 'at least', 'valid', 'comparing', 'someone else', 'not bad enough', 'others'],
        reframePrompt:
          'Pain is not a competition. What if your burnout were allowed to matter without a referee?',
      },
      {
        id: 'timeline_enforcer',
        patternLabel: 'The Timeline Enforcer',
        keywords: [
          'timeline',
          'months',
          'schedule',
          'behind',
          'planned',
          'should be over',
          'by now',
          'three months',
          'recover on',
        ],
        reframePrompt:
          'Healing rarely ships on a Gantt chart. What if the timeline were compassion, not a deadline?',
      },
      {
        id: 'burden_believer',
        patternLabel: 'The Burden Believer',
        keywords: [
          'burden',
          'partner',
          'sorry',
          'inconvenience',
          'dependent',
          'support',
          'self-sufficient',
          'financial',
          'money',
          'income',
          'earn',
        ],
        reframePrompt:
          "That sounds like partnership under strain—not failure. What if accepting support now enabled your next chapter?",
      },
      {
        id: 'default',
        patternLabel: 'Your guilt signal',
        keywords: [],
        reframePrompt:
          'Naming this already softens its grip. What if recovery could be nonlinear—and still honorable?',
      },
    ],
  },
  burnout_diagnostic: {
    id: 'burnout_diagnostic',
    family: 'boundary_protector',
    widgetType: 'diagnostic',
    handoffContext: 'energy',
    microPlannerLabel: 'Burnout scan',
    title: 'Founder Burnout Scan',
    subtitle:
      'Tap the symptoms that hit home. We will identify the pattern and your first recovery move.',
    placeholders: ['', '', ''],
    strategicSummary:
      'Burnout is data—when your symptoms cluster, recovery stops being generic rest and starts matching your real mismatch.',
    signupReassurance:
      'Generic rest will not fix a systemic mismatch. Join founders using data to recover strategically.',
    morningDestinationNote: 'Stores diagnosisId + symptom ids for morning personalization.',
    morningNudge:
      'Your burnout scan from the article is here—let recovery match the pattern, not the platitude.',
    pendingHydrateToastPhrase: 'Founder Burnout Scan',
    diagnosticArchetypes: {
      firefighter: {
        displayName: 'Reactive Firefighter',
        shortLabel: 'Firefighter',
        ringColor: '#ef725c',
        firstRecoveryMove:
          'Book one Laptop Shield block tomorrow morning before you open Slack—proactive air beats another fire drill.',
        morningNudge:
          'Your scan leaned Firefighter—protect one proactive block today before reactive pings eat the day.',
      },
      winner: {
        displayName: 'Hollow Winner',
        shortLabel: 'Winner',
        ringColor: '#c9a227',
        firstRecoveryMove:
          'Write one sentence: what success would still feel meaningful six months from now—then star one task that moves that, not the scoreboard.',
        morningNudge:
          'Your scan leaned Hollow Winner—pick one needle mover today that reconnects to meaning, not metrics.',
      },
      architect: {
        displayName: 'Frustrated Architect',
        shortLabel: 'Architect',
        ringColor: '#4a6fa5',
        firstRecoveryMove:
          'List three recurring tasks that do not require your judgment—pick one to delegate or delete this week.',
        morningNudge:
          "I've flagged your Architect bottlenecks for today. Let's focus on one task that only you can do.",
      },
    },
    diagnosticSymptoms: [
      { id: 'ff_inbox_mornings', label: 'Inbox-driven mornings', archetype: 'firefighter' },
      { id: 'ff_always_on_tension', label: "Physical 'Always-On' tension", archetype: 'firefighter' },
      { id: 'ff_kids_down', label: "Can't unplug after the kids are down", archetype: 'firefighter' },
      { id: 'hw_numb_win', label: 'Numbness when I hit a win', archetype: 'winner' },
      { id: 'hw_achieving_hollow', label: 'Achieving feels hollow', archetype: 'winner' },
      { id: 'hw_sunday', label: 'Sunday dread with no clear cause', archetype: 'winner' },
      { id: 'arch_maintenance', label: 'Trapped in maintenance mode', archetype: 'architect' },
      { id: 'arch_solo_loops', label: 'Decision fatigue from solo-loops', archetype: 'architect' },
      { id: 'arch_bottleneck', label: "I'm the bottleneck for everything", archetype: 'architect' },
    ],
  },
  burnout_whisperer: {
    id: 'burnout_whisperer',
    family: 'cognitive_offloader',
    widgetType: 'narrative_audit',
    handoffContext: 'decision',
    microPlannerLabel: 'Early warning scan',
    title: 'The Early Warning Scan',
    subtitle:
      "Let's look at the data your brain is too tired to process. Mrs. Deer will help you name the whispers.",
    placeholders: ['', '', ''],
    strategicSummary:
      'Nothing here is graded—only witnessed. Small honesty trains your nervous system toward recovery before the crash.',
    signupReassurance:
      'You already did the hard part: you listened. Mrs. Deer will carry these signals into a plan that protects your battery—not another generic checklist.',
    morningDestinationNote: 'Stores audit_results (switch flip, decision weight, maintenance) for morning copy.',
    morningNudge:
      'Your early warning scan from the article is here—let us anchor one protective ritual before the whispers get loud.',
    pendingHydrateToastFull:
      "Mrs. Deer has your energy scan. Let's build a plan that protects your battery.",
  },
  delegation_stress_test: {
    id: 'delegation_stress_test',
    family: 'momentum_builder',
    widgetType: 'stress_tester',
    handoffContext: 'delegation',
    microPlannerLabel: 'Handoff stress-test',
    title: 'The Handoff Stress-Test',
    subtitle: 'Is it your "Baby" or just a "Limb"? Let us look at the real risk of letting go.',
    placeholders: ['', '', ''],
    strategicSummary:
      'Naming the worst case drains the drama from it. Mrs. Deer will carry this triage into your next plan so execution matches reality—not anxiety.',
    signupReassurance:
      'Leadership is a muscle, not a personality trait. Join founders building a trust-based operating system.',
    morningDestinationNote: 'Stores stress_test payload for limb checklist + time-reclaim nudge.',
    morningNudge:
      'Your handoff stress-test from the article is here—let us turn one limb into a clean Done Checklist.',
    pendingHydrateToastFull: 'Mrs. Deer saved your delegation mirror. Let us protect the growth work behind it.',
  },
  legacy_continuity_mapper: {
    id: 'legacy_continuity_mapper',
    family: 'boundary_protector',
    widgetType: 'continuity_mapper',
    handoffContext: 'values',
    microPlannerLabel: 'Legacy continuity',
    title: 'The Legacy Continuity Map',
    subtitle: 'Let us move from "The Business Survives" to "The Impact Continues."',
    placeholders: ['', '', ''],
    strategicSummary:
      'Legacy is designed, not discovered in a panic. Mrs. Deer will carry this map into your morning so Tuesday work can serve a ten-year through-line.',
    signupReassurance:
      'You are not done—you are designing what outlasts you. Join founders who treat legacy as an operating system, not a someday speech.',
    morningDestinationNote: 'Stores continuity_map (remembered value, dependence, succession sliders).',
    morningNudge:
      "Let's build one thing today that outlasts your presence—your continuity map from the article is here.",
    pendingHydrateToastFull: 'Mrs. Deer saved your legacy continuity map. Let us weave it into today’s plan.',
  },
  fulfillment_gap_analyzer: {
    id: 'fulfillment_gap_analyzer',
    family: 'cognitive_offloader',
    widgetType: 'gap_analyzer',
    handoffContext: 'energy',
    microPlannerLabel: 'Fulfillment gap',
    title: 'The Fulfillment Gap Analyzer',
    subtitle: 'Let us map the distance between your business metrics and your mental energy.',
    placeholders: ['', '', ''],
    strategicSummary:
      'A high scoreboard with a low battery is data—not ingratitude. Mrs. Deer will carry this paradox map into your plan so today serves meaning, not just metrics.',
    signupReassurance:
      'You are not broken for succeeding and still feeling empty. Join founders who treat that mismatch as something we can engineer—not something you have to hide.',
    morningDestinationNote: 'Stores fulfillment_gap (external/internal scores + heavy factor).',
    morningNudge:
      "I see the Hollow Win pattern in your data. Today, we focus on one task that serves your meaning—not just the scoreboard.",
    pendingHydrateToastFull: 'Mrs. Deer saved your fulfillment gap map. Let us close one loop before tonight.',
  },
  discipline_loop_designer: {
    id: 'discipline_loop_designer',
    family: 'momentum_builder',
    widgetType: 'loop_builder',
    handoffContext: 'momentum',
    microPlannerLabel: 'Discipline loop',
    title: 'The Discipline Loop Designer',
    subtitle: 'Do not wait for motivation. Let us design a loop that makes showing up inevitable.',
    placeholders: ['', '', ''],
    strategicSummary:
      'Patterns beat pep talks. Mrs. Deer will hold this trigger-habit-celebration loop on your Morning Canvas so streaks compound before the work scales.',
    signupReassurance:
      'You are not lazy—you are under-designed. Join founders who let Mrs. Deer track the streak while they protect the tiny habit.',
    morningDestinationNote: 'Stores discipline_loop (trigger, tiny_habit, celebration).',
    morningNudge:
      "I've locked in your tiny habit from the article. When your trigger fires today, hit one small win—I'll handle the streak prompt tomorrow.",
    pendingHydrateToastFull: 'Mrs. Deer saved your discipline loop. Let us run it once today.',
  },
  needle_mover_distiller: {
    id: 'needle_mover_distiller',
    family: 'momentum_builder',
    widgetType: 'distiller',
    handoffContext: 'momentum',
    microPlannerLabel: 'Needle-Mover distiller',
    title: 'The Needle-Mover Distiller',
    subtitle: 'Turn your chaotic "Unlimited List" into 3 high-impact moves.',
    placeholders: ['', '', ''],
    strategicSummary:
      'You just ran a high-speed triage—Mrs. Deer will carry your Smart Constraint onto the Morning Canvas so momentum wins before reactive expansion does.',
    signupReassurance:
      'I used to confuse motion with momentum. Mrs. Deer forces three honest lines so the needle mover wins before the inbox opens.',
    morningDestinationNote:
      'Stores distilled_tasks (primary_needle_mover, momentum_tasks, maintenance_tasks) for Smart Constraint continuity.',
    morningNudge:
      "I've saved your distilled priorities from yesterday. Ready to ignore the 'Reactive Expansion' and protect your 3 Needle-Movers?",
    pendingHydrateToastFull: 'Mrs. Deer saved your distilled needle-movers. Lead with your primary on the canvas.',
  },
  decision_clarity_bench: {
    id: 'decision_clarity_bench',
    family: 'cognitive_offloader',
    widgetType: 'decision_logger',
    handoffContext: 'energy',
    microPlannerLabel: 'Decision clarity bench',
    title: 'The Virtual Co-Founder',
    subtitle: "Stop overthinking. Let's document this choice and close the loop.",
    placeholders: ['', '', ''],
    strategicSummary:
      'You externalized a fork—Mrs. Deer will hold this Decision Receipt on your Morning Canvas so your brain can drop the what-if weight.',
    signupReassurance:
      'I used to replay the same decision until 2 AM. Mrs. Deer gave me one place to park the reasoning—and permission to execute.',
    morningDestinationNote:
      'Stores decision_log (decisionTopic, chosenPath, reasoning, reviewDate, optionA, optionB).',
    morningNudge:
      'You used the Decision Clarity Bench from the article—externalize the next fork before 2 AM spins it up again.',
    pendingHydrateToastFull: 'Mrs. Deer saved your Decision Receipt. Your call is documented—now protect deep work.',
  },
  mission_drift_filter: {
    id: 'mission_drift_filter',
    family: 'legacy_builder',
    widgetType: 'alignment_check',
    handoffContext: 'values',
    microPlannerLabel: 'Mission alignment filter',
    title: 'The Mission Alignment Filter',
    subtitle: 'Is this a "Needle-Mover" or just a "Shiny Object"? Let\'s run the filter.',
    placeholders: ['', '', ''],
    strategicSummary:
      'You stress-tested one opportunity against your mission—Mrs. Deer logs this as Purpose Protection so your Morning Canvas stays anchored to who you serve.',
    signupReassurance:
      'I almost chased every shiny launch. Mrs. Deer forces one honest filter so my roadmap still serves the person I started for.',
    morningDestinationNote:
      'Stores mission_check (opportunity, corePersona, sarahTest, talentSlider, alignmentScore).',
    morningNudge:
      'You ran the Mission Alignment Filter from the article—keep one move today that serves your core persona, not the loudest new idea.',
    pendingHydrateToastFull: 'Mrs. Deer saved your integrity report. Mission first—then the inbox.',
  },
  success_hangover_lab: {
    id: 'success_hangover_lab',
    family: 'legacy_builder',
    widgetType: 'meaning_mapper',
    handoffContext: 'values',
    microPlannerLabel: 'Meaning experiment lab',
    title: 'The Meaning Experiment Lab',
    subtitle: "Success is the platform. Now, let's find the purpose.",
    placeholders: ['', '', ''],
    strategicSummary:
      'You mapped a hollow win into values and one experiment—Mrs. Deer saves your Post-Success Compass so the Morning Canvas can protect significance, not just the scoreboard.',
    signupReassurance:
      'I hit the milestone and felt nothing. Mrs. Deer gave me permission to treat that as data—and one small experiment to find what still feels alive.',
    morningDestinationNote: 'Stores meaning_lab (achievement, evolvingValues, experiment).',
    morningNudge:
      'You ran the Meaning Experiment Lab from the article—protect ten minutes today for significance, not just metrics.',
    pendingHydrateToastFull: 'Mrs. Deer saved your Post-Success Compass. The scoreboard can wait—meaning gets a block.',
  },
  vision_bridge_builder: {
    id: 'vision_bridge_builder',
    family: 'momentum_builder',
    widgetType: 'bridge_engineer',
    handoffContext: 'momentum',
    microPlannerLabel: 'Vision bridge builder',
    title: 'The Vision Bridge Builder',
    subtitle: "Connect your 5-year castle to today's daily brick.",
    placeholders: ['', '', ''],
    strategicSummary:
      'You named the castle, the carrying task, and one honest brick—Mrs. Deer saves your Strategic Alignment Card so the Morning Canvas opens on the bridge, not the chasm.',
    signupReassurance:
      'I used to grind all day and still feel miles from my vision. Mrs. Deer forces one visible link between the five-year story and the next hour.',
    morningDestinationNote: 'Stores vision_bridge (bigVision, currentTask, dailyBrick).',
    morningNudge:
      'You built a vision bridge in the article—lead with your daily brick before the inbox widens the chasm again.',
    pendingHydrateToastFull: 'Mrs. Deer saved your Strategic Alignment Card. Castle first—then the grind.',
  },
  finished_enough_toggle: {
    id: 'finished_enough_toggle',
    family: 'boundary_protector',
    widgetType: 'shutdown_ritual',
    handoffContext: 'boundaries',
    microPlannerLabel: "The 'Finished Enough' Toggle",
    title: "The 'Finished Enough' Toggle",
    subtitle: 'Define the line so you can close the laptop and mean it.',
    placeholders: ['', '', ''],
    strategicSummary:
      'You named the itch, calibrated presence vs profit, and drew a minimum finish line—Mrs. Deer saves your Presence Permit so tonight can be 100% off-screen.',
    signupReassurance:
      'I used to polish until midnight. Mrs. Deer helps me name one honest “finished enough” so I can close the laptop and mean it.',
    morningDestinationNote: 'Stores shutdown_logic (workItch, calibration, finishedEnough, presenceFor).',
    morningNudge:
      "Yesterday you defined 'Finished Enough' as [Task]. You hit it. Today, let's find that same line so you can be 100% present for [Life/Family] tonight.",
    pendingHydrateToastFull:
      'Mrs. Deer logged your Presence Permit. The minimum line is saved—close the laptop when that brick is laid.',
  },
}

/** Pick strongest keyword match; ties prefer first declared pattern. Falls back to `default`. */
export function matchReframerPattern(
  text: string,
  patterns: ReframerPattern[] | undefined
): ReframerPattern | undefined {
  if (!patterns?.length) return undefined
  const t = text.toLowerCase()
  const defaultPat = patterns.find((p) => p.id === 'default')
  let best: ReframerPattern | undefined
  let bestScore = 0
  for (const p of patterns) {
    if (p.id === 'default') continue
    const score = p.keywords.reduce((n, kw) => (t.includes(kw.toLowerCase()) ? n + 1 : n), 0)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  if (bestScore > 0 && best) return best
  return defaultPat ?? patterns[patterns.length - 1]
}

export function getBlogInteractiveFunnel(id: string): BlogInteractiveFunnelConfig | undefined {
  const key = id.trim() as InteractiveFunnelId
  return BLOG_INTERACTIVE_FUNNELS[key]
}

export function getRoadmapVoteOption(
  funnelId: string,
  optionId: string
): RoadmapVoteOption | undefined {
  const cfg = getBlogInteractiveFunnel(funnelId)
  const id = optionId.trim()
  return cfg?.roadmapVoteOptions?.find((o) => o.id === id)
}

/** Morning Mrs. Deer line after a roadmap card was chosen on the blog widget. */
export function getRoadmapVoteMorningNudge(funnelId: string, optionId: string): string | null {
  return getRoadmapVoteOption(funnelId, optionId)?.morningCanvasNudge ?? null
}

/** Morning line after burnout diagnostic (`diagnosisId` = firefighter | winner | architect). */
export function getBurnoutDiagnosticMorningNudge(
  funnelId: string,
  diagnosisId: string
): string | null {
  const cfg = getBlogInteractiveFunnel(funnelId)
  const key = diagnosisId.trim() as BurnoutArchetypeId
  return cfg?.diagnosticArchetypes?.[key]?.morningNudge ?? null
}

/** Morning line after narrative early-warning scan (`switchFlipLabel` e.g. `6:30 PM`). */
export function getBurnoutWhispererMorningNudge(
  funnelId: string,
  switchFlipLabel: string | undefined
): string | null {
  if (funnelId !== 'burnout_whisperer') return null
  const t = typeof switchFlipLabel === 'string' ? switchFlipLabel.trim() : ''
  if (!t) return null
  return `I've set up your ${t} protective ritual—start with Laptop Shield before Slack tomorrow.`
}

export type DelegationStressWorstCase = 'baby_fail' | 'limb_client' | 'limb_typo'

/** Morning line after legacy continuity mapper (`rememberedValue` = core impact sentence). */
/** Morning line after discipline loop designer hydrates. */
/** Morning line after needle-mover distiller hydrates (`primary` = primary needle-mover text). */
export function getNeedleMoverDistillerMorningNudge(
  funnelId: string,
  primary: string | undefined
): string | null {
  if (funnelId !== 'needle_mover_distiller') return null
  const raw = typeof primary === 'string' ? primary.trim() : ''
  if (!raw) return null
  const short = raw.length > 72 ? `${raw.slice(0, 69)}…` : raw
  return `You identified "${short}" as your primary needle-mover. Let's start there before the reactive expansion hits.`
}

function formatDecisionReviewDateLabel(iso: string | undefined): string {
  const raw = typeof iso === 'string' ? iso.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'the date you set'
  const [y, m, d] = raw.split('-').map((x) => Number(x))
  if (!y || !m || !d) return 'the date you set'
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
      new Date(y, m - 1, d)
    )
  } catch {
    return raw
  }
}

/** Morning line after decision clarity bench hydrates (`decision_log` from pending_plan). */
export function getDecisionClarityBenchMorningNudge(
  funnelId: string,
  log: {
    decisionTopic?: string
    reviewDate?: string
  } | null | undefined
): string | null {
  if (funnelId !== 'decision_clarity_bench' || !log) return null
  const topic = typeof log.decisionTopic === 'string' ? log.decisionTopic.trim() : ''
  if (!topic) return null
  const shortTopic = topic.length > 56 ? `${topic.slice(0, 53)}…` : topic
  const reviewLabel = formatDecisionReviewDateLabel(log.reviewDate)
  return `You logged a decision about "${shortTopic}" yesterday. Your reasoning is safe. Focus on execution today; we'll review the outcome on ${reviewLabel}. Your mental space is reclaimed for deep work.`
}

export type MissionCheckHandoff = {
  opportunity?: string
  corePersona?: string
  sarahTest?: string
  talentSlider?: number
  alignmentScore?: number
}

/** Morning line after mission drift filter hydrates (`mission_check` from pending_plan). */
export function getMissionDriftFilterMorningNudge(
  funnelId: string,
  check: MissionCheckHandoff | null | undefined
): string | null {
  if (funnelId !== 'mission_drift_filter' || !check) return null
  const opp = typeof check.opportunity === 'string' ? check.opportunity.trim() : ''
  const persona = typeof check.corePersona === 'string' ? check.corePersona.trim() : ''
  if (!opp || !persona) return null
  const shortOpp = opp.length > 48 ? `${opp.slice(0, 45)}…` : opp
  const shortPersona = persona.length > 44 ? `${persona.slice(0, 41)}…` : persona
  const score =
    typeof check.alignmentScore === 'number' && Number.isFinite(check.alignmentScore)
      ? Math.round(check.alignmentScore)
      : null
  const test = typeof check.sarahTest === 'string' ? check.sarahTest.trim().toLowerCase() : ''
  const drifty = test === 'no' || (score !== null && score < 52)
  if (drifty) {
    return `You protected your mission yesterday by saying "no" to ${shortOpp}. Today, let's double down on work that serves ${shortPersona}.`
  }
  return `You stress-tested ${shortOpp} against ${shortPersona} yesterday. Today, ship one move that keeps that promise—everything else is noise.`
}

/** Mission Shield badge line on Morning Canvas after mission drift filter hydrates. */
export function getMissionShieldBadgeLine(persona: string | undefined): string | null {
  const raw = typeof persona === 'string' ? persona.trim() : ''
  if (!raw) return null
  const short = raw.length > 88 ? `${raw.slice(0, 85)}…` : raw
  return `Today is about ${short}. Everything else is noise.`
}

export type MeaningLabHandoff = {
  achievement?: string
  evolvingValues?: string[]
  experiment?: string
}

/** Morning line after success hangover / meaning lab hydrates (`meaning_lab` from pending_plan). */
export function getSuccessHangoverLabMorningNudge(
  funnelId: string,
  lab: MeaningLabHandoff | null | undefined
): string | null {
  if (funnelId !== 'success_hangover_lab' || !lab) return null
  const exp = typeof lab.experiment === 'string' ? lab.experiment.trim() : ''
  if (!exp) return null
  const shortExp = exp.length > 56 ? `${exp.slice(0, 53)}…` : exp
  return `You identified "${shortExp}" as a potential source of significance. The scoreboard is safe—today, spend 10 minutes moving that needle, regardless of the revenue scoreboard. Let's see how it feels.`
}

export type VisionBridgeHandoff = {
  bigVision?: string
  currentTask?: string
  dailyBrick?: string
}

export type ShutdownLogicHandoff = {
  workItch?: string
  /** `revenue` = could move revenue tomorrow; `presence` = polish / presence wins. */
  calibration?: 'revenue' | 'presence' | string
  finishedEnough?: string
  presenceFor?: string
}

/** Morning line after vision bridge builder hydrates (`vision_bridge` from pending_plan). */
export function getVisionBridgeMorningNudge(
  funnelId: string,
  bridge: VisionBridgeHandoff | null | undefined
): string | null {
  if (funnelId !== 'vision_bridge_builder' || !bridge) return null
  const vision = typeof bridge.bigVision === 'string' ? bridge.bigVision.trim() : ''
  const brick = typeof bridge.dailyBrick === 'string' ? bridge.dailyBrick.trim() : ''
  if (!vision || !brick) return null
  const shortV = vision.length > 52 ? `${vision.slice(0, 49)}…` : vision
  const shortB = brick.length > 56 ? `${brick.slice(0, 53)}…` : brick
  return `Your vision for "${shortV}" needs its daily brick today. Start with "${shortB}". You identified that brick as core to the castle—lay it before reactive expansion hits.`
}

/** Morning line after Finished Enough / shutdown ritual hydrates (`shutdown_logic` from pending_plan). */
export function getFinishedEnoughMorningNudge(
  funnelId: string,
  logic: ShutdownLogicHandoff | null | undefined
): string | null {
  if (funnelId !== 'finished_enough_toggle' || !logic) return null
  const min = typeof logic.finishedEnough === 'string' ? logic.finishedEnough.trim() : ''
  if (!min) return null
  const whoRaw = typeof logic.presenceFor === 'string' ? logic.presenceFor.trim() : ''
  const shortMin = min.length > 72 ? `${min.slice(0, 69)}…` : min
  const life =
    whoRaw.length > 0
      ? whoRaw.length > 44
        ? `${whoRaw.slice(0, 41)}…`
        : whoRaw
      : 'what matters off-screen'
  return `Yesterday you defined "Finished Enough" as ${shortMin}. You hit it. Today, let's find that same line so you can be 100% present for ${life} tonight.`
}

export function getDisciplineLoopMorningNudge(
  funnelId: string,
  loop: { trigger?: string; tiny_habit?: string } | null | undefined
): string | null {
  if (funnelId !== 'discipline_loop_designer' || !loop) return null
  const tr = typeof loop.trigger === 'string' ? loop.trigger.trim() : ''
  const hb = typeof loop.tiny_habit === 'string' ? loop.tiny_habit.trim() : ''
  const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s)
  if (tr && hb) {
    return `I've locked in your ${short(hb, 42)}. When ${short(tr, 42)} happens today, just focus on that one small win. I'll handle the streak tracking.`
  }
  if (tr) return `Your only job right now is the ${short(tr, 72)}. Ready?`
  return null
}

export function getFulfillmentGapMorningNudge(
  funnelId: string,
  externalScore: number | undefined,
  internalScore: number | undefined
): string | null {
  if (funnelId !== 'fulfillment_gap_analyzer') return null
  const ex = typeof externalScore === 'number' && Number.isFinite(externalScore) ? Math.round(externalScore) : null
  const inn =
    typeof internalScore === 'number' && Number.isFinite(internalScore) ? Math.round(internalScore) : null
  if (ex === null || inn === null) return null
  return `Your business is at a ${ex}, but let's get your battery back from a ${inn} today. I see the Hollow Win pattern in your data—pick one task that serves meaning, not just the scoreboard.`
}

export function getLegacyContinuityMorningNudge(
  funnelId: string,
  rememberedValue: string | undefined
): string | null {
  if (funnelId !== 'legacy_continuity_mapper') return null
  const raw = typeof rememberedValue === 'string' ? rememberedValue.trim() : ''
  if (!raw) return null
  const short = raw.length > 56 ? `${raw.slice(0, 53)}…` : raw
  return `Check-in: Which task today builds toward "${short}"? Let's make sure the Mortality Mirror doesn't rush your growth—and build one thing that outlasts your presence.`
}

export function getDelegationStressTestMorningNudge(
  funnelId: string,
  args: {
    task_name?: string
    saved_time_activity?: string
    worst_case?: string
  } | null
): string | null {
  if (funnelId !== 'delegation_stress_test' || !args) return null
  const task = typeof args.task_name === 'string' ? args.task_name.trim() : ''
  const act = typeof args.saved_time_activity === 'string' ? args.saved_time_activity.trim() : ''
  if (!task || !act) return null
  const shortTask = task.length > 42 ? `${task.slice(0, 39)}…` : task
  const shortAct = act.length > 36 ? `${act.slice(0, 33)}…` : act
  const isLimb = args.worst_case === 'limb_client' || args.worst_case === 'limb_typo'
  if (isLimb) {
    return `You flagged "${shortTask}" as a limb yesterday—ready to write the 3-point Done Checklist and protect time for "${shortAct}"?`
  }
  return `You felt "${shortTask}" might still be a baby-tier risk—let's find a smaller limb to hand off first, then channel energy toward "${shortAct}".`
}

export function getFunnelSignupReassurance(funnelId: string | null | undefined): string | null {
  if (!funnelId) return null
  return getBlogInteractiveFunnel(funnelId)?.signupReassurance ?? null
}

const DEFAULT_AUTH_SOCIAL_PROOF_BODY =
  '“Mrs. Deer is the first tool that actually understands the mom-founder brain fog. I save at least 30 minutes of decision fatigue every morning.” — Sarah K., EdTech Founder'

/**
 * Contextual reassurance when `funnel` or `context` matches the registry; otherwise the default testimonial.
 */
export function getAuthSocialProofBody(
  funnelParam: string | null | undefined,
  entryContextParam: string | null | undefined
): string {
  const reassurance =
    getFunnelSignupReassurance(funnelParam) ?? getFunnelSignupReassurance(entryContextParam)
  if (reassurance) return `“${reassurance}”`
  return DEFAULT_AUTH_SOCIAL_PROOF_BODY
}

export function appendFunnelQuery(href: string, funnelParam: string | null | undefined): string {
  if (!funnelParam) return href
  const join = href.includes('?') ? '&' : '?'
  return `${href}${join}funnel=${encodeURIComponent(funnelParam)}`
}

/** Success toast after hydrating `pending_plan` from the blog widget. */
export function getPendingPlanToastMessage(funnelId: string | null | undefined): string {
  const cfg = funnelId ? getBlogInteractiveFunnel(funnelId) : undefined
  const full = cfg?.pendingHydrateToastFull?.trim()
  if (full) return full
  const override = cfg?.pendingHydrateToastPhrase?.trim()
  if (override) {
    return `Mrs. Deer loaded your ${override} from the article.`
  }
  const raw = cfg?.microPlannerLabel?.replace(/\s*\(draft\)\s*$/i, '').trim() ?? ''
  if (!raw || raw === 'Micro-Planner') {
    return 'Mrs. Deer loaded your draft plan from the article.'
  }
  return `Mrs. Deer loaded your ${raw} from the article.`
}
