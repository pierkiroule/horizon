import { useState } from 'react';
import * as THREE from 'three';
import { sphericalToDirection } from '../../lib/orientation';
import type { AudioSource } from '../../lib/types';

interface AudioSourceBubbleProps {
  source: AudioSource;
  radius: number;
  selected?: boolean;
  onClick?: (source: AudioSource) => void;
  onDragStart?: (source: AudioSource) => void;
  onDragEnd?: (source: AudioSource) => void;
}

export function AudioSourceBubble({
  source,
  radius,
  selected = false,
  onClick,
  onDragStart,
  onDragEnd,
}: AudioSourceBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const dir = sphericalToDirection(source.azimuthDeg, source.elevationDeg);
  const pos = dir.clone().multiplyScalar(radius);

  const size = selected ? 0.15 : hovered ? 0.12 : 0.1;
  const color = selected ? '#f59e0b' : hovered ? '#60a5fa' : '#89cff0';
  const emissive = selected ? '#7c3aed' : hovered ? '#3b82f6' : '#0b7fcf';

  return (
    <mesh
      position={pos.toArray()}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(source);
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDragStart?.(source);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onDragEnd?.(source);
      }}
    >
      <sphereGeometry args={[size, 24, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.4}
        metalness={0.3}
        roughness={0.2}
      />
      {/* Anneau de sélection */}
      {selected && (
        <mesh>
          <ringGeometry args={[size * 1.3, size * 1.5, 32]} />
          <meshBasicMaterial
            color="#f59e0b"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </mesh>
  );
}
