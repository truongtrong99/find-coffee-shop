import { useAnimations, useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { Box3, Vector3, type Object3D } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Free CC0 models by Kenney (www.kenney.nl); each pack's License.txt sits beside its models under public/models.
// Every model is fitted to the size its component asks for, so swapping a file here needs no other change.

const MODELS = `${import.meta.env.BASE_URL}models`

const CHARACTER_MODELS = [
  'character-female-a',
  'character-female-c',
  'character-female-d',
  'character-female-e',
  'character-male-b',
  'character-male-c',
  'character-male-d',
  'character-male-e',
] as const
export type CharacterModel = (typeof CHARACTER_MODELS)[number]

export const PLAYER_CHARACTER: CharacterModel = 'character-female-a'
/** Each v1 NPC Cupper's character, by id. */
const NPC_CHARACTERS: Record<string, CharacterModel> = {
  pip: 'character-male-b',
  mochi: 'character-female-c',
  biscuit: 'character-male-c',
  juniper: 'character-female-d',
  clover: 'character-male-d',
  hazel: 'character-female-e',
  saffron: 'character-male-e',
}

/** The character for an NPC Cupper, or for one without their own, a stand-in picked by their place in the cast. */
export function npcCharacter(id: string, castIndex: number): CharacterModel {
  const standIns = CHARACTER_MODELS.filter((model) => model !== PLAYER_CHARACTER)
  return NPC_CHARACTERS[id] ?? standIns[Math.max(0, castIndex) % standIns.length]!
}

export const characterUrl = (model: CharacterModel) => `${MODELS}/kenney-mini-characters/${model}.glb`
export const furnitureUrl = (model: string) => `${MODELS}/kenney-furniture-kit/${model}.glb`
export const CUPPING_BOWL_URL = `${MODELS}/kenney-food-kit/bowl.glb`

/** The size to fit a model to; a model given one dimension keeps its proportions, given several it stretches to them. */
export interface Fit {
  width?: number
  height?: number
  depth?: number
}

/** Scales and moves `object` so it fills `fit`, centred on x and z and standing on y = 0. */
function fitTo(object: Object3D, { width, height, depth }: Fit): void {
  const size = new Box3().setFromObject(object).getSize(new Vector3())
  const scales = [width && width / size.x, height && height / size.y, depth && depth / size.z]
  const uniform = scales.filter((scale): scale is number => !!scale)
  if (uniform.length === 1) object.scale.setScalar(uniform[0]!)
  else object.scale.set(scales[0] || 1, scales[1] || 1, scales[2] || 1)
  object.position.set(0, 0, 0)
  const box = new Box3().setFromObject(object)
  const centre = box.getCenter(new Vector3())
  object.position.set(-centre.x, -box.min.y, -centre.z)
}

/** Casts and receives shadows on every mesh of a fresh model. */
function withShadows(object: Object3D): Object3D {
  object.traverse((child) => {
    child.castShadow = true
    child.receiveShadow = true
  })
  return object
}

/** A static model fitted to `fit`. Suspends while it loads. */
export function FittedModel({ url, fit }: { url: string; fit: Fit }) {
  const { scene } = useGLTF(url)
  const object = useMemo(() => {
    const copy = withShadows(scene.clone(true))
    fitTo(copy, fit)
    return copy
  }, [scene, fit.width, fit.height, fit.depth])
  return <primitive object={object} />
}

/** A rigged character fitted to `height`, playing `animation` on a loop. Suspends while it loads. */
export function CharacterModelView({ model, height, animation }: { model: CharacterModel; height: number; animation: string }) {
  const { scene, animations } = useGLTF(characterUrl(model))
  const object = useMemo(() => {
    const copy = withShadows(cloneSkinned(scene))
    fitTo(copy, { height })
    return copy
  }, [scene, height])
  const { actions } = useAnimations(animations, object)
  useEffect(() => {
    const action = actions[animation]
    action?.reset().fadeIn(0.25).play()
    return () => void action?.fadeOut(0.25)
  }, [actions, animation])
  return <primitive object={object} />
}

for (const model of CHARACTER_MODELS) useGLTF.preload(characterUrl(model))
useGLTF.preload(CUPPING_BOWL_URL)
