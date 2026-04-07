'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SaveTaskPayload = {
  description: string
  whyThisMatters: string
  isProactive: boolean | null
  needleMover: boolean | null
  actionPlan: string | ''
}

interface SaveAsTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  task: SaveTaskPayload | null
}

export function SaveAsTemplateModal({ isOpen, onClose, task }: SaveAsTemplateModalProps) {
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | ''>('')
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const loadTemplates = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/templates', { credentials: 'include' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load templates')
        }
        const data = (await res.json()) as { templates: { id: string; name: string }[] }
        setTemplates(data.templates || [])
      } catch (err) {
        console.error('[SaveAsTemplateModal] load error', err)
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }
    loadTemplates()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setMode('new')
      setSelectedTemplateId('')
      setNewName('')
      setError(null)
    }
  }, [isOpen])

  if (!isOpen || !task) return null

  const hasDescription = !!task.description?.trim()

  const handleSave = async () => {
    if (!hasDescription) {
      setError('Fill in the task first (description, why, and action plan) before saving it as a template.')
      return
    }
    if (saving) return
    let templateName: string | undefined
    if (mode === 'existing') {
      const tpl = templates.find((t) => t.id === selectedTemplateId)
      if (!tpl) {
        setError('Select a template to add this task.')
        return
      }
      templateName = tpl.name
    } else {
      if (!newName.trim()) {
        setError('Enter a template name.')
        return
      }
      templateName = newName.trim()
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/save-as-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: task.description,
          why_important: task.whyThisMatters || undefined,
          is_proactive: task.isProactive ?? false,
          is_needle_mover: task.needleMover ?? false,
          action_plan: task.actionPlan || null,
          templateName,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to save template')
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Saved to template "${templateName}"`,
              type: 'success',
            },
          })
        )
      }
      onClose()
    } catch (err) {
      console.error('[SaveAsTemplateModal] save error', err)
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Save this task as a template
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <div className="font-medium mb-1">Task to save</div>
            <div>{task.description || 'Untitled task'}</div>
          </div>
          {task.whyThisMatters && (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div className="font-medium mb-1">Why</div>
              <div>{task.whyThisMatters}</div>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4">
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Template category
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Group similar tasks into categories so you can reuse them together later.
          </p>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={mode === 'existing'}
                onChange={() => setMode('existing')}
              />
              <span>Add to existing category</span>
            </label>
            {mode === 'existing' && (
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={loading || templates.length === 0}
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 mt-2">
              <input
                type="radio"
                className="h-4 w-4"
                checked={mode === 'new'}
                onChange={() => setMode('new')}
              />
              <span>Create new category</span>
            </label>
            {mode === 'new' && (
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                placeholder="Daily Checklist"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            )}
          </div>
        </div>

        {!hasDescription && (
          <div className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            To save this as a template, first complete the task fields on the Morning page
            (what the task is, why it matters, and how you&apos;ll approach it).
          </div>
        )}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 mb-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

