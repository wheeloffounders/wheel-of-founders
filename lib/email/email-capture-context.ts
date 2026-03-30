/**
 * When non-empty, `sendEmailWithTracking` records payloads here instead of sending (development only).
 * Used by the test simulation API so retention templates are previewed without delivery.
 */
export type EmailCapturePayload = {
  userId: string
  emailType: string
  dateKey: string
  subject: string
  html: string
  text: string
  templateData?: Record<string, unknown>
}

const stack: Array<(options: EmailCapturePayload) => void> = []

export function pushEmailCapture(handler: (options: EmailCapturePayload) => void): void {
  stack.push(handler)
}

export function popEmailCapture(): void {
  stack.pop()
}

export function getActiveEmailCapture(): ((options: EmailCapturePayload) => void) | undefined {
  return stack[stack.length - 1]
}
