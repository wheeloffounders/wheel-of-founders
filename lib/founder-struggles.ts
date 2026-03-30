import { Target, Zap, Heart, Brain, Sparkles } from 'lucide-react'

export const founderStruggles = [
  { id: 'purpose', label: 'Finding my purpose', description: 'I need clarity on what truly matters', icon: Target },
  { id: 'meaningful', label: 'Build meaningful business', description: 'I want my business to grow and leave a mark', icon: Heart },
  { id: 'overwhelm', label: 'Reducing overwhelm', description: "I'm drowning in too many small tasks", icon: Brain },
  { id: 'stuck', label: 'Breaking through stuck', description: "I'm doing everything but still feel stuck", icon: Zap },
  { id: 'focus', label: 'Improving focus', description: 'I need better clarity and focus', icon: Target },
  { id: 'systems', label: 'Building systems', description: 'I want to systemize and delegate better', icon: Sparkles },
  { id: 'clarity', label: 'General Clarity', description: 'I want better decision-making and clarity', icon: Brain },
  { id: 'motivation', label: 'Staying motivated', description: 'I know what to do, I just struggle to do it consistently', icon: Zap },
  { id: 'calm', label: 'Finding calm', description: 'I need more peace and calm in my daily life', icon: Heart },
  { id: 'confidence', label: 'Building confidence as a founder', description: 'I want to feel more confident in my decisions and direction', icon: Target },
  { id: 'work_life_balance', label: 'Work/Life balance', description: 'I want to be more present at work and at home', icon: Heart },
] as const

export type FounderStruggleId = (typeof founderStruggles)[number]['id']
