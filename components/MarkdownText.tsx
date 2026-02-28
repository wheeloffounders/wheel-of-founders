'use client'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

interface MarkdownTextProps {
  children: string
  className?: string
}

/** Renders markdown (headers, bold, italic, line breaks) for AI-generated prompts */
export function MarkdownText({ children, className = '' }: MarkdownTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-white mt-6 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 dark:text-white mt-6 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 dark:text-white mt-4 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
