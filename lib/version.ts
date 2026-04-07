// lib/version.ts
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  '2026.04.01-2149-tctif9' // older versions are forced to update

export const MINIMUM_SUPPORTED_VERSION = '2024.01.01-0000'

/** localStorage key for stored client version */
export const VERSION_STORAGE_KEY = 'wof_app_version'
const FORCE_RELOAD_KEY = 'wof_force_reload'

/**
 * Compare two version strings (format: YYYY.MM.DD-HHMM[-suffix])
 * Returns true if version1 is older than version2
 */
export function isVersionTooOld(version1: string, version2: string): 
boolean {
  // Extract the main version part (before any -suffix)
  const v1Main = version1.split('-')[0] + '-' + 
(version1.split('-')[1]?.substring(0, 4) || '0000')
  const v2Main = version2.split('-')[0] + '-' + 
(version2.split('-')[1]?.substring(0, 4) || '0000')
  
  // Convert to comparable number (YYYYMMDDHHMM)
  const toComparable = (v: string) => {
    const [datePart, timePart] = v.split('-')
    return parseInt(datePart.replace(/\./g, '') + timePart)
  }
  
  return toComparable(v1Main) < toComparable(v2Main)
}

export function checkForUpdates(): boolean {
  if (typeof window === 'undefined') return false
  
  const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY)
  const currentVersion = APP_VERSION
  
  // If no stored version, this is first load
  if (!storedVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    return false
  }
  
  // If stored version is too old, force update
  if (isVersionTooOld(storedVersion, MINIMUM_SUPPORTED_VERSION)) {
    console.log('Version too old, forcing update')
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    localStorage.setItem(FORCE_RELOAD_KEY, 'true')
    return true
  }
  
  // Normal version mismatch
  if (storedVersion !== currentVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion)
    localStorage.setItem(FORCE_RELOAD_KEY, 'true')
    return true
  }
  
  return false
}

export function shouldForceReload(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(FORCE_RELOAD_KEY) === 'true'
}

export function clearForceReload(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FORCE_RELOAD_KEY)
}

export function performForceReload(): void {
  if (typeof window === 'undefined') return

  console.log('🔄 PERFORMING FORCE RELOAD')

  // Clear ALL caches
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }

  // Unregister ALL service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister())
    })
  }

  // Force fresh load - add cache-busting query param for Vercel
  const url = window.location.href.split('?')[0]
  window.location.href = `${url}?t=${Date.now()}`
}
