'use client'

import { useState } from 'react'
import { LAST_REFRESH_KEYS } from '@/lib/founder-dna/update-schedule'

const KEYS = Object.entries(LAST_REFRESH_KEYS) as Array<[string, string]>

export default function FounderDnaRefreshDebugPage() {
  const [userId, setUserId] = useState('')
  const [key, setKey] = useState<string>(LAST_REFRESH_KEYS.yourStory)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const clearKey = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/founder-dna-clear-refresh-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userId.trim(), key }),
      })
      const data = await res.json().catch(() => ({}))
      setStatus(res.ok ? `OK: ${JSON.stringify(data)}` : `Error: ${JSON.stringify(data)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4 text-gray-900 dark:text-white">
      <h1 className="text-xl font-bold">Founder DNA refresh debug</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Clears a single <code className="text-xs">last_refreshed</code> key so the user&apos;s next visit triggers a
        fresh generation (admin only).
      </p>
      <label className="block text-sm">
        User ID
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
          placeholder="uuid"
        />
      </label>
      <label className="block text-sm">
        Key
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          {KEYS.map(([label, val]) => (
            <option key={val} value={val}>
              {label} ({val})
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busy || !userId.trim()}
        onClick={clearKey}
        className="rounded bg-[#ef725c] text-white px-4 py-2 text-sm disabled:opacity-50"
      >
        Clear refresh key
      </button>
      {status ? <pre className="text-xs whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-3 rounded">{status}</pre> : null}
    </div>
  )
}
