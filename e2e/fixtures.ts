/**
 * Playwright fixtures for E2E tests
 * - Authenticated state (when E2E_TEST_EMAIL is set)
 * - Route mocking for Stripe/MailerLite in tests
 */
import { test as base } from '@playwright/test'

/**
 * Extended test with optional authenticated context.
 * Set E2E_TEST_EMAIL + E2E_TEST_PASSWORD to run auth-dependent tests.
 */
export const test = base.extend<{ authenticated: boolean }>({
  authenticated: [async ({ page }, use) => {
    const hasCreds = !!(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
    await use(hasCreds)
  }, { scope: 'test' }],
})

export { expect } from '@playwright/test'
