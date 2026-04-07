import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

function labelFromNominatim(data: {
  address?: Record<string, string>
  display_name?: string
}): string {
  const a = data.address ?? {}
  const sub = a.suburb || a.neighbourhood || a.quarter || a.hamlet
  const city = a.city || a.town || a.village || a.municipality
  const region = a.state || a.region || a.county
  const country = a.country
  const parts: string[] = []
  if (sub) parts.push(sub)
  if (city) parts.push(city)
  if (!city && region) parts.push(region)
  if (!sub && !city && country) parts.push(country)
  const joined = parts.filter(Boolean).join(', ')
  if (joined) return joined.slice(0, 220)
  const dn = typeof data.display_name === 'string' ? data.display_name.trim() : ''
  return dn.slice(0, 220)
}

/**
 * Reverse geocode for emergency "where are you?" — server-side to satisfy Nominatim policy (no browser CORS).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: { lat?: unknown; lng?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat)
    const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('zoom', '12')

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'WheelOfFounders/1.0 (emergency-location; +https://wheeloffounders.com)',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocode service unavailable' }, { status: 502 })
    }

    const data = (await res.json()) as { address?: Record<string, string>; display_name?: string }
    const label = labelFromNominatim(data).trim()
    return NextResponse.json({ label: label || null })
  } catch (e) {
    console.error('[geocode/reverse]', e)
    return NextResponse.json({ error: 'Geocode failed' }, { status: 500 })
  }
}
