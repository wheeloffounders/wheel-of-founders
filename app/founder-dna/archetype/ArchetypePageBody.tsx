'use client'

import {
  FounderArchetypeCard,
  type FounderArchetypeStickySidebarSlots,
} from '@/components/founder-dna/FounderArchetypeCard'
import { archetypeLayoutOption1, archetypeSplitGridClassName } from './archetype-page-layouts'

function renderOption1Layout(slots: FounderArchetypeStickySidebarSlots) {
  return <div className={archetypeSplitGridClassName}>{archetypeLayoutOption1(slots)}</div>
}

export function ArchetypePageBody() {
  return <FounderArchetypeCard renderStickySidebarLayout={renderOption1Layout} />
}
