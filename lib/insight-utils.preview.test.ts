import { describe, expect, it } from 'vitest'
import { buildDashboardInsightPreview, extractInsightPreviewSource } from './insight-utils'

describe('buildDashboardInsightPreview', () => {
  it('skips meta intro, dividers, and section headers', () => {
    const raw = `Here's your monthly reflection, crafted with care and attention to the nuances of your journey:

---

## The Shape of Your May

May was a month of balancing creation and care—building your app empire while nurturing your son's independence. The dominant themes were **app development** and **parenting adjustments**, with wins that pointed toward steady progress.

## Your Wins, Unpacked

You celebrated shipping a small but meaningful feature.`

    expect(extractInsightPreviewSource(raw)).toBe(
      'May was a month of balancing creation and care—building your app empire while nurturing your son\'s independence. The dominant themes were app development and parenting adjustments, with wins that pointed toward steady progress.'
    )

    const preview = buildDashboardInsightPreview(raw)
    expect(preview).not.toMatch(/\*\*|---|##/)
    expect(preview).not.toMatch(/The Shape of Your May May/)
    expect(preview).toMatch(/^May was a month/)
    expect(preview.endsWith('.')).toBe(true)
  })

  it('ends on a complete sentence within the char limit', () => {
    const raw = `## Opening

First sentence here. Second sentence here. Third sentence should not appear in a two-sentence preview.`

    const preview = buildDashboardInsightPreview(raw, 2, 120)
    expect(preview).toBe('First sentence here. Second sentence here.')
  })
})
