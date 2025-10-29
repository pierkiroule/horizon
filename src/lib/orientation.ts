import * as THREE from 'three';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// In three.js convention, camera faces -Z initially. We use azimuth=0 facing -Z.
export function sphericalToDirection(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
  const az = deg2rad(azimuthDeg);
  const el = deg2rad(elevationDeg);
  // Convert spherical to cartesian on unit sphere
  // Facing -Z when az=0, el=0
  const y = Math.sin(el);
  const r = Math.cos(el);
  const x = Math.sin(az) * r;
  const z = -Math.cos(az) * r; // minus to align az=0 with -Z
  return new THREE.Vector3(x, y, z).normalize();
}

export function angleBetweenDirections(a: THREE.Vector3, b: THREE.Vector3): number {
  const dot = clamp(a.clone().normalize().dot(b.clone().normalize()), -1, 1);
  return Math.acos(dot);
}

// Hann window-shaped directional gain: 1 at 0°, 0 at width
export function directionalGain(thetaRad: number, beamWidthDeg: number): number {
  const widthRad = deg2rad(clamp(beamWidthDeg, 5, 180));
  if (thetaRad >= widthRad) return 0;
  const x = thetaRad / widthRad; // 0..1
  return 0.5 * (1 + Math.cos(Math.PI * x));
}
