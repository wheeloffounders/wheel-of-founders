#!/bin/bash
# Layer A: Local encrypted backup of Vercel environment variables
# Run: bash scripts/backup-env-local.sh
# Cron: 0 2 * * * cd ~/Desktop/wheel-of-founders && ./scripts/backup-env-local.sh
# For cron: create ~/.wof-backup-env with WOF_BACKUP_PASSWORD (chmod 600)

[ -f "$HOME/.wof-backup-env" ] && source "$HOME/.wof-backup-env"
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
ENV_BACKUP_DIR="$BACKUP_ROOT/env"
LOGS_DIR="$BACKUP_ROOT/logs"
RETENTION_DAYS=30

mkdir -p "$LOGS_DIR"

# Password: store in 1Password, pass via WOF_BACKUP_PASSWORD env or prompt
get_password() {
  if [ -n "$WOF_BACKUP_PASSWORD" ]; then
    echo "$WOF_BACKUP_PASSWORD"
    return
  fi
  if [ -t 0 ]; then
    echo "Enter backup encryption password (or set WOF_BACKUP_PASSWORD):" >&2
    read -s -r WOF_PASS
    echo "$WOF_PASS"
  else
    echo "ERROR: WOF_BACKUP_PASSWORD not set and not interactive. Set it or run manually." >&2
    exit 1
  fi
}

mkdir -p "$ENV_BACKUP_DIR"
cd "$PROJECT_DIR"

LOG_FILE="$LOGS_DIR/backup-env-$(date +%Y-%m-%d).log"
log_msg() { echo "[$(date)] $*" | tee -a "$LOG_FILE"; }

# Pull env vars from Vercel - try production first, then default
log_msg "=== Env backup ==="
log_msg "Pulling env vars from Vercel..."
if npx vercel env pull .env.backup-temp --environment=production 2>/dev/null; then
  log_msg "Pulled production env"
elif npx vercel env pull .env.backup-temp 2>/dev/null; then
  log_msg "Pulled development env"
elif [ -f .vercel/.env.production.local ]; then
  log_msg "Using .vercel/.env.production.local"
  cp .vercel/.env.production.local .env.backup-temp
fi

if [ ! -f .env.backup-temp ]; then
  # Fallback: use .env.local if vercel pull failed
  if [ -f .env.local ]; then
    echo "WARN: Using .env.local as fallback (vercel pull may have failed)"
    cp .env.local .env.backup-temp
  else
    echo "ERROR: No env file available. Run 'vercel env pull' manually first." >&2
    exit 1
  fi
fi

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
OUTPUT_FILE="$ENV_BACKUP_DIR/env-$TIMESTAMP.encrypted"

PASS=$(get_password)
openssl enc -aes-256-cbc -salt -pbkdf2 -in .env.backup-temp -out "$OUTPUT_FILE" -k "$PASS"
rm -f .env.backup-temp

log_msg "Saved encrypted backup: $OUTPUT_FILE"

# Prune old backups (keep last 30 days)
find "$ENV_BACKUP_DIR" -name "env-*.encrypted" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
log_msg "Pruned backups older than $RETENTION_DAYS days"
log_msg "=== Env backup complete ==="
