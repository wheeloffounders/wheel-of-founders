import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daily History | Wheel of Founders',
  description: 'Review your daily progress and patterns. Trace your steps, spot patterns, and grow wiser with each reflection.',
}

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
