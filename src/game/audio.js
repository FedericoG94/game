/**
 * Audio procedurale con Web Audio: nessun file da caricare, nessuna licenza.
 * - Nulla parte prima di una interazione dell'utente (`unlock()` va chiamata in un gesto).
 * - Musica a sequenziatore con look-ahead, effetti sintetizzati al volo.
 * - Se l'audio non è disponibile o è disattivato, il gioco resta pienamente comprensibile.
 */
const midiToHz = (n) => 440 * 2 ** ((n - 69) / 12);

const CHORDS = [
  [48, 52, 55], // C
  [45, 48, 52], // Am
  [41, 45, 48], // F
  [43, 47, 50], // G
];

const MELODY_RUN = [
  [76, 79, 84, 79, 76, 79, 81, 79],
  [81, 84, 88, 84, 81, 84, 79, 76],
  [77, 81, 84, 81, 77, 81, 79, 77],
  [79, 83, 86, 83, 79, 83, 81, 79],
  [84, 0, 79, 0, 76, 79, 81, 0],
  [88, 0, 84, 0, 81, 84, 88, 0],
  [84, 0, 81, 0, 77, 81, 84, 0],
  [86, 0, 83, 0, 79, 83, 86, 0],
];

export class AudioManager {
  constructor({ enabled = true, musicVolume = 0.45, sfxVolume = 0.9 } = {}) {
    this.enabled = enabled;
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
    this.ctx = null;
    this.track = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.intensity = 0;
    this.suspendedByGame = false;
  }

