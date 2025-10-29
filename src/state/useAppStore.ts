import { create } from 'zustand';
import type { Mode, Scene3D } from '../lib/types';

interface AppState {
  mode: Mode;
  setMode: (mode: Mode) => void;

  masterGain: number; // 0..1
  setMasterGain: (v: number) => void;

  beamWidthDeg: number;
  setBeamWidthDeg: (v: number) => void;

  normalize: boolean;
  setNormalize: (v: boolean) => void;

  showDebug: boolean;
  setShowDebug: (v: boolean) => void;

  scene?: Scene3D;
  setScene: (s?: Scene3D) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'player',
  setMode: (mode) => set({ mode }),

  masterGain: 0.8,
  setMasterGain: (masterGain) => set({ masterGain }),

  beamWidthDeg: 60,
  setBeamWidthDeg: (beamWidthDeg) => set({ beamWidthDeg }),

  normalize: true,
  setNormalize: (normalize) => set({ normalize }),

  showDebug: false,
  setShowDebug: (showDebug) => set({ showDebug }),

  scene: undefined,
  setScene: (scene) => set({ scene }),
}));
