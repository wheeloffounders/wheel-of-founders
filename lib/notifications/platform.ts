/**
 * Platform/OS detection for notification setup flows.
 * Shared by NotificationGuidance and NotificationWizard.
 */

export type NotificationPlatform = 'mac' | 'windows' | 'ios' | 'android' | 'linux' | 'other'

export function getNotificationPlatform(): NotificationPlatform {
  if (typeof window === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac/.test(ua)) return 'mac'
  if (/Win/.test(ua)) return 'windows'
  if (/Linux/.test(ua) && !/Android/.test(ua)) return 'linux'
  return 'other'
}

export function getBrowserName(): string {
  if (typeof window === 'undefined') return 'browser'
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  return 'browser'
}
