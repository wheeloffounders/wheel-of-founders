'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'
import { AutoExpandTextarea } from '@/components/AutoExpandTextarea'

interface MonthlyIntentionProps {
  onSet: (intention: string) => void
  placeholder?: string
}

export function MonthlyIntention({ onSet, placeholder = "What's your focus for next month?" }: MonthlyIntentionProps) {
  const [intention, setIntention] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSet = () => {
    if (intention.trim()) {
      onSet(intention.trim())
      setSaved(true)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[#152b50] dark:text-white">Set Your Monthly Intention</CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          One focus to carry you through the next month
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AutoExpandTextarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder={placeholder}
          minRows={4}
          className="w-full min-h-[100px] p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 "
          style={{ borderColor: colors.neutral.border }}
          disabled={saved}
        />
        <Button
          variant="primary"
          onClick={handleSet}
          disabled={!intention.trim() || saved}
          className="w-full"
        >
          {saved ? 'Intention Set' : 'Set Monthly Intention'}
        </Button>
      </CardContent>
    </Card>
  )
}
