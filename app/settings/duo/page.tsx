'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Mail, Clock, CheckCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface DuoRelationship {
  id: string
  primary_user_id: string
  secondary_user_id: string | null
  invited_email: string
  status: string
  expires_at: string | null
}

interface PartnerProfile {
  id: string
  email_address?: string
  name?: string
  preferred_name?: string
}

export default function DuoSettingsPage() {
  const [duo, setDuo] = useState<DuoRelationship | null>(null)
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'primary' | 'secondary' | null>(null)

  useEffect(() => {
    loadDuo()
  }, [])

  const loadDuo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if user is primary
    const { data: asPrimary } = await supabase
      .from('duo_relationships')
      .select('*')
      .eq('primary_user_id', user.id)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (asPrimary) {
      setDuo(asPrimary as DuoRelationship)
      setUserRole('primary')
      if (asPrimary.secondary_user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email_address, name, preferred_name')
          .eq('id', asPrimary.secondary_user_id)
          .maybeSingle()
        setPartnerProfile(profile as PartnerProfile | null)
      }
      setLoading(false)
      return
    }

    // Check if user is secondary
    const { data: asSecondary } = await supabase
      .from('duo_relationships')
      .select('*')
      .eq('secondary_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (asSecondary) {
      setDuo(asSecondary as DuoRelationship)
      setUserRole('secondary')
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, email_address, name, preferred_name')
        .eq('id', asSecondary.primary_user_id)
        .maybeSingle()
      setPartnerProfile(profile as PartnerProfile | null)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
        <div className="animate-pulse h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Duo Plan</h1>

      {!duo ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-[#ef725c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#ef725c]" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Duo partner yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Invite a co-founder, partner, or accountability buddy to share your Duo plan. Both accounts stay private and independent.
          </p>
          <Link
            href="/settings/duo/invite"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d]"
          >
            <UserPlus className="w-4 h-4" />
            Invite Partner
          </Link>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-medium mb-3">Duo benefits</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />
                Save up to 35% vs individual
              </div>
              <div className="text-left">
                <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />
                Two Pro accounts
              </div>
              <div className="text-left">
                <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />
                Separate data
              </div>
              <div className="text-left">
                <CheckCircle className="w-4 h-4 text-green-500 inline mr-1" />
                Single bill
              </div>
            </div>
          </div>
        </div>
      ) : duo.status === 'pending' && userRole === 'primary' ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mb-2" />
          <h2 className="text-lg font-semibold mb-1">Invitation Pending</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Waiting for them to accept. Invitation expires{' '}
            {duo.expires_at ? new Date(duo.expires_at).toLocaleDateString() : 'in 7 days'}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-gray-500" />
            <span>{duo.invited_email}</span>
          </div>
        </div>
      ) : duo.status === 'active' ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
          <h2 className="text-lg font-semibold mb-1">Duo Active</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {userRole === 'primary' ? 'You are the primary account holder.' : 'You are on a Duo plan.'}
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="font-medium">
              {userRole === 'primary'
                ? partnerProfile?.preferred_name || partnerProfile?.name || duo.invited_email || 'Your partner'
                : partnerProfile?.preferred_name || partnerProfile?.name || 'Partner'}
            </p>
            <p className="text-sm text-gray-500">
              {userRole === 'primary' ? duo.invited_email : (partnerProfile?.email_address || '')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
