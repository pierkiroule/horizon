import { useMemo, useState } from 'react';
import { CanvasLayout } from '../../components/CanvasLayout';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { sphericalToDirection, rad2deg } from '../../lib/orientation';
import type { AudioSource, Scene3D } from '../../lib/types';

export default function AdminComposer() {
  const [audioUrl, setAudioUrl] = useState<string>('https://cdn.pixabay.com/download/audio/2022/03/01/audio_400fae9dcc.mp3?filename=relaxing-piano-ambient-112199.mp3');
  const [name, setName] = useState<string>('Démo');
  const [sources, setSources] = useState<AudioSource[]>([...Array(8)].map((_, i) => ({
    id: `s${i + 1}`,
    name: `S${i + 1}`,
    url: audioUrl,
    azimuthDeg: (i * 360) / 8 - 180,
    elevationDeg: 0,
    gain: 1,
  })));
  const [selectedId, setSelectedId] = useState<string | null>(sources[0]?.id ?? null);

  function addSourceAt(azimuthDeg: number, elevationDeg: number) {
    const id = `s${Date.now().toString(36)}`;
    const s: AudioSource = { id, name: id, url: audioUrl, azimuthDeg, elevationDeg, gain: 1 };
    setSources((prev) => [...prev, s]);
    setSelectedId(id);
  }

  function onSphereClick(e: any) {
    // Compute azimuth/elevation from click point on sphere
    const p: THREE.Vector3 = e.point.clone().normalize();
    // azimuth: angle around Y from -Z
    const az = rad2deg(Math.atan2(p.x, -p.z));
    const el = rad2deg(Math.asin(p.y));
    addSourceAt(az, el);
  }

  function updateSelected(partial: Partial<AudioSource>) {
    if (!selectedId) return;
    setSources((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...partial } : s)));
  }

  function onExport() {
    const scene: Scene3D = {
      id: `scene-${Date.now()}`,
      name,
      global: { beamWidthDeg: 60, normalize: true },
      sources: sources.map((s) => ({ ...s, url: audioUrl })),
    };
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImportFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (!json.sources) throw new Error('Fichier invalide');
        setAudioUrl(json.sources[0]?.url ?? audioUrl);
        setName(json.name ?? name);
        setSources(json.sources);
        setSelectedId(json.sources[0]?.id ?? null);
      } catch (e) {
        alert('Import échoué: ' + String(e));
      }
    };
    reader.readAsText(file);
  }

  const selected = useMemo(() => sources.find((s) => s.id === selectedId), [sources, selectedId]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1001, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="panel" style={{ width: 260 }} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="panel" style={{ width: 360 }} value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
        <input type="file" accept="application/json" onChange={onImportFile} />
        <button className="button" onClick={onExport}>Exporter JSON</button>
      </div>
      <CanvasLayout>
        <group onClick={onSphereClick}>
          <mesh>
            <sphereGeometry args={[2.5, 32, 32]} />
            <meshBasicMaterial color="#1c2430" wireframe />
          </mesh>
          {sources.map((s) => {
            const dir = sphericalToDirection(s.azimuthDeg, s.elevationDeg);
            const pos = dir.clone().multiplyScalar(2.5);
            const selected = s.id === selectedId;
            return (
              <mesh key={s.id} position={pos.toArray()} onClick={(e) => { e.stopPropagation(); setSelectedId(s.id); }}>
                <sphereGeometry args={[selected ? 0.12 : 0.08, 24, 24]} />
                <meshStandardMaterial color={selected ? '#f59e0b' : '#89cff0'} emissive={selected ? '#7c3aed' : '#0b7fcf'} emissiveIntensity={0.3} />
              </mesh>
            );
          })}
        </group>
        <Html position={[0, -1.8, 0]} center>
          {selected && (
            <div className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ minWidth: 150 }}>{selected.name ?? selected.id}</div>
              <label>Azimuth
                <input type="range" min={-180} max={180} value={selected.azimuthDeg}
                  onChange={(e) => updateSelected({ azimuthDeg: Number(e.target.value) })} />
              </label>
              <label>Élévation
                <input type="range" min={-90} max={90} value={selected.elevationDeg}
                  onChange={(e) => updateSelected({ elevationDeg: Number(e.target.value) })} />
              </label>
              <label>Gain
                <input type="range" min={0} max={1} step={0.01} value={selected.gain ?? 1}
                  onChange={(e) => updateSelected({ gain: Number(e.target.value) })} />
              </label>
              <button className="button" onClick={() => setSources((prev) => prev.filter((x) => x.id !== selected.id))}>Supprimer</button>
            </div>
          )}
        </Html>
      </CanvasLayout>
    </div>
  );
}
