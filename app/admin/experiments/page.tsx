'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import {
  FlaskConical,
  Plus,
  Pencil,
  Play,
  Square,
  Check,
  X,
  Loader2,
} from 'lucide-react'

type ExperimentFull = {
  id: string
  name: string
  status: 'draft' | 'running' | 'completed'
  description: string | null
  variants: string[]
  assignments: Record<string, number>
  events: Record<string, Record<string, number>>
  traffic_allocation: Record<string, number>
  target_metric: string | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  updated_at: string | null
}

const TARGET_METRICS = [
  { value: '', label: 'Select metric...' },
  { value: 'page_view', label: 'Page View' },
  { value: 'funnel_completion', label: 'Funnel Completion' },
  { value: 'morning_flow', label: 'Morning Flow' },
  { value: 'evening_flow', label: 'Evening Flow' },
  { value: 'conversion', label: 'Conversion' },
]

export default function AdminExperimentsPage() {
  const router = useRouter()
  const [experiments, setExperiments] = useState<ExperimentFull[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    variants: 'control, test',
    traffic_allocation: '50, 50',
    target_metric: '',
    start_date: '',
    end_date: '',
  })

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session?.user?.is_admin) {
        router.push('/')
        return
      }
      loadExperiments()
    }
    init()
  }, [router])

  const loadExperiments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/experiments')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to load experiments')
      }
      const data = await res.json()
      setExperiments(data.experiments ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setExperiments([])
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      variants: 'control, test',
      traffic_allocation: '50, 50',
      target_metric: '',
      start_date: '',
      end_date: '',
    })
    setModal('create')
  }

  const openEdit = (exp: ExperimentFull) => {
    const vars = exp.variants ?? ['control', 'test']
    const alloc = vars
      .map((v) => exp.traffic_allocation?.[v] ?? 100 / vars.length)
      .join(', ')
    setForm({
      name: exp.name ?? '',
      description: exp.description ?? '',
      variants: vars.join(', '),
      traffic_allocation: alloc,
      target_metric: exp.target_metric ?? '',
      start_date: exp.start_date ? exp.start_date.slice(0, 10) : '',
      end_date: exp.end_date ? exp.end_date.slice(0, 10) : '',
    })
    setEditingId(exp.id)
    setModal('edit')
  }

  const closeModal = () => {
    setModal(null)
    setEditingId(null)
  }

  const parseVariantsAndAllocation = () => {
    const vars = form.variants
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const nums = form.traffic_allocation
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n))
    const alloc: Record<string, number> = {}
    vars.forEach((v, i) => {
      alloc[v] = nums[i] ?? 100 / vars.length
    })
    return { variants: vars.length ? vars : ['control', 'test'], traffic_allocation: alloc }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const { variants, traffic_allocation } = parseVariantsAndAllocation()
      const res = await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          variants,
          traffic_allocation,
          target_metric: form.target_metric || undefined,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to create')
      }
      closeModal()
      loadExperiments()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !form.name.trim()) return
    setSaving(true)
    try {
      const { variants, traffic_allocation } = parseVariantsAndAllocation()
      const res = await fetch('/api/admin/experiments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          variants,
          traffic_allocation,
          target_metric: form.target_metric || undefined,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update')
      }
      closeModal()
      loadExperiments()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (exp: ExperimentFull) => {
    const next =
      exp.status === 'draft'
        ? 'running'
        : exp.status === 'running'
          ? 'completed'
          : 'draft'
    setToggleLoading(exp.id)
    try {
      const res = await fetch('/api/admin/experiments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: exp.id, status: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update')
      }
      loadExperiments()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setToggleLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-[#152b50] text-white px-6 py-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">A/B Experiments</h1>
            <p className="text-gray-300 text-sm mt-1">
              Create, edit, and manage experiments. Connect to page views and funnel events.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ef725c] hover:bg-[#e86454] font-medium transition"
          >
            <Plus className="w-4 h-4" />
            New Experiment
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading experiments...
          </div>
        ) : experiments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No experiments yet
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              Create your first A/B experiment to test variants with page views and funnel metrics.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#152b50] text-white hover:bg-[#1e3a6e] font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Create Experiment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {exp.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            exp.status === 'running'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                              : exp.status === 'completed'
                                ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                          }`}
                        >
                          {exp.status}
                        </span>
                        {exp.target_metric && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Target: {exp.target_metric}
                          </span>
                        )}
                      </div>
                      {exp.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                          {exp.description}
                        </p>
                      )}
                      {(exp.start_date || exp.end_date) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : '—'}
                          {' → '}
                          {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : '—'}
                        </p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        {exp.variants.map((v) => (
                          <div
                            key={v}
                            className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="font-medium text-[#152b50] dark:text-[#ef725c]">{v}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              Assigned: {exp.assignments[v] ?? 0}
                            </div>
                            {exp.traffic_allocation?.[v] != null && (
                              <div className="text-xs text-gray-500">
                                {exp.traffic_allocation[v]}% traffic
                              </div>
                            )}
                            {exp.events[v] && Object.keys(exp.events[v]).length > 0 && (
                              <div className="mt-1 text-xs text-gray-500">
                                {Object.entries(exp.events[v]).map(([ev, n]) => (
                                  <div key={ev}>
                                    {ev}: {n}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(exp)}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(exp)}
                        disabled={!!toggleLoading}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          exp.status === 'running'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                            : exp.status === 'completed'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                        }`}
                        title={
                          exp.status === 'draft'
                            ? 'Start experiment'
                            : exp.status === 'running'
                              ? 'Complete experiment'
                              : 'Reset to draft'
                        }
                      >
                        {toggleLoading === exp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : exp.status === 'running' ? (
                          <>
                            <Square className="w-4 h-4" />
                            Complete
                          </>
                        ) : exp.status === 'completed' ? (
                          <>
                            <Play className="w-4 h-4" />
                            Reset
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Start
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Create Experiment
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variants (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.variants}
                    onChange={(e) => setForm((f) => ({ ...f, variants: e.target.value }))}
                    placeholder="control, test"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Traffic allocation % (comma-separated, same order as variants)
                  </label>
                  <input
                    type="text"
                    value={form.traffic_allocation}
                    onChange={(e) => setForm((f) => ({ ...f, traffic_allocation: e.target.value }))}
                    placeholder="50, 50"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target metric
                  </label>
                  <select
                    value={form.target_metric}
                    onChange={(e) => setForm((f) => ({ ...f, target_metric: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {TARGET_METRICS.map((m) => (
                      <option key={m.value || 'blank'} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#152b50] text-white hover:bg-[#1e3a6e] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {modal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Edit Experiment
                </h2>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variants (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.variants}
                    onChange={(e) => setForm((f) => ({ ...f, variants: e.target.value }))}
                    placeholder="control, test"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Traffic allocation % (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.traffic_allocation}
                    onChange={(e) => setForm((f) => ({ ...f, traffic_allocation: e.target.value }))}
                    placeholder="50, 50"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target metric
                  </label>
                  <select
                    value={form.target_metric}
                    onChange={(e) => setForm((f) => ({ ...f, target_metric: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {TARGET_METRICS.map((m) => (
                      <option key={m.value || 'blank'} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End date
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#152b50] text-white hover:bg-[#1e3a6e] disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
