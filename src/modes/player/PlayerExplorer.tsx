import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrame, useThree } from '@react-three/fiber';
import { DeviceOrientationControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CanvasLayout } from '../../components/CanvasLayout';
import { GlobalControls } from '../../components/GlobalControls';
import { loadSceneFromUrl } from '../../lib/loaders';
import { sphericalToDirection } from '../../lib/orientation';
import type { Scene3D } from '../../lib/types';
import { AudioEngine } from '../../audio/AudioEngine';
import { useAppStore } from '../../state/useAppStore';

export default function PlayerExplorer() {
  const [search] = useSearchParams();
  const defaultUrl = '/scenes/demo.json';
  const url = search.get('scene') || defaultUrl;
  const [scene, setScene] = useState<Scene3D | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const engineRef = useRef<AudioEngine>();
  const [useSensors, setUseSensors] = useState(false);

  const masterGain = useAppStore((s) => s.masterGain);
  const beamWidthDeg = useAppStore((s) => s.beamWidthDeg);
  const normalize = useAppStore((s) => s.normalize);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    loadSceneFromUrl(url)
      .then((s) => setScene(s))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setMasterGain(masterGain);
  }, [masterGain]);

  const { camera } = useThree();
  useFrame(() => {
    if (!engineRef.current || !scene) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    engineRef.current.updateMix(forward, scene, { beamWidthDeg, normalize, masterGain });
  });

  async function onPlay() {
    if (!scene) return;
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

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <TopBar
        url={url}
        onPlay={onPlay}
        onStop={onStop}
        isPlaying={!!engineRef.current?.isPlaying}
        onEnableSensors={enableSensors}
        sensorsEnabled={useSensors}
      />
      <CanvasLayout>
        <GlobalControls />
        {useSensors && <DeviceOrientationControls makeDefault />}
        <SceneContent scene={scene} loading={loading} error={error} />
      </CanvasLayout>
    </div>
  );
}

function TopBar({ url, onPlay, onStop, isPlaying, onEnableSensors, sensorsEnabled }: {
  url: string;
  onPlay: () => void;
  onStop: () => void;
  isPlaying: boolean;
  onEnableSensors: () => void;
  sensorsEnabled: boolean;
}) {
  return (
    <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1001, display: 'flex', gap: 8, alignItems: 'center' }}>
      <span className="panel">Scène: {url}</span>
      <button className="button" onClick={onEnableSensors}>{sensorsEnabled ? 'Capteurs actifs' : 'Activer capteurs'}</button>
      {!isPlaying ? (
        <button className="button" onClick={onPlay}>Lecture</button>
      ) : (
        <button className="button" onClick={onStop}>Pause</button>
      )}
    </div>
  );
}

function SceneContent({ scene, loading, error }: { scene?: Scene3D; loading: boolean; error?: string }) {
  if (loading) return (
    <Html center><div className="panel">Chargement de la scène…</div></Html>
  );
  if (error) return (
    <Html center><div className="panel">Erreur: {error}</div></Html>
  );
  if (!scene) return (
    <Html center><div className="panel">Aucune scène chargée</div></Html>
  );

  return (
    <group>
      <gridHelper args={[10, 20, '#2a3340', '#1a222c']} />
      <group>
        {scene.sources.map((s) => {
          const dir = sphericalToDirection(s.azimuthDeg, s.elevationDeg);
          const pos = dir.clone().multiplyScalar(3);
          return (
            <mesh key={s.id} position={pos.toArray()}>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshStandardMaterial color="#89cff0" emissive="#0b7fcf" emissiveIntensity={0.2} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
