import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { content } from '../content/v1'
import { ATTRIBUTE_NAMES, ATTRIBUTES } from '../core'
import type { AttemptState, Attribute, BlindCupState, CuppingStep, LineupOptions, RevealedCup, StarCount, TutorialPrompt } from '../core'
import { ATTRIBUTE_ICONS, WINDOW_LABELS } from './cueDisplay'
import { DIORAMA_POSE, LabScene } from './scene/LabScene'
import { SPEEDS, useGameStore } from './store'
import type { OpenedSession } from './store'

const STEPS: { step: CuppingStep; label: string }[] = [
  { step: 'dry-fragrance', label: 'Dry Fragrance' },
  { step: 'pour', label: 'Pour' },
  { step: 'break-the-crust', label: 'Break the Crust' },
  { step: 'skim', label: 'Skim' },
  { step: 'slurp', label: 'Slurp' },
]
const STEP_LABELS = Object.fromEntries(STEPS.map(({ step, label }) => [step, label])) as Record<CuppingStep, string>

const RATINGS = [1, 2, 3, 4, 5] as const

const { ambientTemperature, startTemperature, stoneColdTemperature } = content.tuning.cooling
const { accuracyWindows } = content.tuning.tasting

/** Where a Cup Temperature falls along the thermometer, as a percentage from room temperature to the starting temperature. */
function thermometerPercent(temperature: number) {
  const percent = ((temperature - ambientTemperature) / (startTemperature - ambientTemperature)) * 100
  return Math.min(100, Math.max(0, percent))
}

