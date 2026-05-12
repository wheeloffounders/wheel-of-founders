/** Logged when a Finished Enough / Presence Permit handoff hydrates on the Morning Canvas. */
export const USER_ACTIVITY_PRESENCE_PERMIT_CLAIM = 'presence_permit_claim' as const

export type UserActivityType = typeof USER_ACTIVITY_PRESENCE_PERMIT_CLAIM | string
