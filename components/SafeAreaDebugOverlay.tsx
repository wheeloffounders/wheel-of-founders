'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Dev aid: add ?safeAreaDebug=1 to any URL to see html/body metrics and measured safe-area inset.
 * Helps distinguish: parent padding vs env() vs browser defaults.
 */
export function SafeAreaDebugOverlay() {
  const searchParams = useSearchParams()
  const enabled = searchParams?.get('safeAreaDebug') === '1'
  const [metrics, setMetrics] = useState<string>('…')

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const tick = () => {
      const html = document.documentElement
      const body = document.body
      const csHtml = getComputedStyle(html)
      const csBody = getComputedStyle(body)

      const probe = document.createElement('div')
      probe.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;padding-top:env(safe-area-inset-top,0px);'
      document.body.appendChild(probe)
      const insetTop = getComputedStyle(probe).paddingTop
      probe.remove()

      const vv = window.visualViewport
      const main = document.querySelector('main')

      const lines = [
        `safe-area (probe): ${insetTop}`,
        `html margin: ${csHtml.margin} padding: ${csHtml.paddingTop}`,
        `body margin: ${csBody.margin} padding: ${csBody.paddingTop}`,
        `body bg: ${csBody.backgroundColor}`,
        `visualViewport: offsetTop=${vv?.offsetTop ?? 'n/a'} height=${vv?.height ?? 'n/a'}`,
        `main first child offsetTop: ${main?.firstElementChild ? (main.firstElementChild as HTMLElement).offsetTop : 'n/a'}`,
        `window.innerHeight: ${window.innerHeight}`,
      ]
      setMetrics(lines.join('\n'))
    }

    tick()
    window.addEventListener('resize', tick)
    window.visualViewport?.addEventListener('resize', tick)
    return () => {
      window.removeEventListener('resize', tick)
      window.visualViewport?.removeEventListener('resize', tick)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <pre
      className="fixed bottom-0 left-0 right-0 z-[10000] max-h-[40vh] overflow-auto bg-black/85 text-[10px] text-green-400 p-2 font-mono whitespace-pre-wrap border-t border-green-700 pointer-events-auto"
      aria-live="polite"
    >
      {metrics}
    </pre>
  )
}
