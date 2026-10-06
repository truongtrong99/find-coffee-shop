import { Html } from '@react-three/drei'
import { Suspense, type RefObject } from 'react'
import { Color } from 'three'
import { content } from '../../content/v1'
import type { FreshCues } from '../store'
import { CUPPING_BOWL_URL, FittedModel } from './models'
import { AromaBurst, CueIcons, Steam } from './TastingEffects'

const { ambientTemperature, startTemperature } = content.tuning.cooling
const HOT = new Color('#e8452c')
const COLD = new Color('#4aa3e0')
const THERMOMETER_HEIGHT = 0.9
const BOWL_FIT = { width: 0.9, height: 0.5 }

interface BlindCupProps {
  letter: string
  temperature: number
  /** Whether the core says the cup is stone cold, so it no longer steams. */
  stoneCold: boolean
  position: [number, number, number]
  selected: boolean
  showLabel: boolean
  /** The Tasting Cues the Player's latest Cupping Step on this cup gave, while their effects show. */
  freshCues: FreshCues | undefined
  /** Show the fresh cues' icons and the Player's reaction above the cup, as in first-person. */
  showCueIcons: boolean
  onSelect(): void
  /** Stable DOM layer for labels; without it drei's Html can lose a label when its default target changes on mount. */
  labelLayer: RefObject<HTMLDivElement | null>
}

function Thermometer({ temperature }: { temperature: number }) {
  const fraction = Math.min(1, Math.max(0.05, (temperature - ambientTemperature) / (startTemperature - ambientTemperature)))
  const color = COLD.clone().lerp(HOT, fraction)
  return (
    <group position={[0.65, 0, 0]}>
      <mesh position={[0, THERMOMETER_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, THERMOMETER_HEIGHT, 0.12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, (THERMOMETER_HEIGHT * fraction) / 2, 0.065]}>
        <boxGeometry args={[0.06, THERMOMETER_HEIGHT * fraction, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export function BlindCup({
  letter,
  temperature,
  stoneCold,
  position,
  selected,
  showLabel,
  freshCues,
  showCueIcons,
  onSelect,
  labelLayer,
}: BlindCupProps) {
  const aromaCue = freshCues?.cues.find((cue) => cue.attribute === 'aroma')
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {selected && (
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.62, 48]} />
          <meshStandardMaterial color="#e07a5f" />
        </mesh>
      )}
      {/* The cupping bowl, a CC0 model that can be swapped here, filled with coffee to the brim. */}
      <Suspense fallback={null}>
        <FittedModel url={CUPPING_BOWL_URL} fit={BOWL_FIT} />
      </Suspense>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.01, 32]} />
        <meshStandardMaterial color="#4b2c1a" />
      </mesh>
      <Thermometer temperature={temperature} />
      {!stoneCold && <Steam temperature={temperature} />}
      {freshCues && aromaCue && <AromaBurst key={`aroma-${freshCues.id}`} rating={aromaCue.suggestedRating} />}
      {freshCues && showCueIcons && <CueIcons key={`icons-${freshCues.id}`} cues={freshCues.cues} labelLayer={labelLayer} />}
      {showLabel && (
        <Html position={[0, 1.2, 0]} center zIndexRange={[10, 0]} portal={labelLayer as RefObject<HTMLElement>}>
          <div className={selected ? 'cup-label selected' : 'cup-label'}>
            Cup {letter}
            <small>{Math.round(temperature)}°C</small>
          </div>
        </Html>
      )}
    </group>
  )
}
