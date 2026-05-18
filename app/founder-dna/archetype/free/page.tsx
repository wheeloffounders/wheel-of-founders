import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { FounderArchetypeCard } from '@/components/founder-dna/FounderArchetypeCard'

/** UI audit route — forces freemium locks via pathname in `isFounderDNALocked`. */
export default function FounderArchetypeFreemiumAuditPage() {
  return (
    <FounderDnaPageShell
      title="Archetype (freemium audit)"
      description="Preview of Founder DNA archetype locks for free-tier founders."
    >
      <section aria-labelledby="archetype-main-audit">
        <h2 id="archetype-main-audit" className="sr-only">
          Founder archetype freemium audit
        </h2>
        <FounderArchetypeCard />
      </section>
    </FounderDnaPageShell>
  )
}
