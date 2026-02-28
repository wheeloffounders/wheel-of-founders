# Vercel: AI / Mrs. Deer environment variables

If Mrs. Deer prompts on **production** sound generic, mention "Smart Constraints" or "Needle Mover", or don’t match the warm tone you get locally, the usual cause is missing or different **AI env vars** on Vercel.

## 1. Check what’s set on Vercel

Run (from your machine, not in sandbox):

```bash
npx vercel env ls
```

Check that **Production** (and Preview if you use it) has:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

If `OPENROUTER_MODEL` is missing, the app uses the default model (`deepseek/deepseek-chat`), which can ignore the “BANNED” list and still output product terms.

## 2. Set the variables

**Option A — Vercel Dashboard**

1. Open [Vercel](https://vercel.com) → your project → **Settings** → **Environment Variables**.
2. Add or edit:
   - **OPENROUTER_API_KEY**  
     Value: your OpenRouter API key (same as in `.env.local`).
   - **OPENROUTER_MODEL**  
     Value: one of the supported model IDs, e.g. `anthropic/claude-3.5-sonnet`.
3. Apply to **Production** (and **Preview** if you want the same behavior there).

**Option B — CLI**

```bash
# Add or overwrite (you’ll be prompted for the value)
npx vercel env add OPENROUTER_API_KEY production
npx vercel env add OPENROUTER_MODEL production
```

When prompted for `OPENROUTER_MODEL`, enter e.g.:

- `anthropic/claude-3.5-sonnet` — best for Mrs. Deer tone and instruction-following  
- or `openai/gpt-4o-mini` — good balance of cost and quality  

Other allowed values are in [docs/ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md#5-openrouter-required-for-ai-coaching).

## 3. Redeploy

So the new env vars are used:

```bash
npx vercel --prod
```

## 4. Test

Trigger a morning (or evening) prompt on production and confirm the copy no longer uses “Smart Constraints” or “Needle Mover” and matches the intended Mrs. Deer tone.

## Quick reference

| Variable               | Required | Example / note                                      |
|------------------------|----------|-----------------------------------------------------|
| OPENROUTER_API_KEY     | Yes      | `sk-or-...` from OpenRouter                         |
| OPENROUTER_MODEL       | Recommended | `anthropic/claude-3.5-sonnet` or `openai/gpt-4o-mini` |

If both are set correctly on Vercel and you still see product terms, try a model that follows instructions more strictly (e.g. `anthropic/claude-3.5-sonnet`).
