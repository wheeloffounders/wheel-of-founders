'use client'

import { Link2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'
import type { TransformationThread as TThread } from '@/lib/quarterly/buildQuarterlyNarrative'

interface TransformationThreadProps {
  thread: TThread
}

export function TransformationThread({ thread }: TransformationThreadProps) {
  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.navy.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <Link2 className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
          The Transformation Thread
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
        <p className="font-medium text-gray-900 dark:text-gray-100">Across these months, one thread runs through everything:</p>
        <p>
          You stopped asking {thread.oldQuestion}.<br />
          You started asking {thread.newQuestion}.
        </p>
        <p>{thread.body}</p>
        <p>
          That&apos;s not {thread.oldFraming}. That&apos;s {thread.newFraming}. And it&apos;s the foundation of everything you&apos;re building.
        </p>
      </CardContent>
    </Card>
  )
}
