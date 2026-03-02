# Supabase Clients - Quick Guide

| Use Case | Import | File |
|----------|--------|------|
| **Client Components** | `import { browserSupabase } from '@/lib/supabase'` | `client.ts` |
| **API Routes / Server** | `import { serverSupabase } from '@/lib/supabase'` | `server.ts` |
| **Storage / Admin ops** | `import { adminSupabase } from '@/lib/supabase'` | `admin.ts` |
| **API with user session** | `import { apiSupabase } from '@/lib/supabase'` | `api.ts` |

## When to use which

- **browserSupabase** – Client Components, hooks, browser. Uses anon key. RLS applies.
- **serverSupabase** – API routes, Server Components. Service role. Bypasses RLS.
- **adminSupabase** – Storage uploads, admin operations. Can be `null` if key missing.
- **apiSupabase** – API routes when you need to query as the logged-in user (cookies).

## Legacy imports

`lib/supabase.ts`, `lib/server-supabase.ts`, `lib/supabase-admin.ts` still work but are deprecated.
