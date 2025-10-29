export type Mode = 'player' | 'admin';

export interface AudioSource {
  id: string;
  name?: string;
  url: string;
  azimuthDeg: number; // -180..180 (0 faces -Z)
  elevationDeg: number; // -90..90
  gain?: number; // 0..1, default 1
}

export interface Scene3D {
  id: string;
  name: string;
  description?: string;
  global?: {
    beamWidthDeg?: number; // width of the "mix beam"
    normalize?: boolean; // keep overall loudness roughly constant
  };
  sources: AudioSource[];
}
