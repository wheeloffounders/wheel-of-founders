import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { FounderDnaJourneySections } from '@/components/founder-dna/FounderDnaJourneySections'

export default function FounderDnaJourneyPage() {
  return (
    <FounderDnaPageShell
      title="Journey"
      description="Badges, unlock timing, and lifetime totals from your founder rhythm."
    >
      <FounderDnaJourneySections />
    </FounderDnaPageShell>
  )
}
