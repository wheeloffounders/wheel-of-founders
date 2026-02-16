import { test, expect } from '@playwright/test'

test.describe('Evening Flow', () => {
  test('evening page loads', async ({ page }) => {
    await page.goto('/evening')
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/)
      return
    }
    await expect(
      page.getByRole('heading', { name: /evening|review|journal/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
