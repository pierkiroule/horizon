import { useRef, useState } from 'react';
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
  const longPressTimerRef = useRef<number | null>(null);
  const lastPointerDownRef = useRef<{ x: number; y: number } | null>(null);
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
        // Long-press (touch) to open context menu on mobile
        const anyEvent = e as any;
        if (anyEvent.pointerType === 'touch') {
          try { anyEvent.preventDefault?.(); } catch {}
          const clientX = anyEvent.clientX ?? 0;
          const clientY = anyEvent.clientY ?? 0;
          lastPointerDownRef.current = { x: clientX, y: clientY };
          if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
          }
          longPressTimerRef.current = window.setTimeout(() => {
            onContextMenu?.(source, { x: clientX, y: clientY });
            longPressTimerRef.current = null;
          }, 500);
        }
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onDragEnd?.(source);
        // Cancel long-press if released
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onPointerCancel={() => {
        if (longPressTimerRef.current) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }}
      onPointerMove={(e) => {
        // If finger moves too much, cancel long-press
        if (longPressTimerRef.current && lastPointerDownRef.current) {
          const anyEvent = e as any;
          const dx = (anyEvent.clientX ?? 0) - lastPointerDownRef.current.x;
          const dy = (anyEvent.clientY ?? 0) - lastPointerDownRef.current.y;
          if (dx * dx + dy * dy > 25) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
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
