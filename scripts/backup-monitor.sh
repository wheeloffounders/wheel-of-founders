#!/bin/bash
# Monitor backup freshness - alert if backups are missing or older than 2 days
# Run: bash scripts/backup-monitor.sh
# Cron: 0 */6 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-monitor.sh

set -e
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
ENV_BACKUP_DIR="$BACKUP_ROOT/env"
MAX_AGE_HOURS=48
LOGS_DIR="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}/logs"
LOG_FILE="$LOGS_DIR/monitor.log"

mkdir -p "$LOGS_DIR"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

alert() {
  log "ALERT: $*"
  # Email alert if WOF_ALERT_EMAIL is set
  if [ -n "$WOF_ALERT_EMAIL" ]; then
    echo "Backup alert: $*" | mail -s "WOF Backup Alert" "$WOF_ALERT_EMAIL" 2>/dev/null || true
  fi
  # macOS notification
  if command -v osascript &>/dev/null; then
    osascript -e "display notification \"$*\" with title \"WOF Backup Alert\"" 2>/dev/null || true
  fi
}

FAILED=0

# Check env backups
LATEST_ENV=$(ls -t "$ENV_BACKUP_DIR"/env-*.encrypted 2>/dev/null | head -1)
if [ -z "$LATEST_ENV" ]; then
  alert "No encrypted env backup found in $ENV_BACKUP_DIR"
  FAILED=1
else
  MTIME=$(stat -f %m "$LATEST_ENV" 2>/dev/null || stat -c %Y "$LATEST_ENV" 2>/dev/null)
  AGE=$(( ($(date +%s) - MTIME) / 3600 ))
  if [ "$AGE" -gt "$MAX_AGE_HOURS" ]; then
    alert "Env backup is $AGE hours old (max $MAX_AGE_HOURS): $LATEST_ENV"
    FAILED=1
  else
    log "OK: Env backup fresh ($AGE hours old)"
  fi
fi

# Check database backups (backup-daily.sh uses database/)
LATEST_DB=$(ls -t "$BACKUP_ROOT/database"/db-*.tar.gz* 2>/dev/null | head -1)
if [ -z "$LATEST_DB" ]; then
  LATEST_DB=$(ls -t "$BACKUP_ROOT/supabase"/*.sql* 2>/dev/null | head -1)
fi
if [ -z "$LATEST_DB" ]; then
  log "INFO: No database backup found (run backup-daily.sh)"
else
  MTIME=$(stat -f %m "$LATEST_DB" 2>/dev/null || stat -c %Y "$LATEST_DB" 2>/dev/null)
  AGE=$(( ($(date +%s) - MTIME) / 3600 ))
  if [ "$AGE" -gt "$MAX_AGE_HOURS" ]; then
    alert "Supabase backup is $AGE hours old: $LATEST_DB"
    FAILED=1
  else
    log "OK: Supabase backup fresh ($AGE hours old)"
  fi
fi

[ $FAILED -eq 0 ] && log "All backups OK" || exit 1
