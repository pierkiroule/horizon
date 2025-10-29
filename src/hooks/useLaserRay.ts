import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useState } from 'react';

interface LaserRayState {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  endpoint: THREE.Vector3;
}

/**
 * Hook pour gérer un rayon laser basé sur l'orientation du gyroscope
 * Utilise la direction de la caméra qui est déjà contrôlée par DeviceOrientationControls
 * (qui utilise le gyroscope du smartphone via DeviceOrientationEvent)
 */
export function useLaserRay(length: number = 10): LaserRayState {
  const { camera } = useThree();
  const [rayState, setRayState] = useState<LaserRayState>({
    origin: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, 0, -1),
    length,
    endpoint: new THREE.Vector3(0, 0, -length),
  });

  useFrame(() => {
    // La caméra est déjà contrôlée par DeviceOrientationControls qui utilise le gyroscope
    // On récupère simplement la direction où regarde la caméra
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    // Origine du rayon (position de la caméra, au centre de la scène)
    const origin = new THREE.Vector3(0, 0, 0);
    
    // Point final du rayon (cloner le vecteur forward pour éviter la mutation)
    const endpoint = origin.clone().add(forward.clone().multiplyScalar(length));

    setRayState({
      origin,
      direction: forward.clone(),
      length,
      endpoint,
    });
  });

  return rayState;
}
