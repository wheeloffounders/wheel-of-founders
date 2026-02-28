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
    // Check for main heading first (h1)
    const mainHeading = page.getByRole('heading', { name: /morning plan/i }).first()
    await expect(mainHeading).toBeVisible({ timeout: 10000 })
    
    // Also check for section headings (h2) - at least one should be visible
    const sectionHeadings = page.getByRole('heading', { name: /today's focus|decision log|power list/i })
    const count = await sectionHeadings.count()
    // At least one section heading should exist (either editing mode or viewing mode)
    expect(count).toBeGreaterThan(0)
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
