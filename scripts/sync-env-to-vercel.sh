#!/bin/bash
# Sync .env.local to all Vercel environments (Production, Preview, Development)
# Run from project root: ./scripts/sync-env-to-vercel.sh

set -e

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env.local not found"
  exit 1
fi

echo "🔍 Syncing environment variables to Vercel..."
echo ""

get_val() {
  grep "^$1=" "$ENV_FILE" | sed "s/^$1=//;s/^\"//;s/\"$//" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' | head -1
}

# Trim leading/trailing whitespace (Vercel rejects values with whitespace in headers)
trim_ws() {
  echo "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

# Validate and warn if value had whitespace (writes to stderr so it doesn't pollute captured value)
validate_env_value() {
  local key=$1
  local value=$2
  local trimmed
  trimmed=$(trim_ws "$value")
  if [ "$value" != "$trimmed" ]; then
    echo "⚠️  Warning: $key had leading/trailing whitespace - trimmed" >&2
  fi
  echo "$trimmed"
}

# Load required vars (with trimming - Vercel rejects whitespace in header values)
NEXT_PUBLIC_SUPABASE_URL=$(validate_env_value "NEXT_PUBLIC_SUPABASE_URL" "$(get_val "NEXT_PUBLIC_SUPABASE_URL")")
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(validate_env_value "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$(get_val "NEXT_PUBLIC_SUPABASE_ANON_KEY")")
SUPABASE_SERVICE_ROLE_KEY=$(validate_env_value "SUPABASE_SERVICE_ROLE_KEY" "$(get_val "SUPABASE_SERVICE_ROLE_KEY")")
OPENROUTER_API_KEY=$(validate_env_value "OPENROUTER_API_KEY" "$(get_val "OPENROUTER_API_KEY")")
CRON_SECRET=$(validate_env_value "CRON_SECRET" "$(get_val "CRON_SECRET")")

# Validate required
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Missing required vars in .env.local:"
  [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] && echo "   - NEXT_PUBLIC_SUPABASE_URL"
  [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] && echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "   - SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

add_env() {
  local key=$1
  local value
  value=$(trim_ws "$2")
  local env=$3
  local branch=$4

  if [ -n "$value" ]; then
    echo "  Adding $key to $env..."
    npx vercel env rm "$key" "$env" --yes 2>/dev/null || true
    # Production: NO branch parameter (gitBranch only allowed for preview)
    # --yes: non-interactive (skip branch prompt for preview/development)
    # CRITICAL: Use printf not echo! echo adds trailing newline = whitespace in Vercel
    if [ "$env" = "production" ]; then
      printf '%s' "$value" | npx vercel env add "$key" production --yes
    elif [ -n "$branch" ]; then
      printf '%s' "$value" | npx vercel env add "$key" "$env" "$branch" --yes
    else
      printf '%s' "$value" | npx vercel env add "$key" "$env" --yes
    fi
    echo "  ✅ Added $key to $env"
  else
    echo "  ⚠️  Skipping $key (empty in .env.local)"
  fi
}

# Default branch for Preview/Development (Production gets no branch)
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
DEFAULT_BRANCH=${DEFAULT_BRANCH:-main}

for env in production preview development; do
  echo "📦 Setting up $env environment..."
  if [ "$env" = "production" ]; then
    # Production: no branch parameter
    add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "$env" ""
    add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "$env" ""
    add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$env" ""
    add_env "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY" "$env" ""
    add_env "CRON_SECRET" "$CRON_SECRET" "$env" ""
  else
    # Preview/Development: no branch (applies to all)
    add_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "$env" ""
    add_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "$env" ""
    add_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "$env" ""
    add_env "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY" "$env" ""
    add_env "CRON_SECRET" "$CRON_SECRET" "$env" ""
  fi
  echo ""
done

echo "✅ All environments synced!"
echo "Run 'npx vercel env ls' to verify"
echo ""
echo "See docs/ENV_SETUP.md for full documentation"
