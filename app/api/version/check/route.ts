/**
 * Version check API - returns current version and minimum supported for force-update flow.
 * Clients compare stored version with currentVersion; if mismatch or too old, block with update modal.
 */
import { NextResponse } from 'next/server'
import { APP_VERSION, MINIMUM_SUPPORTED_VERSION } from '@/lib/version'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json({
    currentVersion: APP_VERSION,
    minimumSupported: MINIMUM_SUPPORTED_VERSION,
    required: true,
  })
}
