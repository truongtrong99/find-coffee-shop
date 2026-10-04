import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { firstSession } from '../content/v1'
import { ATTRIBUTE_NAMES, ATTRIBUTES } from '../core'
import type { CuppingStep, RevealedCup, StarCount } from '../core'
import { DIORAMA_POSE, LabScene } from './scene/LabScene'
import { SPEEDS, useGameStore } from './store'

const STEPS: { step: CuppingStep; label: string }[] = [
  { step: 'dry-fragrance', label: 'Dry Fragrance' },
  { step: 'pour', label: 'Pour' },
  { step: 'break-the-crust', label: 'Break the Crust' },
  { step: 'skim', label: 'Skim' },
  { step: 'slurp', label: 'Slurp' },
]
const STEP_LABELS = Object.fromEntries(STEPS.map(({ step, label }) => [step, label])) as Record<CuppingStep, string>

const RATINGS = [1, 2, 3, 4, 5] as const

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

function Hud() {
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const elapsed = useGameStore((s) => s.attempt.elapsedSeconds)
  return (
    <div className="hud">
      <h1>{firstSession.name}</h1>
      <div>Game clock {formatClock(elapsed)}</div>
      <div className="speed" role="group" aria-label="Game speed">
        {SPEEDS.map((s) => (
          <button key={s} aria-pressed={s === speed} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  )
}

function CuppingPanel() {
  const cups = useGameStore((s) => s.attempt.cups)
  const selectedLetter = useGameStore((s) => s.selectedLetter)
  const firstPersonLetter = useGameStore((s) => s.firstPersonLetter)
  const rejection = useGameStore((s) => s.rejection)
  const canSubmit = useGameStore((s) => s.attempt.canSubmit)
  const { selectCup, performStep, returnToDiorama, setRating, submit } = useGameStore.getState()
  const cup = cups.find((c) => c.letter === selectedLetter)!
  const logEnd = useRef<HTMLLIElement>(null)

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [cup.cues.length])

  return (
    <aside className="panel" aria-label="Cupping">
      <div className="cup-picker" role="group" aria-label="Blind Cups">
        {cups.map((c) => (
          <button key={c.letter} aria-pressed={c.letter === selectedLetter} onClick={() => selectCup(c.letter)}>
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
          return (
            <button key={step} className={done ? 'done' : undefined} onClick={() => performStep(step)}>
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

      <h3>Cue Log</h3>
      {cup.cues.length === 0 ? (
        <p className="empty">No Tasting Cues yet. Start with Dry Fragrance or Pour.</p>
      ) : (
        <ol className="cue-log">
          {cup.cues.map((cue, i) => (
            <li key={i} ref={i === cup.cues.length - 1 ? logEnd : undefined}>
              <span className="cue-meta">
                {STEP_LABELS[cue.step]} · {ATTRIBUTE_NAMES[cue.attribute]}
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
            <div key={attribute} className="rating-row" role="group" aria-label={ATTRIBUTE_NAMES[attribute]}>
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
      <button className="submit" disabled={!canSubmit} onClick={submit}>
        Submit
      </button>
      {!canSubmit && <p className="empty">Rate every Attribute on every cup to Submit.</p>}
    </aside>
  )
}

function Stars({ count }: { count: StarCount }) {
  return (
    <div className="stars" aria-label={`${count} of 3 Stars`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= count ? 'earned' : undefined}>
          ★
        </span>
      ))}
    </div>
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
            <th scope="col">Reference</th>
            <th scope="col">You</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attribute) => (
            <tr key={attribute}>
              <th scope="row">{ATTRIBUTE_NAMES[attribute]}</th>
              <td>{cup.referenceScore[attribute]}</td>
              <td>{cup.scoreCard[attribute]}</td>
              <td className={`points-${cup.calibrationPoints[attribute]}`}>+{cup.calibrationPoints[attribute]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

function Reveal() {
  const reveal = useGameStore((s) => s.reveal)
  const cupAgain = useGameStore((s) => s.cupAgain)
  if (!reveal) return null
  return (
    <div className="reveal-backdrop">
      <section className="reveal" aria-label="Reveal">
        <header>
          <h2>The Reveal</h2>
          <Stars count={reveal.stars} />
          <p>
            {reveal.calibrationPoints} of {reveal.maxCalibrationPoints} Calibration Points
          </p>
        </header>
        <div className="reveal-cups">
          {reveal.cups.map((cup) => (
            <RevealCard key={cup.letter} cup={cup} />
          ))}
        </div>
        <button className="again" onClick={cupAgain}>
          Cup again
        </button>
      </section>
    </div>
  )
}

export function App() {
  useGameLoop()
  const labelLayer = useRef<HTMLDivElement>(null)
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
      <Hud />
      <CuppingPanel />
      <Reveal />
    </>
  )
}
