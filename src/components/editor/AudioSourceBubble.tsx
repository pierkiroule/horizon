import { useState } from 'react';
import * as THREE from 'three';
import { sphericalToDirection } from '../../lib/orientation';
import type { AudioSource } from '../../lib/types';
import { Html } from '@react-three/drei';

interface AudioSourceBubbleProps {
  source: AudioSource;
  radius: number;
  selected?: boolean;
  onClick?: (source: AudioSource) => void;
  onDragStart?: (source: AudioSource) => void;
  onDragEnd?: (source: AudioSource) => void;
  onContextMenu?: (source: AudioSource, screen: { x: number; y: number }) => void;
}

export function AudioSourceBubble({
  source,
  radius,
  selected = false,
  onClick,
  onDragStart,
  onDragEnd,
  onContextMenu,
}: AudioSourceBubbleProps) {
  const [hovered, setHovered] = useState(false);
  const dir = sphericalToDirection(source.azimuthDeg, source.elevationDeg);
  const pos = dir.clone().multiplyScalar(radius);

  const size = selected ? 0.15 : hovered ? 0.12 : 0.1;
  const baseColor = source.color ?? '#89cff0';
  const color = selected ? (source.color ?? '#f59e0b') : hovered ? baseColor : baseColor;
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
      onContextMenu={(e) => {
        e.stopPropagation();
        const anyEvent = e as any;
        try { anyEvent.preventDefault?.(); } catch {}
        onContextMenu?.(source, { x: anyEvent.clientX ?? 0, y: anyEvent.clientY ?? 0 });
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
      {/* Etiquette */}
      <Html distanceFactor={10} position={[0, size + 0.05, 0]} center>
        <div
          style={{
            transform: 'translate(-50%, -100%)',
            padding: '2px 6px',
            fontSize: 10,
            background: 'rgba(10,12,16,0.8)',
            border: `1px solid ${baseColor}`,
            borderRadius: 4,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {source.name ?? source.id}
        </div>
      </Html>
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
