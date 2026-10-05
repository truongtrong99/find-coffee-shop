// Animal Crossing-style voice blips: one short pitched beep per letter of what a Cupper says. Presentation only.

const BLIP_SECONDS = 0.055
const MAX_BLIPS = 16
const VOLUME = 0.06
/** Semitones each letter may sit above the speaker's voice, so the babble rises and falls. */
const PITCH_SPREAD = 7

let audio: AudioContext | undefined

/**
 * Babbles `text` in a voice pitched at `voiceHz`. Silent where the browser has no Web Audio, or before the Player
 * has interacted with the page (browsers keep audio suspended until then).
 */
export function speak(text: string, voiceHz: number): void {
  if (typeof AudioContext === 'undefined') return
  audio ??= new AudioContext()
  if (audio.state === 'suspended') void audio.resume()
  const letters = [...text.toLowerCase().replace(/[^a-z]/g, '')].slice(0, MAX_BLIPS)
  const start = audio.currentTime + 0.02
  for (const [i, letter] of letters.entries()) {
    const at = start + i * BLIP_SECONDS
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = voiceHz * 2 ** (((letter.charCodeAt(0) - 97) % PITCH_SPREAD) / 12)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(VOLUME, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + BLIP_SECONDS * 0.9)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(at)
    oscillator.stop(at + BLIP_SECONDS)
  }
}
