'use client'

import { Check, AlertCircle, X } from 'lucide-react'

export function DesignSystem() {
  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-16 px-4 pt-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl mb-4" style={{ color: '#152B50' }}>Wheel of Founders</h1>
        <p className="text-xl" style={{ color: '#6B7280' }}>Design System Specification</p>
      </div>

      {/* 1. Color Palette */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Color Palette</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Navy */}
          <div className="space-y-3">
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Navy (Primary)</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#152B50' }}></div>
                <div>
                  <div className="font-mono text-sm">#152B50</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Main</div>
                  <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Backgrounds, text accent</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#1A3565' }}></div>
                <div>
                  <div className="font-mono text-sm">#1A3565</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Hover state</div>
                </div>
              </div>
            </div>
          </div>

          {/* Coral */}
          <div className="space-y-3">
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Coral (Action/Highlight)</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#EF725C' }}></div>
                <div>
                  <div className="font-mono text-sm">#EF725C</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Main</div>
                  <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Primary actions, accents</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#F28771' }}></div>
                <div>
                  <div className="font-mono text-sm">#F28771</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Hover state</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm border" style={{ backgroundColor: '#FFF0EC', borderColor: '#E5E7EB' }}></div>
                <div>
                  <div className="font-mono text-sm">#FFF0EC</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Soft background</div>
                </div>
              </div>
            </div>
          </div>

          {/* Amber */}
          <div className="space-y-3">
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Amber (Warmth/Info)</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#FBBF24' }}></div>
                <div>
                  <div className="font-mono text-sm">#FBBF24</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Accent</div>
                  <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Info highlights, tags</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm border" style={{ backgroundColor: '#FFFBEB', borderColor: '#E5E7EB' }}></div>
                <div>
                  <div className="font-mono text-sm">#FFFBEB</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Soft background</div>
                </div>
              </div>
            </div>
          </div>

          {/* Emerald */}
          <div className="space-y-3">
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Emerald (Success/Growth)</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm" style={{ backgroundColor: '#22C55E' }}></div>
                <div>
                  <div className="font-mono text-sm">#22C55E</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Success</div>
                  <div className="text-xs mt-1" style={{ color: '#6B7280' }}>Streaks, achievements</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl shadow-sm border" style={{ backgroundColor: '#ECFDF3', borderColor: '#E5E7EB' }}></div>
                <div>
                  <div className="font-mono text-sm">#ECFDF3</div>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Soft background</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Neutrals */}
        <div className="mt-8">
          <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Neutrals</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="w-full h-20 rounded-xl shadow-sm border" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}></div>
              <div className="font-mono text-xs mt-2">#F9FAFB</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>Page background</div>
            </div>
            <div>
              <div className="w-full h-20 rounded-xl shadow-sm border" style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }}></div>
              <div className="font-mono text-xs mt-2">#FFFFFF</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>Cards, panels</div>
            </div>
            <div>
              <div className="w-full h-20 rounded-xl shadow-sm" style={{ backgroundColor: '#E5E7EB' }}></div>
              <div className="font-mono text-xs mt-2">#E5E7EB</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>Borders, dividers</div>
            </div>
            <div>
              <div className="w-full h-20 rounded-xl shadow-sm" style={{ backgroundColor: '#111827' }}></div>
              <div className="font-mono text-xs mt-2">#111827</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>Text primary</div>
            </div>
            <div>
              <div className="w-full h-20 rounded-xl shadow-sm" style={{ backgroundColor: '#6B7280' }}></div>
              <div className="font-mono text-xs mt-2">#6B7280</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>Text secondary</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Typography */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Typography Scale</h2>
        <div className="space-y-6 p-8 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Page Title • 32px • Semi-bold • Line height 1.3</div>
            <div className="text-[32px] leading-[1.3]" style={{ color: '#111827', fontWeight: 600 }}>
              Good morning, Sarah
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Section Heading • 24px • Semi-bold • Line height 1.4</div>
            <div className="text-2xl leading-[1.4]" style={{ color: '#111827', fontWeight: 600 }}>
              Today&apos;s Morning Plan
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Subheading • 18px • Semi-bold • Line height 1.5</div>
            <div className="text-lg leading-[1.5]" style={{ color: '#111827', fontWeight: 600 }}>
              What&apos;s your main focus today?
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Body • 16px • Regular • Line height 1.6</div>
            <div className="text-base leading-[1.6]" style={{ color: '#111827' }}>
              This is body text used for most reading content. It&apos;s comfortable and optimized for long-form journaling and reflections with plenty of breathing room.
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Body Small • 14px • Regular • Line height 1.5</div>
            <div className="text-sm leading-[1.5]" style={{ color: '#111827' }}>
              This is slightly smaller body text for secondary content or compact layouts.
            </div>
          </div>
          <div>
            <div className="text-sm mb-2" style={{ color: '#6B7280' }}>Caption • 13px • Regular • Line height 1.4</div>
            <div className="text-[13px] leading-[1.4]" style={{ color: '#6B7280' }}>
              Helper text, timestamps, and subtle metadata
            </div>
          </div>
        </div>
      </section>

      {/* 3. Components */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Core Components</h2>

        {/* Cards */}
        <div className="mb-12">
          <h3 className="text-xl mb-6" style={{ color: '#152B50' }}>Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <div className="text-sm mb-1" style={{ color: '#152B50', fontWeight: 600 }}>Default Card</div>
              <div className="text-sm" style={{ color: '#6B7280' }}>12px radius, soft shadow, 1px border</div>
              <div className="text-xs mt-4" style={{ color: '#6B7280' }}>Used for general content containers and information panels.</div>
            </div>
            <div className="p-6 rounded-xl shadow-sm" style={{ backgroundColor: '#FFFFFF', borderLeft: '4px solid #EF725C', border: '1px solid #E5E7EB' }}>
              <div className="text-sm mb-1" style={{ color: '#152B50', fontWeight: 600 }}>Highlighted Card</div>
              <div className="text-sm" style={{ color: '#6B7280' }}>4px left border in coral</div>
              <div className="text-xs mt-4" style={{ color: '#6B7280' }}>Used for Mrs. Deer, your AI companion messages, coach insights, or emphasized content.</div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="mb-12">
          <h3 className="text-xl mb-6" style={{ color: '#152B50' }}>Buttons</h3>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <button 
                className="px-6 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#EF725C', color: '#FFFFFF' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F28771'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF725C'}
              >
                Primary Button
              </button>
              <div className="text-sm" style={{ color: '#6B7280' }}>
                Coral background, white text, 8px radius
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                className="px-6 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#FFFFFF', color: '#152B50', border: '2px solid #152B50' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
              >
                Secondary Button
              </button>
              <div className="text-sm" style={{ color: '#6B7280' }}>
                Navy outline, white background
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                className="px-6 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: 'transparent', color: '#152B50' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Ghost Button
              </button>
              <div className="text-sm" style={{ color: '#6B7280' }}>
                Text-only with subtle hover
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                className="px-6 py-3 rounded-lg opacity-50 cursor-not-allowed"
                style={{ backgroundColor: '#E5E7EB', color: '#6B7280' }}
                disabled
              >
                Disabled Button
              </button>
              <div className="text-sm" style={{ color: '#6B7280' }}>
                50% opacity, no interaction
              </div>
            </div>
          </div>
        </div>

        {/* Chips/Tags */}
        <div className="mb-12">
          <h3 className="text-xl mb-6" style={{ color: '#152B50' }}>Chips & Tags</h3>
          <div className="flex flex-wrap gap-3">
            <span className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#FFF0EC', color: '#EF725C' }}>
              Excited
            </span>
            <span className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
              Focused
            </span>
            <span className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#ECFDF3', color: '#22C55E' }}>
              Energized
            </span>
            <span className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: '#F9FAFB', color: '#6B7280' }}>
              Thoughtful
            </span>
          </div>
          <div className="text-sm mt-4" style={{ color: '#6B7280' }}>
            Rounded pill shape, semantic colors, used for emotions and tags
          </div>
        </div>

        {/* Input Fields */}
        <div className="mb-12">
          <h3 className="text-xl mb-6" style={{ color: '#152B50' }}>Input Fields & Textareas</h3>
          <div className="space-y-4 max-w-xl">
            <div>
              <input
                type="text"
                placeholder="Default input"
                className="w-full px-4 py-3 rounded-lg transition-all"
                style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}
              />
              <div className="text-xs mt-2" style={{ color: '#6B7280' }}>Default state</div>
            </div>
            <div>
              <input
                type="text"
                placeholder="Focused input"
                className="w-full px-4 py-3 rounded-lg"
                style={{ border: '2px solid #EF725C', backgroundColor: '#FFFFFF', outline: 'none' }}
              />
              <div className="text-xs mt-2" style={{ color: '#6B7280' }}>Focus state with coral border</div>
            </div>
            <div>
              <textarea
                placeholder="Large textarea for journaling..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}
              />
              <div className="text-xs mt-2" style={{ color: '#6B7280' }}>Textarea for long-form content</div>
            </div>
          </div>
        </div>

        {/* Info Banners */}
        <div className="mb-12">
          <h3 className="text-xl mb-6" style={{ color: '#152B50' }}>Info Banners</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FBBF24' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#D97706' }} />
              <div>
                <div className="text-sm" style={{ color: '#111827', fontWeight: 600 }}>Daily notifications</div>
                <div className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  Reminders will be sent at the times you select below
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Mrs. Deer, your AI companion Character Guidelines */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Mrs. Deer, your AI companion Character Guidelines</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Expression 1: Welcoming */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="w-full h-48 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFF0EC' }}>
              <div className="text-6xl">🦌</div>
            </div>
            <h4 className="mb-2" style={{ color: '#152B50', fontWeight: 600 }}>1. Welcoming</h4>
            <div className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Soft smile, open posture, inviting
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <div><strong>Use on:</strong> Login, onboarding, first-time screens</div>
              <div><strong>Avatar size:</strong> 40-48px circle</div>
              <div><strong>Hero size:</strong> 240-320px max width</div>
            </div>
          </div>

          {/* Expression 2: Thoughtful */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="w-full h-48 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFFBEB' }}>
              <div className="text-6xl">🤔🦌</div>
            </div>
            <h4 className="mb-2" style={{ color: '#152B50', fontWeight: 600 }}>2. Thoughtful</h4>
            <div className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Slight head tilt, reflective, attentive
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <div><strong>Use on:</strong> Morning planning, strategy questions</div>
              <div><strong>Avatar size:</strong> 40-48px circle</div>
              <div><strong>Hero size:</strong> 240-320px max width</div>
            </div>
          </div>

          {/* Expression 3: Encouraging */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="w-full h-48 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFF0EC' }}>
              <div className="text-6xl">😊🦌</div>
            </div>
            <h4 className="mb-2" style={{ color: '#152B50', fontWeight: 600 }}>3. Encouraging</h4>
            <div className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Warm smile, supportive, gentle cheer
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <div><strong>Use on:</strong> Evening reflection, tough day check-ins</div>
              <div><strong>Avatar size:</strong> 40-48px circle</div>
              <div><strong>Hero size:</strong> 240-320px max width</div>
            </div>
          </div>

          {/* Expression 4: Celebratory */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="w-full h-48 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#ECFDF3' }}>
              <div className="text-6xl">🎉🦌</div>
            </div>
            <h4 className="mb-2" style={{ color: '#152B50', fontWeight: 600 }}>4. Celebratory</h4>
            <div className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Big smile, confetti, motion lines
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <div><strong>Use on:</strong> Streaks, wins, shipping milestones</div>
              <div><strong>Avatar size:</strong> 40-48px circle</div>
              <div><strong>Hero size:</strong> 240-320px max width</div>
            </div>
          </div>

          {/* Expression 5: Empathetic */}
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="w-full h-48 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: '#F9FAFB' }}>
              <div className="text-6xl">🤗🦌</div>
            </div>
            <h4 className="mb-2" style={{ color: '#152B50', fontWeight: 600 }}>5. Empathetic</h4>
            <div className="text-sm mb-3" style={{ color: '#6B7280' }}>
              Softer expression, concerned but calming
            </div>
            <div className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <div><strong>Use on:</strong> Emergency/low-energy days</div>
              <div><strong>Avatar size:</strong> 40-48px circle</div>
              <div><strong>Hero size:</strong> 240-320px max width</div>
            </div>
          </div>
        </div>

        {/* Usage Guidelines */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#ECFDF3', border: '1px solid #22C55E' }}>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#22C55E' }} />
              <div>
                <div className="text-sm mb-2" style={{ color: '#111827', fontWeight: 600 }}>Do&apos;s</div>
                <ul className="text-sm space-y-1" style={{ color: '#6B7280' }}>
                  <li>• Keep avatar versions circular at 40-48px</li>
                  <li>• Use hero versions at side of key screens</li>
                  <li>• Maintain consistent padding around character</li>
                  <li>• Match expression to emotional context</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl" style={{ backgroundColor: '#FEE2E2', border: '1px solid #EF4444' }}>
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <div>
                <div className="text-sm mb-2" style={{ color: '#111827', fontWeight: 600 }}>Don&apos;ts</div>
                <ul className="text-sm space-y-1" style={{ color: '#6B7280' }}>
                  <li>• Don&apos;t crop at awkward angles</li>
                  <li>• Don&apos;t shrink below 32px on mobile</li>
                  <li>• Don&apos;t use multiple expressions in one view</li>
                  <li>• Don&apos;t make character the dominant element</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Layout Patterns */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Layout Patterns</h2>
        
        <div className="space-y-8">
          {/* Standard Page Shell */}
          <div>
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Standard Page Shell</h3>
            <div className="p-8 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="h-12 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="px-4 h-full flex items-center text-sm" style={{ color: '#6B7280' }}>Top navigation (optional)</div>
                </div>
                <div className="p-8 rounded-xl min-h-[400px]" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="text-sm" style={{ color: '#6B7280' }}>
                    <div>Content area</div>
                    <div className="mt-2">• Max width: 1024px (64rem)</div>
                    <div>• Padding: 32-48px on desktop</div>
                    <div>• Card spacing: 24px gap</div>
                    <div>• 8px spacing system throughout</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Single Column Focus */}
          <div>
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Single-Column Focus (Morning/Evening)</h3>
            <div className="p-8 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="h-16 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="px-4 h-full flex items-center text-sm" style={{ color: '#6B7280' }}>Header with greeting</div>
                </div>
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', borderLeft: '4px solid #EF725C', border: '1px solid #E5E7EB' }}>
                  <div className="text-sm" style={{ color: '#6B7280' }}>Mrs. Deer, your AI companion prompt card</div>
                </div>
                <div className="h-64 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="px-4 pt-4 text-sm" style={{ color: '#6B7280' }}>Large textarea (max-width: 42rem / 672px)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard with Cards */}
          <div>
            <h3 className="text-xl mb-4" style={{ color: '#152B50' }}>Dashboard with Card Grid</h3>
            <div className="p-8 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-3 gap-6">
                  <div className="h-32 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="px-4 pt-4 text-sm" style={{ color: '#6B7280' }}>Stat card</div>
                  </div>
                  <div className="h-32 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="px-4 pt-4 text-sm" style={{ color: '#6B7280' }}>Stat card</div>
                  </div>
                  <div className="h-32 rounded-lg" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                    <div className="px-4 pt-4 text-sm" style={{ color: '#6B7280' }}>Stat card</div>
                  </div>
                </div>
                <div className="mt-6 text-sm" style={{ color: '#6B7280' }}>
                  Grid: 2-3 columns, 24px gap, responsive collapse to single column on mobile
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing System */}
      <section>
        <h2 className="text-3xl mb-8" style={{ color: '#152B50' }}>Spacing System</h2>
        <div className="p-8 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: '4px', value: '0.25rem', use: 'Tight spacing' },
              { name: '8px', value: '0.5rem', use: 'Base unit' },
              { name: '16px', value: '1rem', use: 'Component padding' },
              { name: '24px', value: '1.5rem', use: 'Card gaps' },
              { name: '32px', value: '2rem', use: 'Section spacing' },
              { name: '48px', value: '3rem', use: 'Large sections' },
              { name: '64px', value: '4rem', use: 'Major divisions' },
            ].map(item => (
              <div key={item.name}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="rounded" style={{ width: item.name, height: '32px', backgroundColor: '#EF725C' }}></div>
                  <div>
                    <div className="text-sm" style={{ color: '#111827', fontWeight: 600 }}>{item.name}</div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>{item.value}</div>
                  </div>
                </div>
                <div className="text-xs" style={{ color: '#6B7280' }}>{item.use}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
