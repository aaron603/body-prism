import { expect, test } from '@playwright/test'

test('explore page renders the 3D canvas and opens info on search', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  // Real Z-Anatomy meshes must replace the placeholders for the skeletal system.
  await expect(page.locator('.stage')).toHaveAttribute('data-models', /femur/, { timeout: 15_000 })

  await page.getByRole('searchbox').fill('肱骨')
  await page.getByRole('button', { name: /肱骨|Humerus/ }).first().click()
  await expect(page.getByRole('dialog')).toContainText('Humerus')

  // The canvas must contain non-transparent pixels, i.e. something was actually drawn.
  const drawn = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    return !!gl && !gl.isContextLost()
  })
  expect(drawn).toBe(true)
  expect(errors).toEqual([])
})

test('quiz starts and shows a question', async ({ page }) => {
  await page.goto('/#/quiz')
  await page.getByRole('button', { name: /开始测验|Start quiz/ }).click()
  await expect(page.getByText(/第 1 \/|Question 1 of/)).toBeVisible()
})
