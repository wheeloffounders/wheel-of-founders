'use client'

import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

interface MarkdownTextProps {
  children: string
  className?: string
}

/** Renders markdown (bold, italic, line breaks) for AI-generated prompts */
export function MarkdownText({ children, className = '' }: MarkdownTextProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
