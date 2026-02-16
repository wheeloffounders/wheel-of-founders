# E2E Tests (Playwright)

## Setup

```bash
npm install
npx playwright install
```

## Run

```bash
npm run test:e2e        # headless
npm run test:e2e:ui    # UI mode for debugging
```

## Tests

- **smoke.spec.ts** — Home, nav links, login redirect
- **auth.spec.ts** — Login page, protected routes, logout
- **morning-flow.spec.ts** — Morning page, Power List, Decision Log
- **evening-flow.spec.ts** — Evening review page
- **export.spec.ts** — Settings export section, format options
- **subscription.spec.ts** — Pricing, subscription links

## CI

Tests run on push/PR to `main` and `develop`. Use Chromium only in CI to save time.

## Auth

Tests that require auth (morning flow, export) skip when unauthenticated. For full coverage:

1. Set `E2E_TEST_EMAIL` and use a test Supabase project
2. Or run tests after manual login in UI mode

## Mocking

Stripe and MailerLite are not mocked in E2E; tests avoid triggering payments or emails. Use Stripe test mode keys in CI.
