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
  /**
   * The NPC Cupper whose remark this is, after one of their Slurps: noted at the Cup Temperature they slurped at and
   * coloured by their Personality Bias. Undefined for the Player's own cues.
   */
  remarkBy: NpcCupperSummary | undefined
}

/** What makes a Cupping Session the guided tutorial. */
export interface TutorialContent {
  /** The NPC Cuppers (by id) pre-filling the Seats, in Seat order; the Player does not choose a Lineup. */
  lineup: string[]
}

export interface CuppingSessionContent {
  id: string
  name: string
  cups: BlindCupContent[]
  /** Set on the guided tutorial, Lab 1's first Cupping Session. */
  tutorial?: TutorialContent
}

export interface LabContent {
  id: string
  name: string
  /** Total Stars the Player needs before the Lab unlocks; 0 for a Lab open from the start. */
  starsToUnlock: number
  /** Seats at the cupping table for NPC Cuppers, 2–4. */
  seats: number
  sessions: CuppingSessionContent[]
}

/** Per Attribute, the cups an NPC Cupper adds to the Reference Score; negative when they under-rate it, absent when unbiased. */
export type PersonalityBias = Partial<Record<Attribute, number>>

/** How an NPC Cupper becomes available for a Lineup. Once unlocked, they stay unlocked. */
export type UnlockRule =
  /** Unlocked from the start. */
  | { kind: 'starter' }
  /** Unlocked once total Stars reach `stars`. */
  | { kind: 'total-stars'; stars: number }
  /** Unlocked by 3-starring this Cupping Session: the NPC Cupper was impressed by the Player's palate. */
  | { kind: 'three-stars'; sessionId: string }

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
  /** The vague hint about their Personality Bias their Cupper Journal entry starts at, e.g. "loves bright coffees". */
  journalHint: string
  unlock: UnlockRule
  /** Offset to the Reference Score on their Score Cards. */
  personalityBias: PersonalityBias
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
  /** For the tutorial, the NPC Cuppers pre-filling the Seats, in Seat order: the only Lineup it takes. */
  prefilledLineup: NpcCupperSummary[] | undefined
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
  /** After a Slurp, the remark they made about the cup, also in its Cue Log; undefined after any other step. */
  remark: TastingCue | undefined
}

/** An NPC Cupper seated for an Attempt. */
export interface NpcCupperState extends NpcCupperSummary {
  /** Every Cupping Step they have performed so far, oldest first. */
  steps: PerformedStep[]
}

/** The tutorial's guidance on what the Player does next. */
export type TutorialPrompt =
  /** Perform this Cupping Step on this cup; on a fresh cup, Dry Fragrance is offered though the Player may Pour instead. */
  | { kind: 'cupping-step'; cupLetter: string; step: CuppingStep }
  /**
   * Read the thermometer and Slurp this cup inside the Accuracy Windows of the Attributes it hasn't yet been
   * tasted accurately for: those open now, and those still too hot to wait for. A window passed untasted is let go.
   */
  | { kind: 'accuracy-windows'; cupLetter: string; slurpNow: Attribute[]; waitFor: Attribute[] }
  /** Rate these Attributes on this cup's Score Card. */
  | { kind: 'score-card'; cupLetter: string; unrated: Attribute[] }
  /** Every Score Card is complete, so Submit; this wins over any other prompt. */
  | { kind: 'submit' }

export interface AttemptState {
  sessionId: string
  /** Game seconds since the Attempt started. */
  elapsedSeconds: number
  cups: BlindCupState[]
  /** The Lineup's NPC Cuppers, in Seat order. */
  npcCuppers: NpcCupperState[]
  /** Whether every Attribute on every Blind Cup is rated, so the Player may Submit. */
  canSubmit: boolean
  /** In the tutorial, what the Player should do next; undefined in any other Cupping Session. */
  tutorialPrompt: TutorialPrompt | undefined
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
  /** Whether this Attempt earned more Stars than any before it in this Cupping Session, so they are the new best. */
  newBest: boolean
  /** The Labs this Attempt's Stars unlocked, in content order; empty when none. */
  unlockedLabs: { id: string; name: string }[]
  /** The NPC Cuppers this Attempt unlocked, in content order; empty when none. */
  unlockedNpcCuppers: UnlockedNpcCupper[]
  /** The Personality Biases this Reveal recorded in the Cupper Journal for the first time; empty when none. */
  journalDiscoveries: JournalDiscovery[]
}

/** How an NPC Cupper unlocks, as the Cupper Journal and the Reveal tell it. */
export type UnlockDescription =
  | { kind: 'starter' }
  | { kind: 'total-stars'; stars: number }
  | { kind: 'three-stars'; sessionId: string; sessionName: string }

/** An NPC Cupper an Attempt unlocked, announced at the Reveal. */
export interface UnlockedNpcCupper extends NpcCupperSummary {
  unlock: UnlockDescription
}

/** A Personality Bias recorded in an NPC Cupper's Cupper Journal entry because a Reveal showed it. */
export interface JournalDiscovery extends NpcCupperSummary {
  attribute: Attribute
  /** Cups their Score Cards add to the Reference Score for this Attribute; negative when they under-rate it. */
  bias: number
}

/** The Player's record of one NPC Cupper. */
export interface CupperJournalEntry extends NpcCupperSummary {
  /** Whether the Player can seat them in a Lineup. */
  unlocked: boolean
  unlock: UnlockDescription
  /** The vague hint about their Personality Bias the entry starts at. */
  hint: string
  /** The Personality Bias Reveals have shown so far, per Attribute; Attributes not yet shown are absent. */
  discoveredBias: PersonalityBias
}

/** A Cupping Session on the Lab Map. */
export interface CuppingSessionSummary {
  id: string
  name: string
  /** The best Stars any Attempt of this Cupping Session has earned; 0 until one earns a Star. */
  bestStars: StarCount
  /** Whether this is the guided tutorial, with a pre-filled Lineup and Tutorial Prompts. */
  tutorial: boolean
}

/** A Lab on the Lab Map. */
export interface LabSummary {
  id: string
  name: string
  /** Total Stars the Player needs before the Lab unlocks. */
  starsToUnlock: number
  /** Whether the Player's total Stars have reached `starsToUnlock`, so its Cupping Sessions can be attempted. */
  unlocked: boolean
  sessions: CuppingSessionSummary[]
}

/** The Player's progression: every Lab and Cupping Session, in content order, with the Stars earned. */
export interface LabMap {
  /** The sum of the best Stars per Cupping Session. */
  totalStars: number
  labs: LabSummary[]
}
