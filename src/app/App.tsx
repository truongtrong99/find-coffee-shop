import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { firstSession } from '../content/v1'
import type { Attribute, CuppingStep } from '../core'
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

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  aroma: 'Aroma',
  flavor: 'Flavor',
  acidity: 'Acidity',
  body: 'Body',
  sweetness: 'Sweetness',
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
  const stepRejection = useGameStore((s) => s.stepRejection)
  const { selectCup, performStep, returnToDiorama } = useGameStore.getState()
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
      {stepRejection && (
        <p className="rejection" role="alert">
          {stepRejection}
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
                {STEP_LABELS[cue.step]} · {ATTRIBUTE_LABELS[cue.attribute]}
              </span>
              {cue.note}
            </li>
          ))}
        </ol>
      )}
    </aside>
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
    </>
  )
}
