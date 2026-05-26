import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { PatternsPageContent } from '@/components/founder-dna/PatternsPageContent'

/** UI audit route — forces freemium locks via pathname in `isPatternsInsightProSurfaceLocked`. */
export default function FounderDnaPatternsFreemiumAuditPage() {
  return (
    <FounderDnaPageShell
      wide
      title="Patterns (freemium audit)"
      description="Preview of Patterns Pro locks for free-tier founders."
    >
      <PatternsPageContent />
    </FounderDnaPageShell>
  )
}
