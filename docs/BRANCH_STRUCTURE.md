# Git branch structure (production / preview / local)

This document describes the intended branching model for Wheel of Founders when **`production`** is the stable deploy branch and **`preview`** is used for pre-production testing.

## Branch roles

| Branch | Purpose | Remote | Vercel |
|--------|---------|--------|--------|
| **`production`** | Stable code shipped to users | ✅ `origin/production` | **Production** deployment (e.g. app.wheeloffounders.com) |
| **`preview`** | Integration / QA before promoting to production | ✅ `origin/preview` | **Preview** deployments on each push |
| **`main`** | (Optional) Historical default; align with team whether this tracks `production` or is retired | Team choice | Usually not production unless configured |
| **`local`** | Optional scratch / experiments | ❌ Never push | N/A |

> **Note:** `local` is optional. Many workflows use short-lived feature branches from `preview` or `production` instead.

---

## One-time setup (from `option-c-weekly-fixes`)

Use this when the code currently on **`option-c-weekly-fixes`** (local + remote) is what you want as **`production`**.

**Before you start:** Commit or stash work on other branches (e.g. `main`) so checkouts are clean.

### 1. Rename `option-c-weekly-fixes` → `production` and update remote

```bash
git fetch origin
git checkout option-c-weekly-fixes
git pull origin option-c-weekly-fixes   # optional: sync with remote

# Rename local branch
git branch -m production

# Publish as production (first time: set upstream)
git push -u origin production
```

If **`origin/production` already exists** and you intend to **replace** it with this history:

```bash
git push -u origin production --force-with-lease
```

Prefer **`--force-with-lease`** over `--force`** when possible; it fails if someone else pushed to `production`.

Remove the old remote name (only after `production` is pushed and verified):

```bash
git push origin --delete option-c-weekly-fixes
```

### 2. Create `preview` from `production`

```bash
git checkout production
git pull origin production
git checkout -b preview
git push -u origin preview
```

Merge or rebase feature work into **`preview`** for testing; open PRs **`preview` → `production`** when ready to release.

### 3. Vercel: production branch

1. Vercel → **Project** → **Settings** → **Git**
2. Set **Production Branch** to **`production`**
3. Save

Redeploy or push to `production` so the production URL tracks the new branch.

Preview deployments still come from **other branches / PRs** per your Vercel settings (often “all branches” or “preview for non-production branches”).

### 4. GitHub default branch (recommended)

If **`main`** is no longer the source of truth:

- GitHub → **Settings** → **General** → **Default branch** → set to **`production`** (or keep `main` and document that `production` is deploy-only).

### 5. Optional: `local` (never pushed)

```bash
git checkout production   # or preview
git checkout -b local
# work freely; do not: git push -u origin local
```

---

## Verify

```bash
git fetch origin
git branch -a
```

Expect to see `remotes/origin/production` and `remotes/origin/preview`.

- [ ] Vercel **Production Branch** = `production`
- [ ] Production URL shows the expected commit
- [ ] Push to `preview` triggers a preview deployment

---

## Related docs

- [Vercel deployment](./VERCEL_DEPLOYMENT.md)
- [Production deployment](./PRODUCTION_DEPLOYMENT.md)
- [Option C + weekly cron deploy notes](./DEPLOY_OPTION_C_AND_WEEKLY_CRON.md) (if present)
