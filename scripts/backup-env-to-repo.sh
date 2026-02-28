#!/bin/bash
# Layer B: Git-protected backup - non-sensitive env var names and placeholders only
# Creates a safe manifest that can be committed to a private repo
# Run: bash scripts/backup-env-to-repo.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${WOF_BACKUP_ROOT:-$HOME/.wof-backups}"
REPO_BACKUP_DIR="$BACKUP_ROOT/env-manifest"

mkdir -p "$REPO_BACKUP_DIR"
cd "$PROJECT_DIR"

TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
MANIFEST="$REPO_BACKUP_DIR/env-manifest-$TIMESTAMP.txt"

echo "# Wheel of Founders - Env Var Manifest (non-sensitive)" > "$MANIFEST"
echo "# Generated: $(date -Iseconds)" >> "$MANIFEST"
echo "# Use this to know which vars to restore. Values are placeholders." >> "$MANIFEST"
echo "" >> "$MANIFEST"

# List expected vars with placeholder values (safe to commit)
cat >> "$MANIFEST" << 'EOF'
# Supabase (get from: Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...

# OpenRouter (get from: https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# App URLs
NEXT_PUBLIC_APP_URL=https://wheel-of-founders.vercel.app
NEXT_PUBLIC_SITE_URL=https://wheel-of-founders.vercel.app
EOF

echo "[$(date)] Created manifest: $MANIFEST"
echo "  Copy to private repo: cp $MANIFEST /path/to/private-wof-repo/docs/"
echo "  Or commit to secure gist manually."
