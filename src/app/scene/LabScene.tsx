import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { ATTRIBUTE_NAMES, STEP_NAMES } from '../../core'
import type { BlindCupState, PerformedStep } from '../../core'
import { ATTRIBUTE_ICONS, reactionTo } from '../cueDisplay'
import { useGameStore } from '../store'
import { speak } from '../voiceBlips'
import { BlindCup } from './BlindCup'
import { Cupper } from './Cupper'
import { LabProps, Table, TABLE_HALF_WIDTH } from './LabProps'
import { npcCharacter, PLAYER_CHARACTER } from './models'

const CUP_SPACING = 1.3
const CUP_TABLE_HEIGHT = 1
/** The widest the row of cups gets, centre to centre, leaving room on the table for the last cup's thermometer. */
const CUP_ROW_WIDTH = (TABLE_HALF_WIDTH - 0.75) * 2

function cupX(index: number, count: number) {
  const spacing = count > 1 ? Math.min(CUP_SPACING, CUP_ROW_WIDTH / (count - 1)) : 0
  return index * spacing - ((count - 1) * spacing) / 2
}

const NO_CUPS: BlindCupState[] = []

/** The Player sits at the front of the table; NPC Cuppers fill the Seats behind it, then the ends. */
const PLAYER_POSITION: [number, number, number] = [0, 0, 2.2]
const SEAT_POSITIONS: [number, number, number][] = [
  [-1.1, 0, -2.2],
  [1.1, 0, -2.2],
  [-(TABLE_HALF_WIDTH + 0.8), 0, 0],
  [TABLE_HALF_WIDTH + 0.8, 0, 0],
]
const TABLE_CENTRE: [number, number] = [0, 0]

/** Game seconds an NPC Cupper is shown performing a Cupping Step; following the core's clock. */
const STEP_SHOWN_GAME_SECONDS = 2.5
/** Real seconds an NPC Cupper's remark stays in its speech bubble, long enough to read at any speed. */
const REMARK_SHOWN_REAL_SECONDS = 3.5
/** Each NPC Cupper's voice blips, by their place in the cast, so Cuppers sound apart. */
const NPC_VOICES_HZ = [330, 440, 262, 392, 294, 494, 349, 220]

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

interface SeatedNpc {
  id: string
  name: string
  latestStep: PerformedStep | undefined
  /** The step carrying their latest remark, a Slurp, and its place among their steps; undefined before any. */
  latestRemark: { step: PerformedStep; index: number } | undefined
}

/**
 * The NPC Cuppers in their Seats: the Attempt's Lineup, or a preview of the one being chosen
 * before it starts, while it fits the Seats.
 */
function useSeatedNpcs(): SeatedNpc[] {
  const npcCuppers = useGameStore((s) => s.attempt?.npcCuppers)
  const lineup = useGameStore((s) => s.lineup)
  const lineupFits = useGameStore((s) => s.lineupRejection === null)
  const options = useGameStore((s) => s.session?.lineupOptions)
  if (npcCuppers) {
    return npcCuppers.map(({ id, name, steps }) => {
      const index = steps.reduce((last, step, i) => (step.remark ? i : last), -1)
      return { id, name, latestStep: steps.at(-1), latestRemark: index === -1 ? undefined : { step: steps[index]!, index } }
    })
  }
  if (!lineupFits || !options) return []
  return lineup.map((id) => ({
    id,
    name: options.npcCuppers.find((npc) => npc.id === id)?.name ?? id,
    latestStep: undefined,
    latestRemark: undefined,
  }))
}

/**
 * The step carrying an NPC Cupper's latest remark while its speech bubble shows, voiced with blips once as it is made.
 * Presentation only: the core decides the remark and when it is made.
 */
function useSpokenRemark(latestRemark: SeatedNpc['latestRemark'], voiceHz: number): PerformedStep | undefined {
  const [shown, setShown] = useState<PerformedStep>()
  const index = latestRemark?.index
  useEffect(() => {
    if (!latestRemark) return setShown(undefined)
    setShown(latestRemark.step)
    speak(latestRemark.step.remark!.note, voiceHz)
    const timer = setTimeout(() => setShown(undefined), REMARK_SHOWN_REAL_SECONDS * 1000)
    return () => clearTimeout(timer)
    // Keyed on the step's place among theirs: a new remark is a new step, while every tick's fresh snapshot of the
    // same one must not voice it again.
  }, [index])
  return shown
}

interface NpcCupperProps extends SeatedNpc {
  seat: number
  castIndex: number
  cups: BlindCupState[]
  elapsed: number
  labelLayer: RefObject<HTMLDivElement | null>
  showLabels: boolean
}

function NpcCupper({ id, name, latestStep, latestRemark, seat, castIndex, cups, elapsed, labelLayer, showLabels }: NpcCupperProps) {
  const speaking = useSpokenRemark(latestRemark, NPC_VOICES_HZ[castIndex % NPC_VOICES_HZ.length] ?? NPC_VOICES_HZ[0]!)
  const performing = latestStep && elapsed - latestStep.atSeconds < STEP_SHOWN_GAME_SECONDS ? latestStep : undefined
  const cupIndex = performing ? cups.findIndex((cup) => cup.letter === performing.cupLetter) : -1
  const remark = speaking?.remark
  return (
    <Cupper
      position={SEAT_POSITIONS[seat]!}
      model={npcCharacter(id, castIndex)}
      facing={cupIndex === -1 ? TABLE_CENTRE : [cupX(cupIndex, cups.length), 0]}
      leaning={cupIndex !== -1}
      labelLayer={labelLayer}
      label={
        (showLabels || remark) && (
          <div className="cupper-tag">
            {remark && (
              <div className="speech-bubble" role="status">
                {ATTRIBUTE_ICONS[remark.attribute]} “{remark.note}”
                <small>
                  Cup {speaking.cupLetter} · {ATTRIBUTE_NAMES[remark.attribute]} · {Math.round(remark.temperature)}°C
                </small>
              </div>
            )}
            {showLabels && (
              <div className={performing ? 'cupper-label performing' : 'cupper-label'}>
                {name}
                {performing && (
                  <small>
                    {STEP_NAMES[performing.step]} · Cup {performing.cupLetter}
                  </small>
                )}
              </div>
            )}
          </div>
        )
      }
    />
  )
}

function NpcCuppers({ labelLayer, showLabels }: { labelLayer: RefObject<HTMLDivElement | null>; showLabels: boolean }) {
  const seated = useSeatedNpcs()
  const cups = useGameStore((s) => s.attempt?.cups ?? NO_CUPS)
  const elapsed = useGameStore((s) => s.attempt?.elapsedSeconds ?? 0)
  const options = useGameStore((s) => s.session?.lineupOptions)
  return seated.map((npc, seat) => (
    <NpcCupper
      key={npc.id}
      {...npc}
      seat={seat}
      castIndex={(options?.npcCuppers ?? []).findIndex((n) => n.id === npc.id)}
      cups={cups}
      elapsed={elapsed}
      labelLayer={labelLayer}
      showLabels={showLabels}
    />
  ))
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
      model={PLAYER_CHARACTER}
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

      <LabProps />
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
