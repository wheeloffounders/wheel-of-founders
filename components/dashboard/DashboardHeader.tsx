'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isDevelopment, showDebugTools } from '@/lib/env'

type DashboardHeaderProps = {
  tierLabel?: string
}

function getTimeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardHeader({ tierLabel }: DashboardHeaderProps) {
  const [name, setName] = useState('Founder')
  const [greeting, setGreeting] = useState(getTimeGreeting())

  useEffect(() => {
    setGreeting(getTimeGreeting())
    const run = async () => {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth.user
      if (!user?.id) return
      const { data } = await supabase
        .from('user_profiles')
        .select('preferred_name, name')
        .eq('id', user.id)
        .maybeSingle()
      const row = data as { preferred_name?: string; name?: string } | null
      if (row?.preferred_name?.trim()) setName(row.preferred_name.trim())
      else if (row?.name?.trim()) setName(row.name.trim().split(' ')[0])
    }
    void run()
  }, [])

  const tier = tierLabel ?? 'Beta'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
          {greeting}, {name}{' '}
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">· {tier}</span>
        </h1>
        {isDevelopment ? (
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
              Admin
            </Link>
            {showDebugTools ? (
              <Link href="/test/simulate" className="text-sm text-amber-600 dark:text-amber-400 hover:underline">
                Test simulate
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

