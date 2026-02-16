/**
 * User Language Personalization
 * Adapts terminology and messaging based on user's primary goal
 */

export type UserGoal = 
  | 'find_purpose'
  | 'build_significance'
  | 'reduce_overwhelm'
  | 'break_through_stuck'
  | 'improve_focus'
  | 'build_systems'
  | 'general_clarity'
  | 'stay_motivated'
  | 'find_calm'

export interface UserLanguage {
  // Task classification
  needleMover: string
  needleMoverQuestion: string
  needleMoverTooltip: string
  
  // Task planning
  powerList: string
  taskLabel: string
  priorityLabel: string
  
  // Decision making
  decisionLog: string
  strategicLabel: string
  tacticalLabel: string
  
  // Action plans
  actionPlanLabel: string
  myZoneLabel: string
  systemizeLabel: string
  delegateLabel: string
  eliminateLabel: string
  quickWinLabel: string
  
  // General messaging
  morningGreeting: string
  eveningTitle: string
  dashboardTitle: string
}

const LANGUAGE_MAP: Record<UserGoal, UserLanguage> = {
  find_purpose: {
    needleMover: 'Purpose Mover',
    needleMoverQuestion: 'Will this help you find clarity on what matters?',
    needleMoverTooltip: 'Does this task connect to your deeper purpose or help you discover what truly matters?',
    powerList: 'Purpose List',
    taskLabel: 'What matters most today?',
    priorityLabel: 'Why does this matter to you?',
    decisionLog: 'Purpose Check',
    strategicLabel: 'Purpose-aligned',
    tacticalLabel: 'Day-to-day',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Purpose',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Let Go',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What matters most to you today?',
    eveningTitle: "Today's Journey: What You Discovered",
    dashboardTitle: 'Your Purpose Journey',
  },
  
  build_significance: {
    needleMover: 'Milestone Mover',
    needleMoverQuestion: 'Will this build toward something meaningful?',
    needleMoverTooltip: 'Does this task move you toward building a meaningful business that leaves a mark?',
    powerList: 'Milestone List',
    taskLabel: 'What milestone will you move toward today?',
    priorityLabel: 'Why does this milestone matter?',
    decisionLog: 'Impact Check',
    strategicLabel: 'Impact-building',
    tacticalLabel: 'Day-to-day',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Milestone',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Let Go',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What milestone will you build toward today?',
    eveningTitle: "Today's Journey: Milestones You Built",
    dashboardTitle: 'Your Significance Journey',
  },
  
  reduce_overwhelm: {
    needleMover: 'Focus Priority',
    needleMoverQuestion: 'Is this truly essential, or can it wait?',
    needleMoverTooltip: 'Will focusing on this reduce your overwhelm, or add to it?',
    powerList: 'Focus List',
    taskLabel: 'What deserves your attention today?',
    priorityLabel: 'Why can\'t this wait?',
    decisionLog: 'Decision Filter',
    strategicLabel: 'Important',
    tacticalLabel: 'Urgent',
    actionPlanLabel: 'How will you handle this?',
    myZoneLabel: 'My Focus',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Eliminate',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. Let\'s focus on what truly matters.',
    eveningTitle: "Today's Journey: What You Focused On",
    dashboardTitle: 'Your Focus Journey',
  },
  
  break_through_stuck: {
    needleMover: 'Breakthrough Task',
    needleMoverQuestion: 'Will this move you forward or keep you stuck?',
    needleMoverTooltip: 'Does this task create momentum, or maintain the status quo?',
    powerList: 'Breakthrough List',
    taskLabel: 'What will move you forward today?',
    priorityLabel: 'Why will this create momentum?',
    decisionLog: 'Momentum Check',
    strategicLabel: 'Forward-moving',
    tacticalLabel: 'Maintenance',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Breakthrough',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Eliminate',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What will break you through today?',
    eveningTitle: "Today's Journey: What Moved You Forward",
    dashboardTitle: 'Your Breakthrough Journey',
  },
  
  improve_focus: {
    needleMover: 'Focus Task',
    needleMoverQuestion: 'Does this deserve your full attention?',
    needleMoverTooltip: 'Will focusing on this create meaningful progress?',
    powerList: 'Focus List',
    taskLabel: 'What deserves your attention today?',
    priorityLabel: 'Why does this need focus?',
    decisionLog: 'Focus Filter',
    strategicLabel: 'Focus-worthy',
    tacticalLabel: 'Distraction',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Focus',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Eliminate',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What deserves your focus today?',
    eveningTitle: "Today's Journey: What You Focused On",
    dashboardTitle: 'Your Focus Journey',
  },
  
  build_systems: {
    needleMover: 'System Builder',
    needleMoverQuestion: 'Will this build a system or just add more work?',
    needleMoverTooltip: 'Does this task create a repeatable system, or just more manual work?',
    powerList: 'System Builder List',
    taskLabel: 'What system will you build today?',
    priorityLabel: 'Why does this system matter?',
    decisionLog: 'System Check',
    strategicLabel: 'System-building',
    tacticalLabel: 'One-off',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My System',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Eliminate',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What system will you build today?',
    eveningTitle: "Today's Journey: Systems You Built",
    dashboardTitle: 'Your System Building Journey',
  },
  
  general_clarity: {
    needleMover: 'Needle Mover',
    needleMoverQuestion: 'Will this change your trajectory?',
    needleMoverTooltip: 'Will this change your trajectory? Or maintain status quo?',
    powerList: 'Power List',
    taskLabel: 'What\'s the ONE thing that would make today a win?',
    priorityLabel: 'Connect it to your vision — why does this matter to you?',
    decisionLog: 'Decision Log',
    strategicLabel: 'Strategic',
    tacticalLabel: 'Tactical',
    actionPlanLabel: 'How will you approach this as a founder?',
    myZoneLabel: 'My Zone',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Eliminate',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning, Founder',
    eveningTitle: "Today's Journey: What You Accomplished",
    dashboardTitle: 'Good morning, Founder',
  },
  
  stay_motivated: {
    needleMover: 'Commitment Task',
    needleMoverQuestion: 'Will this help you stay consistent?',
    needleMoverTooltip: 'Does this task help you build momentum and stay accountable?',
    powerList: 'Commitment List',
    taskLabel: 'What will you commit to doing today?',
    priorityLabel: 'Why does this commitment matter to you?',
    decisionLog: 'Accountability Check',
    strategicLabel: 'Long-term commitment',
    tacticalLabel: 'Daily action',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Commitment',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Let Go',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What will you commit to today?',
    eveningTitle: "Today's Journey: What You Committed To",
    dashboardTitle: 'Your Commitment Journey',
  },
  
  find_calm: {
    needleMover: 'Anchor Task',
    needleMoverQuestion: 'Will this help you feel settled?',
    needleMoverTooltip: 'Does this task help you feel grounded and at peace?',
    powerList: 'Anchor List',
    taskLabel: 'What will anchor you today?',
    priorityLabel: 'Why does this bring you peace?',
    decisionLog: 'Peace Check',
    strategicLabel: 'Grounding',
    tacticalLabel: 'Restorative',
    actionPlanLabel: 'How will you approach this?',
    myZoneLabel: 'My Anchor',
    systemizeLabel: 'Systemize',
    delegateLabel: 'Delegate',
    eliminateLabel: 'Let Go',
    quickWinLabel: 'Quick Win',
    morningGreeting: 'Good morning. What will anchor you today?',
    eveningTitle: "Today's Journey: What Anchored You",
    dashboardTitle: 'Your Calm Journey',
  },
}

