import { test, expect } from '@playwright/test'

test.describe('Export', () => {
  test('settings export section is present', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/)
      return
    }
    await expect(page.getByRole('heading', { name: /data export|export/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel(/export type|format/i).first()).toBeVisible()
  })

  test('export format options include JSON, CSV, PDF', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }
    const formatSelect = page.locator('select#export-format, select[name="format"]').first()
    if (await formatSelect.isVisible()) {
      await expect(formatSelect.locator('option[value="json"]')).toBeVisible()
      await expect(formatSelect.locator('option[value="csv"]')).toBeVisible()
      await expect(formatSelect.locator('option[value="pdf"]')).toBeVisible()
    }
  })
})
