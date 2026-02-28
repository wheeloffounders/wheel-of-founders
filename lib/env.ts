/**
 * Environment detection and configuration utility.
 * Handles production vs development environment detection for Wheel of Founders.
 */

/** App environment: 'production' | 'development' */
export const APP_ENV = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development') as
  | 'production'
  | 'development'

/** True when running in development mode */
export const isDevelopment = APP_ENV === 'development'

/** True when running in production mode */
export const isProduction = APP_ENV === 'production'

/** Base URL for the app (no trailing slash) */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

/**
 * Get Supabase configuration based on environment.
 * In development, uses development Supabase project; in production, uses production.
 */
export function getSupabaseConfig(): {
  url: string
  anonKey: string
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return { url, anonKey }
}

/** True when debug logging should be enabled (development only by default) */
export const isDebugMode = isDevelopment || process.env.NEXT_PUBLIC_DEBUG === 'true'
