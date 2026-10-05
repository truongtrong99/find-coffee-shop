import { create } from 'zustand'
import { content } from '../content/v1'
import { createGameCore, GameRuleError } from '../core'
import type {
  AttemptState,
  Attribute,
  CupperJournalEntry,
  CuppingSessionSummary,
  CuppingStep,
  LabMap,
  LineupOptions,
  RevealResult,
  TastingCue,
} from '../core'
import { createLocalStorageSaveStore } from './localStorageSaveStore'

export const SPEEDS = [1, 2, 4, 8] as const
export type Speed = (typeof SPEEDS)[number]

// Real frames longer than this (e.g. a backgrounded tab) are clamped so cups don't jump to cold.
// The first frame's delta can be slightly negative (the frame timestamp predates the loop starting).
const MAX_REAL_STEP_SECONDS = 0.1

// How long the camera lingers in first-person after a Cupping Step before returning to the diorama.
// Presentation only: it never affects the game clock.
const FIRST_PERSON_REAL_SECONDS = 2.5

// How long the Player's latest Tasting Cues show as particles, flavor icons and a reaction. Presentation only.
const FRESH_CUES_REAL_SECONDS = 4

const core = createGameCore({
  content,
  saveStore: createLocalStorageSaveStore(),
  random: { next: Math.random },
})

/** The Tasting Cues the Player's latest Cupping Step gave, while their effects show; a new `id` restarts them. */
export interface FreshCues {
  id: number
  letter: string
  cues: TastingCue[]
}

/** The Cupping Session the Player picked on the Lab Map. */
export interface OpenedSession {
  id: string
  name: string
  /** What the Lineup screen offers before each Attempt of it. */
  lineupOptions: LineupOptions
}

interface GameStore {
  /** Every Lab and Cupping Session with the Stars earned, as of the last Submit. */
  labMap: LabMap
  /** The Cupper Journal's entries, as of the last Submit. */
  journal: CupperJournalEntry[]
  /** Whether the Player is browsing the Cupper Journal, from the Lab Map or the Lineup screen. */
  journalOpen: boolean
  /** The Cupping Session picked on the Lab Map, or null while on the Lab Map. */
  session: OpenedSession | null
  /** The NPC Cuppers picked for the next Attempt, in Seat order. */
  lineup: string[]
  /** Why the core would reject the picked Lineup, or null if it fits the Seats. */
  lineupRejection: string | null
  /** The Attempt in progress, the last snapshot of it once Submitted, or null while choosing a Lineup. */
  attempt: AttemptState | null
  /** The Reveal of the Submitted Attempt, or null while cupping. */
  reveal: RevealResult | null
  speed: Speed
  /** The Blind Cup the Player is looking at; they may move between cups freely. */
  selectedLetter: string
  /** The cup the camera is zoomed to in first-person, or null for the diorama. */
  firstPersonLetter: string | null
  /** Why the core rejected the Player's last command, if it did. */
  rejection: string | null
  /** The Tasting Cues the Player's latest Cupping Step gave, while their effects show. */
  freshCues: FreshCues | null
  /** Whether the Player asked to Leave Lab mid-Attempt and is being asked to confirm. */
  confirmingLeave: boolean
  /** Goes from the Lab Map to the Lineup screen for a Cupping Session, or straight into the tutorial's pre-filled Lineup. */
  openSession(session: CuppingSessionSummary): void
  openJournal(): void
  closeJournal(): void
  /** Seats an NPC Cupper in the next free Seat, or stands them up if already seated. */
  toggleLineup(npcId: string): void
  /** Starts an Attempt with the chosen Lineup. */
  startAttempt(): void
  setSpeed(speed: Speed): void
  selectCup(letter: string): void
  performStep(step: CuppingStep): void
  /** Rates an Attribute on the selected Blind Cup's Score Card. */
  setRating(attribute: Attribute, rating: number): void
  submit(): void
  /** Returns to the Lineup screen for a fresh Attempt of the same Cupping Session after the Reveal, or restarts the tutorial. */
  cupAgain(): void
  /** Leaves the Lab for the Lab Map; mid-Attempt, asks the Player to confirm first. */
  leaveLab(): void
  /** Leaves the Lab after the Player confirmed, discarding the Attempt in progress. */
  confirmLeaveLab(): void
  /** The Player changed their mind and keeps cupping. */
  cancelLeaveLab(): void
  returnToDiorama(): void
  /** Passes elapsed real time to the core as a game-time step; the core decides what it means. */
  tick(realSeconds: number): void
}

let returnTimer: ReturnType<typeof setTimeout> | undefined
let freshCuesTimer: ReturnType<typeof setTimeout> | undefined
let freshCuesId = 0

/** Runs a core command, returning the core's reason if it rejected it. */
function tryCommand(command: () => void): string | null {
  try {
    command()
    return null
  } catch (error) {
    if (!(error instanceof GameRuleError)) throw error
    return error.message
  }
}

