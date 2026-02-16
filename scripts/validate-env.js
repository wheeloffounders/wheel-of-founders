#!/usr/bin/env node
/**
 * Validate environment variables for Wheel of Founders.
 * Run: node scripts/validate-env.js
 * Loads .env.local if present (use dotenv or manual read). Node doesn't load .env by default.
 */

const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env.local')
const envExamplePath = path.join(process.cwd(), '.env.example')

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

// Merge process.env with .env.local (so existing env vars count)
const envLocal = loadEnv(envPath)
const env = { ...process.env, ...envLocal }

const required = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'Supabase project URL (Project Settings > API)' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'Supabase anon/public key' },
  { key: 'STRIPE_SECRET_KEY', hint: 'Stripe Dashboard > Developers > API Keys' },
]

const optionalButRecommended = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
  'OPENROUTER_API_KEY',
]

const optional = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_MONTHLY_PRICE_ID',
  'STRIPE_PRO_ANNUAL_PRICE_ID',
  'STRIPE_PRO_PLUS_MONTHLY_PRICE_ID',
  'STRIPE_PRO_PLUS_ANNUAL_PRICE_ID',
  'MAILERLITE_API_KEY',
  'MAILERLITE_GROUP_ACTIVE',
  'MAILERLITE_TRANSACTIONAL_API_KEY',
  'RESEND_API_KEY',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'NEXT_PUBLIC_SITE_URL',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
  'ADMIN_SECRET',
  'E2E_TEST_EMAIL',
  'E2E_TEST_PASSWORD',
  'PLAYWRIGHT_BASE_URL',
]

function hasValue(val) {
  return val != null && String(val).trim() !== '' && !String(val).includes('your-') && !String(val).includes('your_')
}

let failed = 0

console.log('Wheel of Founders – environment check')
console.log('')

if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local not found. Copy .env.example to .env.local and fill in values.')
  console.log('   cp .env.example .env.local')
  console.log('')
}

for (const { key, hint } of required) {
  if (!hasValue(env[key])) {
    console.log(`❌ ${key} is missing or placeholder. ${hint}`)
    failed++
  } else {
    console.log(`✅ ${key}`)
  }
}

console.log('')
console.log('Optional (recommended):')
for (const key of optionalButRecommended) {
  if (hasValue(env[key])) {
    console.log(`  ✅ ${key}`)
  } else {
    console.log(`  ⚪ ${key} (not set)`)
  }
}

console.log('')
if (failed > 0) {
  console.log(`Result: ${failed} required variable(s) missing. Fix the ❌ items above.`)
  process.exit(1)
} else {
  console.log('Result: Required variables are set. You can run the app.')
  process.exit(0)
}
