export type EmergencyTriageStrategy = 'hold' | 'pivot' | 'drop'

export type EmergencyTriageJson = {
  strategy: EmergencyTriageStrategy
  oneSafeStep: string
  pausedNeedleMovers: string[]
  encouragement: string
  breathingPrompt?: string
  /** Optional aliases used by some clients / previews (same intent as oneSafeStep / encouragement) */
  insight?: string
  immediate_action?: string
}