/** Stops the first-person camera and Tasting Cue effects once cupping ends, by Submit or Leave Lab. */
function endCuppingView(): Pick<GameStore, 'firstPersonLetter' | 'rejection' | 'freshCues'> {
  clearTimeout(returnTimer)
  clearTimeout(freshCuesTimer)
  return { firstPersonLetter: null, rejection: null, freshCues: null }
}

/** The picked Cupping Session's id; only called once the Player has left the Lab Map. */
function pickedSessionId(get: () => GameStore): string {
  const { session } = get()
  if (session === null) throw new Error('No Cupping Session picked on the Lab Map')
  return session.id
}

/** The tutorial's Lineup is pre-filled, so it skips the Lineup screen and starts the Attempt with it. */
function startPrefilledLineup(set: (partial: Partial<GameStore>) => void, get: () => GameStore): void {
  const { prefilledLineup } = get().session!.lineupOptions
  if (!prefilledLineup) return
  set({ lineup: prefilledLineup.map((npc) => npc.id) })
  get().startAttempt()
}

export const useGameStore = create<GameStore>((set, get) => ({
  labMap: core.getLabMap(),
  journal: core.getCupperJournal(),
  journalOpen: false,
  session: null,
  lineup: [],
  lineupRejection: null,
  attempt: null,
  reveal: null,
  speed: 1,
  selectedLetter: '',
  firstPersonLetter: null,
  rejection: null,
  freshCues: null,
  confirmingLeave: false,
  openSession({ id, name }) {
    set({ session: { id, name, lineupOptions: core.getLineupOptions(id) }, lineup: [], lineupRejection: null, rejection: null })
    startPrefilledLineup(set, get)
  },
  openJournal: () => set({ journalOpen: true }),
  closeJournal: () => set({ journalOpen: false }),
  toggleLineup(npcId) {
    const { lineup } = get()
    const picked = lineup.includes(npcId) ? lineup.filter((id) => id !== npcId) : [...lineup, npcId]
    set({ lineup: picked, lineupRejection: core.checkLineup(pickedSessionId(get), picked) ?? null, rejection: null })
  },
  startAttempt() {
    const rejection = tryCommand(() => core.startAttempt(pickedSessionId(get), get().lineup))
    if (rejection) return set({ rejection })
    const attempt = core.getAttempt()!
    set({ attempt, selectedLetter: attempt.cups[0]!.letter, rejection: null })
  },
  setSpeed: (speed) => set({ speed }),
  selectCup(letter) {
    clearTimeout(returnTimer)
    set({ selectedLetter: letter, firstPersonLetter: null, rejection: null })
  },
  performStep(step) {
    const letter = get().selectedLetter
    let cues: TastingCue[] = []
    const rejection = tryCommand(() => {
      cues = core.performStep(letter, step)
    })
    if (rejection) return set({ rejection })
    clearTimeout(returnTimer)
    returnTimer = setTimeout(() => get().returnToDiorama(), FIRST_PERSON_REAL_SECONDS * 1000)
    clearTimeout(freshCuesTimer)
    if (cues.length > 0) freshCuesTimer = setTimeout(() => set({ freshCues: null }), FRESH_CUES_REAL_SECONDS * 1000)
    set({
      attempt: core.getAttempt()!,
      firstPersonLetter: letter,
      rejection: null,
      freshCues: cues.length > 0 ? { id: ++freshCuesId, letter, cues } : null,
    })
  },
  setRating(attribute, rating) {
    const rejection = tryCommand(() => core.setRating(get().selectedLetter, attribute, rating))
    set(rejection ? { rejection } : { attempt: core.getAttempt()!, rejection: null })
  },
  submit() {
    let reveal: RevealResult | undefined
    const rejection = tryCommand(() => {
      reveal = core.submit()
    })
    if (rejection) return set({ rejection })
    set({ ...endCuppingView(), reveal, labMap: core.getLabMap(), journal: core.getCupperJournal() })
  },
  cupAgain() {
    const session = get().session!
    set({ session: { ...session, lineupOptions: core.getLineupOptions(session.id) }, attempt: null, reveal: null, rejection: null })
    startPrefilledLineup(set, get)
  },
  leaveLab() {
    if (core.getAttempt()) return set({ confirmingLeave: true })
    get().confirmLeaveLab()
  },
  confirmLeaveLab() {
    core.leaveLab()
    set({ ...endCuppingView(), labMap: core.getLabMap(), session: null, attempt: null, reveal: null, confirmingLeave: false })
  },
  cancelLeaveLab: () => set({ confirmingLeave: false }),
  returnToDiorama() {
    clearTimeout(returnTimer)
    set({ firstPersonLetter: null })
  },
  tick(realSeconds) {
    // The clock only runs during an Attempt: not while choosing a Lineup, nor once the Player has Submitted.
    if (!get().attempt || get().reveal) return
    core.advanceClock(Math.min(Math.max(realSeconds, 0), MAX_REAL_STEP_SECONDS) * get().speed)
    set({ attempt: core.getAttempt()! })
  },
}))