/**
 * Get personalized language for a user based on their primary goal
 * Falls back to 'general_clarity' if goal is not set or invalid
 */
export function getUserLanguage(primaryGoal: UserGoal | null | undefined): UserLanguage {
  if (!primaryGoal || !(primaryGoal in LANGUAGE_MAP)) {
    return LANGUAGE_MAP.general_clarity
  }
  return LANGUAGE_MAP[primaryGoal]
}

/**
 * Get user's primary goal from database
 */
export async function getUserGoal(userId: string): Promise<UserGoal | null> {
  const { supabase } = await import('./supabase')
  const { data } = await supabase
    .from('user_profiles')
    .select('primary_goal')
    .eq('id', userId)
    .maybeSingle()
  
  return (data?.primary_goal as UserGoal) || null
}

/**
 * Save user's goals to database
 */
export async function saveUserGoals(
  userId: string,
  primaryGoal: UserGoal,
  secondaryGoals?: string[]
): Promise<void> {
  const { supabase } = await import('./supabase')
  await supabase
    .from('user_profiles')
    .update({
      primary_goal: primaryGoal,
      secondary_goals: secondaryGoals || [],
      questionnaire_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)
}

/**
 * Get personalized action plan options based on user goal
 */
export function getActionPlanOptions(userGoal: UserGoal | null): Array<{
  value: string
  label: string
  emoji: string
  description: string
}> {
  const lang = getUserLanguage(userGoal)
  
  return [
    { 
      value: 'my_zone', 
      label: lang.myZoneLabel, 
      emoji: '🎯', 
      description: 'Only I should do this - core strengths/strategy' 
    },
    { 
      value: 'systemize', 
      label: lang.systemizeLabel, 
      emoji: '⚙️', 
      description: 'Create process/template or automate this' 
    },
    { 
      value: 'delegate_founder', 
      label: lang.delegateLabel, 
      emoji: '👥', 
      description: 'Assign to team member or VA' 
    },
    { 
      value: 'eliminate_founder', 
      label: lang.eliminateLabel, 
      emoji: '🗑️', 
      description: 'A nice-to-have or could forget about it' 
    },
    { 
      value: 'quick_win_founder', 
      label: lang.quickWinLabel, 
      emoji: '⚡', 
      description: 'I can knock this out fast (do immediately)' 
    },
  ]
}
