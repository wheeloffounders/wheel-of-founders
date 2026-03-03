/**
 * Request signing for AI endpoints.
 * Prevents unauthorized direct API calls. Secret must stay server-side.
 */
import { createHmac, timingSafeEqual } from 'crypto'

const SIGNATURE_SECRET = process.env.REQUEST_SIGNATURE_SECRET

/** Generate signature (server-only). Used by /api/auth/request-signature. */
export function generateSignature(userId: string, timestamp: number): string {
  if (!SIGNATURE_SECRET) {
    throw new Error('REQUEST_SIGNATURE_SECRET must be set to generate signatures')
  }
  return createHmac('sha256', SIGNATURE_SECRET)
    .update(`${userId}:${timestamp}`)
    .digest('hex')
}

export interface VerifyResult {
  valid: boolean
  reason?: string
}

/** Verify signature. Returns { valid: true } or { valid: false, reason }. */
export function verifySignature(
  userId: string,
  timestamp: number,
  signature: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
): VerifyResult {
  if (!SIGNATURE_SECRET) {
    return { valid: true }
  }

  if (!timestamp || !signature) {
    return { valid: false, reason: 'missing_headers' }
  }

  if (Date.now() - timestamp > maxAgeMs) {
    return { valid: false, reason: 'timestamp_expired' }
  }

  if (timestamp > Date.now() + 60000) {
    return { valid: false, reason: 'timestamp_future' }
  }

  const expected = generateSignature(userId, timestamp)

  try {
    const valid =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
    return valid ? { valid: true } : { valid: false, reason: 'invalid_signature' }
  } catch {
    return { valid: false, reason: 'invalid_signature' }
  }
}

/** Whether request signing is enabled (secret is set). */
export function isRequestSigningEnabled(): boolean {
  return !!SIGNATURE_SECRET?.trim()
}
