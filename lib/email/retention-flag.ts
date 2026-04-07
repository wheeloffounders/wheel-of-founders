/**
 * Retention email sends (cron reminders, `sendEmailWithTracking`, dry-run).
 * **On by default** — set `EMAIL_RETENTION_V1=false` to disable (e.g. staging).
 */
export function isEmailRetentionV1Enabled(): boolean {
  return process.env.EMAIL_RETENTION_V1 !== 'false'
}
