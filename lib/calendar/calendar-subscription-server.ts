import { randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'

export function newCalendarSubscriptionToken(): string {
  return randomBytes(24).toString('base64url')
}

export function calendarSubscriptionRequestOrigin(req: NextRequest): string {
  const explicitOrigin = req.headers.get('origin')?.trim()
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`.replace(/\/$/, '')
  }
  return req.nextUrl.origin.replace(/\/$/, '')
}