  get supported() {
    return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  /** Da chiamare dentro un gesto dell'utente (click, tocco, tasto). */
  unlock() {
    if (!this.supported) return;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicVolume * 0.5;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxVolume * 0.7;
      this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended' && !this.suspendedByGame) this.ctx.resume().catch(() => {});
    if (this.pendingTrack && this.enabled) this.playMusic(this.pendingTrack);
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.04);
    if (on && this.track === null && this.pendingTrack) this.playMusic(this.pendingTrack);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  // ------------------------------------------------------------ pausa
  /** Sospende musica ed effetti (pausa di gioco, scheda nascosta). */
  suspend() {
    this.suspendedByGame = true;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    this.suspendedByGame = false;
    if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
  }

  // ----------------------------------------------------------- sintesi
  _tone({ freq, type = 'sine', t = 0, dur = 0.2, vol = 0.3, attack = 0.005, release = 0.06, slideTo = null, bus = this.sfxBus, detune = 0, lp = 0 }) {
    const { ctx } = this;
    const start = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + attack);
    gain.gain.setValueAtTime(vol, start + Math.max(attack, dur - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = osc;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      osc.connect(f);
      node = f;
    }
    node.connect(gain);
    gain.connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  _noise({ t = 0, dur = 0.15, vol = 0.2, type = 'highpass', freq = 2000, slideTo = null, q = 1, bus = this.sfxBus }) {
    const { ctx } = this;
    const start = ctx.currentTime + t;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, start);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(gain);
    gain.connect(bus);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  /** Riproduce un effetto sonoro per nome. */
  sfx(name) {
    if (!this.ctx || !this.enabled || this.suspendedByGame || this.ctx.state !== 'running') return;
    const T = (o) => this._tone(o);
    switch (name) {
      case 'ui':
        T({ freq: 620, slideTo: 880, type: 'triangle', dur: 0.09, vol: 0.28 });
        break;
      case 'jump':
        T({ freq: 280, slideTo: 720, type: 'sine', dur: 0.16, vol: 0.26 });
        break;
      case 'slide':
        this._noise({ dur: 0.28, vol: 0.2, type: 'bandpass', freq: 3200, slideTo: 700, q: 1.5 });
        break;
      case 'land':
        T({ freq: 150, slideTo: 60, type: 'sine', dur: 0.12, vol: 0.3 });
        break;
      case 'lane':
        this._noise({ dur: 0.07, vol: 0.09, type: 'bandpass', freq: 1800, q: 0.8 });
        break;
      case 'positive':
        [523, 659, 784, 1047].forEach((f, i) => T({ freq: f, type: 'triangle', t: i * 0.065, dur: 0.22, vol: 0.28 }));
        T({ freq: 2093, type: 'sine', t: 0.2, dur: 0.3, vol: 0.1 });
        break;
      case 'rare':
        [659, 784, 988, 1175, 1319, 1568].forEach((f, i) => T({ freq: f, type: 'triangle', t: i * 0.06, dur: 0.3, vol: 0.26 }));
        [2637, 3136, 3951].forEach((f, i) => T({ freq: f, type: 'sine', t: 0.3 + i * 0.07, dur: 0.4, vol: 0.09 }));
        break;
      case 'negative':
        // "womp womp" di trombone
        T({ freq: 392, slideTo: 370, type: 'sawtooth', dur: 0.3, vol: 0.2, lp: 900 });
        T({ freq: 349, slideTo: 262, type: 'sawtooth', t: 0.32, dur: 0.55, vol: 0.22, lp: 800 });
        break;
      case 'troll':
        T({ freq: 1400, slideTo: 180, type: 'sine', dur: 0.6, vol: 0.22 });
        T({ freq: 140, slideTo: 220, type: 'square', t: 0.62, dur: 0.16, vol: 0.12, lp: 600 });
        T({ freq: 220, slideTo: 110, type: 'square', t: 0.78, dur: 0.2, vol: 0.12, lp: 600 });
        break;
      case 'hit':
        this._noise({ dur: 0.18, vol: 0.32, type: 'lowpass', freq: 900, slideTo: 140 });
        T({ freq: 120, slideTo: 45, type: 'sine', dur: 0.2, vol: 0.4 });
        break;
      case 'countdown':
        T({ freq: 520, type: 'triangle', dur: 0.14, vol: 0.28 });
        break;
      case 'go':
        T({ freq: 784, type: 'triangle', dur: 0.32, vol: 0.28 });
        T({ freq: 1047, type: 'triangle', dur: 0.32, vol: 0.22 });
        break;
      case 'finish':
        [523, 523, 523, 659, 784, 1047].forEach((f, i) => {
          T({ freq: f, type: 'square', t: i * 0.11, dur: i === 5 ? 0.7 : 0.14, vol: 0.14, lp: 2400 });
          T({ freq: f / 2, type: 'triangle', t: i * 0.11, dur: i === 5 ? 0.7 : 0.14, vol: 0.2 });
        });
        break;
      case 'giftShake':
        this._noise({ dur: 1.1, vol: 0.18, type: 'bandpass', freq: 140, q: 2 });
        T({ freq: 70, slideTo: 95, type: 'sine', dur: 1.1, vol: 0.3 });
        break;
      case 'giftOpen':
        this._noise({ dur: 0.5, vol: 0.2, type: 'bandpass', freq: 400, slideTo: 5200, q: 1.2 });
        T({ freq: 200, slideTo: 1600, type: 'sawtooth', dur: 0.5, vol: 0.1, lp: 3000 });
        T({ freq: 90, slideTo: 40, type: 'sine', t: 0.5, dur: 0.3, vol: 0.45 });
        [784, 988, 1175, 1568, 1976, 2349, 3136].forEach((f, i) => T({ freq: f, type: 'sine', t: 0.52 + i * 0.07, dur: 0.7, vol: 0.14 }));
        [523, 659, 784].forEach((f) => T({ freq: f, type: 'triangle', t: 0.55, dur: 1.4, vol: 0.12, release: 0.5 }));
        break;
      case 'pause':
        T({ freq: 500, slideTo: 300, type: 'triangle', dur: 0.12, vol: 0.24 });
        break;
      case 'resume':
        T({ freq: 300, slideTo: 520, type: 'triangle', dur: 0.12, vol: 0.24 });
        break;
      default:
        break;
    }
  }

  // ----------------------------------------------------------- musica
  playMusic(name) {
    this.pendingTrack = name;
    if (!this.ctx || !this.enabled) return;
    if (this.track === name && this.timer) return;
    this.stopMusic();
    this.track = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._schedule(), 30);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  /** 0..1: aumenta lievemente l'energia della musica con l'avanzare della corsa. */
  setIntensity(x) {
    this.intensity = Math.max(0, Math.min(1, x));
  }

  _schedule() {
    const { ctx } = this;
    if (!ctx || ctx.state !== 'running' || !this.track) return;
    const bpm = { run: 128 + this.intensity * 12, menu: 104, final: 80 }[this.track] ?? 110;
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.14) {
      this._playStep(this.step, this.nextTime - ctx.currentTime);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  _m(note, t, dur, vol, type = 'triangle', extra = {}) {
    this._tone({ freq: midiToHz(note), type, t, dur, vol, bus: this.musicBus, ...extra });
  }

  _playStep(stepIndex, t) {
    const step = stepIndex % 16;
    const bar = Math.floor(stepIndex / 16);
    const chord = CHORDS[bar % 4];
    if (this.track === 'run') {
      if (step % 4 === 0) this._tone({ freq: 120, slideTo: 42, type: 'sine', t, dur: 0.14, vol: 0.55, bus: this.musicBus });
      if (step % 4 === 2) this._noise({ t, dur: 0.05, vol: 0.1, freq: 7000, bus: this.musicBus });
      if (this.intensity > 0.45 && step % 2 === 1) this._noise({ t, dur: 0.03, vol: 0.05, freq: 8000, bus: this.musicBus });
      if ([0, 6, 8, 10, 14].includes(step)) this._m(chord[0] - 12 + (step === 14 ? 12 : 0), t, 0.17, 0.42, 'triangle');
      if (step === 4 || step === 12) chord.forEach((n) => this._m(n + 12, t, 0.2, 0.13, 'square', { lp: 1800 }));
      if (step % 2 === 0) {
        const n = MELODY_RUN[bar % 8][step / 2];
        if (n) this._m(n, t, 0.22, 0.2, 'triangle');
      }
    } else if (this.track === 'menu') {
      if (step === 0 || step === 8) this._m(chord[0] - 12, t, 0.5, 0.4, 'triangle');
      if (step === 0) chord.forEach((n) => this._m(n + 12, t, 1.4, 0.1, 'sine', { release: 0.5 }));
      if (step % 4 === 0) {
        const n = MELODY_RUN[bar % 4][step / 2] ?? 0;
        if (n) this._m(n, t, 0.5, 0.17, 'sine', { release: 0.3 });
      }
      if (step === 6 || step === 14) this._noise({ t, dur: 0.04, vol: 0.05, freq: 7000, bus: this.musicBus });
    } else if (this.track === 'final') {
      const arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24];
      if (step % 2 === 0) {
        const n = arp[(step / 2) % 4] + (step >= 8 ? 12 : 0);
        this._m(n, t, 0.9, 0.18, 'sine', { release: 0.5 });
        this._m(n + 12, t, 0.5, 0.05, 'sine', { release: 0.3 });
      }
      if (step === 0) {
        chord.forEach((n) => this._m(n, t, 3.2, 0.12, 'triangle', { release: 1.2, attack: 0.4 }));
        this._m(chord[0] - 12, t, 3.2, 0.3, 'sine', { release: 1.2 });
      }
    }
  }
}
