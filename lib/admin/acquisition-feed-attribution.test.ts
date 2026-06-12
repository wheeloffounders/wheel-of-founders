import { describe, expect, it } from 'vitest'
import {
  attributionFromInboundSnapshot,
  buildUtmSummary,
  mergeJourneyFields,
  referrerDisplayLabel,
} from '@/lib/admin/acquisition-feed-attribution'

describe('acquisition-feed-attribution', () => {
  it('formats referrer hostname', () => {
    expect(referrerDisplayLabel('https://www.google.com/search?q=test')).toBe('google.com')
  })

  it('parses inbound snapshot fields', () => {
    const out = attributionFromInboundSnapshot({
      referrer: 'https://t.co/abc',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'spring',
      first_landing_page: '/blog/hello?utm_source=newsletter',
    })
    expect(out.referrer).toBe('t.co')
    expect(out.utm_summary).toBe('newsletter / email / spring')
    expect(out.first_landing).toBe('/blog/hello?utm_source=newsletter')
  })

  it('prefers funnel next step over page navigation', () => {
    const merged = mergeJourneyFields(
      { dwell_seconds: 12, next_step: 'Started widget · finished_enough_toggle' },
      { dwell_seconds: 45, next_step: '→ /pricing' }
    )
    expect(merged.next_step).toBe('Started widget · finished_enough_toggle')
  })

  it('falls back to page navigation when funnel has no next step', () => {
    const merged = mergeJourneyFields(null, { dwell_seconds: 90, next_step: '→ /pricing' })
    expect(merged.next_step).toBe('→ /pricing')
    expect(merged.dwell_seconds).toBe(90)
  })

  it('builds utm summary with term', () => {
    expect(buildUtmSummary({ utm_source: 'google', utm_term: 'founder coach' })).toBe(
      'google · term: founder coach'
    )
  })
})
