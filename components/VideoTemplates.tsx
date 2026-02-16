'use client'

import { Video, Play, Clock } from 'lucide-react'
import { useState } from 'react'

interface VideoTemplate {
  id: string
  title: string
  duration: string
  description: string
  template: string[]
}

const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'weekly-planning',
    title: 'Weekly Planning Walkthrough',
    duration: '5 min',
    description: 'Record yourself planning the week ahead',
    template: [
      '1. Review last week (30s)',
      '2. This week\'s priorities (2 min)',
      '3. Potential challenges (1 min)',
      '4. Success metrics (30s)',
      '5. Action commitments (1 min)',
    ],
  },
  {
    id: 'morning-intention',
    title: 'Morning Intention Setting',
    duration: '3 min',
    description: 'Set your daily focus and energy',
    template: [
      '1. How do I want to feel today? (30s)',
      '2. What\'s my ONE needle mover? (1 min)',
      '3. What could derail me? (30s)',
      '4. How will I stay focused? (1 min)',
    ],
  },
  {
    id: 'evening-reflection',
    title: 'Evening Reflection',
    duration: '4 min',
    description: 'Reflect on the day and prepare for tomorrow',
    template: [
      '1. What went well today? (1 min)',
      '2. What did I learn? (1 min)',
      '3. What will I do differently? (1 min)',
      '4. Tomorrow\'s focus (1 min)',
    ],
  },
  {
    id: 'decision-log',
    title: 'Decision Log Review',
    duration: '3 min',
    description: 'Review your strategic decisions',
    template: [
      '1. What decisions did I make? (1 min)',
      '2. Why did I make them? (1 min)',
      '3. What\'s the impact? (1 min)',
    ],
  },
  {
    id: 'monthly-review',
    title: 'Monthly Review',
    duration: '7 min',
    description: 'Monthly reflection and planning',
    template: [
      '1. Wins and accomplishments (2 min)',
      '2. Challenges and lessons (2 min)',
      '3. Patterns I notice (1 min)',
      '4. Next month\'s focus (2 min)',
    ],
  },
]

interface VideoTemplatesProps {
  onSelect?: (template: VideoTemplate) => void
}

export function VideoTemplates({ onSelect }: VideoTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-6 h-6 text-purple-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Video Template Library</h2>
          <p className="text-sm text-gray-600">Record structured reflections using these templates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VIDEO_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedTemplate === template.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
            }`}
            onClick={() => {
              setSelectedTemplate(template.id)
              onSelect?.(template)
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{template.title}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {template.duration}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            <ul className="space-y-1 text-xs text-gray-700">
              {template.template.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {selectedTemplate === template.id && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">
                  <Play className="w-4 h-4" />
                  Start Recording
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-gray-700">
          <strong>Tip:</strong> Use these templates to create structured video reflections. Record yourself following
          the prompts, then save for future reference or share with your team.
        </p>
      </div>
    </div>
  )
}
