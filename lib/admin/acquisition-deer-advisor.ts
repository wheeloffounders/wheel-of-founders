import type { AcquisitionHubPayload } from '@/lib/admin/build-acquisition-hub'
import { STRATEGIC_ADVISOR_MODELS } from '@/lib/admin/deer-strategic-advisor'

export const MRS_DEER_ACQUISITION_SYSTEM = `You are Mrs. Deer, strategic advisor for Wheel of Founders. You analyze **traffic and acquisition** data — where visitors come from and where they drop off before signing up.

You receive JSON with: date range, totals (signups, lands, site visits, widget starts/completes, trial conversions), funnel conversion rates, top sources, top landing pages, rule-based leak hints, and a sample of recent activity.

Your job:
1. Name the **biggest leak** in plain language (e.g. "Google sends readers who never touch the widget" or "Homepage visits with no signup CTA click-through").
2. Say **which source or page** deserves attention first — cite specific source names and paths from the data.
3. Give one **Tactical fix** (product/UX) and one **Messaging fix** (copy/channel) — label them clearly.
4. If data is thin (<5 visits), say so briefly and still give your best hypothesis.

Tone: sharp, warm, founder-to-founder. No corporate jargon.

Output **Markdown** only: start with ## heading (one emoji ok). Use **bold** for key phrases. No code blocks. Keep under 250 words unless data is rich.`

export function buildAcquisitionAdvisorUserPrompt(payload: AcquisitionHubPayload): string {
  const bundle = {
    dateRange: { start: payload.date_range_start, end: payload.date_range_end },
    totals: payload.totals,
    funnelRates: payload.funnel_rates,
    topSources: payload.by_source.slice(0, 8),
    topLandingPages: payload.top_landing_pages.slice(0, 8),
    leakHints: payload.leak_hints,
    recentActivitySample: payload.feed.slice(0, 25).map((r) => ({
      at: r.at,
      kind: r.kind,
      source: r.source,
      path: r.path,
      detail: r.detail,
    })),
    sampleNote: payload.sample_note,
  }
  return `Analyze this acquisition snapshot and tell the founder where the leak is and what to fix first.\n\n${JSON.stringify(bundle, null, 2)}`
}

export function formatFallbackAcquisitionAdvice(payload: AcquisitionHubPayload): string {
  const hints = payload.leak_hints
  const rates = payload.funnel_rates
  const top = payload.by_source[0]
  const lines: string[] = ['## 🦌 Where your traffic is leaking']

  if (hints.length > 0) {
    lines.push('')
    lines.push(`**Most urgent:** ${hints[0].title} — ${hints[0].detail}`)
  } else {
    lines.push('')
    lines.push('**Most urgent:** No major leak flagged yet — keep collecting data in this date range.')
  }

  if (top) {
    lines.push('')
    lines.push(
      `**Top source:** **${top.source}** (${top.total_touchpoints} touchpoints, ${top.signups} signup${top.signups === 1 ? '' : 's'}).`
    )
  }

  lines.push('')
  lines.push('**Funnel snapshot:**')
  if (rates.visit_to_signup_pct != null) lines.push(`- Visit → signup: **${rates.visit_to_signup_pct}%**`)
  if (rates.land_to_start_pct != null) lines.push(`- Blog land → widget start: **${rates.land_to_start_pct}%**`)
  if (rates.start_to_complete_pct != null) lines.push(`- Widget start → finish: **${rates.start_to_complete_pct}%**`)

  lines.push('')
  lines.push('**Tactical fix:** Pick the step above with the steepest drop and run one A/B change (CTA placement, shorter widget, or clearer trial gift).')
  lines.push('')
  lines.push('**Messaging fix:** Match your best-performing landing page headline to the channel that sends the most traffic with zero signups.')

  if (payload.sample_note) {
    lines.push('')
    lines.push(`_${payload.sample_note}_`)
  }

  return lines.join('\n')
}

export const ACQUISITION_ADVISOR_MODELS = [...STRATEGIC_ADVISOR_MODELS]
