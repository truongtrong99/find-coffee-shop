import type { Attribute, TastingCue, WindowPosition } from '../core'

export const ATTRIBUTE_ICONS: Record<Attribute, string> = {
  aroma: '🌸',
  flavor: '🍓',
  acidity: '🍋',
  body: '🥛',
  sweetness: '🍯',
}

export const WINDOW_LABELS: Record<WindowPosition, string> = {
  inside: 'In window',
  'too-hot': 'Too hot',
  'too-cold': 'Too cold',
  'stone-cold': 'Stone cold',
}

export interface Reaction {
  emoji: string
  text: string
}

/**
 * How the Player's character reacts to the Tasting Cues of one Cupping Step. Presentation only: it reads
 * where the core placed each cue against its Accuracy Window and the rating it tastes of, and decides nothing.
 */
export function reactionTo(cues: readonly TastingCue[]): Reaction {
  const count = (window: WindowPosition) => cues.filter((cue) => cue.window === window).length
  if (count('stone-cold') > 0) return { emoji: '🥶', text: 'Stone cold…' }
  if (count('too-hot') > count('inside')) return { emoji: '🥵', text: 'Too hot!' }
  if (count('too-cold') > count('inside')) return { emoji: '😕', text: 'Gone cool…' }
  const ratings = cues.flatMap((cue) => (cue.suggestedRating === undefined ? [] : [cue.suggestedRating]))
  if (ratings.length === 0) return { emoji: '🤔', text: 'Hard to tell…' }
  const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  if (mean >= 4) return { emoji: '😍', text: 'Delicious!' }
  if (mean <= 2) return { emoji: '😖', text: 'Hmm…' }
  return { emoji: '🙂', text: 'Nice' }
}
