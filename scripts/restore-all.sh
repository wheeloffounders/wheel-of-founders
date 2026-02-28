#!/bin/bash
# One-click restore - list backups and restore env vars to Vercel
# Run: bash scripts/restore-all.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
ENV_BACKUP_DIR="$BACKUP_ROOT/env"

cd "$PROJECT_DIR"

echo "=== Wheel of Founders - Restore ==="
echo ""

# List available env backups
BACKUPS=($(ls -t "$ENV_BACKUP_DIR"/env-*.encrypted 2>/dev/null || true))
if [ ${#BACKUPS[@]} -eq 0 ]; then
  echo "No backups found in $ENV_BACKUP_DIR"
  echo "Run: ./scripts/backup-env-local.sh"
  exit 1
fi

echo "Available env backups:"
for i in "${!BACKUPS[@]}"; do
  echo "  $((i+1))) ${BACKUPS[$i]}"
done
echo "  0) Cancel"
echo ""
read -p "Select backup number: " CHOICE

if [ "$CHOICE" = "0" ] || [ -z "$CHOICE" ]; then
  echo "Cancelled."
  exit 0
fi

SELECTED="${BACKUPS[$((CHOICE-1))]}"
if [ -z "$SELECTED" ]; then
  echo "Invalid selection."
  exit 1
fi

echo ""
echo "Selected: $SELECTED"
echo "Enter decryption password:"
read -s -r PASSWORD

TEMP_ENV=$(mktemp)
if ! openssl enc -aes-256-cbc -d -pbkdf2 -in "$SELECTED" -out "$TEMP_ENV" -k "$PASSWORD" 2>/dev/null; then
  echo "Decryption failed. Wrong password?"
  rm -f "$TEMP_ENV"
  exit 1
fi

echo ""
echo "Restore to Vercel? This will ADD/UPDATE env vars. (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  rm -f "$TEMP_ENV"
  echo "Cancelled."
  exit 0
fi

echo "Adding env vars to Vercel (existing vars may need to be removed first: vercel env rm VAR production)"
COUNT=0
while IFS= read -r line; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    KEY="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"
    # Remove quotes
    VALUE="${VALUE%\"}"
    VALUE="${VALUE#\"}"
    VALUE="${VALUE%\'}"
    VALUE="${VALUE#\'}"
    echo "$VALUE" | npx vercel env add "$KEY" production 2>/dev/null && ((COUNT++)) || true
  fi
done < "$TEMP_ENV"

rm -f "$TEMP_ENV"
echo "Restored $COUNT variables. Run 'npx vercel env ls' to verify."
echo ""
echo "Deploy: npx vercel --prod"
