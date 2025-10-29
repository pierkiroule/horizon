import { useRef } from 'react';
import * as THREE from 'three';
import { deg2rad, sphericalToDirection } from '../../lib/orientation';

interface MagneticSphereProps {
  radius: number;
  segments?: number;
  magneticGrid?: boolean;
  gridSize?: number;
  wireframe?: boolean;
  onClick?: (point: THREE.Vector3, azimuthDeg: number, elevationDeg: number) => void;
}

export function MagneticSphere({
  radius,
  segments = 32,
  magneticGrid = true,
  gridSize = 15,
  wireframe = true,
  onClick,
}: MagneticSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Créer un maillage magnétique en snap sur la grille
  const snapToGrid = (azimuthDeg: number, elevationDeg: number): [number, number] => {
    if (!magneticGrid) return [azimuthDeg, elevationDeg];
    
    const azStep = 360 / gridSize;
    const elStep = 180 / gridSize;
    
    const snappedAz = Math.round(azimuthDeg / azStep) * azStep;
    const snappedEl = Math.round(elevationDeg / elStep) * elStep;
    
    // Clamp elevation
    const clampedEl = Math.max(-90, Math.min(90, snappedEl));
    
    return [snappedAz, clampedEl];
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (!onClick) return;
    
    const point: THREE.Vector3 = e.point.clone().normalize();
    const az = (Math.atan2(point.x, -point.z) * 180) / Math.PI;
    const el = (Math.asin(point.y) * 180) / Math.PI;
    
    const [snappedAz, snappedEl] = snapToGrid(az, el);
    // Utiliser la même fonction que dans le reste de l'application
    const snappedDir = sphericalToDirection(snappedAz, snappedEl);
    const snappedPoint = snappedDir.multiplyScalar(radius);
    
    onClick(snappedPoint, snappedAz, snappedEl);
  };

  return (
    <>
      {/* Sphère principale avec maillage filaire */}
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshBasicMaterial
          color="#2a3441"
          wireframe={wireframe}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Grille magnétique visible - lignes de latitude */}
      {magneticGrid && (
        <group>
          {Array.from({ length: gridSize - 1 }, (_, i) => {
            const el = ((i + 1) * 180) / gridSize - 90;
            const r = Math.cos(deg2rad(el)) * radius;
            const y = Math.sin(deg2rad(el)) * radius;
            
            return (
              <mesh key={`lat-${i}`} position={[0, y, 0]}>
                <ringGeometry args={[r * 0.999, r * 1.001, 64]} />
                <meshBasicMaterial
                  color="#3b82f6"
                  transparent
                  opacity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })}
          
          {/* Grille magnétique - lignes de longitude */}
          {Array.from({ length: gridSize }, (_, i) => {
            const az = (i * 360) / gridSize;
            const points: THREE.Vector3[] = [];
            for (let el = -90; el <= 90; el += 5) {
              const dir = sphericalToDirection(az, el);
              points.push(dir.multiplyScalar(radius));
            }
            
            return (
              <line key={`lon-${i}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={points.length}
                    array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#3b82f6" transparent opacity={0.3} />
              </line>
            );
          })}
        </group>
      )}
    </>
  );
}
