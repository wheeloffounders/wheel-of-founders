#!/bin/bash
# Sync latest backups to iCloud (and Google Drive if mounted)
# Run after backup-daily.sh and backup-env-local.sh
# Cron: 30 2 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-cloud.sh

set -e
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
ENV_BACKUP_DIR="$BACKUP_ROOT/env"
DB_BACKUP_DIR="$BACKUP_ROOT/database"
LOGS_DIR="$BACKUP_ROOT/logs"

# iCloud Drive path (macOS)
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/wof-backups"
GDRIVE_DIR="$HOME/Google Drive/wof-backups"

mkdir -p "$ICLOUD_DIR" "$LOGS_DIR"
[ -d "$(dirname "$GDRIVE_DIR")" ] 2>/dev/null && mkdir -p "$GDRIVE_DIR" || true

LOG_FILE="$LOGS_DIR/backup-cloud-$(date +%Y-%m-%d).log"
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] === Cloud sync ==="

SYNCED=0

# Env backup
LATEST_ENV=$(ls -t "$ENV_BACKUP_DIR"/env-*.encrypted 2>/dev/null | head -1)
if [ -n "$LATEST_ENV" ]; then
  cp "$LATEST_ENV" "$ICLOUD_DIR/" 2>/dev/null && echo "  → env: $(basename "$LATEST_ENV")" && SYNCED=1
  [ -d "$GDRIVE_DIR" ] && cp "$LATEST_ENV" "$GDRIVE_DIR/" 2>/dev/null || true
else
  echo "  WARN: No env backup found"
fi

# Database backup (latest)
LATEST_DB=$(ls -t "$DB_BACKUP_DIR"/db-*.tar.gz* 2>/dev/null | head -1)
if [ -n "$LATEST_DB" ]; then
  cp "$LATEST_DB" "$ICLOUD_DIR/" 2>/dev/null && echo "  → db: $(basename "$LATEST_DB")" && SYNCED=1
  [ -d "$GDRIVE_DIR" ] && cp "$LATEST_DB" "$GDRIVE_DIR/" 2>/dev/null || true
else
  echo "  WARN: No database backup found"
fi

echo "[$(date)] Cloud sync complete (iCloud: $ICLOUD_DIR)"
