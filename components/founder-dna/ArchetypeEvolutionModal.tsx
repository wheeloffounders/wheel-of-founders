'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { isStrategicBreakthroughNarrative } from '@/lib/services/archetypeEngine'
import type { ArchetypeEvolutionHistoryEntry } from '@/lib/types/founder-dna'

function archetypeDisplay(name: string): { label: string; icon: string } {
  const n = name.trim().toLowerCase()
  switch (n) {
    case 'visionary':
      return { label: 'Visionary', icon: '🔭' }
    case 'builder':
      return { label: 'Builder', icon: '🏗️' }
    case 'hustler':
      return { label: 'Hustler', icon: '🚀' }
    case 'strategist':
      return { label: 'Strategist', icon: '📐' }
    case 'hybrid':
      return { label: 'Hybrid', icon: '⚡' }
    default:
      return { label: name, icon: '✨' }
  }
}

function fireEvolutionConfetti() {
  if (typeof window === 'undefined') return
  const burst = confetti.create(undefined, { resize: true })
  const silver = '#c8d4e0'
  const gold = '#e8c547'
  const navy = '#152b50'
  burst({
    particleCount: 110,
    spread: 72,
    origin: { y: 0.62 },
    colors: [silver, gold, navy],
  })
  burst({
    particleCount: 60,
    angle: 120,
    spread: 50,
    origin: { x: 0.15, y: 0.75 },
    colors: [gold, silver],
  })
}

export type ArchetypeEvolutionModalProps = {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  entry: ArchetypeEvolutionHistoryEntry
}

export function ArchetypeEvolutionModal({ isOpen, onClose, onContinue, entry }: ArchetypeEvolutionModalProps) {
  const hasFiredRef = useRef(false)
  const from = archetypeDisplay(entry.fromPrimary)
  const to = archetypeDisplay(entry.toPrimary)
  const pct = entry.strategicPctRolling ?? 0
  const isStrategicBreakthrough = isStrategicBreakthroughNarrative({
    fromPrimary: entry.fromPrimary,
    toPrimary: entry.toPrimary,
    strategicPctRolling: pct,
  })

  useEffect(() => {
    if (!isOpen) return
    if (hasFiredRef.current) return
    fireEvolutionConfetti()
    hasFiredRef.current = true
  }, [isOpen])

  const headline = isStrategicBreakthrough
    ? 'The build phase is complete.'
    : 'Your operating system has upgraded.'

  const sub =
    isStrategicBreakthrough && pct >= 0.7
      ? `Your last 90 days skew ${Math.round(pct * 100)}% strategic. Mrs. Deer now recognizes you as a ${to.label} — less brute force, more design.`
      : `Your recent decisions and rhythms point to a new center of gravity: ${to.label}. Verdicts and coaching will follow this voice.`

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/55 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archetype-evolution-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            className="relative max-w-md w-full rounded-2xl border border-amber-200/80 bg-gradient-to-b from-slate-50 via-white to-amber-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 shadow-2xl px-6 pt-7 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] text-left max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-3">
              <MrsDeerAvatar expression="celebratory" size="large" />
            </div>

            <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/90 dark:text-amber-200/90 mb-1">
              Evolution event
            </p>
            <h2
              id="archetype-evolution-title"
              className="text-xl font-bold text-center bg-gradient-to-r from-slate-700 via-amber-700 to-slate-700 dark:from-slate-200 dark:via-amber-200 dark:to-slate-200 bg-clip-text text-transparent mb-4"
            >
              {headline}
            </h2>

            <div className="flex items-center justify-center gap-4 mb-5 min-h-[4rem]">
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <span className="text-4xl leading-none" aria-hidden>
                  {from.icon}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{from.label}</span>
              </motion.div>
              <motion.div
                className="text-2xl text-amber-600 dark:text-amber-400 font-light"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring' }}
                aria-hidden
              >
                →
              </motion.div>
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 320, damping: 22 }}
              >
                <span className="text-4xl leading-none drop-shadow-[0_0_12px_rgba(232,197,71,0.45)]" aria-hidden>
                  {to.icon}
                </span>
                <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-100">{to.label}</span>
              </motion.div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed">
              <span className="font-medium text-slate-900 dark:text-white">Mrs. Deer:</span> {sub}
            </p>

            <div className="rounded-lg border border-amber-200/70 bg-white/70 dark:bg-slate-800/50 px-3 py-2.5 mb-5 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Evolution history: </span>
              {from.label} ({entry.periodLabel}) → {to.label}
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-3 rounded-lg font-semibold text-white shadow-lg shadow-amber-900/20 bg-gradient-to-r from-slate-800 via-amber-800 to-slate-800 hover:opacity-95 transition"
            >
              Enter my dashboard →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
