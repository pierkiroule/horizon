import * as THREE from 'three';
import type { Scene3D } from '../lib/types';
import { directionalGain, sphericalToDirection } from '../lib/orientation';

export type MixOptions = {
  beamWidthDeg: number;
  normalize: boolean;
  masterGain: number;
};

export class AudioEngine {
  private audioContext?: AudioContext;
  private master?: GainNode;
  private buffers: Map<string, AudioBuffer> = new Map();
  private nodesById: Map<string, { source: AudioBufferSourceNode; preGain: GainNode; mixGain: GainNode; url: string }> = new Map();
  private _isPlaying = false;
  private currentScene?: Scene3D;

  get isPlaying() {
    return this._isPlaying;
  }

  async ensureContext(): Promise<AudioContext> {
    if (this.audioContext) return this.audioContext;
    const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API non supportée');
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    this.audioContext = ctx;
    this.master = master;
    return ctx;
  }

  async setMasterGain(value: number) {
    await this.ensureContext();
    if (this.master) this.master.gain.setTargetAtTime(value, this.audioContext!.currentTime, 0.01);
  }

  async decodeUrl(url: string): Promise<AudioBuffer> {
    if (this.buffers.has(url)) return this.buffers.get(url)!;
    const ctx = await this.ensureContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Échec du chargement audio: ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(url, buffer);
    return buffer;
  }

  async prepareGraph(scene: Scene3D) {
    const ctx = await this.ensureContext();
    // Clean previous nodes
    this.nodesById.forEach(({ source, preGain, mixGain }) => {
      try { source.stop(0); } catch {}
      try { source.disconnect(); } catch {}
      try { preGain.disconnect(); } catch {}
      try { mixGain.disconnect(); } catch {}
    });
    this.nodesById.clear();
    this.currentScene = scene;

    // Preload unique buffers
    const uniqueUrls = Array.from(new Set(scene.sources.map((s) => s.url)));
    await Promise.all(uniqueUrls.map((u) => this.decodeUrl(u)));

    // Build nodes for each source
    for (const s of scene.sources) {
      const buffer = this.buffers.get(s.url);
      if (!buffer) throw new Error(`Buffer manquant pour ${s.url}`);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = s.loop ?? true;

      // Envelope/pre gain (for fade in/out independent of mix)
      const preGain = ctx.createGain();
      // Start at 0 if fadeIn planned, otherwise at 1
      const fadeIn = Math.max(0, Math.min(30, s.fadeInSec ?? 0));
      preGain.gain.value = fadeIn > 0 ? 0 : 1;

      // Mix gain controlled by directional mixer (updateMix)
      const mixGain = ctx.createGain();
      mixGain.gain.value = 0; // will be driven by updateMix

      src.connect(preGain);
      preGain.connect(mixGain);
      mixGain.connect(this.master!);

      // Schedule fade in
      if (fadeIn > 0) {
        const now = ctx.currentTime;
        preGain.gain.cancelScheduledValues(now);
        preGain.gain.setValueAtTime(0, now);
        preGain.gain.linearRampToValueAtTime(1, now + fadeIn);
      }

      this.nodesById.set(s.id, { source: src, preGain, mixGain, url: s.url });
    }
  }

  async start(scene: Scene3D) {
    const ctx = await this.ensureContext();
    await ctx.resume();
    await this.prepareGraph(scene);
    const startAt = ctx.currentTime + 0.05;
    this.nodesById.forEach(({ source }) => {
      try { source.start(startAt, 0); } catch (e) { /* ignore */ }
    });
    this._isPlaying = true;
  }

  async stop() {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const scene = this.currentScene;

    // Apply fade out if specified, then stop
    this.nodesById.forEach(({ source, preGain }, id) => {
      const conf = scene?.sources.find((s) => s.id === id);
      const fadeOut = Math.max(0, Math.min(30, conf?.fadeOutSec ?? 0));
      const now = ctx.currentTime;
      try { preGain.gain.cancelScheduledValues(now); } catch {}
      if (fadeOut > 0) {
        try { preGain.gain.setValueAtTime(preGain.gain.value, now); } catch {}
        try { preGain.gain.linearRampToValueAtTime(0, now + fadeOut); } catch {}
        try { source.stop(now + fadeOut + 0.01); } catch {}
      } else {
        try { source.stop(0); } catch {}
      }
    });
    this.nodesById.clear();
    this._isPlaying = false;
  }

  updateMix(forward: THREE.Vector3, scene: Scene3D, options: MixOptions) {
    if (!this.audioContext || !this.master) return;
    const { beamWidthDeg, normalize, masterGain } = options;
    // Compute directional weights
    const weights = scene.sources.map((s) => {
      const dir = sphericalToDirection(s.azimuthDeg, s.elevationDeg);
      const theta = Math.acos(THREE.MathUtils.clamp(dir.dot(forward), -1, 1));
      const w = directionalGain(theta, beamWidthDeg) * (s.gain ?? 1);
      return w;
    });
    const sum = weights.reduce((a, b) => a + b, 0);
    const scale = normalize && sum > 0 ? 1 / sum : 1;

    scene.sources.forEach((s, idx) => {
      const node = this.nodesById.get(s.id);
      if (!node) return;
      const g = weights[idx] * scale * masterGain * (s.gain ?? 1);
      node.mixGain.gain.setTargetAtTime(g, this.audioContext!.currentTime, 0.02);
    });
  }

  /**
   * Boost le gain d'une source spécifique (utile quand elle est touchée par le laser)
   */
  boostSource(sourceId: string, boostFactor: number = 2.0, maxGain: number = 1.0) {
    if (!this.audioContext) return;
    const node = this.nodesById.get(sourceId);
    if (!node) return;
    
    // Récupérer le gain de base de la source depuis la scène (nécessiterait de passer la scène en paramètre)
    // Pour l'instant, on utilise le gain actuel et on le multiplie
    const currentGain = node.mixGain.gain.value;
    const boostedGain = Math.min(currentGain * boostFactor, maxGain);
    
    node.mixGain.gain.setTargetAtTime(boostedGain, this.audioContext.currentTime, 0.05);
  }
}
