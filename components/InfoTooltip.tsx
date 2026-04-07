'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  className?: string
  /** @deprecated Kept for backward compatibility; only affects `popover` alignment hints */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * `modal` — full-screen overlay (legacy).
   * `popover` — compact panel; hover on desktop, tap to toggle on touch; **rendered via portal** so cards with `overflow-x: hidden` cannot clip it.
   */
  presentation?: 'modal' | 'popover'
}

const POPOVER_Z = 500
const GAP = 8

export function InfoTooltip({
  text,
  className = '',
  position = 'top',
  presentation = 'modal',
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHover, setIsHover] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)

  const showPopover = presentation === 'popover' && (isOpen || isHover)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null)

  const updatePopoverPosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let top = 0
    let left = 0
    let transform = ''

    if (position === 'bottom') {
      left = r.left + r.width / 2
      top = r.bottom + GAP
      transform = 'translateX(-50%)'
    } else if (position === 'left') {
      left = r.left - GAP
      top = r.top + r.height / 2
      transform = 'translate(-100%, -50%)'
    } else if (position === 'right') {
      left = r.right + GAP
      top = r.top + r.height / 2
      transform = 'translate(0, -50%)'
    } else {
      left = r.left + r.width / 2
      top = r.top - GAP
      transform = 'translate(-50%, -100%)'
    }

    setPopoverStyle({
      position: 'fixed',
      top,
      left,
      transform,
      zIndex: POPOVER_Z,
    })
  }, [position])

  useLayoutEffect(() => {
    if (presentation !== 'popover' || !showPopover) {
      setPopoverStyle(null)
      return
    }
    updatePopoverPosition()
    const onScrollOrResize = () => updatePopoverPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [presentation, showPopover, updatePopoverPosition])

  useEffect(() => {
    if (presentation !== 'popover') return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (tooltipRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presentation])

  useEffect(() => {
    if (presentation !== 'modal') return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (tooltipRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presentation])

  if (presentation === 'popover') {
    const popoverNode =
      showPopover && typeof document !== 'undefined' && popoverStyle ? (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={popoverStyle}
          className="w-max max-w-[min(280px,calc(100vw-2.5rem))] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200 shadow-lg pointer-events-auto"
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
        >
          {text}
        </div>
      ) : null

    return (
      <span ref={wrapRef} className={`inline-flex items-center ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          className="cursor-help p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0 relative z-0"
          aria-label="Help"
          aria-expanded={isOpen}
        >
          <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition" />
        </button>
        {popoverNode && createPortal(popoverNode, document.body)}
      </span>
    )
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="cursor-help p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition" />
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Help information"
        >
          <div
            ref={tooltipRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-[min(320px,calc(100vw-2rem))] w-full shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{text}</p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen(false)
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
