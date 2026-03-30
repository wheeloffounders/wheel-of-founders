'use client'

export type PreferenceToggleProps = {
  label: string
  description?: string
  enabled: boolean
  onToggle: () => void
  disabled?: boolean
}

export function PreferenceToggle({
  label,
  description,
  enabled,
  onToggle,
  disabled,
}: PreferenceToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#ef725c] focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${
          enabled ? 'bg-[#ef725c]' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
