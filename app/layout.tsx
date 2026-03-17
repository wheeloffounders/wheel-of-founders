import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import InstallPrompt from '@/components/InstallPrompt'
import PostHogProvider from '@/components/PostHogProvider'
import PageViewTracker from '@/components/PageViewTracker'
import { FeedbackPopUp } from '@/components/FeedbackPopUp'
import { Toast } from '@/components/Toast'
import { BottomNav } from '@/components/BottomNav'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AppHeader } from '@/components/AppHeader'
import { DuoUpgradeBanner } from '@/components/DuoUpgradeBanner'
import { AppFooter } from '@/components/AppFooter'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ForceUpdateChecker } from '@/components/ForceUpdateChecker'
import { DevModeBadge } from '@/components/DevModeBadge'
import { TutorialProvider } from '@/lib/contexts/TutorialContext'
import { ComprehensiveTourProvider } from '@/lib/contexts/ComprehensiveTourContext'
import { InAppNotificationProvider } from '@/lib/contexts/InAppNotificationContext'
import { JoyrideTutorial } from '@/components/tutorial/JoyrideTutorial'
import { ComprehensiveTourGate } from '@/components/ComprehensiveTourGate'
import { isTourEnabled } from '@/lib/feature-flags'
import { GlobalErrorHandlers } from '@/components/GlobalErrorHandlers'

const inter = Inter({ subsets: ['latin'] })

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Wheel of Founders | Your Daily Founder Coaching Companion',
  description: 'Turn scattered days into a clear, repeatable rhythm. Morning planning, evening reflection, and gentle coaching from Mrs. Deer, your AI companion—built for founders who want to do what actually matters.',
  keywords: ['founder coaching', 'productivity', 'daily planning', 'founder tools', 'startup', 'entrepreneurship'],
  openGraph: {
    title: 'Wheel of Founders',
    description: 'Your daily founder coaching companion',
    type: 'website',
    siteName: 'Wheel of Founders',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wheel of Founders',
    description: 'Your daily founder coaching companion',
  },
}

// Client component for notifications
function NotificationPermission() {
  // This needs 'use client' but we can't have it in a server component
  // So we'll handle it differently
  return null
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('wof_theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = (stored === 'light' || stored === 'dark') ? stored : (prefersDark ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', theme === 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#152b50" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="msapplication-TileColor" content="#152b50" />
        <meta name="msapplication-TileImage" content="/icon-144x144.png" />
      </head>
      <body
        className={`${inter.className} bg-white dark:bg-gray-800 dark:bg-slate-900 text-gray-900 dark:text-gray-100 dark:text-gray-100 transition-colors duration-300 overflow-x-hidden`}
      >
        <ForceUpdateChecker>
        <ThemeProvider>
        <TutorialProvider>
        <ComprehensiveTourProvider>
        <InAppNotificationProvider>
        <GlobalErrorHandlers />
        <DevModeBadge />
        <PostHogProvider />
        <PageViewTracker />
        <ServiceWorkerRegister />
        <InstallPrompt />
        <OfflineBanner />
        <AppHeader />
        <DuoUpgradeBanner />
        <main className="min-h-screen pt-4 pb-24">{children}</main>
        <BottomNav />
        {isTourEnabled() && (
          <>
            <JoyrideTutorial />
            <ComprehensiveTourGate />
          </>
        )}
        <Toast />
        <FeedbackPopUp />
        <AppFooter />
        </InAppNotificationProvider>
        </ComprehensiveTourProvider>
        </TutorialProvider>
        </ThemeProvider>
        </ForceUpdateChecker>

        {/* Notification permission script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
