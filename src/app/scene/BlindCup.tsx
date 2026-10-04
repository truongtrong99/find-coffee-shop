import { Html } from '@react-three/drei'
import type { RefObject } from 'react'
import { Color } from 'three'
import { content } from '../../content/v1'
import type { TastingCue } from '../../core'
import { AromaBurst, FlavorIcons, Steam } from './TastingEffects'

const { ambientTemperature, startTemperature } = content.tuning.cooling
const HOT = new Color('#e8452c')
const COLD = new Color('#4aa3e0')
const THERMOMETER_HEIGHT = 0.9

interface BlindCupProps {
  letter: string
  temperature: number
  position: [number, number, number]
  selected: boolean
  showLabel: boolean
  /** The Tasting Cues the Player's latest Cupping Step on this cup gave, while their effects show; `id` restarts them. */
  freshCues: { id: number; cues: TastingCue[] } | undefined
  /** Show the fresh cues' flavor icons and the Player's reaction above the cup, as in first-person. */
  showFlavorIcons: boolean
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
  position,
  selected,
  showLabel,
  freshCues,
  showFlavorIcons,
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
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.5, 32]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0.505, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.01, 32]} />
        <meshStandardMaterial color="#4b2c1a" />
      </mesh>
      <Thermometer temperature={temperature} />
      <Steam temperature={temperature} />
      {freshCues && aromaCue && <AromaBurst key={`aroma-${freshCues.id}`} rating={aromaCue.suggestedRating} />}
      {freshCues && showFlavorIcons && <FlavorIcons key={`icons-${freshCues.id}`} cues={freshCues.cues} labelLayer={labelLayer} />}
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
