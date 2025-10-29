import { PropsWithChildren, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface View3DProps extends PropsWithChildren {
  title?: string;
  showControls?: boolean;
  cameraPosition?: [number, number, number];
  onCameraChange?: (position: THREE.Vector3, target: THREE.Vector3) => void;
}

export function View3D({
  children,
  title,
  showControls = true,
  cameraPosition = [0, 1.5, 4],
  onCameraChange,
}: View3DProps) {
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
        camera={{ fov: 60, position: cameraPosition }}
      >
        <color attach="background" args={['#0b0e13']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 5, 2]} intensity={0.6} />
        {showControls && (
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={10}
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
