import type { FounderArchetypeStickySidebarSlots } from '@/components/founder-dna/FounderArchetypeCard'

export const archetypeSplitGridClassName =
  'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full'

/** Option 1 — profile left; metrics sticky right; diagnosis at bottom of right column. */
export function archetypeLayoutOption1(slots: FounderArchetypeStickySidebarSlots) {
  return (
    <>
      <div className="col-span-1 lg:col-span-6 space-y-6">{slots.profile}</div>
      <div className="col-span-1 lg:col-span-6 lg:sticky lg:top-6 space-y-6 self-start">
        {slots.radar}
        {slots.signalMatrix}
        {slots.identityDimensions}
        {slots.diagnosis}
      </div>
      {slots.evolution}
    </>
  )
}