function useGameLoop() {
  const tick = useGameStore((s) => s.tick)
  useEffect(() => {
    let last = performance.now()
    let frame = requestAnimationFrame(function loop(now) {
      tick((now - last) / 1000)
      last = now
      frame = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(frame)
  }, [tick])
}

function formatClock(seconds: number) {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

function Hud({ session }: { session: OpenedSession }) {
  const speed = useGameStore((s) => s.speed)
  const elapsed = useGameStore((s) => s.attempt?.elapsedSeconds ?? 0)
  // The Lineup and the Reveal have their own Leave Lab; this one is for leaving mid-Attempt.
  const cupping = useGameStore((s) => s.attempt !== null && s.reveal === null)
  const { setSpeed, leaveLab } = useGameStore.getState()
  return (
    <div className="hud">
      <h1>{session.name}</h1>
      <div>Game clock {formatClock(elapsed)}</div>
      <div className="speed" role="group" aria-label="Game speed">
        {SPEEDS.map((s) => (
          <button key={s} aria-pressed={s === speed} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
      {cupping && <button onClick={leaveLab}>Leave Lab</button>}
    </div>
  )
}

function LabMapScreen() {
  const { totalStars, labs } = useGameStore((s) => s.labMap)
  const openSession = useGameStore((s) => s.openSession)
  return (
    <div className="backdrop">
      <section className="lab-map" aria-label="Lab Map">
        <header>
          <h2>Lab Map</h2>
          <p aria-label={`${totalStars} total Stars`}>
            <span className="star-total">★</span> {totalStars} total Stars
          </p>
        </header>
        {labs.map((lab) => (
          <section key={lab.id} className={lab.unlocked ? 'lab' : 'lab locked'} aria-label={lab.name}>
            <h3>
              {lab.name}
              {!lab.unlocked && <small>🔒 Needs {lab.starsToUnlock} Stars</small>}
            </h3>
            <div className="lab-sessions">
              {lab.sessions.map((session) => (
                <button key={session.id} disabled={!lab.unlocked} onClick={() => openSession(session)}>
                  {session.name}
                  {session.tutorial && <small className="tutorial-badge">Tutorial</small>}
                  <Stars count={session.bestStars} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}

/** Asks before discarding the Attempt in progress; the cups keep cooling while the Player decides. */
function LeaveConfirmation() {
  const { confirmLeaveLab, cancelLeaveLab } = useGameStore.getState()
  return (
    <div className="backdrop">
      <section className="leave-confirmation" role="alertdialog" aria-label="Leave Lab" aria-describedby="leave-warning">
        <p id="leave-warning">Leave? Your cups will go cold!</p>
        <p className="empty">This Attempt will be discarded. Your Stars stay as they are.</p>
        <div className="choices">
          <button className="secondary" onClick={cancelLeaveLab}>
            Keep cupping
          </button>
          <button className="primary" onClick={confirmLeaveLab}>
            Leave Lab
          </button>
        </div>
      </section>
    </div>
  )
}

function LineupScreen({ lineupOptions: { seats, npcCuppers } }: { lineupOptions: LineupOptions }) {
  const lineup = useGameStore((s) => s.lineup)
  const lineupRejection = useGameStore((s) => s.lineupRejection)
  const rejection = useGameStore((s) => s.rejection)
  const { toggleLineup, startAttempt, leaveLab } = useGameStore.getState()
  const problem = lineupRejection ?? rejection
  return (
    <div className="backdrop">
      <section className="lineup" aria-label="Lineup">
        <h2>Who's cupping with you?</h2>
        <p>
          {seats} Seats at this table, {lineup.length} filled. Leave a Seat empty to cup with fewer NPC Cuppers.
        </p>
        <div className="lineup-picks" role="group" aria-label="NPC Cuppers">
          {npcCuppers.map((npc) => {
            const seat = lineup.indexOf(npc.id)
            return (
              <button key={npc.id} aria-pressed={seat !== -1} onClick={() => toggleLineup(npc.id)}>
                {npc.name}
                <small>{seat === -1 ? 'Not seated' : `Seat ${seat + 1}`}</small>
              </button>
            )
          })}
        </div>
        {problem && (
          <p className="rejection" role="alert">
            {problem}
          </p>
        )}
        <button className="primary" disabled={lineupRejection !== null} onClick={startAttempt}>
          Start cupping
        </button>
        <button className="secondary" onClick={leaveLab}>
          Leave Lab
        </button>
      </section>
    </div>
  )
}

/** "Pip", "Pip and Mochi", "Pip, Mochi and Juniper". */
function listOf(names: readonly string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function attributeList(attributes: readonly Attribute[]) {
  return listOf(attributes.map((attribute) => ATTRIBUTE_NAMES[attribute]))
}

const STEP_GUIDANCE: Record<CuppingStep, (cup: string) => string> = {
  'dry-fragrance': (cup) =>
    `Start with Dry Fragrance: smell Cup ${cup}'s dry grounds for an Aroma cue. It's optional, and only possible before you Pour.`,
  pour: (cup) => `Pour hot water over Cup ${cup}'s grounds. A crust of grounds floats up to the top.`,
  'break-the-crust': (cup) => `Break the Crust on Cup ${cup}: push through the floating grounds and catch the burst of aroma.`,
  skim: (cup) => `Skim the last grounds off Cup ${cup}, so it's ready to taste.`,
  slurp: (cup) => `Slurp Cup ${cup}! Each Slurp gives a Tasting Cue for every Attribute, added to the Cue Log below.`,
}

/** The tutorial's prompt, worded; which prompt shows is the core's decision. */
function promptText(prompt: TutorialPrompt, firstLetter: string): { title: string; body: string } {
  switch (prompt.kind) {
    case 'cupping-step': {
      const lead = prompt.cupLetter === firstLetter ? '' : `Every cup cools together, so cup Cup ${prompt.cupLetter} too. `
      return { title: STEP_LABELS[prompt.step], body: lead + STEP_GUIDANCE[prompt.step](prompt.cupLetter) }
    }
    case 'accuracy-windows': {
      const { cupLetter, slurpNow, waitFor } = prompt
      const wait =
        waitFor.length > 0
          ? ` ${attributeList(waitFor)} ${waitFor.length === 1 ? 'is' : 'are'} still too hot: wait for the marker to reach ${waitFor.length === 1 ? 'its window' : 'their windows'}.`
          : ''
      const body =
        slurpNow.length > 0
          ? `Cup ${cupLetter} is inside the Accuracy Window for ${attributeList(slurpNow)}: Slurp now for accurate Tasting Cues.${wait}`
          : `Outside its Accuracy Window, an Attribute's cue is vague or one cup off. Watch the thermometer as Cup ${cupLetter} cools.${wait}`
      return { title: 'Read the thermometer', body }
    }
    case 'score-card':
      return {
        title: 'Fill in the Score Card',
        body: `Rate ${attributeList(prompt.unrated)} on Cup ${prompt.cupLetter}'s Score Card, 1 to 5 cups. Trust the Tasting Cues from inside their Accuracy Windows.`,
      }
    case 'submit':
      return {
        title: 'Submit',
        body: 'Every Score Card is complete. Submit to see the Reveal: each coffee, its Reference Score, and how close you came.',
      }
  }
}

function TutorialPromptCard({ prompt, attempt }: { prompt: TutorialPrompt; attempt: AttemptState }) {
  const { title, body } = promptText(prompt, attempt.cups[0]!.letter)
  const company = attempt.npcCuppers.map((npc) => npc.name)
  return (
    <section className="tutorial-prompt" aria-label="Tutorial" aria-live="polite">
      <small>Tutorial{company.length > 0 && ` · cupping with ${listOf(company)}`}</small>
      <h3>{title}</h3>
      <p>{body}</p>
    </section>
  )
}

/** Each Attribute's Accuracy Window on one scale, with the cup's current temperature, so the Player can time Slurps. */
function Thermometer({ cup, prompted = [] }: { cup: BlindCupState; prompted?: readonly Attribute[] }) {
  return (
    <div className="thermometer">
      {ATTRIBUTES.map((attribute) => {
        const { min, max } = accuracyWindows[attribute]
        const position = cup.windows[attribute]
        return (
          <div key={attribute} className={`window-row ${position}${prompted.includes(attribute) ? ' prompted' : ''}`}>
            <span className="window-name">
              {ATTRIBUTE_ICONS[attribute]} {ATTRIBUTE_NAMES[attribute]}
            </span>
            <span className="window-track" aria-hidden="true">
              <span className="stone-cold-zone" style={{ width: `${thermometerPercent(stoneColdTemperature)}%` }} />
              <span
                className="window-range"
                style={{ left: `${thermometerPercent(min)}%`, width: `${thermometerPercent(max) - thermometerPercent(min)}%` }}
              />
              <span className="temperature-marker" style={{ left: `${thermometerPercent(cup.temperature)}%` }} />
            </span>
            <span className="window-state">{WINDOW_LABELS[position]}</span>
          </div>
        )
      })}
      <div className="thermometer-scale" aria-hidden="true">
        <span>{ambientTemperature}°C</span>
        <span>{startTemperature}°C</span>
      </div>
      <p className="thermometer-legend">
        <span className="legend-window" /> Accuracy Window · <span className="legend-stone-cold" /> stone cold at{' '}
        {stoneColdTemperature}°C
      </p>
    </div>
  )
}

function CuppingPanel() {
  const attempt = useGameStore((s) => s.attempt)
  return attempt && <AttemptPanel attempt={attempt} />
}

function AttemptPanel({ attempt }: { attempt: AttemptState }) {
  const { cups, canSubmit, tutorialPrompt } = attempt
  const selectedLetter = useGameStore((s) => s.selectedLetter)
  const firstPersonLetter = useGameStore((s) => s.firstPersonLetter)
  const rejection = useGameStore((s) => s.rejection)
  const { selectCup, performStep, returnToDiorama, setRating, submit } = useGameStore.getState()
  const cup = cups.find((c) => c.letter === selectedLetter)!
  // The tutorial's prompt points at one cup; it highlights that cup's controls once the Player looks at it.
  const promptedCup = tutorialPrompt && 'cupLetter' in tutorialPrompt ? tutorialPrompt.cupLetter : undefined
  const onPromptedCup = promptedCup === cup.letter
  const promptedWindows = onPromptedCup && tutorialPrompt?.kind === 'accuracy-windows' ? tutorialPrompt.slurpNow : []
  const promptedStep =
    onPromptedCup && tutorialPrompt?.kind === 'cupping-step' ? tutorialPrompt.step : promptedWindows.length > 0 ? 'slurp' : undefined
  const promptedRatings = onPromptedCup && tutorialPrompt?.kind === 'score-card' ? tutorialPrompt.unrated : []
  const logEnd = useRef<HTMLLIElement>(null)

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [cup.cues.length])

  return (
    <aside className="panel" aria-label="Cupping">
      {tutorialPrompt && <TutorialPromptCard prompt={tutorialPrompt} attempt={attempt} />}
      <div className="cup-picker" role="group" aria-label="Blind Cups">
        {cups.map((c) => (
          <button
            key={c.letter}
            aria-pressed={c.letter === selectedLetter}
            className={c.letter === promptedCup && !onPromptedCup ? 'prompted' : undefined}
            onClick={() => selectCup(c.letter)}
          >
            Cup {c.letter}
            {c.scoreCardComplete && <span aria-label="Score Card complete"> ✓</span>}
          </button>
        ))}
      </div>

      <h2>
        Cup {cup.letter} <small>{Math.round(cup.temperature)}°C</small>
      </h2>
      <div className="steps" role="group" aria-label="Cupping Steps">
        {STEPS.map(({ step, label }) => {
          const done = step !== 'slurp' && cup.completedSteps.includes(step)
          const className = [done && 'done', step === promptedStep && 'prompted'].filter(Boolean).join(' ')
          return (
            <button key={step} className={className || undefined} onClick={() => performStep(step)}>
              {done ? `✓ ${label}` : label}
            </button>
          )
        })}
      </div>
      {rejection && (
        <p className="rejection" role="alert">
          {rejection}
        </p>
      )}
      {firstPersonLetter && (
        <button className="back" onClick={returnToDiorama}>
          Back to the table
        </button>
      )}

      <h3>Thermometer</h3>
      <Thermometer cup={cup} prompted={promptedWindows} />

      <h3>Cue Log</h3>
      {cup.cues.length === 0 ? (
        <p className="empty">No Tasting Cues yet. Start with Dry Fragrance or Pour.</p>
      ) : (
        <ol className="cue-log">
          {cup.cues.map((cue, i) => (
            <li key={i} ref={i === cup.cues.length - 1 ? logEnd : undefined} className={cue.window}>
              <span className="cue-meta">
                {ATTRIBUTE_ICONS[cue.attribute]} {STEP_LABELS[cue.step]} · {ATTRIBUTE_NAMES[cue.attribute]} ·{' '}
                {Math.round(cue.temperature)}°C{cue.window !== 'inside' && <em> · {WINDOW_LABELS[cue.window]}</em>}
              </span>
              {cue.note}
            </li>
          ))}
        </ol>
      )}

      <h3>Score Card · Cup {cup.letter}</h3>
      <div className="score-card">
        {ATTRIBUTES.map((attribute) => {
          const rated = cup.scoreCard[attribute]
          return (
            <div
              key={attribute}
              className={promptedRatings.includes(attribute) ? 'rating-row prompted' : 'rating-row'}
              role="group"
              aria-label={ATTRIBUTE_NAMES[attribute]}
            >
              <span>{ATTRIBUTE_NAMES[attribute]}</span>
              {RATINGS.map((rating) => (
                <button
                  key={rating}
                  aria-label={`${rating} cups`}
                  aria-pressed={rating === rated}
                  className={rated !== undefined && rating <= rated ? 'filled' : undefined}
                  onClick={() => setRating(attribute, rating)}
                >
                  {rating}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <button className={tutorialPrompt?.kind === 'submit' ? 'submit prompted' : 'submit'} disabled={!canSubmit} onClick={submit}>
        Submit
      </button>
      {!canSubmit && <p className="empty">Rate every Attribute on every cup to Submit.</p>}
    </aside>
  )
}

function Stars({ count }: { count: StarCount }) {
  return (
    <span className="stars" role="img" aria-label={`${count} of 3 Stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'earned' : undefined}>
          ★
        </span>
      ))}
    </span>
  )
}

function RevealCard({ cup }: { cup: RevealedCup }) {
  return (
    <article className="reveal-cup">
      <h3>
        Cup {cup.letter} <span>{cup.origin}</span>
      </h3>
      <p>{cup.story}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Attribute</th>
            <th scope="col">Ref.</th>
            <th scope="col">You</th>
            <th scope="col">Points</th>
            {cup.npcScoreCards.map((npc) => (
              <th key={npc.id} scope="col">
                {npc.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attribute) => (
            <tr key={attribute}>
              <th scope="row">{ATTRIBUTE_NAMES[attribute]}</th>
              <td>{cup.referenceScore[attribute]}</td>
              <td>{cup.scoreCard[attribute]}</td>
              <td className={`points-${cup.calibrationPoints[attribute]}`}>+{cup.calibrationPoints[attribute]}</td>
              {cup.npcScoreCards.map((npc) => (
                <td key={npc.id} className="npc-rating">
                  {npc.scoreCard[attribute]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function Reveal() {
  const reveal = useGameStore((s) => s.reveal)
  const { cupAgain, leaveLab } = useGameStore.getState()
  if (!reveal) return null
  return (
    <div className="backdrop">
      <section className="reveal" aria-label="Reveal">
        <header>
          <h2>The Reveal</h2>
          <Stars count={reveal.stars} />
          {reveal.newBest && <p className="new-best">New best!</p>}
          {reveal.unlockedLabs.map((lab) => (
            <p key={lab.id} className="new-best">
              🔓 {lab.name} unlocked!
            </p>
          ))}
          <p>
            {reveal.calibrationPoints} of {reveal.maxCalibrationPoints} Calibration Points
          </p>
        </header>
        <div className="reveal-cups">
          {reveal.cups.map((cup) => (
            <RevealCard key={cup.letter} cup={cup} />
          ))}
        </div>
        <div className="choices">
          <button className="secondary" onClick={leaveLab}>
            Leave Lab
          </button>
          <button className="primary" onClick={cupAgain}>
            Cup again
          </button>
        </div>
      </section>
    </div>
  )
}

export function App() {
  useGameLoop()
  const labelLayer = useRef<HTMLDivElement>(null)
  const session = useGameStore((s) => s.session)
  const choosingLineup = useGameStore((s) => s.attempt === null)
  const confirmingLeave = useGameStore((s) => s.confirmingLeave)
  return (
    <>
      <Canvas
        shadows
        camera={{ position: DIORAMA_POSE.position.toArray(), fov: DIORAMA_POSE.fov, near: 0.1, far: 100 }}
        onPointerMissed={() => useGameStore.getState().returnToDiorama()}
      >
        <LabScene labelLayer={labelLayer} />
      </Canvas>
      <div ref={labelLayer} className="label-layer" />
      {session === null ? (
        <LabMapScreen />
      ) : (
        <>
          <Hud session={session} />
          {choosingLineup ? <LineupScreen lineupOptions={session.lineupOptions} /> : <CuppingPanel />}
          <Reveal />
          {confirmingLeave && <LeaveConfirmation />}
        </>
      )}
    </>
  )
}
