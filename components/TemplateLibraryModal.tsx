'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

type TemplateTask = {
  id: string
  description: string
  why_important: string | null
  is_proactive: boolean
  is_needle_mover: boolean
  action_plan: string | null
  task_order: number
}

type Template = {
  id: string
  name: string
  tasks: TemplateTask[]
}

interface TemplateLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  planDate: string
  onApplyTemplate: (templateId: string) => Promise<void> | void
  onInsertTaskFromTemplate: (task: TemplateTask) => void
}

export function TemplateLibraryModal({
  isOpen,
  onClose,
  planDate,
  onApplyTemplate,
  onInsertTaskFromTemplate,
}: TemplateLibraryModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isOpen) return
    const fetchTemplates = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/templates', { credentials: 'include' })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load templates')
        }
        const data = (await res.json()) as { templates: Template[] }
        setTemplates(data.templates || [])
      } catch (err) {
        console.error('[TemplateLibraryModal] load error', err)
        setError(err instanceof Error ? err.message : 'Failed to load templates')
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [isOpen])

  if (!isOpen) return null

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Your Templates
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading templates...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You don&apos;t have any templates yet. Use the ⭐ button on a task to save it as a template.
              </p>
            ) : (
              <div className="space-y-3">
                {templates.map((tpl) => {
                  const isOpenTpl = expanded[tpl.id] ?? true
                  return (
                    <div
                      key={tpl.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left"
                          onClick={() => toggleExpanded(tpl.id)}
                        >
                          {isOpenTpl ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {tpl.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {tpl.tasks.length} task{tpl.tasks.length === 1 ? '' : 's'}
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await onApplyTemplate(tpl.id)
                              } finally {
                                onClose()
                              }
                            }}
                          >
                            Apply to {planDate}
                          </Button>
                        </div>
                      </div>
                      {isOpenTpl && tpl.tasks.length > 0 && (
                        <div className="px-4 pb-3 space-y-1">
                          {tpl.tasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
                              onClick={() => {
                                onInsertTaskFromTemplate(task)
                                onClose()
                              }}
                            >
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {task.description}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {task.action_plan || ''}
                                  {task.is_needle_mover && ' • Needle mover'}
                                  {task.is_proactive && ' • Proactive'}
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

