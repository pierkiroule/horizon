import { useLaserRay } from '../../hooks/useLaserRay';
import * as THREE from 'three';

interface LaserRayProps {
  length?: number;
  color?: string;
  visible?: boolean;
}

export function LaserRay({ length = 10, color = '#ff0000', visible = true }: LaserRayProps) {
  const ray = useLaserRay(length);

  if (!visible) return null;

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([
            ray.origin.x, ray.origin.y, ray.origin.z,
            ray.endpoint.x, ray.endpoint.y, ray.endpoint.z,
          ])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={3} />
    </line>
  );
}
