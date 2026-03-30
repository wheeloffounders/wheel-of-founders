/**
 * Browser-facing app origin for calendar feeds, ICS event URLs, and deep links.
 * Set `NEXT_PUBLIC_APP_URL` per environment (e.g. https://app.wheeloffounders.com in production).
 */
export function getAppPublicOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://app.wheeloffounders.com'
  return raw.replace(/\/$/, '')
}
