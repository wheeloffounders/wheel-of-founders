'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'

export const REST_RECOVER_STORAGE_KEY = 'wof-rest-recover'

/**
 * Session banner + crisis modal actions for “keep tasks in tomorrow” / dismiss rest state.
 * Lives in its own module so the dashboard seal cannot accidentally re-declare these bindings.
 */
export function useRestRecoverModalHandlers(
  setRestorationOpen: Dispatch<SetStateAction<boolean>>,
  setShowRestRecover: Dispatch<SetStateAction<boolean>>
) {
  const dismissRestRecover = useCallback(() => {
    try {
      sessionStorage.removeItem(REST_RECOVER_STORAGE_KEY)
    } catch {
      // ignore
    }
    setShowRestRecover(false)
  }, [setShowRestRecover])

  const handleKeepTomorrow = useCallback(() => {
    setRestorationOpen(false)
    try {
      sessionStorage.setItem(REST_RECOVER_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setShowRestRecover(true)
  }, [setRestorationOpen, setShowRestRecover])

  return { dismissRestRecover, handleKeepTomorrow }
}
