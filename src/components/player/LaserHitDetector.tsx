import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useLaserRay } from '../../hooks/useLaserRay';
import { sphericalToDirection } from '../../lib/orientation';
import type { AudioSource, Scene3D } from '../../lib/types';
import { AudioEngine } from '../../audio/AudioEngine';

interface LaserHitDetectorProps {
  scene: Scene3D;
  radius?: number;
  hitThreshold?: number;
  audioEngine?: AudioEngine;
  onHit?: (source: AudioSource) => void;
}

export function LaserHitDetector({
  scene,
  radius = 2.5,
  hitThreshold = 0.15,
  audioEngine,
  onHit,
}: LaserHitDetectorProps) {
  const ray = useLaserRay(radius * 2);
  const [hitSource, setHitSource] = useState<AudioSource | null>(null);
  const [showHitText, setShowHitText] = useState(false);
  const hitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHitIdRef = useRef<string | null>(null);

  useFrame(() => {
    let closestSource: AudioSource | null | undefined = null;
    let closestDistance = hitThreshold;

    // Vérifier la collision avec chaque bulle audio
    if (!scene?.sources || scene.sources.length === 0) return;
    scene.sources.forEach((source) => {
      const dir = sphericalToDirection(source.azimuthDeg, source.elevationDeg);
      const sourcePos = dir.multiplyScalar(radius);

      // Créer un rayon depuis l'origine vers la cible
      const raycast = new THREE.Ray(ray.origin, ray.direction);
      
      // Distance du point source au rayon
      const distance = raycast.distanceToPoint(sourcePos);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestSource = source;
      }
    });

    // Si une bulle est touchée
    if (closestSource) {
      const hitId = (closestSource as AudioSource).id;
      if (hitId !== lastHitIdRef.current) {
        setHitSource(closestSource);
        setShowHitText(true);
        lastHitIdRef.current = hitId;
        
        // Déclencher le son si l'audio engine est fourni
        if (audioEngine && audioEngine.isPlaying) {
          // Augmenter temporairement le gain de cette source
          onHit?.(closestSource);
        }

        // Effacer le texte après 1 seconde
        if (hitTimeoutRef.current) {
          clearTimeout(hitTimeoutRef.current);
        }
        hitTimeoutRef.current = setTimeout(() => {
          setShowHitText(false);
          setTimeout(() => {
            setHitSource(null);
            lastHitIdRef.current = null;
          }, 300);
        }, 1000);
      }
    } else if (!closestSource && lastHitIdRef.current) {
      lastHitIdRef.current = null;
    }
  });

  useEffect(() => {
    return () => {
      if (hitTimeoutRef.current) {
        clearTimeout(hitTimeoutRef.current);
      }
    };
  }, []);

  if (!showHitText || !hitSource) return null;

  return (
    <Html center position={[0, 2, 0]}>
      <div
        style={{
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '24px',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'pulse 0.3s ease-out',
        }}
      >
        TOUCHÉ!
      </div>
      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </Html>
  );
}
