'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type MorningPlanGateContextValue = {
  loading: boolean
  /** Onboarded user has not committed today’s morning plan (founder-day `plan_date`). */
  isMorningPlanIncomplete: boolean
  planDate: string | null
  /** Refetch after morning save / navigation */
  refreshMorningPlanGate: () => Promise<void>
}

const MorningPlanGateContext = createContext<MorningPlanGateContextValue | null>(null)

export function MorningPlanGateContextProvider({
  value,
  children,
}: {
  value: MorningPlanGateContextValue
  children: ReactNode
}) {
  return <MorningPlanGateContext.Provider value={value}>{children}</MorningPlanGateContext.Provider>
}

export function useMorningPlanGate(): MorningPlanGateContextValue {
  const v = useContext(MorningPlanGateContext)
  if (!v) {
    throw new Error('useMorningPlanGate must be used within MorningPlanGateContextProvider')
  }
  return v
}
