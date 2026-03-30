import { notFound } from 'next/navigation'
import { SimulateDaysClient } from './SimulateDaysClient'

export default function SimulateDaysPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <SimulateDaysClient />
      </div>
    </div>
  )
}
