import * as THREE from 'three';

// Floating HP bar with number (brutes and bosses), drawn on a canvas sprite.
export class HpBar {
  constructor(width = 2.4, big = false) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 64;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, depthTest: false, fog: false, transparent: true }));
    this.sprite.scale.set(width, width / 4, 1);
    this.sprite.renderOrder = 20;
    this.big = big;
    this.shown = -1;
    this.lag = 1;
  }
  draw(hp, max, dt = 0) {
    const f = Math.max(0, Math.min(1, hp / max));
    this.lag = this.lag > f ? Math.max(f, this.lag - dt * 0.6) : f;
    const key = Math.ceil(hp) * 1000 + Math.round(this.lag * 200);
    if (key === this.shown) return;
    this.shown = key;
    const g = this.ctx;
    g.clearRect(0, 0, 256, 64);
    const x = 70;
    const w = 176;
    const y = 18;
    const h = 28;
    g.fillStyle = '#1b2440';
    rr(g, x - 4, y - 4, w + 8, h + 8, 12);
    g.fill();
    g.fillStyle = '#3a1418';
    rr(g, x, y, w, h, 9);
    g.fill();
    if (this.lag > f) {
      g.fillStyle = '#ffe08a';
      rr(g, x, y, w * this.lag, h, 9);
      g.fill();
    }
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#ff6a5a');
    grd.addColorStop(1, '#c81e1e');
    g.fillStyle = grd;
    if (f > 0) {
      rr(g, x, y, Math.max(12, w * f), h, 9);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    if (f > 0) {
      rr(g, x + 4, y + 3, Math.max(4, w * f - 8), 7, 4);
      g.fill();
    }
    g.font = "40px 'Lilita One', 'Arial Black', sans-serif";
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.lineJoin = 'round';
    g.strokeStyle = '#1b2440';
    const txt = String(Math.max(0, Math.ceil(hp)));
    g.strokeText(txt, 64, 34);
    g.fillStyle = '#fff';
    g.fillText(txt, 64, 34);
    this.tex.needsUpdate = true;
  }
  dispose() {
    this.tex.dispose();
    this.sprite.material.dispose();
  }
}

function rr(g, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
