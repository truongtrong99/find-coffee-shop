/** The Player's Cupper, a placeholder made of primitives behind a swappable component boundary. */
export function Cupper({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.4, 0.5, 8, 16]} />
        <meshStandardMaterial color="#e07a5f" />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial color="#ffe0bd" />
      </mesh>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 1.45, -0.4]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#2b1d14" />
        </mesh>
      ))}
    </group>
  )
}
