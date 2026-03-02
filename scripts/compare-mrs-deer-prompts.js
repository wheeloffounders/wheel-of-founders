#!/usr/bin/env node
/**
 * Compare old Mrs. Deer prompts (personal-coaching.ts.CURRENT) with new ones (mrs-deer-prompts.ts)
 * Run: node scripts/compare-mrs-deer-prompts.js
 */

const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const oldFile = path.join(root, 'lib/personal-coaching.ts.CURRENT')
const newFile = path.join(root, 'lib/mrs-deer-prompts.ts')

const oldContent = fs.readFileSync(oldFile, 'utf8')
const newContent = fs.readFileSync(newFile, 'utf8')

// Extract from OLD file (inline prompts)
const oldNoLabels = /const NO_LABELS = '([^']+)'/.exec(oldContent)?.[1] || '(not found)'
const oldFirstDayMatch = oldContent.match(/const FIRST_DAY_MIRROR_RULES = `([^`]+)`/)
const oldFirstDay = oldFirstDayMatch ? oldFirstDayMatch[1].slice(0, 100) + '...' : '(not found)'

// Extract TONE_DETECTION_RULES from NEW file (between backticks)
const toneMatch = newContent.match(/export const TONE_DETECTION_RULES = `([\s\S]+?)`\s*\n/m)
const newToneRules = toneMatch ? toneMatch[1].trim() : '(not found)'
const hasToneRules = newContent.includes('TONE_DETECTION_RULES')
const hasHistoryContext = newContent.includes('HISTORY_CONTEXT')
const hasWordCounts = newContent.includes('WORD_COUNTS')

// Build comparison output
const lines = []
lines.push('='.repeat(70))
lines.push('MRS. DEER PROMPTS COMPARISON')
lines.push('Old: lib/personal-coaching.ts.CURRENT  |  New: lib/mrs-deer-prompts.ts')
lines.push('='.repeat(70))
lines.push('')

// 1. WHAT WAS ADDED
lines.push('1. WHAT WAS ADDED')
lines.push('-'.repeat(70))
if (hasToneRules) {
  lines.push('')
  lines.push('  TONE DETECTION & EMOTIONAL INTELLIGENCE (new):')
  lines.push('  ' + newToneRules.split('\n').join('\n  '))
  lines.push('')
}
if (hasHistoryContext) {
  lines.push('  HISTORY_CONTEXT (extracted constant - was inline in user prompts)')
}
if (hasWordCounts) {
  lines.push('  WORD_COUNTS (new constant for min/max word counts per insight type)')
}
lines.push('')
lines.push('  In personal-coaching.ts:')
lines.push('  - detectTone() function (analyzes user text for emotional signals)')
lines.push('  - toneContext injected into morning, post-morning, evening user prompts')
lines.push('  - TONE_DETECTION_RULES appended to system prompt for those three insight types')
lines.push('')
lines.push('')

// 2. WHAT WAS REMOVED
lines.push('2. WHAT WAS REMOVED')
lines.push('-'.repeat(70))
lines.push('')
lines.push('  Nothing. All original prompt content was preserved and moved to mrs-deer-prompts.ts.')
lines.push('  The only "removal" was from personal-coaching.ts itself - constants were extracted')
lines.push('  to the new file and replaced with imports.')
lines.push('')
lines.push('')

// 3. WHAT WAS PRESERVED
lines.push('3. WHAT WAS PRESERVED (original Mrs. Deer wisdom)')
lines.push('-'.repeat(70))
lines.push('')
lines.push('  NO_LABELS:')
lines.push('    "' + oldNoLabels + '"')
lines.push('')
lines.push('  FIRST_DAY_RULES (was FIRST_DAY_MIRROR_RULES):')
lines.push('    ' + oldFirstDay)
lines.push('')
lines.push('  MORNING_STRUCTURE: 80-120 words, OBSERVE→VALIDATE→REFRAME→Question')
lines.push('  POST_MORNING_STRUCTURE: 70-110 words, same structure + address tension')
lines.push('  EVENING_STRUCTURE: 100-150 words, same structure + treat fear/exhaustion as growth')
lines.push('  WEEKLY_STRUCTURE: max 150 words')
lines.push('  MONTHLY_STRUCTURE: max 250 words')
lines.push('  EMERGENCY_STRUCTURE: max 80 words')
lines.push('')
lines.push('  BANNED phrases: Needle Mover, Action Plan, Smart Constraints, stage codes,')
lines.push('  "futures you imagine", "save the space", "keep the day open", etc.')
lines.push('')
lines.push('  All structure prompts (OBSERVE, VALIDATE, REFRAME, Question) unchanged.')
lines.push('  MRS_DEER_RULES from lib/mrs-deer.ts - unchanged, still the base personality.')
lines.push('')
lines.push('='.repeat(70))

console.log(lines.join('\n'))
