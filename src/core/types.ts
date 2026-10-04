/** Tunable cooling constants. Cup Temperature is in degrees Celsius, time in game seconds. */
export interface CoolingTuning {
  /** Cup Temperature of every Blind Cup when an Attempt starts. */
  startTemperature: number
  /** Temperature the coffee cools towards. */
  ambientTemperature: number
  /** Temperature at which a cup counts as stone cold. */
  stoneColdTemperature: number
  /** Game seconds a cup takes to cool from the starting to the stone cold temperature. */
  secondsToStoneCold: number
}

export const ATTRIBUTES = ['aroma', 'flavor', 'acidity', 'body', 'sweetness'] as const
/** One quality a coffee is scored on. */
export type Attribute = (typeof ATTRIBUTES)[number]

/** A Cup Temperature range in degrees Celsius, both ends included. */
export interface AccuracyWindow {
  min: number
  max: number
}

/** Tunable Tasting Cue constants. Stone cold is `CoolingTuning.stoneColdTemperature`. */
export interface TastingTuning {
  /** Per Attribute, the Cup Temperatures at which a cue about it is accurate. */
  accuracyWindows: Record<Attribute, AccuracyWindow>
  /** Chance, 0–1, that a cue outside its Accuracy Window is skewed one cup off rather than vague. */
  skewedCueChance: number
}

/** Where a Cup Temperature sits against an Attribute's Accuracy Window; stone cold overrides the window. */
export type WindowPosition = 'too-hot' | 'inside' | 'too-cold' | 'stone-cold'

/** An Attribute rating, 1–5 cups. */
export type Rating = 1 | 2 | 3 | 4 | 5

/** The hand-authored expert rating of each Attribute for a coffee. */
export type ReferenceScore = Record<Attribute, Rating>

/** One Cupper's Attribute ratings for one Blind Cup; the Player's may have gaps until Submit. */
export type ScoreCard = Partial<Record<Attribute, Rating>>

/** Authored tasting-note text: one note per Attribute per rating, e.g. Acidity 4 → "bright, lemony". */
export type TastingNotes = Record<Attribute, Record<Rating, string>>

export interface BlindCupContent {
  letter: string
  /** Where the coffee comes from, hidden until the Reveal. */
  origin: string
  /** A short story about the coffee, told at the Reveal. */
  story: string
  referenceScore: ReferenceScore
  tastingNotes: TastingNotes
}

/** The Cupping Steps, in the order they are performed on a cup. Slurp may repeat. */
export type CuppingStep = 'dry-fragrance' | 'pour' | 'break-the-crust' | 'skim' | 'slurp'

/** A tasting note about one Attribute, received from a Cupping Step. */
export interface TastingCue {
  step: CuppingStep
  attribute: Attribute
  note: string
  /** The Cup Temperature when the cue was given. */
  temperature: number
  /** Where that Cup Temperature sat against the Attribute's Accuracy Window; always inside for Dry Fragrance. */
  window: WindowPosition
  /**
   * The rating the cue tastes of, for the presentation's particles, icons and reactions: the Reference
   * Score inside the Accuracy Window, possibly a wrong one outside it. Undefined when the cue is vague.
   */
  suggestedRating: Rating | undefined
}

export interface CuppingSessionContent {
  id: string
  name: string
  cups: BlindCupContent[]
}

export interface LabContent {
  id: string
  name: string
  /** Seats at the cupping table for NPC Cuppers, 2–4. */
  seats: number
  sessions: CuppingSessionContent[]
}

/** How an NPC Cupper becomes available for a Lineup. */
export type UnlockRule = { kind: 'starter' } | { kind: 'total-stars'; stars: number }

/** When an NPC Cupper acts during an Attempt. */
export interface NpcSchedule {
  /** Game seconds before each Cupping Step, the first included. */
  secondsBetweenSteps: number
  /**
   * Once every cup is skimmed, they Slurp every cup once per listed Cup Temperature, hottest first,
   * waiting until the cups have cooled to it. An impatient Cupper slurps hot; a patient one waits.
   */
  slurpTemperatures: number[]
}

