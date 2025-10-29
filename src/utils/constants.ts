/**
 * Constantes globales de l'application
 */

export const AUDIO_DEFAULTS = {
  MASTER_GAIN: 0.8,
  BEAM_WIDTH_DEG: 60,
  NORMALIZE: true,
} as const;

export const ORIENTATION_DEFAULTS = {
  MIN_AZIMUTH: -180,
  MAX_AZIMUTH: 180,
  MIN_ELEVATION: -90,
  MAX_ELEVATION: 90,
} as const;

export const SPHERE_DEFAULTS = {
  RADIUS: 2.5,
  SEGMENTS: 32,
  SOURCE_SIZE: 0.08,
  SOURCE_SIZE_SELECTED: 0.12,
} as const;

export const CAMERA_DEFAULTS = {
  FOV: 60,
  POSITION: [0, 1.5, 4] as [number, number, number],
} as const;
