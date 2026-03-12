# Cross-Platform Notification Strategy

A layered approach so users receive notifications through at least one channel, with clear guidance and measurable delivery.

---

## 1. Architecture Overview

### Channels (priority order for delivery)

| Channel        | Web | Android PWA | iOS | Desktop | Fallback use      |
|----------------|-----|-------------|-----|---------|-------------------|
| **Push**       | ✅  | ✅          | ❌  | ✅      | Primary when on   |
| **In-app**     | ✅  | ✅          | ✅  | ✅      | When app is open  |
| **Email**      | ✅  | ✅          | ✅  | ✅      | Always available  |
| **SMS** (opt-in) | ✅ | ✅          | ✅  | ✅      | Urgent only       |

### Fallback chain (per notification type)

1. **Non-urgent (reminders, insights)**  
   - If user has push: try push → on failure or “no subscription”, send email if `email_notifications_enabled`.  
   - If user prefers email only: send email.  
   - Always create an in-app notification so it appears in the notification center when the user is in the app.

2. **Critical (e.g. account, security)**  
   - Send email always.  
   - Optionally send push + in-app.  
   - SMS only if user opted in and notification is marked urgent.

3. **When user is in-app**  
   - Show in-app toast/banner immediately.  
   - Still send push/email according to preferences (for later visibility).

### Database schema (additions)

- **user_notification_settings** (extend existing):
  - `email_notifications_enabled` (boolean, default true)
  - `in_app_enabled` (boolean, default true)
  - `sms_opt_in` (boolean, default false)
  - `preferred_channel` ('push' | 'email' | 'in_app') for non-urgent
  - Optional: `last_email_sent_at`, `email_digest_frequency` ('immediate' | 'daily')

- **notification_logs** (extend existing):
  - `channel` (text: 'push' | 'email' | 'in_app' | 'sms') for delivery analytics

- **in_app_notifications** (new, optional):
  - `id`, `user_id`, `title`, `body`, `url`, `read_at`, `created_at`  
  - Used for notification center and “past notifications”.

### Queue and retry (recommendation)

- Use a **queue** (e.g. Supabase Edge Functions + pg_cron, or Inngest/Trigger.dev) for:
  - Decoupling send from request (avoid timeouts).
  - Retries with backoff for push/email/SMS.
- **Retry logic**: 3 attempts for push (with 410 → remove subscription); 2 for email; 1 for in-app (fire-and-forget).
- **Fallback**: If push fails (no devices or 4xx), enqueue email for same notification if user has email enabled.

---

## 2. Platform-Specific Behavior

### Web (Chrome, Brave, Firefox, Safari)

- **Push**: Service worker + Web Push API; VAPID keys; subscription stored in `push_subscriptions`.
- **Limitations**: Blocked by Do Not Disturb, Focus, or browser “Quiet” mode; permission can be revoked.
- **Guidance**: Detect OS (see below) and show “Allow notifications” + “Check Do Not Disturb / Focus” for Mac/Windows. Test button in production (with rate limit) to verify delivery.

### Android (PWA)

- Same as web push when PWA is installed; subscription is per-browser/device.
- **Guidance**: “Add to Home Screen” for best reliability; ensure service worker is updated (`__forceSWUpdate` in dev).

### iOS (Safari)

- **No Web Push** for normal Safari; Web Push is limited (iOS 16.4+ and only in standalone/capable contexts). Do **not** rely on push for iOS.
- **Strategy**: Prefer **email** and **in-app**. In settings, show “On iPhone, we’ll send reminders by email and in the app” and default `preferred_channel` to `email` when iOS is detected.

### Desktop (Electron / Tauri)

- If you ship a desktop app, use native push (e.g. Electron’s `notification`) or continue web push in a WebView; same fallback chain (email + in-app).

---

## 3. User Guidance System

### OS / environment detection

- **Client**: `navigator.userAgent`, `navigator.platform`, or a small library (e.g. `ua-parser-js`) to infer Mac / Windows / Linux / iOS / Android.
- **Use**: Show OS-specific tips (e.g. “On Mac: System Settings → Notifications → Browser → Allow”) and default `preferred_channel` on iOS to email.

### Notification permission flow

1. **Request permission** only after a short in-app explanation (“Get reminders at 9am”).
2. If **denied**: Show “You can still get reminders by email” and enable email fallback in settings.
3. If **granted** but no notifications appear: Show troubleshooting (check DND/Focus, try “Send test notification”), and suggest email as backup.

### Test notification in production

- Keep a **“Send test notification”** button (e.g. in Settings → Notifications), with **rate limiting** (e.g. 3 per hour per user) to avoid abuse.
- Log test sends in `notification_logs` with `channel = 'push'` (or email if testing email). Use for support and analytics.

---

## 4. Analytics and Monitoring

- **Delivery rates**: By `channel` and `type` (e.g. morning_reminder, weekly_insight). Query `notification_logs` for `success = true` vs total.
- **Opens/clicks**: For email, use link tracking (e.g. `?utm_source=notification&id=...`); for push/in-app, log when user opens the target URL from the notification.
- **Alerts**: If push delivery rate drops below a threshold (e.g. 80%) over 24h, alert (e.g. Slack or PagerDuty) to check VAPID keys, push service, or subscription cleanup.

---

## 5. Code Artifacts in This Repo

- **Migration 074** (`supabase/migrations/074_notification_multi_channel.sql`): Adds `email_notifications_enabled`, `in_app_enabled`, `preferred_channel` to `user_notification_settings`; adds `channel` to `notification_logs`; creates `in_app_notifications` table.
- **In-app**:
  - `lib/contexts/InAppNotificationContext.tsx`: Provider + `useInAppNotifications()`; in-memory list, `addNotification`, `markRead`, `markAllRead`.
  - `components/notifications/NotificationCenter.tsx`: Bell icon + dropdown listing notifications (used in `AppHeader`). Wire to `in_app_notifications` table when you add API fetch.
- **Guidance**: `components/notifications/NotificationGuidance.tsx`: OS detection (Mac/Windows/iOS/Android/Linux), shows setup steps and email fallback tip. Use `variant="compact"` or `"full"` on Settings → Notifications.
- **Guided setup wizard**: `components/notifications/NotificationWizard.tsx` – Interactive step-by-step flow per platform (Mac, Windows, Android, Linux, iOS, other). Steps use verification: `request_permission` (browser prompt), `test_notification` (send test + "Did you see it?"), `confirm_saw` ("I did this"). Progress is stored in localStorage; completion clears it and shows a success state. Step definitions live in `lib/notifications/wizard-steps.ts`. Platform detection in `lib/notifications/platform.ts`. The wizard is shown on Settings → Notifications when push is not yet enabled.
- **Email**: `lib/notifications/email-templates.ts`: `buildNotificationEmail({ title, body, ctaUrl, ctaLabel, userName })` returns `{ subject, html, text }` for use with `sendTransactionalEmail`.

**Layout**: `InAppNotificationProvider` wraps the app in `app/layout.tsx`; `NotificationCenter` is in `AppHeader`.

Implement fallback chains and queue in the **cron/scheduler** and **API routes** that send notifications: check `preferred_channel` and `*_enabled` flags, then try push → email → in-app as designed above. When sending, insert into `in_app_notifications` so the notification center can load past items from the DB.
