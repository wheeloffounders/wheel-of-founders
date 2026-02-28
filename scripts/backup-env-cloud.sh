#!/bin/bash
# Layer C: Copy encrypted backups to cloud (iCloud / Google Drive)
# Run after backup-env-local.sh: bash scripts/backup-env-cloud.sh
# Cron: 0 4 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-env-cloud.sh

set -e
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
ENV_BACKUP_DIR="$BACKUP_ROOT/env"

# iCloud Drive path (macOS)
ICLOUD_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/wof-backups"
# Google Drive path (if mounted - common locations)
GDRIVE_DIR="$HOME/Google Drive/wof-backups"

mkdir -p "$ICLOUD_DIR"
[ -d "$(dirname "$GDRIVE_DIR")" ] 2>/dev/null && mkdir -p "$GDRIVE_DIR" || true

# Copy latest encrypted env backup
LATEST=$(ls -t "$ENV_BACKUP_DIR"/env-*.encrypted 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "WARN: No encrypted env backup found. Run backup-env-local.sh first." >&2
  exit 1
fi

echo "[$(date)] Syncing to cloud..."
cp "$LATEST" "$ICLOUD_DIR/" 2>/dev/null && echo "  → iCloud: $ICLOUD_DIR" || echo "  → iCloud: failed"
[ -d "$GDRIVE_DIR" ] && cp "$LATEST" "$GDRIVE_DIR/" 2>/dev/null && echo "  → Google Drive: $GDRIVE_DIR" || true

echo "[$(date)] Cloud sync complete"
