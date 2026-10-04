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
}

export interface CuppingSessionContent {
  id: string
  name: string
  cups: BlindCupContent[]
}

export interface LabContent {
  id: string
  name: string
  sessions: CuppingSessionContent[]
}

export interface GameContent {
  tuning: { cooling: CoolingTuning }
  labs: LabContent[]
}

export interface BlindCupState {
  letter: string
  /** Current Cup Temperature in degrees Celsius. */
  temperature: number
  /** Cupping Steps performed on this cup, in order; each Slurp is listed. */
  completedSteps: CuppingStep[]
  /** The Cue Log: every Tasting Cue received about this cup, oldest first. */
  cues: TastingCue[]
  /** The Player's Score Card for this cup, editable until Submit. */
  scoreCard: ScoreCard
  /** Whether every Attribute on this cup's Score Card is rated. */
  scoreCardComplete: boolean
}

export interface AttemptState {
  sessionId: string
  /** Game seconds since the Attempt started. */
  elapsedSeconds: number
  cups: BlindCupState[]
  /** Whether every Attribute on every Blind Cup is rated, so the Player may Submit. */
  canSubmit: boolean
}

/** Stars earned for Calibration in an Attempt; 0 below half the maximum Calibration Points. */
export type StarCount = 0 | 1 | 2 | 3

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
