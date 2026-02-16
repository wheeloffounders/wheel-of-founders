#!/usr/bin/env node
/**
 * Post-deployment verification for Wheel of Founders.
 * Usage: VERCEL_URL=https://wheeloffounders.com node scripts/verify-production.js
 *    or: node scripts/verify-production.js https://wheeloffounders.com
 */

const baseUrl = process.env.VERCEL_URL || process.argv[2]
if (!baseUrl) {
  console.error('Usage: VERCEL_URL=https://your-domain.com node scripts/verify-production.js')
  console.error('   or: node scripts/verify-production.js https://your-domain.com')
  process.exit(1)
}

const root = baseUrl.startsWith('http') ? baseUrl.replace(/\/$/, '') : `https://${baseUrl}`

const checks = []

async function check(name, fn) {
  try {
    await fn()
    checks.push({ name, ok: true })
    return true
  } catch (e) {
    checks.push({ name, ok: false, error: e.message })
    return false
  }
}

async function main() {
  console.log(`Verifying production at ${root}\n`)

  await check('Health endpoint returns 200 and status ok', async () => {
    const res = await fetch(`${root}/api/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status !== 'ok') throw new Error(`status was ${data.status}`)
  })

  await check('Login page loads (auth entry)', async () => {
    const res = await fetch(`${root}/login`, { redirect: 'manual' })
    if (res.status !== 200 && res.status !== 307 && res.status !== 308) {
      throw new Error(`HTTP ${res.status}`)
    }
  })

  await check('Stripe webhook endpoint exists and rejects invalid requests', async () => {
    const res = await fetch(`${root}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (res.status === 404) throw new Error('Endpoint not found (404)')
    if (res.status === 500) throw new Error('Server error (500) - check STRIPE_WEBHOOK_SECRET')
    if (res.status === 200) throw new Error('Expected 400 for missing signature, got 200')
    if (res.status !== 400) throw new Error(`Unexpected HTTP ${res.status}`)
  })

  await check('Admin route redirects when unauthenticated', async () => {
    const res = await fetch(`${root}/admin`, { redirect: 'manual' })
    if (res.status !== 302 && res.status !== 307 && res.status !== 303) {
      throw new Error(`Expected redirect (302/307/303), got ${res.status}`)
    }
    const loc = res.headers.get('location') || ''
    if (!loc.includes('login') && !loc.includes('/')) {
      throw new Error(`Unexpected redirect location: ${loc}`)
    }
  })

  await check('Homepage loads', async () => {
    const res = await fetch(`${root}/`, { redirect: 'manual' })
    if (res.status !== 200 && res.status !== 307 && res.status !== 308) {
      throw new Error(`HTTP ${res.status}`)
    }
  })

  console.log('Results:\n')
  let failed = 0
  for (const { name, ok, error } of checks) {
    const icon = ok ? '✅' : '❌'
    console.log(`  ${icon} ${name}`)
    if (error) console.log(`     ${error}`)
    if (!ok) failed++
  }
  console.log('')
  if (failed > 0) {
    console.log(`${failed} check(s) failed. Fix issues and re-run.`)
    process.exit(1)
  }
  console.log('All checks passed.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
