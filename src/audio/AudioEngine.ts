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
  private nodesById: Map<string, { source: AudioBufferSourceNode; gain: GainNode; url: string }> = new Map();
  private _isPlaying = false;

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
    this.nodesById.forEach(({ source, gain }) => {
      try { source.stop(0); } catch {}
      try { source.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    });
    this.nodesById.clear();

    // Preload unique buffers
    const uniqueUrls = Array.from(new Set(scene.sources.map((s) => s.url)));
    await Promise.all(uniqueUrls.map((u) => this.decodeUrl(u)));

    // Build nodes for each source
    for (const s of scene.sources) {
      const buffer = this.buffers.get(s.url);
      if (!buffer) throw new Error(`Buffer manquant pour ${s.url}`);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = s.gain ?? 1;
      src.connect(gain);
      gain.connect(this.master!);
      this.nodesById.set(s.id, { source: src, gain, url: s.url });
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
    this.nodesById.forEach(({ source }) => { try { source.stop(0); } catch {} });
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
      const g = weights[idx] * scale * masterGain;
      node.gain.gain.setTargetAtTime(g, this.audioContext!.currentTime, 0.02);
    });
  }
}
