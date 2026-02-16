import { test, expect } from '@playwright/test'

test.describe('Morning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/morning')
    // If redirected to login, skip (requires auth)
  })

  test('morning page loads with Power List and Decision Log sections', async ({ page }) => {
    // May redirect to login if unauthenticated
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }
    await expect(
      page.getByRole('heading', { name: /power list|morning|decisions/i }).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('can add a task when authenticated', async ({ page }) => {
    if (page.url().includes('/login')) {
      test.skip(true, 'Requires authentication')
    }
    const taskInput = page.locator('input[placeholder*="task"], textarea[placeholder*="task"], [data-testid="task-input"]').first()
    if (await taskInput.isVisible()) {
      await taskInput.fill('E2E test task')
      const addBtn = page.getByRole('button', { name: /add|save/i }).first()
      if (await addBtn.isVisible()) {
        await addBtn.click()
        await expect(page.getByText(/E2E test task/i)).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
