# Security & IP Protection

This document describes security measures for Wheel of Founders, including user data protection and Mrs. Deer intellectual property (IP) protection.

## User Data Security

### Row Level Security (RLS)

All user data tables have RLS enabled. Users can only access their own rows via `auth.uid() = user_id`. See [RLS_AUDIT_REPORT.md](./RLS_AUDIT_REPORT.md) for details.

### Rate Limiting

AI insight endpoints are rate-limited per user tier:

| Tier | Daily (morning/post_morning/evening) | Weekly/Monthly/Quarterly | Emergency |
|------|-------------------------------------|---------------------------|-----------|
| Free | 2 per day | 1 per period | 5 per day |
| Pro/Beta | 5 per day | 3 per period | 5 per day |

### Abuse Detection

- **Threshold:** >10 insights in 1 hour or >20 in 24 hours triggers a block
- **Action:** Request rejected with 429 (Too many requests)
- **Logging:** Suspicious activity is logged to console

## Mrs. Deer IP Protection

### 1. Prompt Overrides (Environment Variables)

Prompts can be overridden via environment variables to keep them out of the deployed bundle:

| Variable | Purpose | Fallback |
|----------|---------|----------|
| `MRS_DEER_SYSTEM_PROMPT` | Base personality | Built-in default |
| `MRS_DEER_TONE_RULES` | Tone detection rules | Built-in default |
| `MRS_DEER_BANNED_PHRASES` | Banned phrases | Built-in default |

**Production:** Set these in Vercel Environment Variables. The real prompts are stored server-side, not in the repo.

**Development:** Leave unset; built-in defaults are used.

### 2. Request Signing (Phase 2)

When `REQUEST_SIGNATURE_SECRET` is set:
- Client fetches signed headers from `POST /api/auth/request-signature`
- AI requests must include `X-Timestamp` and `X-Signature`
- Invalid or expired signatures return 403

### 3. Response Watermarking (Phase 2)

When `WATERMARK_SECRET` is set:
- Invisible zero-width characters are inserted into AI responses
- Helps trace stolen content back to the user
- No-op when unset

### 4. Honeypot Endpoints (Phase 3)

When `HONEYPOT_ENABLED=true`:
- `/api/prompts` and `/api/mrs-deer-secrets` log and block access
- Attempts are stored in `security_logs`

### 5. Prompt Rotation (Phase 3)

- Weekly cron `GET /api/cron/rotate-prompts` creates new versions with slight variations
- Versions stored in `prompt_versions` table
- Use `getCurrentPrompts()` from `lib/prompt-rotation` for optional DB-based prompts

### 6. Honeypot Monitoring (Phase 3)

- Hourly cron `GET /api/cron/check-honeypot` scans `security_logs`
- Alerts when >5 triggers from same IP, >10 from same user-agent
- Alerts stored in `security_alerts` table

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CRON_SECRET` | Yes (prod) | Protects cron-triggered jobs |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side DB access (never expose to client) |
| `MRS_DEER_*` | No | Prompt overrides for IP protection |
| `REQUEST_SIGNATURE_SECRET` | No | Request signing (optional) |
| `WATERMARK_SECRET` | No | Response watermarking (optional) |
| `HONEYPOT_ENABLED` | No | Set to `true` to enable honeypot endpoints |

## Reporting Security Issues

If you discover a security vulnerability, please contact the team privately. Do not open issues for security vulnerabilities.
