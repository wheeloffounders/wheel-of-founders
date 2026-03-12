'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

type Severity = 'hot' | 'warm' | 'contained'

interface EmergencyCardProps {
  emergency: {
    id: string
    description: string
    severity: Severity
    notes: string | null
    resolved: boolean
    created_at: string
    fire_date?: string
  }
  onDelete: (id: string) => void
  onToggleResolved: (id: string, resolved: boolean) => void
  severityOptions: { value: Severity; label: string; emoji: string }[]
}

export function EmergencyCard({
  emergency,
  onDelete,
  onToggleResolved,
  severityOptions,
}: EmergencyCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { data: { session } } = await import('@/lib/supabase').then((m) => m.supabase.auth.getSession())
      const headers: Record<string, string> = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/emergency/${emergency.id}`, {
        method: 'DELETE',
        headers,
      })

      if (response.ok) {
        onDelete(emergency.id)
      } else {
        console.error('Failed to delete emergency')
      }
    } catch (error) {
      console.error('Error deleting emergency:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const severityOption = severityOptions.find((s) => s.value === emergency.severity)

  return (
    <>
      <li
        className={`p-4 rounded-lg border ${
          emergency.resolved
            ? 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700 opacity-75'
            : 'bg-[#f8f4f0] dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  emergency.severity === 'hot'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : emergency.severity === 'warm'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                }`}
              >
                {severityOption?.emoji} {emergency.severity}
              </span>
              <span className="text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300">
                {format(new Date(emergency.created_at), 'h:mm a')}
              </span>
            </div>
            <p
              className={`text-gray-900 dark:text-gray-100 dark:text-white ${
                emergency.resolved ? 'line-through text-gray-700 dark:text-gray-300 dark:text-gray-300' : ''
              }`}
            >
              {emergency.description}
            </p>
            {emergency.notes && (
              <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 mt-1">{emergency.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onToggleResolved(emergency.id, !emergency.resolved)}
              className={`text-sm font-medium px-2 py-1 rounded ${
                emergency.resolved
                  ? 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 dark:hover:bg-gray-800'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40'
              }`}
            >
              {emergency.resolved ? 'Reopen' : 'Resolved'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label="Delete emergency"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </li>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Emergency"
        message="Are you sure you want to delete this emergency? This action cannot be undone."
      />
    </>
  )
}
