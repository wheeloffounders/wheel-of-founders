# Testing Cron Emails

Cron emails (profile completion reminders) require a `CRON_SECRET` and cannot be tested directly from the browser.

## Manual Test Method

1. Get the `CRON_SECRET` from your environment variables.
2. Use curl or Postman to trigger the endpoint:

```bash
curl -X GET "http://localhost:3000/api/cron/check-profile-completion" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

3. Check server logs for execution details.

## Important Notes

- Only runs for users with incomplete profiles.
- Respects any relevant notification settings.
- Will send real emails – use with caution in production.

