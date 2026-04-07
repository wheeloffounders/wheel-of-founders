import { NextRequest } from 'next/server'
import { postResendWebhook } from '@/lib/email/resend-webhook-http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  return postResendWebhook(req)
}
