#!/bin/bash
# Sync database schema between development and production Supabase projects.
# Use this to push migrations from dev to prod, or pull schema from prod to dev.
#
# Prerequisites:
# - Supabase CLI installed (npm i -g supabase)
# - Linked to both projects, or use --project-ref
#
# Usage:
#   ./scripts/sync-db.sh push   # Push local migrations to remote
#   ./scripts/sync-db.sh pull   # Pull remote schema to local
#   ./scripts/sync-db.sh diff   # Show diff between local and remote

set -e

ACTION="${1:-diff}"

case "$ACTION" in
  push)
    echo "Pushing migrations to remote..."
    supabase db push
    ;;
  pull)
    echo "Pulling remote schema to local..."
    supabase db pull
    ;;
  diff)
    echo "Showing schema diff..."
    supabase db diff
    ;;
  *)
    echo "Usage: $0 {push|pull|diff}"
    echo "  push - Push local migrations to remote"
    echo "  pull - Pull remote schema to local"
    echo "  diff - Show diff between local and remote"
    exit 1
    ;;
esac
