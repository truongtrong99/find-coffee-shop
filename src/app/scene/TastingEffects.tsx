import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type CSSProperties, type RefObject } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import { content } from '../../content/v1'
import type { Rating, TastingCue } from '../../core'
import { ATTRIBUTE_ICONS, reactionTo } from '../cueDisplay'

const { ambientTemperature, startTemperature } = content.tuning.cooling
const SURFACE_HEIGHT = 0.52

const STEAM_PUFFS = 6
const STEAM_RISE_PER_SECOND = 0.35

/** Wisps rising from a cup that isn't stone cold, thicker the hotter it is. Follows the core's Cup Temperature. */
export function Steam({ temperature }: { temperature: number }) {
  const steamStrength = Math.min(1, Math.max(0, (temperature - ambientTemperature) / (startTemperature - ambientTemperature)))
  const puffs = useRef<(Mesh | null)[]>([])
  useFrame(({ clock }) => {
    puffs.current.forEach((puff, i) => {
      if (!puff) return
      const rise = (clock.elapsedTime * STEAM_RISE_PER_SECOND + i / STEAM_PUFFS) % 1
      puff.position.set(Math.sin(rise * 6 + i) * 0.1, SURFACE_HEIGHT + rise * 0.8, Math.cos(i * 2.3) * 0.12)
      puff.scale.setScalar(0.04 + rise * 0.09)
      ;(puff.material as MeshBasicMaterial).opacity = steamStrength * 0.35 * (1 - rise)
    })
  })
  return (
    <group>
      {Array.from({ length: STEAM_PUFFS }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (puffs.current[i] = mesh)}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Aroma particle colour by the rating the cue tastes of: faint and papery up to a vivid floral burst. */
const AROMA_COLORS: Record<Rating, string> = { 1: '#cdbfb0', 2: '#e3b98f', 3: '#f0a46c', 4: '#f47fa0', 5: '#d65db1' }
const VAGUE_COLOR = '#a9a39d'
const AROMA_RISE_SECONDS = 2.5

/** A puff of aroma particles from an Aroma cue: more and brighter for a higher rating, a grey wisp when vague. */
export function AromaBurst({ rating }: { rating: Rating | undefined }) {
  const count = rating === undefined ? 4 : rating * 4
  const color = rating === undefined ? VAGUE_COLOR : AROMA_COLORS[rating]
  const particles = useRef<(Mesh | null)[]>([])
  const startedAt = useRef<number | null>(null)
  useFrame(({ clock }) => {
    startedAt.current ??= clock.elapsedTime
    const progress = Math.min(1, (clock.elapsedTime - startedAt.current) / AROMA_RISE_SECONDS)
    particles.current.forEach((particle, i) => {
      if (!particle) return
      const angle = (i / count) * Math.PI * 2
      const spread = 0.15 + progress * 0.45
      particle.position.set(Math.cos(angle) * spread, SURFACE_HEIGHT + progress * (0.6 + (i % 3) * 0.2), Math.sin(angle) * spread)
      ;(particle.material as MeshBasicMaterial).opacity = 1 - progress
    })
  })
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(mesh) => void (particles.current[i] = mesh)} position={[0, SURFACE_HEIGHT, 0]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Above the cup in first-person: the Player's reaction and an icon per Attribute cued, bigger the higher
 * the rating it tastes of, a question mark when vague.
 */
export function CueIcons({ cues, labelLayer }: { cues: readonly TastingCue[]; labelLayer: RefObject<HTMLDivElement | null> }) {
  const reaction = reactionTo(cues)
  return (
    <Html position={[0, 0.75, 0]} center zIndexRange={[10, 0]} portal={labelLayer as RefObject<HTMLElement>}>
      <div className="fresh-cues">
        <div className="reaction">
          {reaction.emoji} {reaction.text}
        </div>
        <div className="cue-icons">
          {cues.map((cue) =>
            cue.suggestedRating === undefined ? (
              <span key={cue.attribute} className="cue-icon vague">
                ?
              </span>
            ) : (
              <span key={cue.attribute} className="cue-icon" style={{ '--intensity': cue.suggestedRating } as CSSProperties}>
                {ATTRIBUTE_ICONS[cue.attribute]}
              </span>
            ),
          )}
        </div>
      </div>
    </Html>
  )
}
