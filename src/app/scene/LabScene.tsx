import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { useGameStore } from '../store'
import { BlindCup } from './BlindCup'
import { Cupper } from './Cupper'

const CUP_SPACING = 1.3
const CUP_TABLE_HEIGHT = 1

function cupX(index: number, count: number) {
  return index * CUP_SPACING - ((count - 1) * CUP_SPACING) / 2
}

interface CameraPose {
  position: Vector3
  target: Vector3
  fov: number
}

// A narrow field of view from far away reads as an isometric diorama, and lets the camera
// zoom smoothly into a first-person view without switching camera types.
// The view is aimed along screen-right (+x, -z) so the table sits left of the cupping panel.
const DIORAMA_TARGET = new Vector3(1.4, 0.8, -1.4)
export const DIORAMA_POSE: CameraPose = {
  position: DIORAMA_TARGET.clone().add(new Vector3(18, 18, 18)),
  target: DIORAMA_TARGET,
  fov: 14,
}

/** Leaning over a cup from the Player's side of the table. */
function firstPersonPose(x: number): CameraPose {
  return {
    position: new Vector3(x, CUP_TABLE_HEIGHT + 1, 1.3),
    target: new Vector3(x, CUP_TABLE_HEIGHT + 0.2, 0),
    fov: 50,
  }
}

const CAMERA_EASE_PER_SECOND = 5

/** Eases the camera between the diorama and first-person on a cup; presentation only. */
function CameraRig({ firstPersonX }: { firstPersonX: number | null }) {
  const lookAt = useRef(DIORAMA_POSE.target.clone())
  useFrame(({ camera }, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return
    const goal = firstPersonX === null ? DIORAMA_POSE : firstPersonPose(firstPersonX)
    const t = 1 - Math.exp(-CAMERA_EASE_PER_SECOND * delta)
    camera.position.lerp(goal.position, t)
    lookAt.current.lerp(goal.target, t)
    camera.fov += (goal.fov - camera.fov) * t
    camera.updateProjectionMatrix()
    camera.lookAt(lookAt.current)
  })
  return null
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f2d9b5" />
    </mesh>
  )
}

function Table() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.2, 2]} />
        <meshStandardMaterial color="#b9794a" />
      </mesh>
      {[-2, 2].flatMap((x) =>
        [-0.8, 0.8].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z]} castShadow>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <meshStandardMaterial color="#8a5a36" />
          </mesh>
        )),
      )}
    </group>
  )
}

export function LabScene({ labelLayer }: { labelLayer: RefObject<HTMLDivElement | null> }) {
  const cups = useGameStore((s) => s.attempt.cups)
  const selectedLetter = useGameStore((s) => s.selectedLetter)
  const firstPersonLetter = useGameStore((s) => s.firstPersonLetter)
  const selectCup = useGameStore((s) => s.selectCup)
  const firstPersonIndex = cups.findIndex((cup) => cup.letter === firstPersonLetter)
  return (
    <>
      <CameraRig firstPersonX={firstPersonIndex === -1 ? null : cupX(firstPersonIndex, cups.length)} />
      <color attach="background" args={['#f6e7cf']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 4]} intensity={1.6} castShadow />

      {/* Diorama base and the two back walls */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#d8b48a" />
      </mesh>
      <Wall position={[0, 1.8, -4.4]} size={[9, 3.6, 0.2]} />
      <Wall position={[-4.4, 1.8, 0]} size={[0.2, 3.6, 9]} />

      <Table />
      {cups.map((cup, i) => (
        <BlindCup
          key={cup.letter}
          letter={cup.letter}
          temperature={cup.temperature}
          position={[cupX(i, cups.length), CUP_TABLE_HEIGHT, 0]}
          selected={cup.letter === selectedLetter}
          showLabel={firstPersonLetter === null}
          onSelect={() => selectCup(cup.letter)}
          labelLayer={labelLayer}
        />
      ))}
      <Cupper position={[0, 0, 2.2]} />
    </>
  )
}
