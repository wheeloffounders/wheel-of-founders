import type { ReactNode } from 'react'

type FounderDnaPageShellProps = {
  title: string
  description?: string
  children: ReactNode
}

/** Consistent header + scrollable content area for Founder DNA hub pages. */
export function FounderDnaPageShell({ title, description, children }: FounderDnaPageShellProps) {
  return (
    <div className="w-full min-h-[50vh]">
      <div className="max-w-4xl mx-auto px-4 md:px-5 py-6 pb-28">
        <header className="mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white break-words">{title}</h1>
          {description ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed break-words max-w-full">
              {description}
            </p>
          ) : null}
        </header>
        <div className="space-y-10">{children}</div>
      </div>
    </div>
  )
}
