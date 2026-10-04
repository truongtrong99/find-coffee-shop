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

/** Authored tasting-note text: one note per Attribute per rating, e.g. Acidity 4 → "bright, lemony". */
export type TastingNotes = Record<Attribute, Record<Rating, string>>

export interface BlindCupContent {
  letter: string
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
}

export interface AttemptState {
  sessionId: string
  /** Game seconds since the Attempt started. */
  elapsedSeconds: number
  cups: BlindCupState[]
}
