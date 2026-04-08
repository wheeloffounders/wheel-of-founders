/**
 * Set on the opener when a calendar OAuth popup is launched; cleared after UI refresh.
 * Uses localStorage (not sessionStorage) so the flag is visible across windows/tabs on the same origin.
 */
export const CALENDAR_OAUTH_PENDING_KEY = 'wof_calendar_oauth_pending'

export const CALENDAR_POPUP_POSTMESSAGE_TYPE = 'wof-calendar-oauth-done'
