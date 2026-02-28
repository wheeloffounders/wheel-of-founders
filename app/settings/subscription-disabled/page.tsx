import { Suspense } from 'react'
import SubscriptionDisabledContent from './SubscriptionDisabledContent'

function SubscriptionFallback() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-5 py-8">
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#152b50] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function SubscriptionDisabledPage() {
  return (
    <Suspense fallback={<SubscriptionFallback />}>
      <SubscriptionDisabledContent />
    </Suspense>
  )
}
