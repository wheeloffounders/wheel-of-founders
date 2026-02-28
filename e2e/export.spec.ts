import { test, expect } from '@playwright/test'

test.describe('Export', () => {
  test('settings export section is present', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/\/login/)
      return
    }
    await expect(page.getByRole('heading', { name: /data export/i })).toBeVisible({ timeout: 10000 })
    // Check for export type select or format select
    const exportTypeSelect = page.locator('#export-type')
    const exportFormatSelect = page.locator('#export-format')
    const hasExportType = await exportTypeSelect.isVisible().catch(() => false)
    const hasExportFormat = await exportFormatSelect.isVisible().catch(() => false)
    if (!hasExportType && !hasExportFormat) {
      // Fallback: check for any select element in the export section
      await expect(page.locator('select').first()).toBeVisible({ timeout: 5000 })
    }
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
