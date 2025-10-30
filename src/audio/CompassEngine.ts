export type SectorSource = { url: string; gain?: number; mode?: 'loop' | 'oneshot' };

const NUM_SECTORS = 8;
const SECTOR_DEG = 360 / NUM_SECTORS; // 45

function angularDistanceDeg(a: number, b: number) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export class CompassEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private sectorGains: GainNode[] = [];
  private loopNodes: (AudioBufferSourceNode | null)[] = Array(NUM_SECTORS).fill(null);
  private buffers: (AudioBuffer | null)[] = Array(NUM_SECTORS).fill(null);
  private oneshotLastAt: number[] = Array(NUM_SECTORS).fill(0);
  private currentSector: number = -1;
  private lastChangeAt = 0;
  private muted = false;

  // Config
  private crossfadeMs: number;
  private hysteresisDeg: number;
  private changeCooldownMs: number;
  private oneshotCooldownMs: number;
  private outputGainVal: number;

  private sources: SectorSource[];

  constructor(
    sources: SectorSource[],
    opts?: {
      crossfadeMs?: number;
      sectorHysteresisDeg?: number;
      changeCooldownMs?: number;
      oneshotCooldownMs?: number;
      outputGain?: number;
    }
  ) {
    if (sources.length !== NUM_SECTORS) {
      throw new Error(`Expected ${NUM_SECTORS} sources (N,NE,E,SE,S,SW,W,NW)`);
    }
    this.sources = sources;
    this.crossfadeMs = opts?.crossfadeMs ?? 220;
    this.hysteresisDeg = opts?.sectorHysteresisDeg ?? 10;
    this.changeCooldownMs = opts?.changeCooldownMs ?? 300;
    this.oneshotCooldownMs = opts?.oneshotCooldownMs ?? 1500;
    this.outputGainVal = opts?.outputGain ?? 1;
  }

  async ensureContext(): Promise<AudioContext> {
    if (this.ctx) return this.ctx;
    const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API non supportée');
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.outputGainVal;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  async loadBuffer(url: string): Promise<AudioBuffer> {
    const ctx = await this.ensureContext();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Échec du chargement audio: ${url}`);
    const arr = await res.arrayBuffer();
    return await ctx.decodeAudioData(arr);
  }

  async init() {
    const ctx = await this.ensureContext();

    // Preload
    const all = await Promise.all(this.sources.map((s) => this.loadBuffer(s.url)));
    all.forEach((buf, i) => (this.buffers[i] = buf));

    // Create per-sector gain + loop source if needed
    for (let i = 0; i < NUM_SECTORS; i++) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master!);
      this.sectorGains[i] = g;

      const s = this.sources[i];
      if ((s.mode ?? 'loop') === 'loop') {
        const node = ctx.createBufferSource();
        node.buffer = this.buffers[i]!;
        node.loop = true;
        node.connect(g);
        node.start(0);
        this.loopNodes[i] = node;
      }
    }
  }

  async resume() {
    const ctx = await this.ensureContext();
    if (ctx.state !== 'running') await ctx.resume();
  }

  setMuted(v: boolean) {
    this.muted = v;
    if (!this.master || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(v ? 0 : this.outputGainVal, t, 0.02);
  }

  private crossfadeTo(nextSector: number) {
    if (!this.ctx) return;
    if (nextSector === this.currentSector) return;
    const now = performance.now();
    if (now - this.lastChangeAt < this.changeCooldownMs) return;

    const t = this.ctx.currentTime;
    const fadeS = this.crossfadeMs / 1000;

    if (this.currentSector >= 0) {
      const gOut = this.sectorGains[this.currentSector];
      gOut.gain.cancelScheduledValues(t);
      gOut.gain.setValueAtTime(gOut.gain.value, t);
      gOut.gain.linearRampToValueAtTime(0, t + fadeS);
    }

    const gIn = this.sectorGains[nextSector];
    const target = this.sources[nextSector].gain ?? 1;
    gIn.gain.cancelScheduledValues(t);
    gIn.gain.setValueAtTime(gIn.gain.value, t);
    gIn.gain.linearRampToValueAtTime(this.muted ? 0 : target, t + fadeS);

    // Trigger oneshot if configured
    const src = this.sources[nextSector];
    if ((src.mode ?? 'loop') === 'oneshot') {
      const last = this.oneshotLastAt[nextSector];
      if (performance.now() - last > this.oneshotCooldownMs && this.buffers[nextSector]) {
        const one = this.ctx.createBufferSource();
        one.buffer = this.buffers[nextSector]!;
        one.connect(gIn);
        one.start();
        this.oneshotLastAt[nextSector] = performance.now();
      }
    }

    this.currentSector = nextSector;
    this.lastChangeAt = now;
  }

  updateHeading(headingDeg: number) {
    // Quantize + hysteresis decision
    const sector = Math.floor(((headingDeg + SECTOR_DEG / 2) % 360) / SECTOR_DEG); // 0..7
    if (this.currentSector === -1) {
      this.crossfadeTo(sector);
      return;
    }
    const centerCurr = (this.currentSector * SECTOR_DEG) % 360;
    const centerNext = (sector * SECTOR_DEG) % 360;
    const distCurr = angularDistanceDeg(headingDeg, centerCurr);
    const distNext = angularDistanceDeg(headingDeg, centerNext);
    if (distNext + this.hysteresisDeg < distCurr) {
      this.crossfadeTo(sector);
    }
  }

  stop() {
    this.loopNodes.forEach((n) => {
      try {
        n?.stop();
        n?.disconnect();
      } catch {}
    });
    this.sectorGains.forEach((g) => g?.disconnect());
    try { this.master?.disconnect(); } catch {}
    try { this.ctx?.close(); } catch {}
    this.loopNodes = Array(NUM_SECTORS).fill(null);
    this.sectorGains = [];
    this.buffers = Array(NUM_SECTORS).fill(null);
    this.currentSector = -1;
  }
}
