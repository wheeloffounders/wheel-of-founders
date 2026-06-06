import { NextRequest, NextResponse } from 'next/server'
import { AIError, generateAIPrompt } from '@/lib/ai-client'
import { authorizeAdminApiRequest } from '@/lib/admin'
import type { AcquisitionHubPayload } from '@/lib/admin/build-acquisition-hub'
import {
  ACQUISITION_ADVISOR_MODELS,
  MRS_DEER_ACQUISITION_SYSTEM,
  buildAcquisitionAdvisorUserPrompt,
  formatFallbackAcquisitionAdvice,
} from '@/lib/admin/acquisition-deer-advisor'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { payload?: AcquisitionHubPayload }
    const payload = body.payload
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }

    try {
      const text = await generateAIPrompt({
        systemPrompt: MRS_DEER_ACQUISITION_SYSTEM,
        userPrompt: buildAcquisitionAdvisorUserPrompt(payload),
        maxTokens: 1200,
        temperature: 0.45,
        models: [...ACQUISITION_ADVISOR_MODELS],
      })
      return NextResponse.json({ advice: text.trim(), fallback: false })
    } catch (e) {
      console.error('[admin/acquisition/analyze] AI failure — fallback', e)
      if (e instanceof AIError) {
        console.error('[admin/acquisition/analyze] AIError:', e.message, e.model)
      }
      return NextResponse.json({
        advice: formatFallbackAcquisitionAdvice(payload),
        fallback: true,
        fallbackReason: e instanceof Error ? e.message : 'AI unavailable',
      })
    }
  } catch (e) {
    console.error('[admin/acquisition/analyze]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to analyze' },
      { status: 500 }
    )
  }
}
