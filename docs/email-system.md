# Email System Architecture

## Overview

Transactional emails are sent via the `sendTransactionalEmail` helper in `lib/email/transactional.ts`, which uses MailerSend or Resend under the hood. Most user-facing emails go through the `/api/email/transactional/send` endpoint or dedicated API routes.

## Email Types

### 1. Template-based (via `/api/email/transactional/send`)

- **welcome** – New user welcome email.
- **export_ready** – Data export notifications.
- **weekly_digest** – Weekly insights / digest (respects opt-out via notification settings).

### 2. Direct API Routes

- **`/api/duo/invite`** – Duo partner invitations.
- **`/api/feedback`** – Admin feedback notifications.
- **`/api/cron/check-profile-completion`** – Profile completion reminders (cron only).
- **`auth/callback` route** – Sends welcome emails on successful auth callback.

## Authentication Rules

| Email Type             | Auth Required       | Special Headers                         |
|------------------------|--------------------|-----------------------------------------|
| Template emails        | Yes (session)      | None                                    |
| Duo invites            | Yes (session)      | None                                    |
| Feedback notifications | Yes (session)      | None                                    |
| Cron emails            | No user session    | `Authorization: Bearer CRON_SECRET`     |

The transactional endpoint uses `getServerSessionFromRequest` to validate the session and enforces that `body.email` matches the authenticated user’s email (from `user_profiles` or Supabase auth).

## Testing

See [`cron-email-testing.md`](./cron-email-testing.md) for cron job testing, and [`email-monitoring.md`](./email-monitoring.md) for monitoring guidance.

## Troubleshooting

### Common Errors

- **401 Unauthorized**: No valid session found (or missing/invalid cron secret for cron routes).
- **403 Forbidden**: `email` in the request body does not match the authenticated user.
- **400 Bad Request**: Invalid template name or missing required fields.
- **Provider errors**: Logged from `lib/email/transactional.ts` when MailerSend/Resend return an error.

### Quick Fixes

1. Confirm the user is logged in (for session-protected routes).
2. Verify the `email` passed to `/api/email/transactional/send` matches the session user.
3. Ensure the template name is one of `welcome`, `export_ready`, or `weekly_digest`.
4. Check that transactional email API keys are configured in the environment.

