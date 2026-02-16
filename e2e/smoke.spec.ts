import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Wheel of Founders/i)
  })

  test('navigation links exist', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /dashboard|home/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /morning/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /emergency/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /evening/i })).toBeVisible()
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
