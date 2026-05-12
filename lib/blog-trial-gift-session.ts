/** Set when any blog interactive funnel saves `pending_plan` (session handoff). Drives CTA gift UI + morning toast. */
export const WOF_BLOG_TRIAL_GIFT_KEY = 'wof_blog_trial_gift_unlocked'

/** Non-HttpOnly mirror so `/auth/callback` can grant the Pro trial after OAuth (sessionStorage is not sent). */
export const WOF_BLOG_TRIAL_GIFT_COOKIE = 'wof_blog_trial_gift'

const TRIAL_UNLOCK_EVENT = 'wof-trial-gift-unlocked'

export function setBlogTrialGiftCookie(): void {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${WOF_BLOG_TRIAL_GIFT_COOKIE}=1; Path=/; Max-Age=7200; SameSite=Lax`
  } catch {
    // best effort
  }
}

export function clearBlogTrialGiftCookie(): void {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${WOF_BLOG_TRIAL_GIFT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  } catch {
    // best effort
  }
}

export function hasBlogTrialGiftCookie(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.cookie.split(';').some((part) => {
      const [k, ...rest] = part.trim().split('=')
      return k === WOF_BLOG_TRIAL_GIFT_COOKIE && rest.join('=') === '1'
    })
  } catch {
    return false
  }
}

export function unlockBlogTrialGiftInSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(WOF_BLOG_TRIAL_GIFT_KEY, '1')
    setBlogTrialGiftCookie()
    window.dispatchEvent(new CustomEvent(TRIAL_UNLOCK_EVENT))
  } catch {
    // best effort
  }
}

export function hasBlogTrialGiftInSession(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(WOF_BLOG_TRIAL_GIFT_KEY) === '1'
  } catch {
    return false
  }
}

export function clearBlogTrialGiftInSession(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(WOF_BLOG_TRIAL_GIFT_KEY)
  } catch {
    // best effort
  }
}

export function subscribeBlogTrialGiftUnlock(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => listener()
  window.addEventListener(TRIAL_UNLOCK_EVENT, handler)
  return () => window.removeEventListener(TRIAL_UNLOCK_EVENT, handler)
}

/** True if `pending_plan` exists with a registered funnel id (blog widget handoff in flight). */
export function hasPendingBlogPlanHandoff(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem('pending_plan')
    if (!raw) return false
    const p = JSON.parse(raw) as { funnelId?: string }
    return typeof p.funnelId === 'string' && p.funnelId.trim().length > 0
  } catch {
    return false
  }
}
