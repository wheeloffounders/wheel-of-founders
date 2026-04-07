'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { cn } from '@/components/ui/utils'

export type EmergencyModeContextValue = {
  isEmergencyActive: boolean
  activeHotEmergencyId: string | null
  refreshEmergencyMode: () => Promise<void>
}

const EmergencyCtx = createContext<EmergencyModeContextValue | null>(null)

/** Fire after logging or resolving a Hot fire so chrome + morning pause update everywhere. */
export function dispatchEmergencyModeRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('wof-emergency-refresh'))
}

export function EmergencyModeProvider({ children }: { children: ReactNode }) {
  const [activeHotEmergencyId, setActiveHotEmergencyId] = useState<string | null>(null)

  const refreshEmergencyMode = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) {
      setActiveHotEmergencyId(null)
      return
    }
    const { data } = await supabase
      .from('emergencies')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('severity', 'hot')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActiveHotEmergencyId(data?.id ?? null)
  }, [])

  useEffect(() => {
    void refreshEmergencyMode()
  }, [refreshEmergencyMode])

  useEffect(() => {
    const run = () => void refreshEmergencyMode()
    window.addEventListener('focus', run)
    window.addEventListener('wof-emergency-refresh', run)
    return () => {
      window.removeEventListener('focus', run)
      window.removeEventListener('wof-emergency-refresh', run)
    }
  }, [refreshEmergencyMode])

  const value = useMemo(
    () => ({
      isEmergencyActive: activeHotEmergencyId !== null,
      activeHotEmergencyId,
      refreshEmergencyMode,
    }),
    [activeHotEmergencyId, refreshEmergencyMode]
  )

  return <EmergencyCtx.Provider value={value}>{children}</EmergencyCtx.Provider>
}

export function useEmergencyMode(): EmergencyModeContextValue {
  const v = useContext(EmergencyCtx)
  if (!v) {
    throw new Error('useEmergencyMode must be used within EmergencyModeProvider')
  }
  return v
}

/** Amber pulse around the main shell when a Hot fire is unresolved. */
export function EmergencyShell({ children }: { children: ReactNode }) {
  const { isEmergencyActive } = useEmergencyMode()
  return (
    <div
      className={cn(
        'min-h-screen transition-[box-shadow] duration-300',
        isEmergencyActive && 'emergency-mode-amber-shell'
      )}
    >
      {children}
    </div>
  )
}
