import { MagneticSphere } from './MagneticSphere';
import { HorizonPlane } from './HorizonPlane';
import { AudioSourceBubble } from './AudioSourceBubble';
import type { AudioSource } from '../../lib/types';
import * as THREE from 'three';

interface SceneContentProps {
  sources: AudioSource[];
  selectedId?: string | null;
  radius?: number;
  showHorizon?: boolean;
  showSphere?: boolean;
  magneticGrid?: boolean;
  gridSize?: number;
  onSphereClick?: (point: THREE.Vector3, azimuthDeg: number, elevationDeg: number) => void;
  onSourceClick?: (source: AudioSource) => void;
  onSourceDragStart?: (source: AudioSource) => void;
  onSourceDragEnd?: (source: AudioSource) => void;
}

export function SceneContent({
  sources,
  selectedId,
  radius = 2.5,
  showHorizon = true,
  showSphere = true,
  magneticGrid = true,
  gridSize = 15,
  onSphereClick,
  onSourceClick,
  onSourceDragStart,
  onSourceDragEnd,
}: SceneContentProps) {
  return (
    <>
      {/* Plan d'horizon */}
      {showHorizon && <HorizonPlane size={radius * 2} position={[0, 0, 0]} />}
      
      {/* Sphère magnétique */}
      {showSphere && (
        <MagneticSphere
          radius={radius}
          magneticGrid={magneticGrid}
          gridSize={gridSize}
          wireframe={true}
          onClick={onSphereClick}
        />
      )}
      
      {/* Sources audio */}
      {sources.map((source) => (
        <AudioSourceBubble
          key={source.id}
          source={source}
          radius={radius}
          selected={source.id === selectedId}
          onClick={onSourceClick}
          onDragStart={onSourceDragStart}
          onDragEnd={onSourceDragEnd}
        />
      ))}
    </>
  );
}
