export type EmailPreferences = {
  onboarding: boolean
  weekly_digest: boolean
  inactivity_reminders: boolean
  nurture_emails: boolean
  marketing_updates: boolean
}

const DEFAULT_PREFS: EmailPreferences = {
  onboarding: true,
  weekly_digest: true,
  inactivity_reminders: true,
  nurture_emails: true,
  marketing_updates: false,
}

export async function fetchEmailPreferences(): Promise<EmailPreferences> {
  const res = await fetch('/api/user/email-preferences', {
    method: 'GET',
    credentials: 'include',
  })
  if (!res.ok) {
    return DEFAULT_PREFS
  }
  const data = (await res.json().catch(() => DEFAULT_PREFS)) as Partial<EmailPreferences>
  return {
    onboarding: data.onboarding ?? DEFAULT_PREFS.onboarding,
    weekly_digest: data.weekly_digest ?? DEFAULT_PREFS.weekly_digest,
    inactivity_reminders: data.inactivity_reminders ?? DEFAULT_PREFS.inactivity_reminders,
    nurture_emails: data.nurture_emails ?? DEFAULT_PREFS.nurture_emails,
    marketing_updates: data.marketing_updates ?? DEFAULT_PREFS.marketing_updates,
  }
}

export async function updateEmailPreferences(prefs: EmailPreferences): Promise<void> {
  const res = await fetch('/api/user/email-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || 'Failed to save email preferences')
  }
}

