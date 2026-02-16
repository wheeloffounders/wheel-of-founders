# E2E Testing with Playwright

## Setup

```bash
npm install
npx playwright install chromium
```

## Run Tests

```bash
# Run all E2E tests (starts dev server)
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific spec
npx playwright test e2e/auth.spec.ts
```

## Test Coverage

| Spec | Coverage |
|------|----------|
| smoke.spec.ts | Home, nav links, login link |
| auth.spec.ts | Login page, redirects, logout |
| morning-flow.spec.ts | Morning page, Power List, add task |
| evening-flow.spec.ts | Evening page load |
| subscription.spec.ts | Pricing page, settings subscription link |
| export.spec.ts | Export section, format options |
| export-generation.spec.ts | Export button triggers API, format selector |

## Authentication

Tests that require auth (morning flow, export, settings) skip when unauthenticated. To run full auth flow:

1. Set environment variables:
   - `E2E_TEST_EMAIL` — test user email
   - `E2E_TEST_PASSWORD` — test user password

2. Use a dedicated test Supabase project or test user in staging.

## CI/CD

E2E tests run on push/PR to `main` and `develop` via `.github/workflows/e2e.yml`.

Required secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (for Stripe/MailerLite tests):
- `STRIPE_SECRET_KEY` (test mode)
- `MAILERLITE_TRANSACTIONAL_API_KEY`

## Mocking

- `export-generation.spec.ts` mocks `/api/export` to avoid hitting Supabase in CI.
- Stripe/MailerLite are not mocked by default; add `page.route()` in tests as needed.

## Test Database

For full E2E with real data:
1. Use a separate Supabase project for E2E.
2. Seed test data via migrations or scripts.
3. Run cleanup after tests (e.g., delete test user data).
