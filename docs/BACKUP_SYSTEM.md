# Wheel of Founders - Backup System

Fully automated backup system for environment variables and database. Runs daily without manual intervention.

## Quick Start

**One-time setup:**

```bash
cd ~/Desktop/wheel-of-founders
./scripts/setup-backups.sh
```

This creates directories, makes scripts executable, runs an initial backup, and optionally installs cron jobs.

## Overview

| What | When | Where |
|------|------|-------|
| Database backup | Daily 1am | `~/.wof-backups/database/` |
| Env vars backup | Daily 2am | `~/.wof-backups/env/` |
| Cloud sync | Daily 2:30am | iCloud, Google Drive |
| Monitor | Every 6 hours | Alerts if backup missing/stale |

## Directory Structure

```
~/.wof-backups/
├── database/     # Full schema + data dumps (encrypted)
├── env/          # Encrypted .env backups
├── logs/         # backup-daily, backup-env, backup-cloud, cron, monitor
└── (iCloud)      # ~/Library/Mobile Documents/.../wof-backups/
```

## Setup for Automated Cron

1. **Create `~/.wof-backup-env`** (chmod 600):
   ```bash
   export WOF_BACKUP_PASSWORD="your-password-from-1password"
   export SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
   ```
   Get SUPABASE_DB_URL from: Supabase Dashboard → Settings → Database → Connection string (URI, **direct**)

2. **Install cron:**
   ```bash
   ./scripts/install-cron.sh
   ```

## Scripts

| Script | Purpose |
|--------|---------|
| `setup-backups.sh` | One-time setup: dirs, permissions, initial backup, cron |
| `backup-daily.sh` | Full database backup (schema + critical tables) |
| `backup-env-local.sh` | Pull env from Vercel, encrypt, save |
| `backup-cloud.sh` | Sync latest backups to iCloud/GDrive |
| `backup-monitor.sh` | Check backups are fresh; macOS notification if not |
| `install-cron.sh` | Add cron jobs for automated backups |
| `restore-all.sh` | Interactive restore of env vars to Vercel |

## Restore

### Env vars

```bash
./scripts/restore-all.sh
```

Select backup, enter password, confirm. Then: `npx vercel --prod`

### Database

**Warning:** Overwrites existing data.

```bash
# Decrypt
openssl enc -aes-256-cbc -d -pbkdf2 -in ~/.wof-backups/database/db-YYYY-MM-DD.tar.gz.enc -out db.tar.gz -k PASSWORD

# Extract and restore
tar -xzf db.tar.gz
psql $SUPABASE_DB_URL < schema.sql
psql $SUPABASE_DB_URL < data.sql
```

## Monitor & Alerts

- **Logs:** `~/.wof-backups/logs/`
- **macOS notification:** If backup missing or older than 48 hours
- **Email:** Set `WOF_ALERT_EMAIL` in `~/.wof-backup-env` for email alerts

## Where Passwords Are Stored

- **Backup encryption:** 1Password (Wheel of Founders vault) → put in `~/.wof-backup-env` for cron
- **Supabase:** Dashboard → Settings → API
- **OpenRouter:** https://openrouter.ai/keys

## Emergency

See [ENV_RECOVERY.md](./ENV_RECOVERY.md) for manual restore steps and where to find each variable.
