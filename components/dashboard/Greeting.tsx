'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Greeting() {
  const [name, setName] = useState('Founder')
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    const getUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_profiles')
        .select('preferred_name, name')
        .eq('id', user.id)
        .maybeSingle()

      const row = data as { preferred_name?: string; name?: string } | null
      if (row?.preferred_name) setName(row.preferred_name)
      else if (row?.name) setName(row.name.split(' ')[0])
    }
    getUserName()
  }, [])

  return (
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
      {greeting}, {name} 👋
    </h1>
  )
}
