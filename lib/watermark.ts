/**
 * Response watermarking for AI insights.
 * Invisible markers help trace stolen content. Optional when WATERMARK_SECRET is unset.
 */
import { createHash } from 'crypto'

const WATERMARK_SECRET = process.env.WATERMARK_SECRET

/** Zero-width character range for encoding */
const ZWC_BASE = 0x200b

/** Generate invisible watermark string for a user. */
function generateWatermark(userId: string): string {
  if (!WATERMARK_SECRET) return ''
  const hash = createHash('sha256')
    .update(userId + WATERMARK_SECRET)
    .digest('hex')
  const watermarkId = hash.slice(0, 8)
  return watermarkId
    .split('')
    .map((c) => String.fromCharCode(ZWC_BASE + (c.charCodeAt(0) % 10)))
    .join('')
}

/**
 * Add invisible watermark to text. No-op when WATERMARK_SECRET is unset.
 */
export function addWatermark(text: string, userId: string): string {
  const watermark = generateWatermark(userId)
  if (!watermark) return text

  const minPos = Math.min(100, Math.floor(text.length * 0.2))
  const maxPos = Math.max(minPos, text.length - 100)
  const pos = minPos + Math.floor(Math.random() * Math.max(0, maxPos - minPos))

  return text.slice(0, pos) + watermark + text.slice(pos)
}

/**
 * Extract watermark hex from text (for verification).
 */
export function extractWatermark(text: string): string | null {
  const zwcRegex = /[\u200B-\u200F]/g
  const match = text.match(zwcRegex)
  if (!match?.length) return null
  return match
    .map((c) => (c.charCodeAt(0) - ZWC_BASE).toString(16))
    .join('')
}

/** Whether watermarking is enabled. */
export function isWatermarkingEnabled(): boolean {
  return !!WATERMARK_SECRET?.trim()
}
