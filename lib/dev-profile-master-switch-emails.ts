/** Case-insensitive allowlist for dev-only dashboard links and profile master switch. */
export const DEV_MASTER_EMAILS = [
  'vanieho@hotmail.com',
  'vanieho429@gmail.com',
  'wttmotivation@gmail.com',
  'sniclam@gmail.com',
] as const

const DEV_PROFILE_MASTER_SWITCH_EMAILS = new Set(DEV_MASTER_EMAILS.map((e) => e.toLowerCase()))

export function isDevProfileMasterSwitchEmail(email: string | null | undefined): boolean {
  const n = (email ?? '').trim().toLowerCase()
  return n.length > 0 && DEV_PROFILE_MASTER_SWITCH_EMAILS.has(n)
}
