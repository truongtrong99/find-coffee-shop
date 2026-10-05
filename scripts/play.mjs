// Play one scripted Attempt in headless Chromium from the Lab Map, screenshotting each stage under screenshots/,
// then Leave Lab mid-Attempt and check the Stars survive a reload.
// Usage: npm run play
// Exits 1 if a check fails or the page logged any console error or uncaught exception.
// Controls are found by accessible role and name, so restyling doesn't break it.
import assert from 'node:assert/strict'
import { screenshot, withGamePage } from './browser.mjs'

const CUPPING_STEPS = ['Dry Fragrance', 'Pour', 'Break the Crust', 'Skim', 'Slurp']
const ATTRIBUTES = ['Aroma', 'Flavor', 'Acidity', 'Body', 'Sweetness']
const RATINGS = [1, 2, 3, 4, 5]

/** Waits for `locator` to reach `state`, failing with `failure` if it doesn't within a few seconds. */
async function expectState(locator, failure, state = 'visible') {
  try {
    await locator.waitFor({ state, timeout: 5000 })
  } catch {
    throw new Error(failure)
  }
}

await withGamePage(async (page) => {
  // Lab Map: only Lab 1 is open on a fresh save; pick its first Cupping Session.
  const labMap = page.getByRole('region', { name: 'Lab Map' })
  await expectState(labMap, 'the Lab Map did not appear on load')
  const labs = labMap.getByRole('region')
  assert.equal(await labs.count(), 3, 'the Lab Map does not show 3 Labs')
  assert.equal(await labs.nth(1).getByRole('button', { disabled: true }).count(), await labs.nth(1).getByRole('button').count(), 'Lab 2 is open on a fresh save')
  await expectState(labs.nth(1).getByText('Needs 8 Stars'), 'locked Lab 2 does not show the Stars it needs')
  const firstSession = labs.first().getByRole('button').first()
  const sessionName = (await firstSession.innerText()).split('\n')[0]
  console.log(`Lab Map: ${await labMap.getByLabel(/total Stars$/).getAttribute('aria-label')}, Lab 2 locked`)
  await screenshot(page, 'screenshots/play-0-lab-map.png')
  await firstSession.click()

  // Lineup: seat the first NPC Cupper so the Reveal shows an NPC Score Card beside the Player's.
  const lineup = page.getByRole('region', { name: 'Lineup' })
  await lineup.getByRole('group', { name: 'NPC Cuppers' }).getByRole('button').first().click()
  await lineup.getByRole('button', { name: 'Start cupping' }).click()

  const panel = page.getByRole('complementary', { name: 'Cupping' })
  const cupPicker = panel.getByRole('group', { name: 'Blind Cups' })
  const cupButton = (letter) => cupPicker.getByRole('button', { name: new RegExp(`^Cup ${letter}\\b`) })
  const submitWhen = (disabled) => panel.getByRole('button', { name: 'Submit', disabled })
  await cupPicker.getByRole('button').first().waitFor()
  const letters = (await cupPicker.getByRole('button').allInnerTexts()).map((text) => text.match(/^Cup (\w)/)[1])
  console.log(`Attempt started: Cup ${letters.join(', Cup ')}`)

  // Every Cupping Step on the first cup, in order. A preparing step is ticked once done; a Slurp adds Tasting Cues.
  const steps = panel.getByRole('group', { name: 'Cupping Steps' })
  const cueLog = panel.getByRole('list').getByRole('listitem')
  for (const step of CUPPING_STEPS) {
    const cueCountBefore = await cueLog.count()
    await steps.getByRole('button', { name: step, exact: true }).click()
    const done = step === 'Slurp' ? cueLog.nth(cueCountBefore) : steps.getByRole('button', { name: `✓ ${step}`, exact: true })
    await expectState(done, `${step} didn't complete on Cup ${letters[0]}`)
    const rejectedStepMessages = await panel.getByRole('alert').allInnerTexts()
    assert.deepEqual(rejectedStepMessages, [], `${step} was rejected`)
  }
  console.log(`Cupped Cup ${letters[0]}: ${await cueLog.count()} Tasting Cues`)
  await screenshot(page, 'screenshots/play-1-cupped.png')

  // Rate every Attribute on every cup, checking Submit stays disabled until the last gap is filled.
  await expectState(submitWhen(true), 'Submit is enabled before any Score Card is rated')
  for (const [cupIndex, letter] of letters.entries()) {
    await cupButton(letter).click()
    for (const [attributeIndex, attribute] of ATTRIBUTES.entries()) {
      if (cupIndex === letters.length - 1 && attributeIndex === ATTRIBUTES.length - 1) {
        await expectState(submitWhen(true), `Submit is enabled with ${attribute} on Cup ${letter} unrated`)
      }
      // A spread of ratings, so the Reveal shows a mix of Calibration Points.
      const rating = RATINGS[(cupIndex + attributeIndex) % RATINGS.length]
      await panel.getByRole('group', { name: attribute }).getByRole('button', { name: `${rating} cups` }).click()
    }
  }
  await expectState(submitWhen(false), 'Submit is disabled with every Attribute rated')
  console.log('Every Score Card rated: Submit enabled')
  await screenshot(page, 'screenshots/play-2-rated.png')

  // Submit and the Reveal.
  await submitWhen(false).click()
  const reveal = page.getByRole('region', { name: 'Reveal' })
  await expectState(reveal, 'the Reveal did not appear after Submit')
  assert.equal(await reveal.getByRole('article').count(), letters.length, 'the Reveal does not show every cup')
  const stars = await reveal.getByLabel(/of 3 Stars$/).getAttribute('aria-label')
  console.log(`Reveal: ${stars}, ${await reveal.getByText(/Calibration Points$/).innerText()}`)
  await screenshot(page, 'screenshots/play-3-reveal.png')

  // Note each cup's Reference Score from the Reveal, to calibrate against in the next Attempt.
  const referenceScores = {}
  for (const article of await reveal.getByRole('article').all()) {
    const letter = (await article.getByRole('heading').innerText()).match(/^Cup (\w)/)[1]
    referenceScores[letter] = {}
    for (const attribute of ATTRIBUTES) {
      const row = article.getByRole('row').filter({ has: page.getByRole('rowheader', { name: attribute, exact: true }) })
      referenceScores[letter][attribute] = Number(await row.getByRole('cell').first().innerText())
    }
  }

  // Cup again returns to the Lineup for a fresh Attempt.
  await reveal.getByRole('button', { name: 'Cup again' }).click()
  await expectState(lineup, 'the Lineup did not appear after Cup again')
  await expectState(reveal, 'the Reveal is still showing after Cup again', 'detached')
  console.log('Cup again: back at the Lineup')

  // A calibrated Attempt: scoring every Reference Score exactly earns 3 Stars, a new best.
  await lineup.getByRole('button', { name: 'Start cupping' }).click()
  for (const letter of letters) {
    await cupButton(letter).click()
    for (const attribute of ATTRIBUTES) {
      await panel.getByRole('group', { name: attribute }).getByRole('button', { name: `${referenceScores[letter][attribute]} cups` }).click()
    }
  }
  await submitWhen(false).click()
  await expectState(reveal.getByLabel('3 of 3 Stars'), 'scoring every Reference Score exactly did not earn 3 Stars')
  await expectState(reveal.getByText('New best!'), 'a better Attempt was not a new best')
  console.log('Calibrated Attempt: 3 of 3 Stars, New best!')
  await reveal.getByRole('button', { name: 'Cup again' }).click()

  // Leave Lab mid-Attempt: asks first, and Keep cupping carries on with the Attempt.
  await lineup.getByRole('button', { name: 'Start cupping' }).click()
  await steps.getByRole('button', { name: 'Pour', exact: true }).click()
  const leaveLab = page.getByRole('button', { name: 'Leave Lab' })
  const confirmation = page.getByRole('alertdialog', { name: 'Leave Lab' })
  await leaveLab.click()
  await expectState(confirmation.getByText('Leave? Your cups will go cold!'), 'Leave Lab mid-Attempt did not ask to confirm')
  await screenshot(page, 'screenshots/play-4-leave-lab.png')
  await confirmation.getByRole('button', { name: 'Keep cupping' }).click()
  await expectState(confirmation, 'the confirmation is still showing after Keep cupping', 'detached')
  await expectState(steps.getByRole('button', { name: '✓ Pour', exact: true }), 'Keep cupping lost the Attempt')

  // Confirming discards the Attempt and returns to the Lab Map with the best Stars unchanged.
  await leaveLab.click()
  await confirmation.getByRole('button', { name: 'Leave Lab' }).click()
  await expectState(labMap, 'the Lab Map did not appear after leaving the Lab')
  const bestStars = () => labMap.getByRole('button', { name: sessionName }).getByLabel(/of 3 Stars$/).getAttribute('aria-label')
  assert.equal(await bestStars(), '3 of 3 Stars', 'the Lab Map does not show the best Stars')
  console.log(`Left the Lab mid-Attempt: ${sessionName} keeps ${await bestStars()}`)

  // Progress is saved: a reload shows the same best Stars.
  await page.reload()
  await expectState(labMap, 'the Lab Map did not appear after a reload')
  assert.equal(await bestStars(), '3 of 3 Stars', 'best Stars were not saved across a reload')
  console.log(`Reloaded: ${sessionName} still has ${await bestStars()}`)
  await screenshot(page, 'screenshots/play-5-lab-map-after.png')
})
