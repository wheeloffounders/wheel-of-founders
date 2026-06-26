import { describe, expect, it } from 'vitest'
import {
  blogSlugToPostFunnelId,
  extractPrimaryWidgetFunnelFromMdx,
} from '@/lib/blog/extract-widget-funnel'

describe('extract-widget-funnel', () => {
  it('parses InteractiveTemplate context', () => {
    const raw = '<InteractiveTemplate context="mission_drift_filter" />'
    expect(extractPrimaryWidgetFunnelFromMdx(raw)).toBe('mission_drift_filter')
  })

  it('builds post_* funnel id from slug', () => {
    expect(blogSlugToPostFunnelId('stop-mission-drift')).toBe('post_stop_mission_drift')
  })
})
