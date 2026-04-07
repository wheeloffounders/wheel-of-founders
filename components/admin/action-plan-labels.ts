/**
 * Human-readable action plan labels for admin narrative views.
 * Matches morning page ACTION_PLAN_OPTIONS_2.
 */
export const ACTION_PLAN_LABELS: Record<string, string> = {
  my_zone: 'Milestone',
  systemize: 'Systemize',
  delegate_founder: 'Delegate',
  eliminate_founder: 'Eliminate',
  quick_win_founder: 'Quick Win',
}

export function getActionPlanLabel(value: string | null | undefined): string {
  if (!value) return ''
  return ACTION_PLAN_LABELS[value] ?? value
}
