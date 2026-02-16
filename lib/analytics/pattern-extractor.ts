import { getServerSupabase } from '@/lib/server-supabase'
import { generateAIPrompt } from '@/lib/ai-client'

const PATTERN_TYPES = ['struggle', 'win', 'theme', 'pain_point', 'goal'] as const

export async function extractPatternsFromText(
  userId: string,
  sourceTable: string,
  sourceId: string,
  text: string
) {
  if (!text?.trim()) return
  const supabase = getServerSupabase()
  await supabase.from('pattern_extraction_queue').insert({
    user_id: userId,
    source_table: sourceTable,
    source_id: sourceId,
    content: text.trim(),
  })
}

export async function processPatternQueue(batchSize = 50) {
  const supabase = getServerSupabase()

  const { data: queue } = await supabase
    .from('pattern_extraction_queue')
    .select('*')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(batchSize)

  for (const item of queue || []) {
    try {
      const patterns = await generateAIPrompt({
        systemPrompt: `You are an analyst. Extract key themes from a founder's reflection text. Return ONLY a valid JSON array of objects. Each object must have: "type" (one of: struggle, win, theme, pain_point, goal) and "text" (short phrase, no quotes). Example: [{"type":"struggle","text":"prioritization"},{"type":"win","text":"shipped feature"}]`,
        userPrompt: `Text:\n${(item.content || '').slice(0, 4000)}`,
        maxTokens: 500,
        temperature: 0.3,
      })

      if (!patterns) {
        await supabase
          .from('pattern_extraction_queue')
          .update({ processed: true })
          .eq('id', item.id)
        continue
      }

      const raw = patterns.replace(/^[\s\S]*?\[/, '[').replace(/\][\s\S]*$/, ']')
      let extracted: Array<{ type?: string; text?: string }> = []
      try {
        extracted = JSON.parse(raw) as Array<{ type?: string; text?: string }>
      } catch {
        try {
          extracted = JSON.parse(patterns) as Array<{ type?: string; text?: string }>
        } catch {
          // skip invalid JSON
        }
      }

      for (const p of Array.isArray(extracted) ? extracted : []) {
        const type = p.type && PATTERN_TYPES.includes(p.type as (typeof PATTERN_TYPES)[number]) ? p.type : 'theme'
        const text = (p.text && String(p.text).trim()) || null
        if (!text) continue
        await supabase.from('user_patterns').insert({
          user_id: item.user_id,
          pattern_type: type,
          pattern_text: text,
          source_table: item.source_table,
          source_id: item.source_id,
          detected_at: new Date().toISOString(),
        })
      }

      await supabase
        .from('pattern_extraction_queue')
        .update({ processed: true })
        .eq('id', item.id)
    } catch (error) {
      console.error('Pattern extraction failed for queue item:', item.id, error)
    }
  }
}
