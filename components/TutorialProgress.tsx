'use client'

interface TutorialProgressProps {
  currentStep: number // 1, 2, or 3
}

export function TutorialProgress({ currentStep }: TutorialProgressProps) {
  return (
    <div className="mb-6 p-4 bg-[#f8f4f0] dark:bg-gray-800 rounded-lg border-l-4 border-[#ef725c]">
      <h2 className="font-bold text-lg mb-2">Welcome to Wheel of Founders! 🦌</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Let&apos;s complete your first day to unlock the full app.
      </p>

      <div className="flex items-center gap-2">
        {/* Step 1: Goal */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1
              ? 'bg-[#ef725c] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
        >
          1
        </div>
        <div
          className={`h-1 w-12 ${
            currentStep >= 2 ? 'bg-[#ef725c]' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />

        {/* Step 2: Morning */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2
              ? 'bg-[#ef725c] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
        >
          2
        </div>
        <div
          className={`h-1 w-12 ${
            currentStep >= 3 ? 'bg-[#ef725c]' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />

        {/* Step 3: Evening */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 3
              ? 'bg-[#ef725c] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
          }`}
        >
          3
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Step {currentStep} of 3:{' '}
        {currentStep === 1
          ? 'Set your goal'
          : currentStep === 2
            ? 'Plan your morning'
            : 'Reflect on your day'}
      </p>
    </div>
  )
}
