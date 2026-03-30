import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { PatternsPageContent } from '@/components/founder-dna/PatternsPageContent'

export default function FounderDnaPatternsPage() {
  return (
    <FounderDnaPageShell
      title="Your Weekly Patterns"
      description="Every Wednesday, I look at how you work, decide, and reflect — and share the patterns starting to emerge."
    >
      <PatternsPageContent />
    </FounderDnaPageShell>
  )
}
