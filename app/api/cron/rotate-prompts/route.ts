import { NextResponse } from 'next/server'
import { rotatePrompts } from '@/lib/prompt-rotation'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await rotatePrompts()

    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      newVersion: result.newVersion,
    })
  } catch (error) {
    console.error('[Rotate Prompts] Error:', error)
    return NextResponse.json(
      { error: 'Failed to rotate prompts' },
      { status: 500 }
    )
  }
}
