#!/bin/bash
# Backup Vercel project configuration and project files
# Run: bash scripts/backup-vercel-config.sh
# Cron: 0 5 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-vercel-config.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
VERCEL_BACKUP_DIR="$BACKUP_ROOT/vercel-config"
RETENTION_DAYS=30

mkdir -p "$VERCEL_BACKUP_DIR"
cd "$PROJECT_DIR"

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_SUBDIR="$VERCEL_BACKUP_DIR/config-$TIMESTAMP"
mkdir -p "$BACKUP_SUBDIR"

echo "[$(date)] Backing up Vercel config..."

# Copy config files
cp -p vercel.json "$BACKUP_SUBDIR/" 2>/dev/null || true
cp -p next.config.js "$BACKUP_SUBDIR/" 2>/dev/null || true
cp -p next.config.ts "$BACKUP_SUBDIR/" 2>/dev/null || true
cp -p package.json "$BACKUP_SUBDIR/" 2>/dev/null || true

# Export project info (if vercel CLI available)
npx vercel project ls 2>/dev/null > "$BACKUP_SUBDIR/vercel-projects.txt" || true
npx vercel env ls 2>/dev/null > "$BACKUP_SUBDIR/vercel-env-list.txt" || true

# Create tarball
cd "$VERCEL_BACKUP_DIR"
tar -czf "config-$TIMESTAMP.tar.gz" "config-$TIMESTAMP"
rm -rf "config-$TIMESTAMP"
cd "$PROJECT_DIR"

# Prune old backups
find "$VERCEL_BACKUP_DIR" -name "config-*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo "[$(date)] Vercel config backup: $VERCEL_BACKUP_DIR/config-$TIMESTAMP.tar.gz"
