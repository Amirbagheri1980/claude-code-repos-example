import { test, expect } from '@playwright/test'

test('shows a friendly error when visiting a room that does not exist', async ({ page }) => {
  await page.goto('/chat/ZZZZZZ')

  await expect(page.getByRole('heading', { name: /room not found/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /start a new room/i })).toBeVisible()
})
