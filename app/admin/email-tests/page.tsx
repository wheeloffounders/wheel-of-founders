'use client'

import { useEffect, useState } from 'react'
import { getUserSession } from '@/lib/auth'
import { useRouter } from 'next/navigation'

type TestRow = {
  id: string
  name: string
  email_type: string
  status: 'active' | 'paused' | 'completed'
  winner_variant?: 'A' | 'B' | null
  variant_a_subject: string
  variant_b_subject: string
  results?: {
    byVariant: Record<'A' | 'B', { sent: number; opened: number; clicked: number; openRate: number; clickRate: number }>
  }
}

export default function AdminEmailTestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<TestRow[]>([])
  const [form, setForm] = useState({
    name: '',
    email_type: 'weekly_insight',
    variant_a_subject: '',
    variant_b_subject: '',
    variant_a_content: '',
    variant_b_content: '',
  })

  const load = async () => {
    const res = await fetch('/api/admin/email-tests', { credentials: 'include' })
    const json = (await res.json().catch(() => ({ tests: [] }))) as { tests?: TestRow[] }
    setTests(json.tests || [])
  }

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session?.user?.is_admin) {
        router.push('/dashboard')
        return
      }
      await load()
      setLoading(false)
    }
    void init()
  }, [router])

  const createTest = async () => {
    const res = await fetch('/api/admin/email-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({
        name: '',
        email_type: 'weekly_insight',
        variant_a_subject: '',
        variant_b_subject: '',
        variant_a_content: '',
        variant_b_content: '',
      })
      await load()
    }
  }

  const patchTest = async (id: string, action: 'pause' | 'resume' | 'complete', winnerVariant?: 'A' | 'B') => {
    await fetch(`/api/admin/email-tests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, winnerVariant }),
    })
    await load()
  }

  if (loading) return <div className="p-6">Loading email tests...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email A/B Tests</h1>

      <div className="rounded border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-medium">Create Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded p-2 bg-transparent" placeholder="Test name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border rounded p-2 bg-transparent" placeholder="Email type (e.g. weekly_insight)" value={form.email_type} onChange={(e) => setForm((p) => ({ ...p, email_type: e.target.value }))} />
          <input className="border rounded p-2 bg-transparent" placeholder="Variant A subject" value={form.variant_a_subject} onChange={(e) => setForm((p) => ({ ...p, variant_a_subject: e.target.value }))} />
          <input className="border rounded p-2 bg-transparent" placeholder="Variant B subject" value={form.variant_b_subject} onChange={(e) => setForm((p) => ({ ...p, variant_b_subject: e.target.value }))} />
          <textarea className="border rounded p-2 bg-transparent" placeholder="Variant A extra content (optional)" value={form.variant_a_content} onChange={(e) => setForm((p) => ({ ...p, variant_a_content: e.target.value }))} />
          <textarea className="border rounded p-2 bg-transparent" placeholder="Variant B extra content (optional)" value={form.variant_b_content} onChange={(e) => setForm((p) => ({ ...p, variant_b_content: e.target.value }))} />
        </div>
        <button onClick={createTest} className="px-4 py-2 bg-[#152b50] text-white rounded hover:opacity-90">
          Create test
        </button>
      </div>

      <div className="space-y-4">
        {tests.map((t) => {
          const a = t.results?.byVariant?.A
          const b = t.results?.byVariant?.B
          return (
            <div key={t.id} className="rounded border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.email_type} · {t.status}{t.winner_variant ? ` · winner ${t.winner_variant}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  {t.status === 'active' ? (
                    <button className="px-3 py-1 border rounded" onClick={() => patchTest(t.id, 'pause')}>Pause</button>
                  ) : t.status === 'paused' ? (
                    <button className="px-3 py-1 border rounded" onClick={() => patchTest(t.id, 'resume')}>Resume</button>
                  ) : null}
                  {t.status !== 'completed' ? (
                    <>
                      <button className="px-3 py-1 border rounded" onClick={() => patchTest(t.id, 'complete', 'A')}>Winner A</button>
                      <button className="px-3 py-1 border rounded" onClick={() => patchTest(t.id, 'complete', 'B')}>Winner B</button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="font-medium mb-1">Variant A</div>
                  <div>{t.variant_a_subject}</div>
                  <div className="mt-2 text-gray-600">Sent {a?.sent ?? 0} · Open {Math.round((a?.openRate ?? 0) * 100)}% · CTR {Math.round((a?.clickRate ?? 0) * 100)}%</div>
                </div>
                <div className="rounded bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="font-medium mb-1">Variant B</div>
                  <div>{t.variant_b_subject}</div>
                  <div className="mt-2 text-gray-600">Sent {b?.sent ?? 0} · Open {Math.round((b?.openRate ?? 0) * 100)}% · CTR {Math.round((b?.clickRate ?? 0) * 100)}%</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

