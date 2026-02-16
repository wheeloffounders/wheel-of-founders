'use client'

import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  className?: string
}

export function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  return (
    <span className={`group relative inline-flex cursor-help ${className}`}>
      <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 transition" />
      <span className="absolute right-0 top-full mt-1 z-50 w-64 p-2.5 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity whitespace-normal">
        {text}
      </span>
    </span>
  )
}
