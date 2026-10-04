import { useGameStore } from '../store'
import { BlindCup } from './BlindCup'
import { Cupper } from './Cupper'

const CUP_SPACING = 1.3

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#f2d9b5" />
    </mesh>
  )
}

function Table() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.2, 2]} />
        <meshStandardMaterial color="#b9794a" />
      </mesh>
      {[-2, 2].flatMap((x) =>
        [-0.8, 0.8].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.4, z]} castShadow>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <meshStandardMaterial color="#8a5a36" />
          </mesh>
        )),
      )}
    </group>
  )
}

export function LabScene() {
  const cups = useGameStore((s) => s.attempt.cups)
  const offset = ((cups.length - 1) * CUP_SPACING) / 2
  return (
    <>
      <color attach="background" args={['#f6e7cf']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 4]} intensity={1.6} castShadow />

      {/* Diorama base and the two back walls */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[9, 0.3, 9]} />
        <meshStandardMaterial color="#d8b48a" />
      </mesh>
      <Wall position={[0, 1.8, -4.4]} size={[9, 3.6, 0.2]} />
      <Wall position={[-4.4, 1.8, 0]} size={[0.2, 3.6, 9]} />

      <Table />
      {cups.map((cup, i) => (
        <BlindCup key={cup.letter} letter={cup.letter} temperature={cup.temperature} position={[i * CUP_SPACING - offset, 1, 0]} />
      ))}
      <Cupper position={[0, 0, 2.2]} />
    </>
  )
}
