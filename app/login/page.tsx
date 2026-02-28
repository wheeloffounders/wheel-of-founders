import { Suspense } from 'react'
import LoginContent from './LoginContent'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function LoginFallback() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 w-full max-w-md border-l-4 border-[#152b50] animate-pulse">
        <div className="h-9 bg-gray-50 dark:bg-gray-900 rounded w-3/4 mx-auto mb-6" />
        <div className="h-5 bg-gray-50 dark:bg-gray-900 rounded w-full mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-50 dark:bg-gray-900 rounded" />
          <div className="h-12 bg-gray-50 dark:bg-gray-900 rounded" />
          <div className="h-12 bg-gray-50 dark:bg-gray-900 rounded" />
          <div className="h-12 bg-gray-50 dark:bg-gray-900 rounded" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  )
}
