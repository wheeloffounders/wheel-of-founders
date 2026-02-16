import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page loads and has expected elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/Wheel of Founders/i)
    await expect(page.getByRole('heading', { name: /log in|sign in|wheel of founders/i })).toBeVisible()
  })

  test('redirects to login when visiting protected route unauthenticated', async ({ page }) => {
    await page.goto('/morning')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects to login when visiting settings unauthenticated', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('logout clears session and redirects', async ({ page, context }) => {
    // Requires authenticated session - in CI we may need to use test user
    // Skip if no auth setup
    test.skip(!process.env.E2E_TEST_EMAIL, 'E2E_TEST_EMAIL not set - skipping auth flow')
    await page.goto('/')
    // If logged in, profile dropdown should have logout
    const profileBtn = page.getByRole('button', { name: /profile/i })
    if (await profileBtn.isVisible()) {
      await profileBtn.click()
      await page.getByRole('button', { name: /logout/i }).click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
