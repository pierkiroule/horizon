import { z } from 'zod';
import type { Scene3D } from './types';

const AudioSourceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  url: z.string().url(),
  azimuthDeg: z.number().min(-180).max(180),
  elevationDeg: z.number().min(-90).max(90),
  gain: z.number().min(0).max(1).optional(),
  color: z.string().optional(),
  loop: z.boolean().optional(),
  fadeInSec: z.number().min(0).max(30).optional(),
  fadeOutSec: z.number().min(0).max(30).optional(),
});

const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  global: z
    .object({
      beamWidthDeg: z.number().min(5).max(180).optional(),
      normalize: z.boolean().optional(),
    })
    .optional(),
  sources: z.array(AudioSourceSchema).min(1),
});

export async function loadSceneFromUrl(url: string): Promise<Scene3D> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Échec du chargement de la scène: ${res.status}`);
  const json = await res.json();
  const parsed = SceneSchema.parse(json);
  return parsed;
}

export function validateScene(json: unknown): Scene3D {
  return SceneSchema.parse(json);
}
