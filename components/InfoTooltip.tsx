'use client'

import { useState, useRef, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  className?: string
  /** Kept for backward compatibility; ignored in current implementation */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (tooltipRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setIsVisible(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible((v) => !v)}
        className="cursor-help p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition" />
      </button>
      {isVisible && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsVisible(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Help information"
        >
          <div
            ref={tooltipRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-[min(320px,calc(100vw-2rem))] w-full shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
              {text}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsVisible(false)
              }}
              className="mt-3 w-full py-2 bg-[#ef725c] text-white rounded-lg text-sm font-medium hover:bg-[#e8654d] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
