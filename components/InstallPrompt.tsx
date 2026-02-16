'use client'

import { useState, useEffect } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 10 seconds if not dismissed before
      if (!localStorage.getItem('pwaInstallDismissed')) {
        setTimeout(() => {
          setShowPrompt(true)
        }, 10000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler as any)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler as any)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted PWA install')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwaInstallDismissed', 'true')
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm z-40">
      <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Install Wheel of Founders</h4>
          <p className="text-xs text-gray-600 mt-1">
            Get the app experience on your desktop or home screen. No app store needed.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#152b50] text-white hover:bg-[#1a3565] transition"
          >
            Install app
          </button>
        </div>
      </div>
    </div>
  )
}

