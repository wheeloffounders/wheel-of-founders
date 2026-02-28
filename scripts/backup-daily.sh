#!/bin/bash
# Daily full database backup - critical tables + schema
# Run: bash scripts/backup-daily.sh
# Cron: 0 1 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-daily.sh
# For cron: create ~/.wof-backup-env with WOF_BACKUP_PASSWORD and SUPABASE_DB_URL (chmod 600)

[ -f "$HOME/.wof-backup-env" ] && source "$HOME/.wof-backup-env"
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
DB_BACKUP_DIR="$BACKUP_ROOT/database"
LOGS_DIR="$BACKUP_ROOT/logs"
RETENTION_DAYS=30

# Critical tables to backup (public schema unless noted)
TABLES="user_profiles personal_prompts morning_tasks morning_decisions evening_reviews emergencies feedback user_stages"

mkdir -p "$DB_BACKUP_DIR" "$LOGS_DIR"
cd "$PROJECT_DIR"

LOG_FILE="$LOGS_DIR/backup-daily-$(date +%Y-%m-%d).log"
exec >> "$LOG_FILE" 2>&1

echo "[$(date)] === Daily database backup ==="

# Get DB URL - DIRECT connection required for pg_dump
if [ -z "$SUPABASE_DB_URL" ]; then
  if [ -f .env.local ]; then
    SUPABASE_DB_URL=$(grep -E '^SUPABASE_DB_URL=|^DIRECT_URL=' .env.local 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "ERROR: SUPABASE_DB_URL not set. Add to .env.local:" >&2
  echo "  SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres" >&2
  echo "  Get from: Supabase Dashboard → Settings → Database → Connection string (URI, direct)" >&2
  exit 1
fi

DATE_DIR=$(date +%Y-%m-%d)
mkdir -p "$DB_BACKUP_DIR/$DATE_DIR"

# Full schema dump
SCHEMA_FILE="$DB_BACKUP_DIR/$DATE_DIR/schema.sql"
echo "[$(date)] Dumping schema..."
if command -v pg_dump &>/dev/null; then
  pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges -f "$SCHEMA_FILE" 2>/dev/null || {
    echo "WARN: pg_dump failed, trying supabase db dump..."
    command -v supabase &>/dev/null && supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SCHEMA_FILE" 2>/dev/null || true
  }
else
  command -v supabase &>/dev/null && supabase db dump --db-url "$SUPABASE_DB_URL" -f "$SCHEMA_FILE" 2>/dev/null || {
    echo "ERROR: Need pg_dump or supabase CLI. Install: brew install postgresql or npm i -g supabase" >&2
    exit 1
  }
fi

# Data dump - critical tables
DATA_FILE="$DB_BACKUP_DIR/$DATE_DIR/data.sql"
echo "[$(date)] Dumping data (tables: $TABLES)..."
if command -v pg_dump &>/dev/null; then
  TABLE_ARGS=""
  for t in $TABLES; do
    TABLE_ARGS="$TABLE_ARGS --table=public.$t"
  done
  pg_dump "$SUPABASE_DB_URL" --data-only --no-owner $TABLE_ARGS -f "$DATA_FILE" 2>/dev/null || true
fi

# Compress
echo "[$(date)] Compressing..."
cd "$DB_BACKUP_DIR/$DATE_DIR"
tar -czf "../db-$DATE_DIR.tar.gz" . 2>/dev/null || true
cd - >/dev/null
rm -rf "$DB_BACKUP_DIR/$DATE_DIR"

# Encrypt if password set
if [ -n "$WOF_BACKUP_PASSWORD" ]; then
  openssl enc -aes-256-cbc -salt -pbkdf2 -in "$DB_BACKUP_DIR/db-$DATE_DIR.tar.gz" -out "$DB_BACKUP_DIR/db-$DATE_DIR.tar.gz.enc" -k "$WOF_BACKUP_PASSWORD"
  rm -f "$DB_BACKUP_DIR/db-$DATE_DIR.tar.gz"
  echo "[$(date)] Encrypted: db-$DATE_DIR.tar.gz.enc"
else
  echo "[$(date)] Saved: db-$DATE_DIR.tar.gz (set WOF_BACKUP_PASSWORD for encryption)"
fi

# Prune old backups
find "$DB_BACKUP_DIR" -name "db-*.tar.gz*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
echo "[$(date)] Pruned backups older than $RETENTION_DAYS days"
echo "[$(date)] === Backup complete ==="
