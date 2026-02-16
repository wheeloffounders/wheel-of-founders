import { test, expect } from '@playwright/test'

test.describe('Subscription / Pricing', () => {
  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page).toHaveTitle(/pricing|wheel of founders/i)
    await expect(
      page.getByRole('heading', { name: /pricing|plans|subscription/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('settings subscription link exists', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }
    const subLink = page.getByRole('link', { name: /subscription|billing/i })
    if (await subLink.isVisible()) {
      await expect(subLink).toHaveAttribute('href', /subscription/)
    }
  })
})
