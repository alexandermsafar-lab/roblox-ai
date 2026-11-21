import * as THREE from 'three';
import { WEAPONS, VEHICLE } from './weapons.js';

export const BRIDGE_W = 12;
const FONT = "'Lilita One', 'Arial Black', sans-serif";

// ---------- Textures ----------
export function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#6f6a63';
  g.fillRect(0, 0, 512, 512);
  const n = 4;
  const s = 512 / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = 168 + Math.floor(Math.random() * 22);
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
      // speckle
      for (let i = 0; i < 90; i++) {
        const k = v - 20 + Math.random() * 40;
        g.fillStyle = `rgba(${k},${k - 6},${k - 14},0.35)`;
        g.fillRect(x * s + 4 + Math.random() * (s - 10), y * s + 4 + Math.random() * (s - 10), 3, 3);
      }
      // bevel light
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x * s + 3, y * s + 3, s - 6, 4);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(x * s + 3, y * s + s - 7, s - 6, 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.6)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function beamTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 256, 0, 0);
  grd.addColorStop(0, 'rgba(255,230,120,1)');
  grd.addColorStop(0.5, 'rgba(255,200,60,0.55)');
  grd.addColorStop(1, 'rgba(255,200,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function drawOutlinedText(g, text, x, y, size, fill = '#fff', stroke = '#2a2f45') {
  g.font = `${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16;
  g.strokeStyle = stroke;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

// A label plane whose canvas can be redrawn (barrel HP, gate values, squad count)
export class Label {
  constructor(w, h, pxW = 256, pxH = 128) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = pxW;
    this.canvas.height = pxH;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.mat);
    this.value = null;
  }
  dispose() {
    this.tex.dispose();
    this.mat.dispose();
    this.mesh.geometry.dispose();
  }
}

// ---------- Barrel ----------
const barrelGeo = new THREE.CylinderGeometry(1, 1, 2.6, 28, 1);
barrelGeo.rotateZ(Math.PI / 2);
const ringGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.14, 28, 1);
ringGeo.rotateZ(Math.PI / 2);
const capGeo = new THREE.CircleGeometry(0.86, 28);
// Golden reward platform on top of the barrel: thin torus + soft additive glow disc
const platRingGeo = new THREE.TorusGeometry(0.98, 0.055, 10, 56);
platRingGeo.rotateX(Math.PI / 2);
const platGlowGeo = new THREE.CircleGeometry(1.45, 48);
platGlowGeo.rotateX(-Math.PI / 2);
barrelGeo._shared = ringGeo._shared = capGeo._shared = platRingGeo._shared = platGlowGeo._shared = true;
const barrelMat = new THREE.MeshLambertMaterial({ color: 0xe0302c, emissive: 0x3a0505 });
const ringMat = new THREE.MeshLambertMaterial({ color: 0xa81c1c });
const capMat = new THREE.MeshLambertMaterial({ color: 0xff5c4a });
const platRingMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, fog: false });
let platGlowMat = null;
function ringGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,190,60,0.30)');
  grd.addColorStop(0.55, 'rgba(255,200,70,0.45)');
  grd.addColorStop(0.68, 'rgba(255,236,150,1)');
  grd.addColorStop(0.78, 'rgba(255,190,60,0.45)');
  grd.addColorStop(1, 'rgba(255,170,40,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const BARREL_FLASH = new THREE.Color(0xffd6e6);
const BARREL_EMISSIVE = [new THREE.Color(0x3a0505), new THREE.Color(0x000000), new THREE.Color(0x000000)];

export function makeBarrel(hp, rewardId) {
  const g = new THREE.Group();
  // per-barrel materials so a hit can flash just this barrel
  const mats = [barrelMat.clone(), ringMat.clone(), capMat.clone()];
  const body = new THREE.Mesh(barrelGeo, mats[0]);
  body.position.y = 1;
  g.add(body);
  for (const x of [-1.0, -0.35, 0.35, 1.0]) {
    const r = new THREE.Mesh(ringGeo, mats[1]);
    r.position.set(x, 1, 0);
    g.add(r);
  }
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, mats[2]);
    cap.position.set(1.31 * s, 1, 0);
    cap.rotation.y = (Math.PI / 2) * s;
    g.add(cap);
  }
  // golden ring platform on the top surface (barrel top is y = 2.0)
  if (!platGlowMat) {
    platGlowMat = new THREE.MeshBasicMaterial({
      map: ringGlowTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
  }
  const plat = new THREE.Group();
  plat.position.y = 2.02;
  const glow = new THREE.Mesh(platGlowGeo, platGlowMat);
  glow.renderOrder = 2;
  plat.add(glow);
  const ring = new THREE.Mesh(platRingGeo, platRingMat);
  ring.position.y = 0.03;
  plat.add(ring);
  g.add(plat);
  g.userData.flashMats = mats;

  const label = new Label(2.3, 1.15);
  label.mesh.position.set(0, 1.05, 1.06);
  g.add(label.mesh);
  setBarrelLabel(label, hp);

  // 'squad' rewards stand real soldiers on the ring (placed by Game.js): no hologram
  const holo = rewardId === 'squad' ? new THREE.Group() : makeHologram(rewardId);
  holo.position.set(0, 2.9, 0);
  g.add(holo);
  return { group: g, label, holo, platform: plat };
}

// Hit flash: call every frame with a decaying 0..1 value. Accepts the makeBarrel()
// result, a Game barrel entry ({ obj }) or the barrel group itself.
export function flashBarrel(barrel, amount) {
  const g = (barrel && (barrel.group || barrel.obj)) || barrel;
  const mats = g && g.userData && g.userData.flashMats;
  if (!mats) return;
  const a = Math.max(0, Math.min(1, amount || 0));
  for (let i = 0; i < mats.length; i++) {
    mats[i].emissive.copy(BARREL_EMISSIVE[i]).lerp(BARREL_FLASH, a * 0.85);
  }
}

export function setBarrelLabel(label, hp) {
  const v = Math.max(0, Math.ceil(hp));
  if (label.value === v) return;
  label.value = v;
  const g = label.ctx;
  g.clearRect(0, 0, 256, 128);
  drawOutlinedText(g, String(v), 128, 68, v >= 1000 ? 74 : 92);
  label.tex.needsUpdate = true;
}

// ---------- Gates ----------
const postGeo = new THREE.BoxGeometry(0.28, 3.0, 0.28);
postGeo._shared = true;
const postMat = new THREE.MeshLambertMaterial({ color: 0x8a5a33 });

export function gateText(op, val) {
  if (op === 'mul') return `×${val}`;
  return val >= 0 ? `+${val}` : `${val}`;
}

export function drawGate(label, op, val) {
  const key = op + val;
  if (label.value === key) return;
  label.value = key;
  const g = label.ctx;
  const W = label.canvas.width;
  const H = label.canvas.height;
  g.clearRect(0, 0, W, H);
  const good = op === 'mul' || val > 0;
  const grd = g.createLinearGradient(0, 0, 0, H);
  if (good) {
    grd.addColorStop(0, 'rgba(120,200,255,0.92)');
    grd.addColorStop(1, 'rgba(210,240,255,0.70)');
  } else {
    grd.addColorStop(0, 'rgba(255,90,80,0.92)');
    grd.addColorStop(1, 'rgba(255,190,120,0.70)');
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(0, 0, W, 10);
  drawOutlinedText(g, gateText(op, val), W / 2, H / 2 + 6, 120, '#fff', good ? '#1d4e8f' : '#8f1d1d');
  label.tex.needsUpdate = true;
}

export function makeGatePanel(width, op, val) {
  const g = new THREE.Group();
  const label = new Label(width, 2.3, 320, 200);
  label.mat.side = THREE.DoubleSide;
  label.mesh.position.y = 1.5;
  g.add(label.mesh);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set((width / 2) * s, 1.5, 0);
    g.add(p);
  }
  drawGate(label, op, val);
  return { group: g, label };
}

// ---------- Weapon holograms ----------
function holoMat(color) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 });
}

export function makeHologram(id) {
  if (id === 'squad' || (id !== 'car' && !WEAPONS[id])) return new THREE.Group();
  const color = id === 'car' ? VEHICLE.color : WEAPONS[id].color;
  const m = holoMat(color);
  const dark = holoMat(new THREE.Color(color).multiplyScalar(0.55));
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.rotation.z = rz;
    g.add(mesh);
    return mesh;
  };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const C = (r, l, seg = 10) => new THREE.CylinderGeometry(r, r, l, seg);
  switch (id) {
    case 'pistol':
      add(B(0.9, 0.25, 0.2), m, 0, 0.1, 0);
      add(B(0.22, 0.5, 0.18), dark, -0.25, -0.2, 0, 0, 0.2);
      break;
    case 'smg':
      add(B(1.3, 0.3, 0.22), m, 0, 0, 0);
      add(B(0.18, 0.5, 0.16), dark, 0.05, -0.32, 0);
      add(B(0.2, 0.42, 0.16), dark, -0.35, -0.25, 0, 0, 0.25);
      add(B(0.45, 0.2, 0.18), m, -0.8, -0.02, 0);
      break;
    case 'rifle':
      add(B(1.8, 0.28, 0.2), m, 0, 0, 0);
      add(B(0.55, 0.32, 0.2), dark, -1.0, -0.08, 0);
      add(B(0.18, 0.5, 0.16), dark, 0.15, -0.32, 0, 0, -0.2);
      add(B(0.4, 0.15, 0.15), m, 0.2, 0.25, 0);
      break;
    case 'gatling':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(C(0.06, 1.6, 6), m, 0.35, Math.sin(a) * 0.17, Math.cos(a) * 0.17, 0, Math.PI / 2);
      }
      add(B(0.8, 0.55, 0.55), dark, -0.6, 0, 0);
      add(B(0.3, 0.3, 0.3), m, -0.45, 0.42, 0);
      break;
    case 'sniper':
      add(B(2.4, 0.18, 0.16), m, 0.2, 0, 0);
      add(B(0.7, 0.3, 0.18), dark, -1.1, -0.06, 0);
      add(C(0.1, 0.7), dark, 0, 0.25, 0, 0, Math.PI / 2);
      add(B(0.12, 0.4, 0.12), m, 0.9, -0.22, 0, 0, 0.4);
      break;
    case 'plasma':
      add(B(1.2, 0.42, 0.36), m, 0, 0, 0);
      add(C(0.16, 0.7), dark, 0.85, 0, 0, 0, Math.PI / 2);
      add(new THREE.SphereGeometry(0.22, 10, 8), m, 1.25, 0, 0);
      add(B(0.2, 0.5, 0.18), dark, -0.2, -0.38, 0);
      break;
    case 'cannon': {
      add(C(0.24, 1.8, 12), m, 0.25, 0.25, 0, 0, Math.PI / 2 - 0.25);
      const wheel = new THREE.TorusGeometry(0.42, 0.07, 6, 16);
      add(wheel, dark, -0.2, -0.1, 0.32);
      add(wheel, dark, -0.2, -0.1, -0.32);
      add(B(1.1, 0.12, 0.12), dark, -0.75, -0.35, 0, 0, 0.3);
      break;
    }
    case 'car': {
      add(B(1.8, 0.6, 1.1), m, 0, 0, 0);
      add(B(1.0, 0.45, 0.95), dark, -0.15, 0.5, 0);
      add(C(0.08, 0.9), m, 0.55, 0.62, 0, 0, Math.PI / 2);
      const w = C(0.3, 0.2, 12);
      for (const x of [-0.6, 0.6]) for (const z of [-0.58, 0.58]) add(w, dark, x, -0.3, z, Math.PI / 2);
      break;
    }
  }
  g.rotation.y = -0.6;
  g.scale.setScalar(id === 'car' ? 1.1 : 1.25);
  return g;
}

// ---------- Armored car (ally vehicle model) ----------
export function makeCar() {
  const g = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: 0xf0a23c });
  const dark = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd6ff });
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(1.7, 0.7, 2.6), body, 0, 0.85, 0);
  add(new THREE.BoxGeometry(1.5, 0.5, 1.3), body, 0, 1.45, 0.25);
  add(new THREE.BoxGeometry(1.3, 0.3, 0.05), glass, 0, 1.45, -0.42);
  const turret = new THREE.Group();
  turret.position.set(0, 1.85, 0.2);
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.3, 12), dark);
  turret.add(t1);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), dark);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.05, -0.6);
  turret.add(barrel);
  g.add(turret);
  const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14);
  wheel.rotateZ(Math.PI / 2);
  g.wheels = [];
  for (const x of [-0.9, 0.9]) for (const z of [-0.85, 0.85]) g.wheels.push(add(wheel, dark, x, 0.42, z));
  return g;
}

// ---------- Environment ----------
export function buildEnvironment(scene, length) {
  const env = new THREE.Group();
  scene.add(env);

  // Bridge deck
  const tex = stoneTexture();
  tex.repeat.set(BRIDGE_W / 7, length / 7);
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(BRIDGE_W, length),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.z = -length / 2 + 30;
  env.add(deck);

  const side = new THREE.Mesh(
    new THREE.BoxGeometry(BRIDGE_W + 0.6, 2.2, length),
    new THREE.MeshLambertMaterial({ color: 0x6d6a66 }),
  );
  side.position.set(0, -1.12, -length / 2 + 30);
  env.add(side);

  // Railings
  const railMat = new THREE.MeshLambertMaterial({ color: 0x4d5560 });
  const posts = Math.floor(length / 3);
  const postInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 1.0, 0.18), railMat, posts * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < posts; i++) {
    const z = 30 - i * 3;
    m.makeTranslation(-BRIDGE_W / 2 - 0.1, 0.5, z);
    postInst.setMatrixAt(i * 2, m);
    m.makeTranslation(BRIDGE_W / 2 + 0.1, 0.5, z);
    postInst.setMatrixAt(i * 2 + 1, m);
  }
  env.add(postInst);
  for (const s of [-1, 1]) {
    for (const y of [0.95, 0.55]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, length), railMat);
      rail.position.set((BRIDGE_W / 2 + 0.1) * s, y, -length / 2 + 30);
      env.add(rail);
    }
  }
  return env;
}

// Scenery that follows the camera: cloud sea, mountains, pines
export function buildScenery(scene) {
  const g = new THREE.Group();
  scene.add(g);
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8aa6c2, emissiveIntensity: 0.55 });
  const puffGeo = new THREE.SphereGeometry(1, 12, 8);
  const puffs = [];
  for (let i = 0; i < 70; i++) {
    const p = new THREE.Mesh(puffGeo, cloudMat);
    const side = Math.random() < 0.5 ? -1 : 1;
    p.position.set(side * (8 + Math.random() * 40), -5 - Math.random() * 4, -Math.random() * 160 + 20);
    const s = 4 + Math.random() * 7;
    p.scale.set(s * 1.6, s * 0.55, s);
    g.add(p);
    puffs.push(p);
  }
  // cloud floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshBasicMaterial({ color: 0xe3f1fc }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -9;
  g.add(floor);

  const rock = new THREE.MeshLambertMaterial({ color: 0x5f7896 });
  const snow = new THREE.MeshLambertMaterial({ color: 0xf2f8ff });
  const pine = new THREE.MeshLambertMaterial({ color: 0x2f4f4a });
  const mountains = [];
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? -1 : 1;
    const h = 30 + Math.random() * 35;
    const r = 18 + Math.random() * 16;
    const mt = new THREE.Group();
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rock);
    base.position.y = h / 2;
    mt.add(base);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.42, 7), snow);
    cap.position.y = h - h * 0.21 + 0.2;
    mt.add(cap);
    for (let k = 0; k < 6; k++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5, 6), pine);
      const a = Math.random() * Math.PI * 2;
      const rr = r * (0.75 + Math.random() * 0.2);
      t.position.set(Math.cos(a) * rr, 2.5, Math.sin(a) * rr);
      mt.add(t);
    }
    mt.position.set(side * (55 + Math.random() * 50), -14, -i * 22 - 30);
    g.add(mt);
    mountains.push(mt);
  }
  return {
    group: g,
    update(camZ) {
      // recycle objects that fell behind the camera
      for (const p of puffs) {
        if (p.position.z > camZ + 25) p.position.z -= 180;
      }
      for (const mt of mountains) {
        if (mt.position.z > camZ + 40) mt.position.z -= 16 * 22;
      }
      floor.position.z = camZ - 100;
    },
  };
}
