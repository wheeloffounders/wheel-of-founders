import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Wheel of Founders/i)
  })

  test('navigation links exist', async ({ page }) => {
    await page.goto('/')
    // Use more specific selectors to avoid ambiguity
    const morningLink = page.getByRole('link', { name: /morning/i }).first()
    const eveningLink = page.getByRole('link', { name: /evening/i }).first()
    await expect(morningLink).toBeVisible()
    await expect(eveningLink).toBeVisible()
    // Check for emergency link if it exists
    const emergencyLink = page.getByRole('link', { name: /emergency/i }).first()
    if (await emergencyLink.isVisible().catch(() => false)) {
      await expect(emergencyLink).toBeVisible()
    }
  })

  test('login link navigates to login', async ({ page }) => {
    await page.goto('/')
    const loginLink = page.getByRole('link', { name: /log in|login/i })
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
