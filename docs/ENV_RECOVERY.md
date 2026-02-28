# Environment Variables Recovery Guide

Emergency guide to restore environment variables from any backup layer.

## Where to Find Each Variable

| Variable | Source | Location |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Dashboard → Settings → API → service_role (secret) |
| `OPENROUTER_API_KEY` | OpenRouter | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | - | Use: `anthropic/claude-3.5-sonnet` |
| `NEXT_PUBLIC_APP_URL` | - | `https://wheel-of-founders.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | - | `https://wheel-of-founders.vercel.app` |

## Restore from Layer A (Local Encrypted)

```bash
# 1. Find latest backup
ls -lt ~/.wof-backups/env/env-*.encrypted | head -5

# 2. Decrypt (you'll be prompted for password)
openssl enc -aes-256-cbc -d -pbkdf2 -in ~/.wof-backups/env/env-YYYY-MM-DD-HHMMSS.encrypted -out .env.restored -k YOUR_PASSWORD

# 3. Add to Vercel
cd ~/Desktop/wheel-of-founders
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  echo "$value" | npx vercel env add "$key" production
done < .env.restored

# 4. Clean up
rm .env.restored
```

## Restore from Layer C (iCloud / Google Drive)

Same as Layer A – the encrypted file is copied there. Paths:

- **iCloud:** `~/Library/Mobile Documents/com~apple~CloudDocs/wof-backups/`
- **Google Drive:** `~/Google Drive/wof-backups/`

## Restore Manually (No Backup)

1. **Supabase:** Dashboard → Settings → API → copy URL and keys
2. **OpenRouter:** https://openrouter.ai/keys → create or copy key
3. **Vercel:** Dashboard → Project → Settings → Environment Variables → Add each

## Emergency Contacts

- **Supabase:** https://supabase.com/dashboard/support
- **OpenRouter:** https://openrouter.ai/docs
- **Vercel:** https://vercel.com/support

## Password Storage

Backup encryption password: **Store in 1Password** (vault: Wheel of Founders)
