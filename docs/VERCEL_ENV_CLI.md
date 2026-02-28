# Add Vercel Environment Variables via CLI

Run these commands from the project root. For sensitive variables, you'll be prompted to paste the value.

**Note:** If a variable already exists, remove it first: `npx vercel env rm VARIABLE_NAME production`

## 1. Link to project (if needed)

```bash
cd ~/Desktop/wheel-of-founders
npx vercel link --project wheel-of-founders
```

## 2. Add variables (Production)

### Non-sensitive (pipe value)

```bash
# Supabase URL (remove first if exists)
npx vercel env rm NEXT_PUBLIC_SUPABASE_URL production 2>/dev/null || true
echo "https://bqoovqkbntcynqhhmwwy.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production

# App URLs  
echo "https://wheel-of-founders.vercel.app" | npx vercel env add NEXT_PUBLIC_APP_URL production
echo "https://wheel-of-founders.vercel.app" | npx vercel env add NEXT_PUBLIC_SITE_URL production

# OpenRouter model
echo "anthropic/claude-3.5-sonnet" | npx vercel env add OPENROUTER_MODEL production
```

### Sensitive (run manually, paste when prompted)

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# When prompted: paste your anon key from Supabase Dashboard → Settings → API

npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# When prompted: paste your service_role key (mark as sensitive: yes)

npx vercel env add OPENROUTER_API_KEY production
# When prompted: paste your OpenRouter API key (mark as sensitive: yes)
```

## 3. Verify

```bash
npx vercel env ls | grep -E "(SUPABASE|OPENROUTER|APP)"
```

## 4. Monitor for disappearance (optional)

In another terminal:

```bash
while true; do clear; date; npx vercel env ls 2>/dev/null | grep -E "(SERVICE|OPENROUTER|SUPABASE)"; sleep 5; done
```

## 5. Deploy

```bash
npx vercel --prod
```
