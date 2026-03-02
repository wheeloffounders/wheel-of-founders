/**
 * Environment variable validation - runs at server startup only
 * SUPABASE_SERVICE_ROLE_KEY is server-only; never run in browser
 */

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

type EnvVar = (typeof REQUIRED_ENV_VARS)[number]

export function validateEnv(environment = process.env.VERCEL_ENV || 'development') {
  const missing: EnvVar[] = []

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    const error =
      `[Environment Error] Missing required environment variables for ${environment}:\n` +
      missing.map((key) => `  - ${key}`).join('\n') +
      '\n\n' +
      'For Vercel, ensure these are set in:\n' +
      `  - Production: https://vercel.com/[team]/[project]/settings/environment-variables\n` +
      `  - Preview: Also need to be set for Preview environment\n` +
      `  - Local: Add to .env.local`

    console.error('\x1b[31m%s\x1b[0m', error) // Red text
    if (environment === 'production') {
      // In production, we throw to prevent deployment
      throw new Error(error)
    } else {
      // In development, warn but don't crash
      console.warn(
        '\x1b[33m%s\x1b[0m',
        '⚠️ Continuing in development mode, but API routes will fail!'
      )
    }
  }
}

// Run validation only on server (SUPABASE_SERVICE_ROLE_KEY is never in browser)
if (typeof window === 'undefined') {
  validateEnv()
}
