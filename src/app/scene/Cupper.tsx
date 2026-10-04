import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode, type RefObject } from 'react'
import type { Group } from 'three'

const HIP_HEIGHT = 0.5
const LEAN_ANGLE = -0.35
const TURN_EASE_PER_SECOND = 6

interface CupperProps {
  position: [number, number, number]
  color?: string
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

/** A Cupper at the table, a placeholder made of primitives behind a swappable component boundary. */
export function Cupper({ position, color = '#e07a5f', facing, leaning = false, label, labelLayer }: CupperProps) {
  const body = useRef<Group>(null)
  const hips = useRef<Group>(null)

  // Presentation only: eases towards the pose the core's state asks for.
  useFrame((_, delta) => {
    if (!body.current || !hips.current) return
    const t = 1 - Math.exp(-TURN_EASE_PER_SECOND * delta)
    const turn = yawTowards(position, facing) - body.current.rotation.y
    body.current.rotation.y += (Math.atan2(Math.sin(turn), Math.cos(turn))) * t
    hips.current.rotation.x += ((leaning ? LEAN_ANGLE : 0) - hips.current.rotation.x) * t
  })

  return (
    <group ref={body} position={position} rotation={[0, yawTowards(position, facing), 0]}>
      <group ref={hips} position={[0, HIP_HEIGHT, 0]}>
        <mesh position={[0, 0.55 - HIP_HEIGHT, 0]} castShadow>
          <capsuleGeometry args={[0.4, 0.5, 8, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.4 - HIP_HEIGHT, 0]} castShadow>
          <sphereGeometry args={[0.45, 24, 24]} />
          <meshStandardMaterial color="#ffe0bd" />
        </mesh>
        {[-0.16, 0.16].map((x) => (
          <mesh key={x} position={[x, 1.45 - HIP_HEIGHT, -0.4]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#2b1d14" />
          </mesh>
        ))}
      </group>
      {label && labelLayer && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[10, 0]} portal={labelLayer as RefObject<HTMLElement>}>
          {label}
        </Html>
      )}
    </group>
  )
}
