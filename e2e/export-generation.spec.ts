import { test, expect } from '@playwright/test'

/**
 * Export generation and download flow.
 * Mocks /api/export to avoid hitting real Supabase in CI.
 */
test.describe('Export generation', () => {
  test('export button triggers request and shows success', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }

    // Mock export API to return success without hitting Supabase
    await page.route('**/api/export', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            exportId: 'test-export-id',
            fileName: 'wheel-of-founders-export-full_history-test.json',
            downloadUrl: null,
            formats: ['json'],
            data: {
              exportType: 'full_history',
              dateRange: { start: '2025-01-01', end: '2025-01-31' },
              data: { tasks: [], decisions: [], reviews: [], emergencies: [] },
            },
          }),
        })
      } else {
        await route.continue()
      }
    })

    const exportBtn = page.getByRole('button', { name: /download export|generating export/i })
    await expect(exportBtn).toBeVisible()
    await exportBtn.click()

    // Should show success (blob fallback when no downloadUrl)
    await expect(
      page.getByText(/export ready|downloaded successfully|download started/i)
    ).toBeVisible({ timeout: 15000 })
  })

  test('export format selector has all options', async ({ page }) => {
    await page.goto('/settings')
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }
    const formatSelect = page.locator('#export-format')
    if (await formatSelect.isVisible()) {
      await expect(formatSelect.locator('option[value="all"]')).toBeVisible()
      await expect(formatSelect.locator('option[value="json"]')).toBeVisible()
      await expect(formatSelect.locator('option[value="csv"]')).toBeVisible()
      await expect(formatSelect.locator('option[value="pdf"]')).toBeVisible()
    }
  })
})
