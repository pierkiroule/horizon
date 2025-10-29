import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Leva } from 'leva';
import { PropsWithChildren } from 'react';

export function CanvasLayout({ children }: PropsWithChildren) {
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <Canvas style={{ position: 'absolute', inset: 0, zIndex: 0 }} camera={{ fov: 60, position: [0, 1.5, 4] }}>
        <color attach="background" args={["#0b0e13"]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 5, 2]} intensity={0.6} />
        <OrbitControls enableDamping />
        {children}
      </Canvas>
      <Leva collapsed />
    </div>
  );
}