export interface NpcCupperContent {
  id: string
  name: string
  unlock: UnlockRule
  /** Per-Attribute offset to the Reference Score on their Score Cards; unlisted Attributes are unbiased. */
  personalityBias: Partial<Record<Attribute, number>>
  schedule: NpcSchedule
}

export interface GameContent {
  tuning: {
    cooling: CoolingTuning
    tasting: TastingTuning
    /** Most an NPC Cupper's rating strays from Reference Score plus Personality Bias by chance, before rounding. */
    npcScoreNoise: number
  }
  /** The note a vague cue gives about each Attribute, whatever the coffee. */
  vagueTastingNotes: Record<Attribute, string>
  npcCuppers: NpcCupperContent[]
  labs: LabContent[]
}

/** An NPC Cupper the Player can seat in a Lineup. */
export interface NpcCupperSummary {
  id: string
  name: string
}

/** What the Lineup screen offers before an Attempt. */
export interface LineupOptions {
  /** Seats at this Lab's table; a Lineup may leave some empty. */
  seats: number
  /** The unlocked NPC Cuppers, in content order. */
  npcCuppers: NpcCupperSummary[]
}

export interface BlindCupState {
  letter: string
  /** Current Cup Temperature in degrees Celsius. */
  temperature: number
  /** Cupping Steps performed on this cup, in order; each Slurp is listed. */
  completedSteps: CuppingStep[]
  /** The Cue Log: every Tasting Cue received about this cup, oldest first. */
  cues: TastingCue[]
  /** Where the current Cup Temperature sits against each Attribute's Accuracy Window. */
  windows: Record<Attribute, WindowPosition>
  /** Whether the cup is stone cold, so every cue from it is vague. */
  stoneCold: boolean
  /** The Player's Score Card for this cup, editable until Submit. */
  scoreCard: ScoreCard
  /** Whether every Attribute on this cup's Score Card is rated. */
  scoreCardComplete: boolean
}

/** A Cupping Step an NPC Cupper performed, for the presentation to animate. */
export interface PerformedStep {
  cupLetter: string
  step: CuppingStep
  /** Game seconds into the Attempt when it happened. */
  atSeconds: number
  /** The Cup Temperature at that moment. */
  temperature: number
}

/** An NPC Cupper seated for an Attempt. */
export interface NpcCupperState extends NpcCupperSummary {
  /** Every Cupping Step they have performed so far, oldest first. */
  steps: PerformedStep[]
}

export interface AttemptState {
  sessionId: string
  /** Game seconds since the Attempt started. */
  elapsedSeconds: number
  cups: BlindCupState[]
  /** The Lineup's NPC Cuppers, in Seat order. */
  npcCuppers: NpcCupperState[]
  /** Whether every Attribute on every Blind Cup is rated, so the Player may Submit. */
  canSubmit: boolean
}

/** Stars earned for Calibration in an Attempt; 0 below half the maximum Calibration Points. */
export type StarCount = 0 | 1 | 2 | 3

/** An NPC Cupper's Score Card for one Blind Cup, shown at the Reveal. */
export interface NpcScoreCard extends NpcCupperSummary {
  scoreCard: Record<Attribute, Rating>
}

/** One Blind Cup at the Reveal, its origin no longer hidden. */
export interface RevealedCup {
  letter: string
  origin: string
  story: string
  referenceScore: ReferenceScore
  /** The Player's submitted Score Card, every Attribute rated. */
  scoreCard: Record<Attribute, Rating>
  /** Calibration Points earned per Attribute against the Reference Score. */
  calibrationPoints: Record<Attribute, number>
  /** Every Lineup NPC Cupper's Score Card for this cup, in Seat order. */
  npcScoreCards: NpcScoreCard[]
}

/** The end of an Attempt: what the Player sees at the Reveal. */
export interface RevealResult {
  sessionId: string
  cups: RevealedCup[]
  /** Calibration Points earned across every Blind Cup. */
  calibrationPoints: number
  /** Calibration Points for a perfect Calibration: an exact match on every Attribute of every cup. */
  maxCalibrationPoints: number
  /** Stars earned for this Attempt: 1 at 50% of the maximum Calibration Points, 2 at 70%, 3 at 90%. */
  stars: StarCount
}
