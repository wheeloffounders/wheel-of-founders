import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useOnboarding() {
  const [hideOnboarding, setHideOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPreference = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('hide_onboarding')
        .eq('id', user.id)
        .maybeSingle()

      setHideOnboarding(data?.hide_onboarding ?? false)
      setLoading(false)
    }
    loadPreference()
  }, [])

  const setHideForever = async (hide: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_profiles')
      .update({ hide_onboarding: hide, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    setHideOnboarding(hide)
  }

  return { hideOnboarding, loading, setHideForever }
}
