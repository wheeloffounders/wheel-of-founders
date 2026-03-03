'use client'

interface NextStepPromptProps {
  type: 'post-morning' | 'evening' | 'emergency'
}

const prompts: Record<NextStepPromptProps['type'], string> = {
  'post-morning':
    "Your plan is set and you're ready to start your day. Come back this evening for your evening reflection.",
  evening: 'Rest well, founder. See you tomorrow morning.',
  emergency:
    "Take a breath. You've handled the moment. Return to your regular rhythm whenever you're ready.",
}

export function NextStepPrompt({ type }: NextStepPromptProps) {
  return (
    <div className="mt-4 p-3 bg-[#f8f4f0] dark:bg-gray-800 rounded-lg border-l-4 border-[#ef725c]">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        🦌 {prompts[type]}
      </p>
    </div>
  )
}
