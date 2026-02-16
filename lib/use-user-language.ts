'use client'

import { useState, useEffect } from 'react'
import { getUserSession } from './auth'
import { getUserLanguage, getUserGoal, UserLanguage } from './user-language'

/**
 * Hook to get personalized language for the current user
 * Returns default language until user's goal is loaded
 */
export function useUserLanguage(): UserLanguage {
  const [language, setLanguage] = useState<UserLanguage | null>(null)

  useEffect(() => {
    const loadLanguage = async () => {
      const session = await getUserSession()
      if (!session) {
        // Use default language if not authenticated
        setLanguage(getUserLanguage(null))
        return
      }

      const goal = await getUserGoal(session.user.id)
      setLanguage(getUserLanguage(goal))
    }

    loadLanguage()
  }, [])

  // Return default language while loading
  return language || getUserLanguage(null)
}
