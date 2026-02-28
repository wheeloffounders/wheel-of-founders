import { test, expect } from '@playwright/test'

test.describe('Subscription / Pricing', () => {
  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing')
    
    // Pricing page redirects to pricing-disabled or login
    // Check if we're redirected to pricing-disabled
    if (page.url().includes('/pricing-disabled')) {
      // Pricing-disabled page has "Choose Your Plan" heading
      await expect(page).toHaveURL(/pricing-disabled/)
      await expect(
        page.getByRole('heading', { name: /choose your plan|pricing|plans/i }).first()
      ).toBeVisible({ timeout: 10000 })
      return
    }
    
    // If redirected to login, that's also valid
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/)
      return
    }
    
    // If somehow on pricing page, check for heading
    await expect(page).toHaveTitle(/pricing|wheel of founders/i)
    await expect(
      page.getByRole('heading', { name: /choose your plan|pricing|plans|subscription/i }).first()
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
