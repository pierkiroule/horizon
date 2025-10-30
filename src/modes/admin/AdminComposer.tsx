import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import type { AudioSource, Scene3D } from '../../lib/types';
import { useAppStore } from '../../state/useAppStore';
import { View3D } from '../../components/editor/View3D';
import { View2D } from '../../components/editor/View2D';
import { SceneContent } from '../../components/editor/SceneContent';
import { ROUTES } from '../../config/routes';

type ViewLayout = 'single' | 'grid';

export default function AdminComposer() {
  const setScene = useAppStore((s) => s.setScene);
  const savedScene = useAppStore((s) => s.scene);
  
  const defaultAudioUrl = 'https://cdn.pixabay.com/download/audio/2022/03/01/audio_400fae9dcc.mp3?filename=relaxing-piano-ambient-112199.mp3';
  const [name, setName] = useState<string>(savedScene?.name ?? 'Démo');
  // Palette de couleurs pour les bulles
  const palette = ['#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f472b6','#fb923c','#22c55e','#60a5fa','#eab308'];
  const [nextColorIndex, setNextColorIndex] = useState<number>(1);
  const initialSources: AudioSource[] = savedScene?.sources && savedScene.sources.length > 0
    ? savedScene.sources
    : [{
        id: 's1',
        name: 'S1',
        url: defaultAudioUrl,
        azimuthDeg: 0,
        elevationDeg: 0,
        gain: 1,
        color: '#f59e0b',
        loop: true,
        fadeInSec: 0,
        fadeOutSec: 0,
      }];
  const [sources, setSources] = useState<AudioSource[]>(initialSources);
  const [selectedId, setSelectedId] = useState<string | null>(sources.length > 0 ? (sources[0]?.id ?? null) : null);
  const [viewLayout, setViewLayout] = useState<ViewLayout>('grid');
  const [magneticGrid, setMagneticGrid] = useState<boolean>(true);
  const [gridSize, setGridSize] = useState<number>(15);
  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number; sourceId: string }>(null);

  // Sauvegarder automatiquement la scène dans le store quand elle change
  useEffect(() => {
    const scene: Scene3D = {
      id: savedScene?.id ?? `scene-${Date.now()}`,
      name,
      global: { beamWidthDeg: 60, normalize: true },
      sources: sources, // Utiliser directement les sources avec leurs URLs individuelles
    };
    setScene(scene);
  }, [sources, name, setScene, savedScene?.id]);

  function addSourceAt(azimuthDeg: number, elevationDeg: number) {
    const id = `s${Date.now().toString(36)}`;
    // Utiliser l'URL de la source sélectionnée comme valeur par défaut, ou l'URL par défaut
    const defaultUrl = sources.find(s => s.id === selectedId)?.url ?? defaultAudioUrl;
    const color = palette[nextColorIndex % palette.length];
    setNextColorIndex((i) => (i + 1) % palette.length);
    const s: AudioSource = { id, name: id, url: defaultUrl, azimuthDeg, elevationDeg, gain: 1, color, loop: true, fadeInSec: 0, fadeOutSec: 0 };
    setSources((prev) => [...prev, s]);
    setSelectedId(id);
  }

  function onSphereClick(_point: THREE.Vector3, azimuthDeg: number, elevationDeg: number) {
    addSourceAt(azimuthDeg, elevationDeg);
  }

  function updateSelected(partial: Partial<AudioSource>) {
    if (!selectedId) return;
    setSources((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...partial } : s)));
  }

  function onExport() {
    const scene: Scene3D = {
      id: savedScene?.id ?? `scene-${Date.now()}`,
      name,
      global: { beamWidthDeg: 60, normalize: true },
      sources: sources, // Utiliser directement les sources avec leurs URLs individuelles
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
        setName(json.name ?? name);
        setSources(json.sources);
        setSelectedId(json.sources[0]?.id ?? null);
      } catch (e) {
        alert('Import échoué: ' + String(e));
      }
    };
    reader.readAsText(file);
  }

  function onSourceClick(source: AudioSource) {
    setSelectedId(source.id);
  }

  function onSourceDragStart(_source: AudioSource) {
    // TODO: Implement drag functionality
  }

  function onSourceDragEnd(_source: AudioSource) {
    // TODO: Implement drag functionality
  }

  function onSourceContextMenu(source: AudioSource, screen: { x: number; y: number }) {
    setSelectedId(source.id);
    setContextMenu({ x: screen.x, y: screen.y, sourceId: source.id });
  }

  const selected = useMemo(() => sources.find((s) => s.id === selectedId), [sources, selectedId]);

  const commonSceneProps = {
    sources,
    selectedId,
    radius: 2.5,
    showHorizon: true,
    showSphere: true,
    magneticGrid,
    gridSize,
    onSphereClick,
    onSourceClick,
    onSourceDragStart,
    onSourceDragEnd,
    onSourceContextMenu,
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre d'outils */}
      <div
        style={{
          position: 'fixed',
          top: 10,
          left: 10,
          right:10,
          zIndex: 1001,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(10, 12, 16, 0.9)',
          padding: '10px',
         borderRadius: '8px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link to={ROUTES.PLAYER} className="button" style={{ textDecoration: 'none', display: 'inline-block' }}>
          → Joueur
        </Link>
        <input
          className="panel"
          style={{ width: 200 }}
          placeholder="Nom de la scène"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input type="file" accept="application/json" onChange={onImportFile} style={{ cursor: 'pointer' }} />
        <button className="button" onClick={onExport}>
          Exporter JSON
        </button>
        <button
          className="button"
          onClick={() => setViewLayout(viewLayout === 'single' ? 'grid' : 'single')}
        >
          {viewLayout === 'single' ? 'Vues multiples' : 'Vue unique'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={magneticGrid}
            onChange={(e) => setMagneticGrid(e.target.checked)}
          />
          Grille magnétique
        </label>
        {magneticGrid && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Taille grille:
            <input
              type="range"
              min={5}
              max={30}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              style={{ width: 100 }}
            />
            {gridSize}
          </label>
        )}
      </div>

      {/* Zone d'édition principale */}
      <div style={{ flex: 1, marginTop:'80px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {viewLayout === 'single' ? (
          <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            <View3D title="Vue 3D - Perspective">
              <SceneContent {...commonSceneProps} />
            </View3D>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '10px',
            }}
          >
            {/* Vue 3D principale (grande) */}
            <div
              style={{
                gridColumn: '1 / 2',
                gridRow: '1 / 3',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <View3D title="Vue 3D - Perspective"showControls={true}>
                <SceneContent {...commonSceneProps} />
              </View3D>
            </div>

            {/* Vue 2D du haut */}
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <View2D type="top" title="Vue du haut" showControls={false}>
                <SceneContent {...commonSceneProps} />
              </View2D>
            </div>

            {/* Vue 2D de droite */}
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <View2D type="right" title="Vue de droite" showControls={false}>
                <SceneContent {...commonSceneProps} />
              </View2D>
            </div>

            {/* Vue 2D de gauche */}
            <div
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <View2D type="left" title="Vue de gauche" showControls={false}>
                <SceneContent {...commonSceneProps} />
              </View2D>
            </div>
          </div>
        )}
      </div>

      {/* Panneau de contrôle pour la source sélectionnée */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(10, 12, 16, 0.95)',
            padding: '15px 20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            minWidth: '600px',
            maxWidth: '800px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', gap: 15, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 150, fontWeight: 'bold', color: '#f59e0b' }}>
                {selected.name ?? selected.id}
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12px' }}>
                Azimuth: {selected.azimuthDeg.toFixed(1)}°
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={selected.azimuthDeg}
                  onChange={(e) => updateSelected({ azimuthDeg: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12px' }}>
                Élévation: {selected.elevationDeg.toFixed(1)}°
                <input
                  type="range"
                  min={-90}
                  max={90}
                  value={selected.elevationDeg}
                  onChange={(e) => updateSelected({ elevationDeg: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12px' }}>
                Gain: {(selected.gain ?? 1).toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={selected.gain ?? 1}
                  onChange={(e) => updateSelected({ gain: Number(e.target.value) })}
                  style={{ width: 100 }}
                />
              </label>
              <button
                className="button button-danger"
                onClick={() => {
                  setSources((prev) => prev.filter((x) => x.id !== selected.id));
                  setSelectedId(null);
                }}
              >
                Supprimer
              </button>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '12px', width: '100%' }}>
              URL audio:
              <input
                className="panel"
                type="text"
                placeholder="https://..."
                value={selected.url ?? ''}
                onChange={(e) => updateSelected({ url: e.target.value })}
                style={{ width: '100%', padding: '8px', fontSize: '12px' }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Menu contextuel source */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            transform: 'translate(0, 0)',
            zIndex: 1002,
            background: 'rgba(17, 24, 39, 0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: 12,
            minWidth: 260,
            color: '#e5e7eb',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const s = sources.find(x => x.id === contextMenu.sourceId);
            if (!s) return null;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 700, color: s.color ?? '#f59e0b' }}>Configurer « {s.name ?? s.id} »</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  Titre
                  <input className="panel" value={s.name ?? ''} onChange={(e) => updateSelected({ name: e.target.value })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  URL audio
                  <input className="panel" placeholder="https://..." value={s.url} onChange={(e) => updateSelected({ url: e.target.value })} />
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    Volume: {(s.gain ?? 1).toFixed(2)}
                    <input type="range" min={0} max={1} step={0.01} value={s.gain ?? 1} onChange={(e) => updateSelected({ gain: Number(e.target.value) })} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={s.loop ?? true} onChange={(e) => updateSelected({ loop: e.target.checked })} />
                    Loop
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    Fade in (s)
                    <input type="number" min={0} max={30} step={0.1} value={s.fadeInSec ?? 0} onChange={(e) => updateSelected({ fadeInSec: Number(e.target.value) })} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                    Fade out (s)
                    <input type="number" min={0} max={30} step={0.1} value={s.fadeOutSec ?? 0} onChange={(e) => updateSelected({ fadeOutSec: Number(e.target.value) })} />
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  Couleur
                  <input type="color" value={s.color ?? '#f59e0b'} onChange={(e) => updateSelected({ color: e.target.value })} />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button className="button button-danger" onClick={() => { setSources(prev => prev.filter(x => x.id !== s.id)); setContextMenu(null); }}>Supprimer</button>
                  <button className="button" onClick={() => setContextMenu(null)}>Fermer</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
