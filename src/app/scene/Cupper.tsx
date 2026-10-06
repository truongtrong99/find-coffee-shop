import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useRef, type ReactNode, type RefObject } from 'react'
import type { Group } from 'three'
import { CharacterModelView, type CharacterModel } from './models'

const CUPPER_HEIGHT = 1.45
const TURN_EASE_PER_SECOND = 6

interface CupperProps {
  position: [number, number, number]
  /** The character standing in for this Cupper. */
  model: CharacterModel
  /** The point on the floor plane, [x, z], the Cupper turns to face. */
  facing: [number, number]
  /** Leaning in over a cup, e.g. while performing a Cupping Step on it. */
  leaning?: boolean
  /** Shown above the Cupper's head in the diorama. */
  label?: ReactNode
  labelLayer?: RefObject<HTMLDivElement | null>
}

/** Yaw that turns the Cupper's face (local -z) towards `facing`. */
function yawTowards([x, , z]: [number, number, number], [fx, fz]: [number, number]) {
  return Math.atan2(-(fx - x), -(fz - z))
}

/**
 * A Cupper at the table: a CC0 character model behind a swappable component boundary, idling, or reaching over a cup
 * while leaning in.
 */
export function Cupper({ position, model, facing, leaning = false, label, labelLayer }: CupperProps) {
  const body = useRef<Group>(null)

  // Presentation only: eases towards the pose the core's state asks for.
  useFrame((_, delta) => {
    if (!body.current) return
    const t = 1 - Math.exp(-TURN_EASE_PER_SECOND * delta)
    const turn = yawTowards(position, facing) - body.current.rotation.y
    body.current.rotation.y += (Math.atan2(Math.sin(turn), Math.cos(turn))) * t
  })

  return (
    <group ref={body} position={position} rotation={[0, yawTowards(position, facing), 0]}>
      {/* The character faces +z; the Cupper faces -z. */}
      <group rotation={[0, Math.PI, 0]}>
        <Suspense fallback={null}>
          <CharacterModelView model={model} height={CUPPER_HEIGHT} animation={leaning ? 'interact-right' : 'idle'} />
        </Suspense>
      </group>
      {label && labelLayer && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[10, 0]} portal={labelLayer as RefObject<HTMLElement>}>
          {label}
        </Html>
      )}
    </group>
  )
}
