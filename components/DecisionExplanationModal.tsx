'use client'

import { X } from 'lucide-react'

interface DecisionExplanationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DecisionExplanationModal({ isOpen, onClose }: DecisionExplanationModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-[#152b50]">Understanding Decision Types</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Every decision can be classified along two dimensions: <strong>Needle Mover</strong> and{' '}
            <strong>Initiative</strong>. Understanding where your decisions fall helps you see patterns
            in your decision-making.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-900"></th>
                  <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                    Proactive (You initiated)
                  </th>
                  <th className="border border-gray-300 p-3 text-center font-semibold text-gray-900">
                    Reactive (Response)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold text-gray-900 bg-gray-50">
                    <strong>Needle Mover</strong>
                  </td>
                  <td className="border border-gray-300 p-4 bg-green-50 border-green-300">
                    <strong className="text-green-800">Strategic Building</strong>
                    <br />
                    <span className="text-sm text-gray-700">
                      Intentional growth decision you initiated
                    </span>
                  </td>
                  <td className="border border-gray-300 p-4 bg-blue-50 border-blue-300">
                    <strong className="text-blue-800">Adaptive Execution</strong>
                    <br />
                    <span className="text-sm text-gray-700">
                      Might be your most important pivot—responding to change with high impact
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold text-gray-900 bg-gray-50">
                    <strong>Not Needle Mover</strong>
                  </td>
                  <td className="border border-gray-300 p-4 bg-yellow-50 border-yellow-300">
                    <strong className="text-yellow-800">Busy Work</strong>
                    <br />
                    <span className="text-sm text-gray-700">
                      Proactive but not moving the needle
                    </span>
                  </td>
                  <td className="border border-gray-300 p-4 bg-orange-50 border-orange-300">
                    <strong className="text-orange-800">Firefighting</strong>
                    <br />
                    <span className="text-sm text-gray-700">Keeping things running, responding to issues</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <p className="text-blue-900">
            <strong>💡 Insight:</strong> The magic is in the crossovers. <strong>Adaptive Execution</strong> (Reactive + Needle Mover) might be your most important pivot—responding to change with high impact. <strong>Busy Work</strong> (Proactive + Not Needle Mover) is worth doing, but not game-changing.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#ef725c] text-white rounded-lg font-medium hover:bg-[#e8654d] transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
