export interface UserProfileForExamples {
  primary_goal_text?: string | null
  struggles?: string[] | null
  founder_stage?: string | null
  industry?: string | null
  founder_personality?: string | null
  destress_activity?: string | null
  hobbies?: string[] | null
  message_to_mrs_deer?: string | null
}

export function generateExamplesForUser(userProfile: UserProfileForExamples): string[] {
  console.log('🔥 [DEBUG] Full profile:', JSON.stringify(userProfile, null, 2))
  console.log('🔥 [DEBUG] goal:', userProfile.primary_goal_text)
  console.log('🔥 [DEBUG] struggles:', userProfile.struggles)
  console.log('🔥 [DEBUG] story:', userProfile.message_to_mrs_deer)
  console.log('🔥 [DEBUG] personality:', userProfile.founder_personality)
  console.log('🔥 [DEBUG] decompress:', userProfile.destress_activity)

  const examples: string[] = []

  const goalRaw = userProfile.primary_goal_text || ''
  const goal = goalRaw.toLowerCase()
  const story = (userProfile.message_to_mrs_deer || '').toLowerCase()
  const personality = (userProfile.founder_personality || '').toLowerCase()
  const decompress = (userProfile.destress_activity || '').toLowerCase()
  const hobbies = Array.isArray(userProfile.hobbies) ? userProfile.hobbies : []

  const struggles = Array.isArray(userProfile.struggles) ? userProfile.struggles : []
  const stage = userProfile.founder_stage

  // Amy-like profile: productivity + motivation
  const hasProductivityGoal =
    goal.includes('productive') || goal.includes('productivity') || goal.includes('focus')
  const hasMotivationStruggle = struggles.includes('motivation')

  if (hasProductivityGoal && hasMotivationStruggle) {
    console.log('🔍 [Profile Examples] Matched: productivity + motivation')
    examples.push(
      'What would give you energy today?',
      'Which project to prioritize — course or photoshoot?',
      'One thing you can say no to',
    )
  }

  if (hasMotivationStruggle && !examples.length) {
    console.log('🔍 [Profile Examples] Matched: motivation struggle')
    examples.push(
      'What would give you energy today?',
      'One tiny action that would feel like progress',
    )
  }

  // Money / security themes from goal or story
  if (goal.includes('debt') || goal.includes('million') || story.includes('debt') || story.includes('lose it all')) {
    console.log('🔍 [Profile Examples] Matched: money/security theme')
    examples.push(
      'One decision that moves you closer to financial security',
      'What would make you feel safer about money this week?',
    )
  }

  // Parenting / balance themes
  if (story.includes('son') || struggles.some((s) => s.toLowerCase().includes('balance'))) {
    console.log('🔍 [Profile Examples] Matched: parenting/balance theme')
    examples.push(
      'How to protect time with your son today',
      'What boundary would protect both your work and your family?',
    )
  }

  // Visionary / strategist / builder personalities
  if (personality.includes('visionary') || personality.includes('strategist')) {
    console.log('🔍 [Profile Examples] Matched: visionary/strategist personality')
    examples.push(
      'One decision that would simplify your strategy',
      'Whether to build or hire next',
    )
  }
  if (personality.includes('builder') || personality.includes('hustler')) {
    console.log('🔍 [Profile Examples] Matched: builder/hustler personality')
    examples.push(
      'Which founder role to lead with today',
      'What is the most leverage you can create in the next 2 hours?',
    )
  }

  // Decompress / recharge hints
  if (decompress || hobbies.length > 0) {
    console.log('🔍 [Profile Examples] Matched: decompress/hobbies present')
    examples.push(
      'What would actually recharge you tonight?',
    )
  }

  if (stage === 'idea') {
    examples.push(
      'Whether to validate your idea this week',
      'Which idea to prototype first',
    )
  } else if (stage === 'growth') {
    examples.push(
      'Which growth channel to focus on this month',
      'Whether to double down on what is already working',
    )
  } else if (stage === 'scale') {
    examples.push(
      'Who to hire next',
      'What to delegate so you can stay in your zone',
    )
  }

  if (!examples.length && hasProductivityGoal) {
    console.log('🔍 [Profile Examples] Matched: productivity-only fallback')
    examples.push(
      'Which project to prioritize today',
      "What you’re willing to say no to",
    )
  }

  // Fallback defaults if nothing personalized applied
  if (!examples.length) {
    console.log('🔍 [Profile Examples] Using generic fallback examples')
    examples.push(
      "Said no to something that didn't align",
      'Chose pricing for a new offer',
      'Decided to delegate a task',
    )
  }

  // De-duplicate while preserving order and cap at 5
  const seen = new Set<string>()
  const unique: string[] = []
  for (const ex of examples) {
    if (!seen.has(ex)) {
      seen.add(ex)
      unique.push(ex)
    }
    if (unique.length >= 5) break
  }

  return unique
}

export function getPersonalizedDecisionExample(userProfile: {
  primary_goal_text?: string
  struggles?: string[]
  founder_stage?: string
}): string {
  if (userProfile.struggles?.includes('motivation')) {
    return 'What would give you energy today?'
  }
  if (userProfile.founder_stage === 'idea') {
    return 'Whether to validate your idea this week'
  }
  if (userProfile.primary_goal_text?.toLowerCase().includes('productive')) {
    return 'Which project to prioritize today'
  }
  return "Said no to something that didn't align"
}

