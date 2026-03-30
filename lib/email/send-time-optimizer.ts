type OptimizedReminderTimes = {
  morningTime: string
  eveningTime: string
  usedSmartMorning: boolean
  usedSmartEvening: boolean
}

function toHHMM(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function parseHour(hhmm: string, fallback: number): number {
  const h = Number(String(hhmm || '').split(':')[0])
  if (!Number.isFinite(h) || h < 0 || h > 23) return fallback
  return h
}

export function getOptimizedReminderTimes(input: {
  morningFallback: string
  eveningFallback: string
  bestSendHour?: number | null
  bestSendConfidence?: number | null
}): OptimizedReminderTimes {
  const morningFallback = String(input.morningFallback || '09:00').slice(0, 5)
  const eveningFallback = String(input.eveningFallback || '20:00').slice(0, 5)
  const bestHour = input.bestSendHour
  const confidence = Number(input.bestSendConfidence || 0)

  if (!Number.isFinite(bestHour) || bestHour == null || bestHour < 0 || bestHour > 23 || confidence < 0.35) {
    return {
      morningTime: morningFallback,
      eveningTime: eveningFallback,
      usedSmartMorning: false,
      usedSmartEvening: false,
    }
  }

  const morningDefaultHour = parseHour(morningFallback, 9)
  const eveningDefaultHour = parseHour(eveningFallback, 20)
  let morningHour = morningDefaultHour
  let eveningHour = eveningDefaultHour
  let usedSmartMorning = false
  let usedSmartEvening = false

  // Apply smart hour only when it lands in a sensible local window.
  if (bestHour >= 6 && bestHour <= 11) {
    morningHour = bestHour
    usedSmartMorning = true
  } else if (bestHour >= 17 && bestHour <= 22) {
    eveningHour = bestHour
    usedSmartEvening = true
  } else {
    // Midday activity often predicts later-evening open windows.
    eveningHour = Math.min(22, Math.max(17, bestHour + 5))
    usedSmartEvening = true
  }

  return {
    morningTime: toHHMM(morningHour),
    eveningTime: toHHMM(eveningHour),
    usedSmartMorning,
    usedSmartEvening,
  }
}

