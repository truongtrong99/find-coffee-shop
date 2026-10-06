import { Suspense } from 'react'
import { FittedModel, furnitureUrl, type Fit, type FurnitureModel } from './models'

/** Half the width of the cupping table, for laying out the Blind Cups along it. */
export const TABLE_HALF_WIDTH = 3
/** Where the cupping table's top is: the height the Blind Cups stand at. */
export const TABLE_TOP_HEIGHT = 1
type Vec3 = [number, number, number]
/** Where the coffee bar's counter top is, for what stands on it. */
const COUNTER_HEIGHT = 1

const BACK_WALL_Z = -4.4
const LEFT_WALL_X = -4.4

/** A furniture model fitted to `fit`, standing at `position` and turned `turn` radians about y. */
function Prop({ model, fit, position, turn = 0 }: { model: FurnitureModel; fit: Fit; position: Vec3; turn?: number }) {
  return (
    <group position={position} rotation={[0, turn, 0]}>
      <FittedModel url={furnitureUrl(model)} fit={fit} />
    </group>
  )
}

function Wall({ position, size }: { position: Vec3; size: Vec3 }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f2d9b5" />
    </mesh>
  )
}

/** The cupping table, under a cloth, its top at `TABLE_TOP_HEIGHT` where the Blind Cups stand. */
export function Table() {
  return (
    <Suspense fallback={null}>
      <Prop model="tableCloth" fit={{ width: TABLE_HALF_WIDTH * 2, height: TABLE_TOP_HEIGHT - 0.02, depth: 2 }} position={[0, 0, 0]} />
    </Suspense>
  )
}

/**
 * The Lab around the table: the diorama's floor and two back walls, then a coffee bar, a bookcase, plants and a lamp.
 * Purely decorative; each prop is a CC0 model that can be swapped here without touching the game.
 */
export function LabProps() {
  return (
    <>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#d8b48a" />
      </mesh>
      <Wall position={[0, 1.8, BACK_WALL_Z]} size={[9, 3.6, 0.2]} />
      <Wall position={[LEFT_WALL_X, 1.8, 0]} size={[0.2, 3.6, 9]} />
      <Suspense fallback={null}>
        <Prop model="rugRectangle" fit={{ width: 7.8, depth: 5.6 }} position={[0, 0.001, 0]} />

        {/* The coffee bar along the back wall, where the Lab prepares every coffee. */}
        {[-3.4, -2.4, -1.4].map((x) => (
          <Prop key={x} model="kitchenCabinet" fit={{ width: 1 }} position={[x, 0, BACK_WALL_Z + 0.6]} />
        ))}
        <Prop model="kitchenCoffeeMachine" fit={{ height: 0.6 }} position={[-3.3, COUNTER_HEIGHT, BACK_WALL_Z + 0.55]} />
        <Prop model="kitchenCoffeeMachine" fit={{ height: 0.6 }} position={[-2.2, COUNTER_HEIGHT, BACK_WALL_Z + 0.55]} />
        <Prop model="plantSmall1" fit={{ height: 0.5 }} position={[-1.3, COUNTER_HEIGHT, BACK_WALL_Z + 0.55]} />

        <Prop model="bookcaseOpen" fit={{ height: 2.3 }} position={[2.6, 0, BACK_WALL_Z + 0.45]} />
        <Prop model="books" fit={{ width: 0.5 }} position={[2.6, 1.1, BACK_WALL_Z + 0.45]} />
        <Prop model="pottedPlant" fit={{ height: 1.6 }} position={[3.8, 0, BACK_WALL_Z + 0.5]} />

        {/* Along the left wall, facing into the room. */}
        <Prop model="lampSquareFloor" fit={{ height: 2.2 }} position={[LEFT_WALL_X + 0.5, 0, -3.6]} turn={Math.PI / 2} />
        <Prop model="sideTable" fit={{ width: 1.1 }} position={[LEFT_WALL_X + 0.55, 0, 2.6]} turn={Math.PI / 2} />
        <Prop model="plantSmall2" fit={{ height: 0.55 }} position={[LEFT_WALL_X + 0.55, 0.85, 2.6]} />
        <Prop model="pottedPlant" fit={{ height: 1.4 }} position={[LEFT_WALL_X + 0.5, 0, 3.9]} turn={Math.PI / 2} />
      </Suspense>
    </>
  )
}
