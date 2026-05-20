import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { ArchetypePageBody } from './ArchetypePageBody'

/**
 * Option 1 — sticky sidebar (`archetype-page-layouts.tsx`):
 * - Left: founder profile card
 * - Right (sticky lg+): radar → signal matrix → identity dimensions → ArchetypeDiagnosisSummary (bottom)
 */
export default function FounderArchetypePage() {
  return (
    <FounderDnaPageShell
      wide
      title="Archetype"
      description="Your founder archetype, personality readout, how it was calculated, and the full signal breakdown. Decision style lives on Patterns."
    >
      <section aria-labelledby="archetype-main" className="w-full">
        <h2 id="archetype-main" className="sr-only">
          Founder archetype
        </h2>
        <ArchetypePageBody />
      </section>
    </FounderDnaPageShell>
  )
}
