#!/usr/bin/env node
/**
 * Quick test for tone detection
 * Run: node scripts/test-tone-detection.js
 */

function detectTone(userData) {
  const toStr = (v) => {
    if (v == null) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.filter(Boolean).map(String).join(' ')
    return String(v)
  }
  const text = [
    userData.focus || '',
    userData.purposeCheck || '',
    ...(userData.tasks?.map((t) => t.description || '') || []),
    userData.notes || '',
    toStr(userData.wins),
    toStr(userData.lessons),
    toStr(userData.journal),
    userData.decision || '',
    toStr(userData.why_this_decision),
  ]
    .join(' ')
    .toLowerCase()

  const signals = {
    burdened: ['stuck', 'heavy', 'overwhelm', 'so much', 'behind', "can't", 'too much', 'drowning'],
    calm: ['space', 'easy', 'simple', 'clear', 'peace', 'settled', 'steady', 'breathe'],
    curious: ['what if', 'imagine', 'wonder', 'maybe', 'could', 'explore', 'thinking about', 'curious'],
    excited: ['excited', 'looking forward', "can't wait", 'amazing', 'love', 'thrilled', 'awesome'],
    tired: ['tired', 'exhausted', 'drained', 'sleep', 'rest', 'low energy', 'fatigue'],
  }

  const scores = { burdened: 0, calm: 0, curious: 0, excited: 0, tired: 0 }

  Object.entries(signals).forEach(([tone, words]) => {
    words.forEach((word) => {
      if (text.includes(word)) scores[tone] += 1
    })
  })

  const dominant = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
  const keywords = Object.values(signals).flatMap((words) => words.filter((w) => text.includes(w)))

  return {
    energy: scores[dominant] > 0 ? dominant : 'neutral',
    keywords,
  }
}

const testCases = [
  { focus: 'So much to do, behind on everything' }, // burdened
  { focus: 'Nice to have space today' }, // calm
  { focus: 'What if I tried something new?' }, // curious
  { focus: 'So excited for today!' }, // excited
  { focus: 'So tired, need rest' }, // tired
  { focus: 'Ship the feature and review docs' }, // neutral
  {
    wins: 'Finished the proposal',
    lessons: 'I was so exhausted by 3pm',
  }, // tired from lessons
  {
    tasks: [{ description: 'Explore new marketing channels' }],
    decision: 'Gut says yes but risk feels heavy',
  }, // curious + burdened (both match - burdened has "heavy")
]

console.log('Tone detection test:\n')
testCases.forEach((test) => {
  const tone = detectTone(test)
  const input = test.focus || JSON.stringify(test).slice(0, 60) + '...'
  console.log(`  "${input}"`)
  console.log(`  → energy: ${tone.energy}, keywords: [${tone.keywords.join(', ') || 'none'}]\n`)
})
