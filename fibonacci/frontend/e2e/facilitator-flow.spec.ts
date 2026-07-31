import { test, expect } from '@playwright/test'

test('facilitator reveals a user pick and closing the chat returns the user to the landing page', async ({
  browser,
}) => {
  const facilitatorContext = await browser.newContext()
  const userContext = await browser.newContext()

  try {
    const facilitatorPage = await facilitatorContext.newPage()
    const userPage = await userContext.newPage()

    await facilitatorPage.goto('/')
    await facilitatorPage.getByRole('radio', { name: 'Facilitator' }).check()
    await facilitatorPage.getByLabel(/your name/i).fill('Grace Hopper')
    await facilitatorPage.getByRole('button', { name: /enter/i }).click()
    await expect(
      facilitatorPage.getByRole('heading', { name: /participants/i }),
    ).toBeVisible()
    await expect(facilitatorPage).toHaveURL(/\/chat\/[A-Z0-9]{6}$/)

    const roomLink = await facilitatorPage.getByLabel(/room link/i).inputValue()

    await userPage.goto(roomLink)
    await expect(userPage.getByLabel(/your name/i)).toBeVisible()
    await userPage.getByRole('radio', { name: 'User' }).check()
    await userPage.getByLabel(/your name/i).fill('Ada Lovelace')
    await userPage.getByRole('button', { name: /enter/i }).click()
    await expect(
      userPage.getByRole('heading', { name: /estimate deck/i }),
    ).toBeVisible()

    await userPage.getByRole('button', { name: '5', exact: true }).click()

    await expect(facilitatorPage.getByText('Ada Lovelace')).toBeVisible({
      timeout: 10_000,
    })
    await expect(facilitatorPage.getByText('Picked')).toBeVisible({ timeout: 10_000 })
    await expect(facilitatorPage.getByText('5', { exact: true })).not.toBeVisible()

    await facilitatorPage.getByRole('button', { name: /reveal/i }).click()
    await expect(facilitatorPage.getByText('5', { exact: true })).toBeVisible({
      timeout: 10_000,
    })

    await facilitatorPage.getByRole('button', { name: /restart/i }).click()
    await expect(
      facilitatorPage.getByRole('listitem').filter({ hasText: 'Ada Lovelace' }),
    ).toContainText('Waiting…', { timeout: 10_000 })
    await expect(
      userPage.getByRole('button', { name: '5', exact: true }),
    ).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 })

    await facilitatorPage.getByRole('button', { name: /close chat/i }).click()
    await expect(
      facilitatorPage.getByRole('heading', { name: /fibonacci estimation/i }),
    ).toBeVisible()
    await expect(
      userPage.getByRole('heading', { name: /fibonacci estimation/i }),
    ).toBeVisible({ timeout: 10_000 })
  } finally {
    await facilitatorContext.close()
    await userContext.close()
  }
})
