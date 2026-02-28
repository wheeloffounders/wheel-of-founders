'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AutoExpandTextarea } from '@/components/AutoExpandTextarea'

interface QuarterlyIntentionProps {
  onSet: (intention: string) => void
  placeholder?: string
}

export function QuarterlyIntention({ onSet, placeholder = "What's your focus for the next quarter?" }: QuarterlyIntentionProps) {
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
        <CardTitle className="text-[#152b50] dark:text-white">Set Your Quarterly Intention</CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          One focus to carry you through the next quarter
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AutoExpandTextarea
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
          placeholder={placeholder}
          minRows={4}
          className="w-full min-h-[100px] p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 "
          disabled={saved}
        />
        <Button
          variant="primary"
          onClick={handleSet}
          disabled={!intention.trim() || saved}
          className="w-full"
        >
          {saved ? 'Intention Set' : 'Set Quarterly Intention'}
        </Button>
      </CardContent>
    </Card>
  )
}
