#!/bin/bash
# Backup Supabase schema and critical data
# Requires: Supabase CLI, DIRECT database URL in .env.local or SUPABASE_DB_URL
# Run: bash scripts/backup-supabase.sh
# Cron: 0 3 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-supabase.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
DB_BACKUP_DIR="$BACKUP_ROOT/supabase"
RETENTION_DAYS=30

mkdir -p "$DB_BACKUP_DIR"
cd "$PROJECT_DIR"

# Get DB URL - use DIRECT connection (not pooler) for pg_dump
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
if [ -z "$SUPABASE_DB_URL" ]; then
  if [ -f .env.local ]; then
    SUPABASE_DB_URL=$(grep -E '^SUPABASE_DB_URL=|^DIRECT_URL=' .env.local 2>/dev/null | head -1 | cut -d= -f2-)
  fi
  if [ -z "$SUPABASE_DB_URL" ]; then
    echo "WARN: SUPABASE_DB_URL not set. Add to .env.local: SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres" >&2
    echo "  Get it from: Supabase Dashboard → Settings → Database → Connection string (URI, direct)" >&2
    exit 1
  fi
fi

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
SCHEMA_FILE="$DB_BACKUP_DIR/schema-$TIMESTAMP.sql"
DATA_FILE="$DB_BACKUP_DIR/data-$TIMESTAMP.sql"

echo "[$(date)] Backing up Supabase..."

# Schema dump
if command -v supabase &>/dev/null; then
  supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SCHEMA_FILE" 2>/dev/null || true
else
  echo "WARN: Supabase CLI not installed. Install: npm i -g supabase" >&2
  echo "  Skipping schema dump." >&2
fi

# Data dump (optional - requires supabase CLI)
if [ -f "$SCHEMA_FILE" ]; then
  supabase db dump --db-url "$SUPABASE_DB_URL" -f "$DATA_FILE" --data-only --use-copy 2>/dev/null || true
fi

# Alternative: use pg_dump directly if available
if command -v pg_dump &>/dev/null && [ ! -f "$SCHEMA_FILE" ]; then
  pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges -f "$SCHEMA_FILE" 2>/dev/null || true
fi

# Encrypt if we have a backup and password
if [ -f "$SCHEMA_FILE" ] && [ -n "$WOF_BACKUP_PASSWORD" ]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 -in "$SCHEMA_FILE" -out "$SCHEMA_FILE.enc" -k "$WOF_BACKUP_PASSWORD"
  rm -f "$SCHEMA_FILE"
  echo "[$(date)] Encrypted: $SCHEMA_FILE.enc"
fi

# Prune old backups
find "$DB_BACKUP_DIR" -name "*.sql*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo "[$(date)] Supabase backup complete: $DB_BACKUP_DIR"
