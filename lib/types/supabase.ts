export type InsightJob = {
  id: string
  user_id: string
  type: 'weekly' | 'monthly' | 'quarterly'
  week_start: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result: string | null
  error: string | null
  created_at: string
  updated_at: string
}
