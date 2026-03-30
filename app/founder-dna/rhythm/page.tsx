import { FounderDnaPageShell } from '@/components/founder-dna/FounderDnaPageShell'
import { RhythmPageContent } from '@/components/founder-dna/RhythmPageContent'

export default function FounderDnaRhythmPage() {
  return (
    <FounderDnaPageShell
      title="Your Weekly Rhythm"
      description="Every Tuesday, I look back at your week and share what I see — your patterns, your wins, and the threads worth following."
    >
      <RhythmPageContent />
    </FounderDnaPageShell>
  )
}
