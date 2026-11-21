// Procedural sound effects and a light music loop with the Web Audio API.
// No external audio files are needed.
export class Audio {
  constructor() {
    this.ctx = null;
    this.sound = true;
    this.music = true;
    this.lastPlay = {};
    this.musicTimer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setSound(on) {
    this.sound = on;
  }
  setMusic(on) {
    this.music = on;
    if (!on) this.stopMusic();
  }

  _env(node, t, a, d, peak) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  _tone(type, f0, f1, dur, vol, when = 0) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, 0.005, dur, vol);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  _noise(dur, vol, freq = 1200, q = 0.8, when = 0) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this._env(g, t, 0.003, dur, vol);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.sound || !this.ctx) return;
    const now = this.ctx.currentTime;
    const min = { shot: 0.06, hit: 0.05, heavy: 0.1 }[name] || 0.03;
    if (this.lastPlay[name] && now - this.lastPlay[name] < min) return;
    this.lastPlay[name] = now;
    switch (name) {
      case 'shot':
        this._noise(0.05, 0.25, 2400, 1.2);
        this._tone('square', 900, 300, 0.04, 0.05);
        break;
      case 'heavy':
        this._noise(0.14, 0.45, 600, 0.7);
        this._tone('sine', 160, 50, 0.15, 0.4);
        break;
      case 'hit':
        this._noise(0.04, 0.15, 800, 2);
        break;
      case 'boom':
        this._noise(0.5, 0.8, 300, 0.5);
        this._tone('sine', 120, 30, 0.45, 0.6);
        break;
      case 'powerup':
        [523, 659, 784, 1046].forEach((f, i) => this._tone('triangle', f, f * 1.01, 0.14, 0.25, i * 0.06));
        break;
      case 'gateGood':
        this._tone('triangle', 600, 1200, 0.18, 0.3);
        this._tone('sine', 900, 1800, 0.2, 0.15, 0.05);
        break;
      case 'gateBad':
        this._tone('sawtooth', 300, 90, 0.3, 0.2);
        break;
      case 'click':
        this._tone('sine', 700, 500, 0.06, 0.25);
        break;
      case 'coin':
        this._tone('square', 988, 988, 0.06, 0.12);
        this._tone('square', 1319, 1319, 0.12, 0.12, 0.06);
        break;
      case 'win':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this._tone('triangle', f, f, 0.18, 0.3, i * 0.11));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this._tone('triangle', f, f * 0.98, 0.25, 0.3, i * 0.16));
        break;
    }
  }

  // Upbeat march loop
  startMusic() {
    if (!this.music || !this.ctx || this.musicTimer) return;
    const bass = [110, 110, 146.8, 130.8, 110, 110, 164.8, 146.8];
    const lead = [440, 0, 523, 587, 659, 0, 587, 523, 440, 0, 392, 440, 523, 0, 494, 0];
    let step = 0;
    const bpm = 128;
    const stepDur = 60 / bpm / 2;
    const tick = () => {
      if (!this.music) return;
      const c = this.ctx;
      const t = c.currentTime + 0.05;
      const play = (type, f, dur, vol) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.value = f;
        this._env(g, t, 0.01, dur, vol);
        o.connect(g).connect(this.musicGain);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      if (step % 2 === 0) play('triangle', bass[(step / 2) % bass.length], stepDur * 1.6, 0.5);
      const l = lead[step % lead.length];
      if (l) play('square', l, stepDur * 0.8, 0.12);
      if (step % 4 === 0) {
        const s = c.createBufferSource();
        s.buffer = this.noise;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 200;
        const g = c.createGain();
        this._env(g, t, 0.002, 0.12, 0.8);
        s.connect(f).connect(g).connect(this.musicGain);
        s.start(t);
        s.stop(t + 0.2);
      }
      if (step % 4 === 2) {
        const s = c.createBufferSource();
        s.buffer = this.noise;
        const f = c.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 5000;
        const g = c.createGain();
        this._env(g, t, 0.002, 0.05, 0.3);
        s.connect(f).connect(g).connect(this.musicGain);
        s.start(t);
        s.stop(t + 0.1);
      }
      step++;
    };
    this.musicTimer = setInterval(tick, stepDur * 1000);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
