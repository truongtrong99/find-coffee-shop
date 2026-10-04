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

export interface BlindCupContent {
  letter: string
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
}

export interface AttemptState {
  sessionId: string
  /** Game seconds since the Attempt started. */
  elapsedSeconds: number
  cups: BlindCupState[]
}
