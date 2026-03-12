/**
 * Step-by-step definitions for the notification setup wizard, by platform.
 * Verification: 'request_permission' = trigger browser prompt and advance if granted;
 * 'test_notification' = send test then "Did you see it?"; 'confirm_saw' = user clicks "I did this".
 */

import type { NotificationPlatform } from './platform'

export type StepVerification = 'request_permission' | 'test_notification' | 'confirm_saw' | 'info'

export interface WizardStep {
  id: string
  title: string
  body: string
  verification: StepVerification
  /** Placeholder for screenshot path or description for assets */
  imageHint?: string
}

function macSteps(browser: string): WizardStep[] {
  return [
    {
      id: 'mac-1',
      title: 'Open System Settings',
      body: `Click the Apple logo in the top-left corner of your screen, then click "System Settings".`,
      verification: 'confirm_saw',
      imageHint: 'screenshot: Apple menu → System Settings',
    },
    {
      id: 'mac-2',
      title: 'Go to Notifications',
      body: 'In the sidebar, click "Notifications". Scroll down to find your browser (e.g. ' + browser + ').',
      verification: 'confirm_saw',
      imageHint: 'screenshot: Notifications → browser list',
    },
    {
      id: 'mac-3',
      title: 'Allow notifications for this site',
      body: 'Turn on "Allow Notifications". Set alert style to "Alerts" so you see them. If you use Focus, add an exception for Wheel of Founders or turn Focus off during your reminder times.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: Browser notification toggles',
    },
    {
      id: 'mac-4',
      title: 'Enable in the browser',
      body: 'Come back here and click the button below. When the browser asks "Allow notifications?", click Allow.',
      verification: 'request_permission',
    },
    {
      id: 'mac-5',
      title: 'Test your notifications',
      body: "We'll send a test notification. Check your screen (and menu bar if Do Not Disturb is on) and tell us if you saw it.",
      verification: 'test_notification',
    },
  ]
}

function windowsSteps(browser: string): WizardStep[] {
  return [
    {
      id: 'win-1',
      title: 'Open Windows Settings',
      body: 'Press the Windows key, type "Settings", and open Settings. Or click the Start menu and choose the gear icon.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: Windows Settings',
    },
    {
      id: 'win-2',
      title: 'Go to Notifications',
      body: 'Click "System", then "Notifications". Make sure "Notifications" is turned on and that your browser (' + browser + ') is allowed.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: System → Notifications',
    },
    {
      id: 'win-3',
      title: 'Turn off Focus assist (optional)',
      body: 'If you use Focus assist, set it to "Off" during your reminder times, or add Wheel of Founders as a priority.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: Focus assist',
    },
    {
      id: 'win-4',
      title: 'Enable in the browser',
      body: 'Come back here and click the button below. When the browser asks to show notifications, click Allow.',
      verification: 'request_permission',
    },
    {
      id: 'win-5',
      title: 'Test your notifications',
      body: "We'll send a test notification. Did you see it?",
      verification: 'test_notification',
    },
  ]
}

function androidSteps(): WizardStep[] {
  return [
    {
      id: 'and-1',
      title: 'Add to Home screen (recommended)',
      body: 'In your browser menu, tap "Add to Home screen" or "Install app". This helps notifications work reliably.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: Add to Home screen',
    },
    {
      id: 'and-2',
      title: 'Allow in browser',
      body: 'When the browser asks "Allow notifications?", tap Allow. If you already denied, open browser Settings → Site settings → Notifications and allow this site.',
      verification: 'request_permission',
    },
    {
      id: 'and-3',
      title: 'Test your notifications',
      body: "We'll send a test. Check your notification shade and tell us if you saw it.",
      verification: 'test_notification',
    },
  ]
}

function iosSteps(): WizardStep[] {
  return [
    {
      id: 'ios-1',
      title: 'On iPhone and iPad',
      body: "Web push is limited on iOS. We'll send your reminders by email and show them in the app when you're here.",
      verification: 'info',
    },
    {
      id: 'ios-2',
      title: 'Turn on email reminders',
      body: 'Below, make sure "Email notifications" or email reminders are enabled so you get morning and evening nudges.',
      verification: 'confirm_saw',
    },
  ]
}

function linuxSteps(browser: string): WizardStep[] {
  return [
    {
      id: 'linux-1',
      title: 'Allow in the browser',
      body: 'Click the button below. When ' + browser + ' asks to show notifications, click Allow.',
      verification: 'request_permission',
    },
    {
      id: 'linux-2',
      title: 'Check system notifications',
      body: 'Ensure your desktop (GNOME KDE, etc.) has notifications enabled and that the browser is allowed to show them.',
      verification: 'confirm_saw',
      imageHint: 'screenshot: System notification settings',
    },
    {
      id: 'linux-3',
      title: 'Test your notifications',
      body: "We'll send a test. Did you see it?",
      verification: 'test_notification',
    },
  ]
}

function otherSteps(browser: string): WizardStep[] {
  return [
    {
      id: 'other-1',
      title: 'Allow notifications',
      body: 'Click the button below. When ' + browser + ' asks to show notifications, click Allow.',
      verification: 'request_permission',
    },
    {
      id: 'other-2',
      title: 'Test your notifications',
      body: "We'll send a test. Did you see it?",
      verification: 'test_notification',
    },
  ]
}

export function getWizardSteps(platform: NotificationPlatform, browser: string): WizardStep[] {
  switch (platform) {
    case 'mac':
      return macSteps(browser)
    case 'windows':
      return windowsSteps(browser)
    case 'android':
      return androidSteps()
    case 'ios':
      return iosSteps()
    case 'linux':
      return linuxSteps(browser)
    default:
      return otherSteps(browser)
  }
}

const WIZARD_STORAGE_KEY = 'wof_notification_wizard_progress'

export function getWizardProgress(platform: NotificationPlatform): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY)
    if (!raw) return 0
    const data = JSON.parse(raw) as { platform?: string; step?: number }
    return data.platform === platform && typeof data.step === 'number' ? data.step : 0
  } catch {
    return 0
  }
}

export function setWizardProgress(platform: NotificationPlatform, step: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ platform, step }))
  } catch {
    // ignore
  }
}

export function clearWizardProgress(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(WIZARD_STORAGE_KEY)
  } catch {
    // ignore
  }
}
