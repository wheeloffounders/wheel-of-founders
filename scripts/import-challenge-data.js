#!/usr/bin/env node
/**
 * Import 30-Day Challenge data into Supabase.
 * OVERWRITES all morning_tasks, morning_decisions, evening_reviews from the last 30 days.
 *
 * Usage:
 *   USER_ID=your-uuid node scripts/import-challenge-data.js
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const envPath = path.join(process.cwd(), '.env.local')
const envLocal = loadEnv(envPath)
const env = { ...process.env, ...envLocal }

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
const userId = env.USER_ID || env.CHALLENGE_USER_ID

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

if (!userId) {
  console.error('❌ Missing USER_ID. Set it in .env.local or run: USER_ID=your-uuid node scripts/import-challenge-data.js')
  console.error('   Get your user ID from Supabase Auth > Users')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const dataPath = path.join(process.cwd(), 'data', '30-day-challenge-structured.json')
if (!fs.existsSync(dataPath)) {
  console.error('❌ data/30-day-challenge-structured.json not found')
  process.exit(1)
}

const raw = fs.readFileSync(dataPath, 'utf8')
const { days } = JSON.parse(raw)

// Compute date range from data
const dates = days.map((d) => d.date)
const minDate = dates.reduce((a, b) => (a < b ? a : b))
const maxDate = dates.reduce((a, b) => (a > b ? a : b))

console.log('📦 30-Day Challenge Import')
console.log('   User:', userId)
console.log('   Date range:', minDate, '→', maxDate)
console.log('   Days:', days.length)
console.log('')

async function run() {
  // Step 1: DELETE existing data from last 30 days (use range from our data)
  console.log('🗑️  Deleting existing data...')

  const { error: delTasksErr } = await supabase
    .from('morning_tasks')
    .delete()
    .eq('user_id', userId)
    .gte('plan_date', minDate)
    .lte('plan_date', maxDate)

  if (delTasksErr) {
    console.error('❌ Failed to delete morning_tasks:', delTasksErr.message)
    process.exit(1)
  }
  console.log('   ✓ morning_tasks deleted')

  const { error: delDecErr } = await supabase
    .from('morning_decisions')
    .delete()
    .eq('user_id', userId)
    .gte('plan_date', minDate)
    .lte('plan_date', maxDate)

  if (delDecErr) {
    console.error('❌ Failed to delete morning_decisions:', delDecErr.message)
    process.exit(1)
  }
  console.log('   ✓ morning_decisions deleted')

  const { error: delRevErr } = await supabase
    .from('evening_reviews')
    .delete()
    .eq('user_id', userId)
    .gte('review_date', minDate)
    .lte('review_date', maxDate)

  if (delRevErr) {
    console.error('❌ Failed to delete evening_reviews:', delRevErr.message)
    process.exit(1)
  }
  console.log('   ✓ evening_reviews deleted')

  // Step 2: INSERT new data
  console.log('')
  console.log('📥 Inserting challenge data...')

  let tasksInserted = 0
  let decisionsInserted = 0
  let reviewsInserted = 0

  for (const day of days) {
    const { date, morning, evening } = day

    // Tasks
    for (let i = 0; i < morning.tasks.length; i++) {
      const t = morning.tasks[i]
      const { error } = await supabase.from('morning_tasks').insert({
        user_id: userId,
        plan_date: date,
        task_order: i + 1,
        description: t.text,
        why_this_matters: '',
        needle_mover: t.is_needle_mover ?? false,
        completed: t.completed ?? true,
        is_proactive: t.is_needle_mover ? true : null,
        action_plan: t.is_needle_mover ? 'my_zone' : 'quick_win_founder',
      })
      if (error) {
        console.error(`❌ Task failed for ${date}:`, error.message)
      } else {
        tasksInserted++
      }
    }

    // Decisions
    for (const d of morning.decisions) {
      const { error } = await supabase.from('morning_decisions').insert({
        user_id: userId,
        plan_date: date,
        decision: d.text,
        decision_type: 'strategic',
        why_this_decision: '',
        is_proactive: d.is_proactive ?? true,
      })
      if (error) {
        console.error(`❌ Decision failed for ${date}:`, error.message)
      } else {
        decisionsInserted++
      }
    }

    // Evening review
    const winsVal = Array.isArray(evening.wins) ? JSON.stringify(evening.wins) : JSON.stringify([String(evening.wins || '')])
    const lessonsVal = Array.isArray(evening.lessons) ? JSON.stringify(evening.lessons) : JSON.stringify([String(evening.lessons || '')])

    const { error } = await supabase.from('evening_reviews').insert({
      user_id: userId,
      review_date: date,
      mood: evening.mood ?? 4,
      energy: evening.energy ?? 3,
      wins: winsVal,
      lessons: lessonsVal,
    })
    if (error) {
      console.error(`❌ Evening review failed for ${date}:`, error.message)
    } else {
      reviewsInserted++
    }
  }

  console.log('')
  console.log('✅ Import complete!')
  console.log('   morning_tasks:', tasksInserted)
  console.log('   morning_decisions:', decisionsInserted)
  console.log('   evening_reviews:', reviewsInserted)
  console.log('')
  console.log('📊 Check your dashboard, weekly, and monthly insights!')
}

run().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
