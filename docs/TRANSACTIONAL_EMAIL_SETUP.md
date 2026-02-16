# Transactional Email Setup

## Environment Variables

- `MAILERLITE_TRANSACTIONAL_API_KEY` — MailerSend API key (MailerLite's transactional product). Get it from [MailerSend](https://www.mailersend.com) (same account via MailerLite SSO).
- `RESEND_API_KEY` — Fallback provider if `MAILERLITE_TRANSACTIONAL_API_KEY` is not set.

## Email Templates (optional)

Templates are built in-code. To use MailerSend templates:

1. Create templates in MailerSend dashboard.
2. Update `lib/email/transactional.ts` to pass `template_id` instead of `html`/`text` for MailerSend API.

## Triggered Emails

| Template       | Trigger                          | Opt-out Setting          |
|----------------|----------------------------------|--------------------------|
| Welcome        | Auth callback (new signup)       | `welcome_email_enabled`  |
| Export Ready   | Export API (export completed)    | `export_notification_enabled` |
| Weekly Digest  | Cron / Supabase Edge Function    | `weekly_email_enabled`   |

## API Route

`POST /api/email/transactional/send` — Protected by `CRON_SECRET` (internal) or session (user must own email).

Body: `{ template, email, variables }` — Templates: `welcome`, `export_ready`, `weekly_digest`.

## Rate Limiting

- MailerSend trial: ~10 req/min. In-code delay: 600ms between sends.
- Resend: higher limits.

## Migrations

Run `039_email_preferences.sql` to add `welcome_email_enabled` and `export_notification_enabled` to `user_profiles`.
