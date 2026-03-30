import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { FounderArchetypeCard } from '@/components/founder-dna/FounderArchetypeCard'

export default function FounderArchetypePage() {
  return (
    <FounderDnaPageShell
      title="Archetype"
      description="Your founder archetype, personality readout, how it was calculated, and the full signal breakdown. Decision style lives on Patterns."
    >
      <section aria-labelledby="archetype-main">
        <h2 id="archetype-main" className="sr-only">
          Founder archetype
        </h2>
        <FounderArchetypeCard />
      </section>
    </FounderDnaPageShell>
  )
}
