import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { ROUTES } from '../../config/routes';

export default function PlayerExplorer() {
  // Utiliser la scène du store au lieu de charger depuis un fichier
  const scene = useAppStore((s) => s.scene);
  const engineRef = useRef<AudioEngine>();
  const [useSensors, setUseSensors] = useState(false);
  const [hitSourceId, setHitSourceId] = useState<string | null>(null);

  const masterGain = useAppStore((s) => s.masterGain);
  const beamWidthDeg = useAppStore((s) => s.beamWidthDeg);
  const normalize = useAppStore((s) => s.normalize);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setMasterGain(masterGain);
  }, [masterGain]);

  async function onPlay() {
    if (!scene) {
      alert('Aucune scène disponible. Créez d\'abord une scène dans l\'éditeur Admin.');
      return;
    }
    // L'AudioContext devrait déjà être créé et activé par enableSensors
    if (!engineRef.current) {
      // Si ce n'est pas le cas, créer l'AudioContext ici (interaction utilisateur)
      engineRef.current = new AudioEngine();
      try {
        const ctx = await engineRef.current.ensureContext();
        await ctx.resume();
      } catch (e) {
        alert('Audio bloqué par le navigateur — cliquez d\'abord sur Activer capteurs/son.');
        console.error(e);
        return;
      }
    }
    try {
      await engineRef.current.start(scene);
    } catch (e) {
      alert('Impossible de démarrer la lecture audio: ' + String(e));
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
      
      // Créer et activer l'AudioContext immédiatement via l'interaction utilisateur
      // Cela débloque l'audio pour les navigateurs qui requièrent une interaction
      if (!engineRef.current) engineRef.current = new AudioEngine();
      try {
        const ctx = await engineRef.current.ensureContext();
        await ctx.resume(); // Forcer la reprise pour débloquer l'audio
      } catch (e) {
        console.warn('Problème lors de l\'activation de l\'audio:', e);
      }
      
      setUseSensors(true);
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
        {useSensors && (
          <>
            {/* Positionner la caméra au centre de la sphère pour le player */}
            <CameraCenterPosition />
            <DeviceOrientationControls makeDefault />
          </>
        )}
        
        {/* Composant interne qui gère la mise à jour audio (doit être dans le Canvas) */}
        <PlayerSceneController
          scene={scene}
          engineRef={engineRef}
          hitSourceId={hitSourceId}
          beamWidthDeg={beamWidthDeg}
          normalize={normalize}
          masterGain={masterGain}
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

/**
 * Composant qui positionne la caméra au centre de la sphère (0,0,0)
 * Le player est toujours au centre et le laser part de ce point
 * Utilise useFrame pour maintenir la position au centre même si DeviceOrientationControls essaie de la modifier
 */
function CameraCenterPosition() {
  const { camera } = useThree();
  
  useFrame(() => {
    // Maintenir la caméra au centre de la sphère (player position)
    // DeviceOrientationControls gère la rotation, mais la position reste au centre
    if (camera.position.x !== 0 || camera.position.y !== 0 || camera.position.z !== 0) {
      camera.position.set(0, 0, 0);
    }
  });
  
  return null;
}

/**
 * Composant interne qui doit être rendu à l'intérieur du Canvas
 * pour pouvoir utiliser useThree() et useFrame()
 */
function PlayerSceneController({
  scene,
  engineRef,
  hitSourceId,
  beamWidthDeg,
  normalize,
  masterGain,
}: {
  scene?: Scene3D;
  engineRef: React.MutableRefObject<AudioEngine | undefined>;
  hitSourceId: string | null;
  beamWidthDeg: number;
  normalize: boolean;
  masterGain: number;
}) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (!engineRef.current || !scene) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    
    // Calculer le mix normal
    engineRef.current.updateMix(forward, scene, { beamWidthDeg, normalize, masterGain });
    
    // Si une source est touchée, augmenter temporairement son gain (boost)
    if (hitSourceId && engineRef.current.isPlaying) {
      engineRef.current.boostSource(hitSourceId, 2.0, 1.0);
    }
  });
  
  return null; // Ce composant ne rend rien visuellement
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
    <div style={{ position: 'fixed', top: 10, left: 10, right: 10, zIndex: 1001, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <Link to={ROUTES.ADMIN} className="button" style={{ textDecoration: 'none', display: 'inline-block' }}>
        ← Admin
      </Link>
      <span className="panel">Scène: {sceneName}</span>
      <button className="button" onClick={onEnableSensors}>
        {sensorsEnabled ? 'Capteurs/Son actifs' : 'Activer capteurs/son'}
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
        <p>Aucun paysage sonore chargé</p>
        <p style={{ fontSize: '14px', marginTop: '10px', color: '#9ca3af' }}>
          Créez votre paysage de samples dans l'éditeur Admin pour commencer à naviguer
        </p>
      </div>
    </Html>
  );

  const hasSources = scene.sources && Array.isArray(scene.sources) && scene.sources.length > 0;

  return (
    <group>
      {/* Sphère de référence */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#1c2430" wireframe transparent opacity={0.3} />
      </mesh>
      
      {/* Plan d'horizon */}
      <gridHelper args={[10, 20, '#2a3340', '#1a222c']} />
      
      {/* Message si pas de sources */}
      {!hasSources && (
        <Html center>
          <div className="panel" style={{ textAlign: 'center', padding: '20px' }}>
            <p>Scène "{scene.name}" chargée</p>
            <p style={{ fontSize: '14px', marginTop: '10px', color: '#9ca3af' }}>
              Aucune source audio dans cette scène
            </p>
          </div>
        </Html>
      )}
      
      {/* Bulles sources audio */}
      {hasSources && (
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
      )}
    </group>
  );
}
