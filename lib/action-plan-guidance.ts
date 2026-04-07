/**
 * Mrs. Deer prompts for the morning "How" (action plan) row — copy rotates by selection;
 * the stored note is a single field shared across all plans.
 */
export type MorningActionPlan =
  | 'my_zone'
  | 'systemize'
  | 'delegate_founder'
  | 'eliminate_founder'
  | 'quick_win_founder'

export function getActionPlanGuidance(plan: MorningActionPlan | ''): {
  prompt: string
  placeholder: string
} | null {
  if (!plan) return null
  switch (plan) {
    case 'systemize':
      return {
        prompt: "What's the one step you could document today to make this repeatable?",
        placeholder: 'One step...',
      }
    case 'delegate_founder':
      return {
        prompt: "Who's the right person for this?",
        placeholder: 'Name or note...',
      }
    case 'eliminate_founder':
      return {
        prompt: "If this task isn't done by Friday, who actually misses it?",
        placeholder: 'Who misses it?',
      }
    case 'quick_win_founder':
      return {
        prompt: "What's the smallest step you can take right now?",
        placeholder: 'Small step...',
      }
    case 'my_zone':
      return {
        prompt: "What's the one part of this task that only you can do best?",
        placeholder: 'What only I can do...',
      }
    default:
      return null
  }
}
