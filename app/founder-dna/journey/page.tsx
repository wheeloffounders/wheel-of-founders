import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { FounderDnaJourneySections } from '@/components/founder-dna/FounderDnaJourneySections'

export default function FounderDnaJourneyPage() {
  return (
    <FounderDnaPageShell
      wide
      title="Journey"
      description="Badges, unlock timing, and lifetime totals. Weekly Mrs. Deer letters are under Weekly Insight."
    >
      <FounderDnaJourneySections />
    </FounderDnaPageShell>
  )
}
