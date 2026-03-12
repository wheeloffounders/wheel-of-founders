import { redirect } from 'next/navigation'

/**
 * Legacy /login route - redirect to new auth flow.
 * Preserves returnTo and error for backward compatibility.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>
}) {
  const params = await searchParams
  const url = new URL('/auth/login', 'http://dummy')
  if (params.returnTo) url.searchParams.set('returnTo', params.returnTo)
  if (params.error) url.searchParams.set('error', params.error)
  redirect(url.pathname + url.search)
}
