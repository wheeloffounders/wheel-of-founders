import { describe, expect, it } from 'vitest'
import {
  getRelationshipPhase,
  pickDailyResponseShape,
  shouldAllowArcSprinkleOnDaily,
} from './coaching-evolution'

describe('coaching-evolution', () => {
  it('maps days with entries to phases', () => {
    expect(getRelationshipPhase(0)).toBe('new')
    expect(getRelationshipPhase(20)).toBe('building')
    expect(getRelationshipPhase(60)).toBe('familiar')
    expect(getRelationshipPhase(100)).toBe('long_haul')
  })

  it('picks stable daily shape for same user/date', () => {
    const a = pickDailyResponseShape({
      userId: 'u1',
      kind: 'post_evening',
      targetDate: '2026-05-28',
      phase: 'familiar',
      allowArcSprinkle: true,
    })
    const b = pickDailyResponseShape({
      userId: 'u1',
      kind: 'post_evening',
      targetDate: '2026-05-28',
      phase: 'familiar',
      allowArcSprinkle: true,
    })
    expect(a.shapeId).toBe(b.shapeId)
  })

  it('arc sprinkle only for familiar+ with signals', () => {
    expect(
      shouldAllowArcSprinkleOnDaily({
        userId: 'u1',
        targetDate: '2026-05-28',
        phase: 'new',
        hasRepeatingLessonSignal: true,
        hasFounderThemes: true,
      })
    ).toBe(false)
  })
})
