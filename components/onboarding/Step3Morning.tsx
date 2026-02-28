'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { Target, Zap, Star } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

export function Step3Morning() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <MrsDeerAvatar expression="thoughtful" size="large" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Mrs. Deer, your AI companion</p>
        </div>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4" style={{ color: colors.navy.DEFAULT }}>
        Morning Routine: Power List
      </h2>
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        Each morning you&apos;ll set 2–3 priorities. Here&apos;s what makes them powerful:
      </p>
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <Target className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.coral.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">3-task Power List</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Focus on what matters most—not everything.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Star className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Needle Movers</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">The one thing that, if moved today, would change the game. Mark it with ⭐.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <Zap className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.navy.DEFAULT }} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">Decision Log</span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Strategic (big picture) vs tactical (today&apos;s call). Capture your key decision.</p>
          </div>
        </li>
      </ul>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
        Example: &quot;Ship MVP demo&quot; (Needle Mover) + &quot;Hire vs outsource customer support&quot; (Strategic decision)
      </p>
    </div>
  )
}
