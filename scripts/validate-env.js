#!/usr/bin/env node
/**
 * Validate required environment variables before build.
 * Used by vercel-build to fail fast if Supabase keys are missing.
 * Run: node scripts/validate-env.js
 * Loads .env.local if present (for local runs; Vercel injects vars at build time)
 */

const fs = require('fs')
const path = require('path')

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

const envLocal = loadEnv(path.join(process.cwd(), '.env.local'))
Object.assign(process.env, envLocal)

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Missing required environment variables:')
  missing.forEach((key) => console.error(`   - ${key}`))
  console.error(
    '\nFor Preview deployments, ensure these are set in Vercel Preview environment.'
  )
  console.error(
    'Run: ./scripts/fix-preview-supabase-env.sh  (syncs from .env.local)'
  )
  process.exit(1)
} else {
  console.log('\x1b[32m%s\x1b[0m', '✅ All required environment variables present')
}
