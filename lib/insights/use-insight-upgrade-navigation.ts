'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Freemium insight CTAs — one tap to pricing (no intermediate marketing sheet).
 */
export function useInsightUpgradeNavigation() {
  const router = useRouter()
  return useCallback(() => {
    router.push('/pricing')
  }, [router])
}
