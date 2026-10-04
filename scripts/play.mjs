// Play one scripted Attempt in headless Chromium, screenshotting each stage under screenshots/.
// Usage: npm run play
// Exits 1 if a check fails or the page logged any console error or uncaught exception.
// Controls are found by accessible role and name, so restyling doesn't break it.
import assert from 'node:assert/strict'
import { screenshot, withGamePage } from './browser.mjs'

const CUPPING_STEPS = ['Dry Fragrance', 'Pour', 'Break the Crust', 'Skim', 'Slurp']
const ATTRIBUTES = ['Aroma', 'Flavor', 'Acidity', 'Body', 'Sweetness']

await withGamePage({}, async (page) => {
  // Lineup: seat the first NPC Cupper so the Reveal shows an NPC Score Card beside the Player's.
  const lineup = page.getByRole('region', { name: 'Lineup' })
  await lineup.getByRole('group', { name: 'NPC Cuppers' }).getByRole('button').first().click()
  await lineup.getByRole('button', { name: 'Start cupping' }).click()

  const panel = page.getByRole('complementary', { name: 'Cupping' })
  const cupButtons = panel.getByRole('group', { name: 'Blind Cups' }).getByRole('button')
  const submit = panel.getByRole('button', { name: 'Submit' })
  await cupButtons.first().waitFor()
  const letters = (await cupButtons.allInnerTexts()).map((text) => text.match(/^Cup (\w)/)[1])
  console.log(`Attempt started: Cup ${letters.join(', Cup ')}`)

  // Every Cupping Step on the first cup, in order.
  const steps = panel.getByRole('group', { name: 'Cupping Steps' })
  for (const step of CUPPING_STEPS) {
    await steps.getByRole('button', { name: step, exact: true }).click()
    const rejections = await panel.getByRole('alert').allInnerTexts()
    assert.deepEqual(rejections, [], `${step} was rejected`)
  }
  const cues = await panel.getByRole('list').getByRole('listitem').count()
  assert.ok(cues > 0, 'the Cue Log is empty after cupping')
  console.log(`Cupped Cup ${letters[0]}: ${cues} Tasting Cues`)
  await screenshot(page, 'screenshots/play-1-cupped.png')

  // Rate every Attribute on every cup, checking Submit stays disabled until the last gap is filled.
  assert.ok(await submit.isDisabled(), 'Submit is enabled before any Score Card is rated')
  for (const [cupIndex, letter] of letters.entries()) {
    await panel.getByRole('button', { name: new RegExp(`^Cup ${letter}\\b`) }).click()
    for (const [attributeIndex, attribute] of ATTRIBUTES.entries()) {
      if (cupIndex === letters.length - 1 && attributeIndex === ATTRIBUTES.length - 1) {
        assert.ok(await submit.isDisabled(), `Submit is enabled with ${attribute} on Cup ${letter} unrated`)
      }
      // A spread of ratings, so the Reveal shows a mix of Calibration Points.
      const rating = ((cupIndex + attributeIndex) % 5) + 1
      await panel.getByRole('group', { name: attribute }).getByRole('button', { name: `${rating} cups` }).click()
    }
  }
  assert.ok(await submit.isEnabled(), 'Submit is disabled with every Attribute rated')
  console.log('Every Score Card rated: Submit enabled')
  await screenshot(page, 'screenshots/play-2-rated.png')

  // Submit and the Reveal.
  await submit.click()
  const reveal = page.getByRole('region', { name: 'Reveal' })
  await reveal.waitFor()
  assert.equal(await reveal.getByRole('article').count(), letters.length, 'the Reveal does not show every cup')
  const stars = await reveal.getByLabel(/of 3 Stars$/).getAttribute('aria-label')
  console.log(`Reveal: ${stars}, ${await reveal.getByText(/Calibration Points$/).innerText()}`)
  await screenshot(page, 'screenshots/play-3-reveal.png')

  // Cup again returns to the Lineup for a fresh Attempt.
  await reveal.getByRole('button', { name: 'Cup again' }).click()
  await lineup.waitFor()
  assert.equal(await reveal.count(), 0, 'the Reveal is still showing after Cup again')
  console.log('Cup again: back at the Lineup')
})
