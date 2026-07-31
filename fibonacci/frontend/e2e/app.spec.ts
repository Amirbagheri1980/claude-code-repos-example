import { test, expect } from '@playwright/test'

test('full estimation flow: join, view sidebar, select and switch cards', async ({
  page,
}) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /fibonacci estimation/i }),
  ).toBeVisible()

  const enterButton = page.getByRole('button', { name: /enter/i })
  await expect(enterButton).toBeDisabled()

  await page.getByRole('radio', { name: 'User' }).check()
  await page.getByLabel(/your name/i).fill('Ada Lovelace')
  await expect(enterButton).toBeEnabled()
  await page.getByLabel(/your name/i).press('Enter')

  await expect(
    page.getByRole('heading', { name: /estimate deck/i }),
  ).toBeVisible()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()

  const cardFive = page.getByRole('button', { name: '5', exact: true })
  const cardEight = page.getByRole('button', { name: '8', exact: true })

  await cardFive.click()
  await expect(cardFive).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/your estimate:/i)).toBeVisible()

  await cardEight.click()
  await expect(cardEight).toHaveAttribute('aria-pressed', 'true')
  await expect(cardFive).toHaveAttribute('aria-pressed', 'false')
})
