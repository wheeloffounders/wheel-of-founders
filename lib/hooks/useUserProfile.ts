'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { invalidateUserProfileBundle } from '@/lib/user-profile-bundle-cache'

export interface UserProfile {
  id: string
  preferred_name: string | null
  name: string | null
  email_address: string | null
  tier: string | null
  pro_features_enabled: boolean | null
  [key: string]: any // Allow other fields
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const session = await getUserSession()
        if (!session?.user?.id) {
          setLoading(false)
          return
        }

        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (fetchError) {
          console.warn('Error fetching user profile:', fetchError)
          setError(fetchError.message)
          // Don't set error state - just log it, fallback to null profile
        }

        if (data) {
          setProfile(data)
        } else {
          // Profile doesn't exist yet - create a minimal one
          setProfile({
            id: session.user.id,
            preferred_name: null,
            name: null,
            email_address: session.user.email || null,
            tier: session.user.tier || 'beta',
            pro_features_enabled: session.user.pro_features_enabled || false,
          })
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const session = await getUserSession()
      if (!session?.user?.id) {
        throw new Error('Not authenticated')
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            id: session.user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (updateError) {
        throw updateError
      }

      // Refresh profile after update
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (data) {
        setProfile(data)
      }
      invalidateUserProfileBundle()
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  // Get display name: preferred_name > name > 'Founder'
  const displayName = profile?.preferred_name || profile?.name || 'Founder'

  return {
    profile,
    loading,
    error,
    displayName,
    updateProfile,
  }
}
