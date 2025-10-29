import { PropsWithChildren, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type View2DType = 'top' | 'right' | 'left';

interface View2DProps extends PropsWithChildren {
  type: View2DType;
  title?: string;
  showControls?: boolean;
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
}

const viewConfigs: Record<View2DType, { position: [number, number, number]; lookAt: [number, number, number]; up: [number, number, number] }> = {
  top: { position: [0, 6, 0], lookAt: [0, 0, 0], up: [0, 0, -1] },
  right: { position: [6, 0, 0], lookAt: [0, 0, 0], up: [0, 1, 0] },
  left: { position: [-6, 0, 0], lookAt: [0, 0, 0], up: [0, 1, 0] },
};

export function View2D({
  children,
  type,
  title,
  showControls = false,
  onCameraChange,
}: View2DProps) {
  const config = viewConfigs[type];
  const controlsRef = useRef<any>(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {title && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            background: 'rgba(10, 12, 16, 0.8)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#e2e8f0',
          }}
        >
          {title}
        </div>
      )}
      <Canvas
        style={{ background: '#0b0e13' }}
        orthographic
        camera={{
          position: config.position,
          up: config.up,
          zoom: 50,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(...config.lookAt);
        }}
      >
        <color attach="background" args={['#0b0e13']} />
        <ambientLight intensity={0.5} />
        {showControls && (
          <OrbitControls
            ref={controlsRef}
            enableRotate={false}
            enablePan={true}
            enableZoom={true}
            enableDamping
            dampingFactor={0.05}
            onChange={() => {
              if (controlsRef.current && onCameraChange) {
                const target = controlsRef.current.target;
                const position = controlsRef.current.object.position;
                onCameraChange(position, target);
              }
            }}
          />
        )}
        {children}
      </Canvas>
    </div>
  );
}
