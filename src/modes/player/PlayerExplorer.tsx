import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DeviceOrientationControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CanvasLayout } from '../../components/CanvasLayout';
import { GlobalControls } from '../../components/GlobalControls';
import { sphericalToDirection } from '../../lib/orientation';
import type { Scene3D } from '../../lib/types';
import { AudioEngine } from '../../audio/AudioEngine';
import { useAppStore } from '../../state/useAppStore';
import { LaserRay } from '../../components/player/LaserRay';
import { LaserHitDetector } from '../../components/player/LaserHitDetector';

// Composant qui doit être rendu à l'intérieur du Canvas pour utiliser useThree()
function AudioMixController({
  scene,
  engineRef,
  hitSourceId,
}: {
  scene: Scene3D | null;
  engineRef: React.MutableRefObject<AudioEngine | undefined>;
  hitSourceId: string | null;
}) {
  const { camera } = useThree();
  const masterGain = useAppStore((s) => s.masterGain);
  const beamWidthDeg = useAppStore((s) => s.beamWidthDeg);
  const normalize = useAppStore((s) => s.normalize);

  useFrame(() => {
    if (!engineRef.current || !scene) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    // Si une source est touchée, augmenter temporairement son gain
    if (hitSourceId && scene.sources) {
      engineRef.current.updateMix(forward, scene, { beamWidthDeg, normalize, masterGain });
      
      // Temporairement augmenter le gain de la source touchée
      const hitSource = scene.sources.find((s) => s.id === hitSourceId);
      if (hitSource) {
        // Cette logique sera gérée dans updateMix mais on peut aussi le faire ici
        // pour un effet plus prononcé
      }
    } else {
      engineRef.current.updateMix(forward, scene, { beamWidthDeg, normalize, masterGain });
    }
  });

  return null; // Ce composant ne rend rien, il gère juste la logique
}

export default function PlayerExplorer() {
  // Utiliser la scène du store au lieu de charger depuis un fichier
  const scene = useAppStore((s) => s.scene);
  const engineRef = useRef<AudioEngine>();
  const [useSensors, setUseSensors] = useState(false);
  const [hitSourceId, setHitSourceId] = useState<string | null>(null);

  const masterGain = useAppStore((s) => s.masterGain);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setMasterGain(masterGain);
  }, [masterGain]);

  async function onPlay() {
    if (!scene) {
      alert('Aucune scène disponible. Créez d\'abord une scène dans l\'éditeur Admin.');
      return;
    }
    if (!engineRef.current) engineRef.current = new AudioEngine();
    try {
      await engineRef.current.start(scene);
    } catch (e) {
      alert('Audio bloqué par le navigateur — cliquez d\'abord sur Activer capteurs/son.');
      console.error(e);
    }
  }

  async function onStop() {
    await engineRef.current?.stop();
  }

  async function enableSensors() {
    try {
      // iOS permission gate
      const doe: any = (window as any).DeviceOrientationEvent;
      if (doe && typeof doe.requestPermission === 'function') {
        const res = await doe.requestPermission();
        if (res !== 'granted') throw new Error('Permission refusée');
      }
      const dme: any = (window as any).DeviceMotionEvent;
      if (dme && typeof dme.requestPermission === 'function') {
        try { await dme.requestPermission(); } catch {}
      }
      setUseSensors(true);
      // Resume audio context if created
      try { await engineRef.current?.ensureContext().then((ctx) => ctx.resume()); } catch {}
    } catch (e) {
      alert('Impossible d\'activer les capteurs: ' + String(e));
    }
  }

  function handleHit(source: { id: string }) {
    setHitSourceId(source.id);
    // Réinitialiser après un court délai
    setTimeout(() => {
      setHitSourceId(null);
    }, 500);
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <TopBar
        sceneName={scene?.name ?? 'Aucune scène'}
        onPlay={onPlay}
        onStop={onStop}
        isPlaying={!!engineRef.current?.isPlaying}
        onEnableSensors={enableSensors}
        sensorsEnabled={useSensors}
      />
      <CanvasLayout>
        <GlobalControls />
        {useSensors && <DeviceOrientationControls makeDefault />}
        
        {/* Contrôleur de mix audio qui utilise useThree() */}
        <AudioMixController
          scene={scene}
          engineRef={engineRef}
          hitSourceId={hitSourceId}
        />
        
        {/* Rayon laser visible (utilise le gyroscope via DeviceOrientationControls) */}
        {useSensors && <LaserRay length={5} color="#ff0000" visible={true} />}
        
        {/* Détection de collision et affichage du texte "touché" */}
        {scene && useSensors && (
          <LaserHitDetector
            scene={scene}
            radius={2.5}
            audioEngine={engineRef.current}
            onHit={handleHit}
          />
        )}
        
        <SceneContent scene={scene} />
      </CanvasLayout>
    </div>
  );
}

function TopBar({
  sceneName,
  onPlay,
  onStop,
  isPlaying,
  onEnableSensors,
  sensorsEnabled,
}: {
  sceneName: string;
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  onEnableSensors: () => void;
  sensorsEnabled: boolean;
}) {
  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1001, display: 'flex', gap: 8, alignItems: 'center' }}>
      <span className="panel">Scène: {sceneName}</span>
      <button className="button" onClick={onEnableSensors}>
        {sensorsEnabled ? 'Gyroscope actif' : 'Activer gyroscope'}
      </button>
      {!isPlaying ? (
        <button className="button" onClick={onPlay}>Lecture</button>
      ) : (
        <button className="button" onClick={onStop}>Pause</button>
      )}
    </div>
  );
}

function SceneContent({ scene }: { scene?: Scene3D }) {
  if (!scene) return (
    <Html center>
      <div className="panel" style={{ textAlign: 'center', padding: '20px' }}>
        <p>Aucune scène chargée</p>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#9ca3af' }}>
          Créez une scène dans l'éditeur Admin pour commencer
        </p>
      </div>
    </Html>
  );

  return (
    <group>
      {/* Sphère de référence */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#1c2430" wireframe transparent opacity={0.3} />
      </mesh>
      
      {/* Plan d'horizon */}
      <gridHelper args={[10, 20, '#2a3340', '#1a222c']} />
      
      {/* Bulles sources audio */}
      <group>
        {scene.sources.map((s) => {
          const dir = sphericalToDirection(s.azimuthDeg, s.elevationDeg);
          const pos = dir.clone().multiplyScalar(2.5);
          return (
            <mesh key={s.id} position={pos.toArray()}>
              <sphereGeometry args={[0.1, 24, 24]} />
              <meshStandardMaterial
                color="#89cff0"
                emissive="#0b7fcf"
                emissiveIntensity={0.4}
                metalness={0.3}
                roughness={0.2}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
