#!/bin/bash
# Install cron jobs for automated backups
# Run: bash scripts/install-cron.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
LOGS_DIR="$BACKUP_ROOT/logs"

# Use absolute path for project
PROJECT_PATH="$PROJECT_DIR"
CRON_LOG="$LOGS_DIR/cron.log"

mkdir -p "$LOGS_DIR"

# Cron entries - use absolute paths
CRON_ENTRIES="
# Wheel of Founders - Automated backups (installed $(date))
# Daily database backup at 1am
0 1 * * * cd $PROJECT_PATH && WOF_BACKUP_PASSWORD=\"\${WOF_BACKUP_PASSWORD}\" ./scripts/backup-daily.sh >> $CRON_LOG 2>&1

# Daily env backup at 2am
0 2 * * * cd $PROJECT_PATH && WOF_BACKUP_PASSWORD=\"\${WOF_BACKUP_PASSWORD}\" ./scripts/backup-env-local.sh >> $CRON_LOG 2>&1

# Cloud sync after backups at 2:30am
30 2 * * * cd $PROJECT_PATH && ./scripts/backup-cloud.sh >> $CRON_LOG 2>&1

# Check backups every 6 hours
0 */6 * * * cd $PROJECT_PATH && ./scripts/backup-monitor.sh >> $CRON_LOG 2>&1
"

echo "=== Install Backup Cron Jobs ==="
echo ""
echo "Add these to crontab. Run: crontab -e"
echo ""
echo "IMPORTANT: Set WOF_BACKUP_PASSWORD in your shell profile (e.g. .zshrc) so cron can use it:"
echo "  export WOF_BACKUP_PASSWORD=\"your-password-from-1password\""
echo ""
echo "Cron entries:"
echo "$CRON_ENTRIES"
echo ""
echo "Or install automatically (will merge with existing crontab):"
read -p "Install now? (y/N): " INSTALL
if [ "$INSTALL" = "y" ] || [ "$INSTALL" = "Y" ]; then
  # Remove old WOF entries
  (crontab -l 2>/dev/null | grep -v "wheel-of-founders\|WOF_BACKUP\|backup-daily\|backup-env-local\|backup-cloud\|backup-monitor" || true) > /tmp/crontab.tmp
  # Add new entries (without the env var - user must set in profile)
  cat >> /tmp/crontab.tmp << EOF

# Wheel of Founders - Automated backups (installed $(date))
0 1 * * * cd $PROJECT_PATH && ./scripts/backup-daily.sh >> $CRON_LOG 2>&1
0 2 * * * cd $PROJECT_PATH && ./scripts/backup-env-local.sh >> $CRON_LOG 2>&1
30 2 * * * cd $PROJECT_PATH && ./scripts/backup-cloud.sh >> $CRON_LOG 2>&1
0 */6 * * * cd $PROJECT_PATH && ./scripts/backup-monitor.sh >> $CRON_LOG 2>&1
EOF
  crontab /tmp/crontab.tmp
  rm -f /tmp/crontab.tmp
  echo "Cron jobs installed. Verify with: crontab -l"
  echo ""
  echo "NOTE: For encryption in cron, create ~/.wof-backup-env (chmod 600):"
  echo "  export WOF_BACKUP_PASSWORD=\"your-password\""
  echo "  export SUPABASE_DB_URL=\"postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres\""
  echo "  The backup scripts automatically source this file."
fi
