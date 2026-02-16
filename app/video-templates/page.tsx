'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Video, ArrowLeft } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { VideoTemplates } from '@/components/VideoTemplates'
import Link from 'next/link'

export default function VideoTemplatesPage() {
  const router = useRouter()
  const [userTier, setUserTier] = useState<string>('beta')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
      
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      if (!features.videoTemplates) {
        router.push('/pricing')
        return
      }
      
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <VideoTemplates
        onSelect={(template) => {
          // In a real app, this would open video recording interface
          alert(`Starting recording with template: ${template.title}\n\nThis feature will open your device's camera to record.`)
        }}
      />
    </div>
  )
}
