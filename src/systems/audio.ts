import { BALANCE } from '../config/balance';
import { TR } from '../config/tr';
import { assetUrl } from './assets';

/**
 * All SFX are synthesized with WebAudio — zero audio files shipped
 * (the only optional file is the user-supplied Beşiktaş mp3).
 * Every play* call builds its own node graph so overlaps are safe.
 */
class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private crowdNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  /** Call on any user gesture; safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = BALANCE.audio.masterVolume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running' && !!this.master;
  }

  private noise(): AudioBuffer {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) {
      const len = ctx.sampleRate * 2;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  private noiseBurst(opts: {
    duration: number;
    type?: BiquadFilterType;
    freqFrom: number;
    freqTo: number;
    q?: number;
    peak: number;
    attack?: number;
    delay?: number;
  }): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.type ?? 'bandpass';
    filter.frequency.setValueAtTime(opts.freqFrom, t0);
    filter.frequency.linearRampToValueAtTime(opts.freqTo, t0 + opts.duration);
    filter.Q.value = opts.q ?? 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.peak, t0 + (opts.attack ?? 0.02));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start(t0);
    src.stop(t0 + opts.duration + 0.05);
  }

  private tone(opts: {
    duration: number;
    type?: OscillatorType;
    freqFrom: number;
    freqTo?: number;
    peak: number;
    attack?: number;
    delay?: number;
  }): void {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freqFrom, t0);
    if (opts.freqTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqTo), t0 + opts.duration);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.peak, t0 + (opts.attack ?? 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);
    osc.connect(gain).connect(this.master!);
    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.05);
  }

  // ---------- match SFX ----------

  uiClick(): void {
    this.tone({ duration: 0.06, type: 'sine', freqFrom: 1800, freqTo: 1200, peak: 0.12 });
  }

  whistle(): void {
    this.tone({ duration: 0.18, type: 'sine', freqFrom: 2200, peak: 0.22 });
    this.tone({ duration: 0.3, type: 'sine', freqFrom: 2200, peak: 0.22, delay: 0.22 });
  }

  kickThump(): void {
    this.tone({ duration: 0.14, type: 'sine', freqFrom: 110, freqTo: 38, peak: 0.65, attack: 0.004 });
    this.noiseBurst({ duration: 0.08, type: 'lowpass', freqFrom: 900, freqTo: 300, peak: 0.25, attack: 0.004 });
  }

  netSwish(): void {
    this.noiseBurst({ duration: 0.28, type: 'highpass', freqFrom: 2500, freqTo: 4000, peak: 0.2 });
  }

  postClank(): void {
    this.tone({ duration: 0.4, type: 'square', freqFrom: 780, freqTo: 740, peak: 0.3, attack: 0.004 });
    this.tone({ duration: 0.32, type: 'square', freqFrom: 1170, freqTo: 1100, peak: 0.16, attack: 0.004 });
  }

  crowdRoar(): void {
    this.noiseBurst({ duration: 1.5, freqFrom: 500, freqTo: 1800, q: 0.5, peak: 0.5, attack: 0.08 });
  }

  crowdGroan(): void {
    this.noiseBurst({ duration: 1.0, freqFrom: 700, freqTo: 220, q: 0.6, peak: 0.35, attack: 0.06 });
  }

  saveThud(): void {
    this.noiseBurst({ duration: 0.2, type: 'lowpass', freqFrom: 500, freqTo: 180, peak: 0.4, attack: 0.005 });
  }

  startCrowdLoop(): void {
    if (!this.ready || this.crowdNodes) return;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 0.4;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = BALANCE.audio.crowdLoopVolume * 0.25;
    lfo.connect(lfoGain).connect(gain.gain);
    gain.gain.setTargetAtTime(BALANCE.audio.crowdLoopVolume, ctx.currentTime, 0.8);
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
    lfo.start();
    this.crowdNodes = { src, gain };
  }

  stopCrowdLoop(): void {
    if (!this.crowdNodes || !this.ctx) return;
    const { src, gain } = this.crowdNodes;
    gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    src.stop(this.ctx.currentTime + 1.2);
    this.crowdNodes = null;
  }

  // ---------- toxic celebration sounds ----------

  /** "şşşş" — the finger-on-lips hush. */
  hush(): void {
    this.noiseBurst({ duration: 1.1, freqFrom: 4200, freqTo: 3600, q: 2.5, peak: 0.4, attack: 0.12 });
  }

  /** Mocking laugh: descending "ha-ha-ha" bursts. */
  laugh(kind: 'short' | 'long' | 'loud' | 'chuckle' = 'short'): void {
    const config = {
      short: { count: 3, base: 300, peak: 0.28, gap: 0.16 },
      long: { count: 6, base: 280, peak: 0.3, gap: 0.15 },
      loud: { count: 4, base: 340, peak: 0.4, gap: 0.17 },
      chuckle: { count: 4, base: 220, peak: 0.18, gap: 0.12 }
    }[kind];
    for (let i = 0; i < config.count; i++) {
      const freq = config.base * (1 - i * 0.06);
      this.tone({
        duration: 0.11,
        type: 'sawtooth',
        freqFrom: freq,
        freqTo: freq * 0.82,
        peak: config.peak,
        attack: 0.02,
        delay: i * config.gap
      });
      this.noiseBurst({
        duration: 0.09,
        freqFrom: 1200,
        freqTo: 900,
        q: 1.2,
        peak: config.peak * 0.4,
        attack: 0.02,
        delay: i * config.gap
      });
    }
  }

  /** Crowd "siuu" surge for the jump-spin celebration. */
  siuu(): void {
    this.noiseBurst({ duration: 0.9, freqFrom: 600, freqTo: 2000, q: 0.7, peak: 0.4, attack: 0.25 });
    this.tone({ duration: 0.55, type: 'sine', freqFrom: 520, freqTo: 880, peak: 0.16, attack: 0.2, delay: 0.25 });
  }

  // ---------- Beşiktaş special ----------

  /** mp3 if present → Turkish TTS → silent (bubble only). Never throws. */
  playBesiktas(): void {
    const url = assetUrl('audio/babaniz-besiktas.mp3');
    if (url) {
      try {
        const el = new Audio(url);
        el.volume = BALANCE.audio.sfxVolume;
        el.addEventListener('error', () => this.speakBesiktas());
        el.play().catch(() => this.speakBesiktas());
        return;
      } catch {
        /* fall through to TTS */
      }
    }
    this.speakBesiktas();
  }

  private speakBesiktas(): void {
    if (!('speechSynthesis' in window)) return;
    try {
      const utter = new SpeechSynthesisUtterance(TR.match.besiktasTts);
      utter.lang = 'tr-TR';
      utter.rate = 1.3;
      utter.pitch = 1.6;
      const voice = window.speechSynthesis
        .getVoices()
        .find(v => v.lang?.toLowerCase().startsWith('tr'));
      if (voice) utter.voice = voice;
      window.speechSynthesis.speak(utter);
    } catch {
      /* bubble-only degradation */
    }
  }
}

export const sfx = new AudioSystem();
