'use client'

import { ThemeChart } from '@/components/insights/ThemeChart'
import type { TopicCount } from '@/lib/weekly-analysis'

interface TopicVisualizationProps {
  topics: TopicCount[]
}

export function TopicVisualization({ topics }: TopicVisualizationProps) {
  const themes = topics.map((t) => ({ theme: t.topic, count: t.count }))
  return <ThemeChart themes={themes} title="Topics this week" />
}
