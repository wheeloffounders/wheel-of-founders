'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { NotificationSettings } from '@/components/settings/NotificationSettings'

export default function NotificationSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
    }
    check()
  }, [router])

  return (
    <div className="mx-auto min-w-0 max-w-2xl px-4 py-8 md:px-5">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-[#ef725c]" />
          Notification Settings
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          Enable push notifications and choose your reminders and insights.
        </p>
      </div>
      <NotificationSettings />
    </div>
  )
}

