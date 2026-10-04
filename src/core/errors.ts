/** Thrown when a command breaks a game rule; the message says why. */
export class GameRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameRuleError'
  }
}
