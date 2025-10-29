import * as THREE from 'three';

interface HorizonPlaneProps {
  size?: number;
  gridDivisions?: number;
  position?: [number, number, number];
}

export function HorizonPlane({
  size = 5,
  gridDivisions = 20,
  position = [0, 0, 0],
}: HorizonPlaneProps) {
  return (
    <group position={position}>
      {/* Plan principal semi-transparent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color="#1e40af"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Grille de référence */}
      <gridHelper args={[size, gridDivisions, '#3b82f6', '#1e3a8a']} />
      
      {/* Ligne d'horizon centrale (plus épaisse) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-size / 2, 0, 0, size / 2, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#60a5fa" linewidth={2} />
      </line>
    </group>
  );
}
