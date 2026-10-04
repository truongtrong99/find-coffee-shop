import { Html } from '@react-three/drei'
import { Color } from 'three'
import { content } from '../../content/v1'

const { ambientTemperature, startTemperature } = content.tuning.cooling
const HOT = new Color('#e8452c')
const COLD = new Color('#4aa3e0')
const THERMOMETER_HEIGHT = 0.9

interface BlindCupProps {
  letter: string
  temperature: number
  position: [number, number, number]
}

function Thermometer({ temperature }: { temperature: number }) {
  const fraction = Math.min(1, Math.max(0.05, (temperature - ambientTemperature) / (startTemperature - ambientTemperature)))
  const color = COLD.clone().lerp(HOT, fraction)
  return (
    <group position={[0.65, 0, 0]}>
      <mesh position={[0, THERMOMETER_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.12, THERMOMETER_HEIGHT, 0.12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, (THERMOMETER_HEIGHT * fraction) / 2, 0.065]}>
        <boxGeometry args={[0.06, THERMOMETER_HEIGHT * fraction, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

export function BlindCup({ letter, temperature, position }: BlindCupProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.5, 32]} />
        <meshStandardMaterial color="#fffaf0" />
      </mesh>
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.37, 0.37, 0.02, 32]} />
        <meshStandardMaterial color="#4b2c1a" />
      </mesh>
      <Thermometer temperature={temperature} />
      <Html position={[0, 1.2, 0]} center zIndexRange={[10, 0]}>
        <div className="cup-label">
          Cup {letter}
          <small>{Math.round(temperature)}°C</small>
        </div>
      </Html>
    </group>
  )
}
