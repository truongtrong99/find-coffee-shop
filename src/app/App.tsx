import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { firstSession } from '../content/v1'
import { LabScene } from './scene/LabScene'
import { SPEEDS, useGameStore } from './store'

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

export function App() {
  useGameLoop()
  return (
    <>
      <Canvas orthographic shadows camera={{ position: [8, 8, 8], zoom: 90, near: 0.1, far: 100 }}>
        <LabScene />
      </Canvas>
      <Hud />
    </>
  )
}
