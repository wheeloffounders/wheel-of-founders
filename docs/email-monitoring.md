# Email Delivery Monitoring

## Current Status

All core email types are working:

- Welcome emails
- Export ready notifications
- Weekly digests
- Duo invites
- Feedback notifications

## How to Monitor

### Check Server Logs

Look for:

- Successful sends: objects like `{ ok: true, messageId: ... }` from `sendTransactionalEmail`.
- Failed sends: errors logged in API routes or in `lib/email/transactional.ts`.

### Failed Delivery Investigation

If an email fails to send:

1. Check that the user exists in the database.
2. Verify the user has not opted out (for weekly digests).
3. Check the Resend/MailerSend (or configured provider) dashboard for delivery status.
4. Look for rate limiting, quota, or API key issues.

### Add Better Monitoring (Optional Future Work)

- Set up Sentry alerts for email failures.
- Add a health check endpoint for email service configuration.
- Track email metrics (sent, delivered, opened, bounced) via the provider or a dashboard.

