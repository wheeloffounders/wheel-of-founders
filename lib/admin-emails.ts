/**
 * Hardcoded super-admin allowlist (OAuth email, case-insensitive).
 * Kept in sync with auth callback upserts; also used client-side for nav before profile refresh.
 */
export const ADMIN_WHITELIST_EMAILS_LOWERCASE = [
  'wttmotivation@gmail.com',
  'vanieho@hotmail.com',
] as const

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase()
}

export function isWhitelistAdminEmail(email: string | null | undefined): boolean {
  const n = normalizeAdminEmail(email)
  return (ADMIN_WHITELIST_EMAILS_LOWERCASE as readonly string[]).includes(n)
}
