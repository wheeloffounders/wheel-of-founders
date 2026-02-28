#!/bin/bash
# One-time setup: create directories, make scripts executable, run initial backup
# Run: bash scripts/setup-backups.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"

echo "=== Wheel of Founders - Backup System Setup ==="
echo ""

# Step 1: Create directory structure
echo "1. Creating directories..."
mkdir -p "$BACKUP_ROOT"/{database,env,logs}
echo "   → $BACKUP_ROOT/database"
echo "   → $BACKUP_ROOT/env"
echo "   → $BACKUP_ROOT/logs"
echo ""

# Step 2: Make scripts executable
echo "2. Making scripts executable..."
chmod +x "$SCRIPT_DIR"/backup-daily.sh \
        "$SCRIPT_DIR"/backup-env-local.sh \
        "$SCRIPT_DIR"/backup-cloud.sh \
        "$SCRIPT_DIR"/backup-monitor.sh \
        "$SCRIPT_DIR"/install-cron.sh \
        "$SCRIPT_DIR"/restore-all.sh 2>/dev/null || true
echo "   Done"
echo ""

# Step 3: Check prerequisites
echo "3. Checking prerequisites..."
MISSING=0
command -v openssl &>/dev/null || { echo "   WARN: openssl not found" >&2; MISSING=1; }
command -v pg_dump &>/dev/null && echo "   ✓ pg_dump" || echo "   ⚠ pg_dump not found (install for DB backup: brew install postgresql)"
command -v npx &>/dev/null && echo "   ✓ npx" || { echo "   ✗ npx required" >&2; MISSING=1; }
[ -f "$PROJECT_DIR/.env.local" ] && echo "   ✓ .env.local exists" || echo "   ⚠ .env.local not found (run vercel env pull)"
echo ""

# Step 4: Add SUPABASE_DB_URL to .env.local if missing
if [ -f "$PROJECT_DIR/.env.local" ] && ! grep -q "SUPABASE_DB_URL" "$PROJECT_DIR/.env.local" 2>/dev/null; then
  echo "4. Add SUPABASE_DB_URL to .env.local for database backups:"
  echo "   SUPABASE_DB_URL=postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
  echo "   Get from: Supabase Dashboard → Settings → Database → Connection string (URI, direct)"
  echo ""
fi

# Step 5: Run initial backup
echo "5. Run initial backup? (requires WOF_BACKUP_PASSWORD for encryption)"
echo "   Set it: export WOF_BACKUP_PASSWORD=\"your-password\""
read -p "   Run backup now? (y/N): " RUN
if [ "$RUN" = "y" ] || [ "$RUN" = "Y" ]; then
  echo ""
  echo "   Running backup-env-local.sh..."
  cd "$PROJECT_DIR"
  ./scripts/backup-env-local.sh || echo "   Env backup failed (check WOF_BACKUP_PASSWORD)"
  echo ""
  echo "   Running backup-daily.sh..."
  ./scripts/backup-daily.sh 2>/dev/null || echo "   DB backup failed (check SUPABASE_DB_URL)"
  echo ""
  echo "   Running backup-cloud.sh..."
  ./scripts/backup-cloud.sh 2>/dev/null || echo "   Cloud sync skipped (no backups yet)"
fi
echo ""

# Step 6: Install cron
echo "6. Install cron jobs for daily automated backups?"
read -p "   Install cron? (y/N): " CRON
if [ "$CRON" = "y" ] || [ "$CRON" = "Y" ]; then
  "$SCRIPT_DIR/install-cron.sh"
fi
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Backup locations:"
echo "  • Env:      $BACKUP_ROOT/env/"
echo "  • Database: $BACKUP_ROOT/database/"
echo "  • Logs:     $BACKUP_ROOT/logs/"
echo "  • iCloud:   ~/Library/Mobile Documents/com~apple~CloudDocs/wof-backups/"
echo ""
echo "Restore: ./scripts/restore-all.sh"
echo "Docs:    docs/BACKUP_SYSTEM.md"
echo ""
