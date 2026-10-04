import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { STEP_NAMES } from '../../core'
import type { BlindCupState, PerformedStep } from '../../core'
import { reactionTo } from '../cueDisplay'
import { useGameStore } from '../store'
import { BlindCup } from './BlindCup'
import { Cupper } from './Cupper'

const CUP_SPACING = 1.3
const CUP_TABLE_HEIGHT = 1

function cupX(index: number, count: number) {
  return index * CUP_SPACING - ((count - 1) * CUP_SPACING) / 2
}

const NO_CUPS: BlindCupState[] = []

/** The Player sits at the front of the table; NPC Cuppers fill the Seats behind it, then the ends. */
const PLAYER_POSITION: [number, number, number] = [0, 0, 2.2]
const SEAT_POSITIONS: [number, number, number][] = [
  [-1.1, 0, -2.2],
  [1.1, 0, -2.2],
  [-3.1, 0, 0],
  [3.1, 0, 0],
]
const NPC_COLORS = ['#81b29a', '#f2cc8f', '#9c89b8', '#6d9dc5', '#f4a261', '#90be6d', '#c77dff', '#4d908e']
const TABLE_CENTRE: [number, number] = [0, 0]

/** Game seconds an NPC Cupper is shown performing a Cupping Step; following the core's clock. */
const STEP_SHOWN_GAME_SECONDS = 2.5

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

interface SeatedNpc {
  id: string
  name: string
  latestStep: PerformedStep | undefined
}

/**
 * The NPC Cuppers in their Seats: the Attempt's Lineup, or a preview of the one being chosen
 * before it starts, while it fits the Seats.
 */
function useSeatedNpcs(): SeatedNpc[] {
  const npcCuppers = useGameStore((s) => s.attempt?.npcCuppers)
  const lineup = useGameStore((s) => s.lineup)
  const lineupFits = useGameStore((s) => s.lineupRejection === null)
  const options = useGameStore((s) => s.lineupOptions)
  if (npcCuppers) return npcCuppers.map(({ id, name, steps }) => ({ id, name, latestStep: steps.at(-1) }))
  if (!lineupFits) return []
  return lineup.map((id) => ({ id, name: options.npcCuppers.find((npc) => npc.id === id)?.name ?? id, latestStep: undefined }))
}

function NpcCuppers({ labelLayer, showLabels }: { labelLayer: RefObject<HTMLDivElement | null>; showLabels: boolean }) {
  const seated = useSeatedNpcs()
  const cups = useGameStore((s) => s.attempt?.cups ?? NO_CUPS)
  const elapsed = useGameStore((s) => s.attempt?.elapsedSeconds ?? 0)
  const options = useGameStore((s) => s.lineupOptions)
  return seated.map(({ id, name, latestStep }, seat) => {
    const performing = latestStep && elapsed - latestStep.atSeconds < STEP_SHOWN_GAME_SECONDS ? latestStep : undefined
    const cupIndex = performing ? cups.findIndex((cup) => cup.letter === performing.cupLetter) : -1
    const colorIndex = options.npcCuppers.findIndex((npc) => npc.id === id)
    return (
      <Cupper
        key={id}
        position={SEAT_POSITIONS[seat]!}
        color={NPC_COLORS[colorIndex % NPC_COLORS.length]}
        facing={cupIndex === -1 ? TABLE_CENTRE : [cupX(cupIndex, cups.length), 0]}
        leaning={cupIndex !== -1}
        labelLayer={labelLayer}
        label={
          showLabels && (
            <div className={performing ? 'cupper-label performing' : 'cupper-label'}>
              {name}
              {performing && (
                <small>
                  {STEP_NAMES[performing.step]} · Cup {performing.cupLetter}
                </small>
              )}
            </div>
          )
        }
      />
    )
  })
}

/** The Player at the front of the table, leaning in over the cup in first-person and reacting to their latest cues. */
function PlayerCupper({ cups, labelLayer }: { cups: BlindCupState[]; labelLayer: RefObject<HTMLDivElement | null> }) {
  const firstPersonLetter = useGameStore((s) => s.firstPersonLetter)
  const freshCues = useGameStore((s) => s.freshCues)
  const cupIndex = cups.findIndex((cup) => cup.letter === firstPersonLetter)
  const reaction = freshCues && reactionTo(freshCues.cues)
  return (
    <Cupper
      position={PLAYER_POSITION}
      facing={cupIndex === -1 ? TABLE_CENTRE : [cupX(cupIndex, cups.length), 0]}
      leaning={cupIndex !== -1}
      labelLayer={labelLayer}
      label={
        reaction &&
        firstPersonLetter === null && (
          <div className="cupper-label">
            {reaction.emoji} {reaction.text}
          </div>
        )
      }
    />
  )
}

export function LabScene({ labelLayer }: { labelLayer: RefObject<HTMLDivElement | null> }) {
  const cups = useGameStore((s) => s.attempt?.cups ?? NO_CUPS)
  const selectedLetter = useGameStore((s) => s.selectedLetter)
  const firstPersonLetter = useGameStore((s) => s.firstPersonLetter)
  const freshCues = useGameStore((s) => s.freshCues)
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
          stoneCold={cup.stoneCold}
          position={[cupX(i, cups.length), CUP_TABLE_HEIGHT, 0]}
          selected={cup.letter === selectedLetter}
          showLabel={firstPersonLetter === null}
          freshCues={freshCues?.letter === cup.letter ? freshCues : undefined}
          showCueIcons={firstPersonLetter === cup.letter}
          onSelect={() => selectCup(cup.letter)}
          labelLayer={labelLayer}
        />
      ))}
      <PlayerCupper cups={cups} labelLayer={labelLayer} />
      <NpcCuppers labelLayer={labelLayer} showLabels={firstPersonLetter === null} />
    </>
  )
}
