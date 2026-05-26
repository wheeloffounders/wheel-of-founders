import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { RhythmPageContent } from '@/components/founder-dna/RhythmPageContent'

/** UI audit route — forces freemium locks via pathname in `isRhythmInsightProSurfaceLocked`. */
export default function FounderDnaRhythmFreemiumAuditPage() {
  return (
    <FounderDnaPageShell
      wide
      title="Rhythm (freemium audit)"
      description="Preview of Rhythm Pro locks for free-tier founders."
    >
      <RhythmPageContent />
    </FounderDnaPageShell>
  )
}
