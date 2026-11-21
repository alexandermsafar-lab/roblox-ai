import * as THREE from 'three';
import { glowTexture, beamTexture } from './models.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

// Debris / sparks / smoke particles in one instanced mesh
export class Particles {
  constructor(scene, max = 1600) {
    this.max = max;
    this.list = [];
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      max,
    );
    this.mesh.setColorAt(0, _c.set(0xffffff));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }
  spawn(x, y, z, opts) {
    const n = opts.count || 10;
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 4) * (0.4 + Math.random() * 0.8);
      const up = opts.up ?? 4;
      this.list.push({
        x, y, z,
        vx: Math.cos(a) * sp,
        vy: up * (0.5 + Math.random()),
        vz: Math.sin(a) * sp,
        life: 0,
        max: (opts.life || 0.7) * (0.6 + Math.random() * 0.7),
        size: (opts.size || 0.2) * (0.6 + Math.random() * 0.8),
        color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color,
        g: opts.gravity ?? 14,
        rot: Math.random() * 6,
        grow: opts.grow || 0,
      });
    }
  }
  update(dt) {
    let i = 0;
    const out = [];
    for (const p of this.list) {
      p.life += dt;
      if (p.life >= p.max) continue;
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.05 && p.g > 0) {
        p.y = 0.05;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      p.rot += dt * 6;
      out.push(p);
      const k = 1 - p.life / p.max;
      const s = p.size * (p.grow ? 1 + (1 - k) * p.grow : k * 0.6 + 0.4);
      _q.setFromAxisAngle(_p.set(0.3, 1, 0.2).normalize(), p.rot);
      _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.setHex(p.color));
      i++;
    }
    this.list = out;
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  clear() {
    this.list = [];
    this.mesh.count = 0;
  }
}

// Additive glow flashes and golden beam bursts (weapon pickup)
export class Flashes {
  constructor(scene) {
    this.scene = scene;
    this.glowTex = glowTexture();
    this.beamTex = beamTexture();
    this.items = [];
  }
  flash(x, y, z, color = 0xffc040, size = 4, life = 0.35) {
    const mat = new THREE.SpriteMaterial({
      map: this.glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.setScalar(size * 0.4);
    this.scene.add(s);
    this.items.push({ obj: s, mat, t: 0, life, size, kind: 'flash' });
  }
  beam(x, z, radius = 2, color = 0xffd050) {
    const geo = new THREE.CylinderGeometry(radius, radius * 1.2, 6, 24, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: this.beamTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, 3, z);
    this.scene.add(m);
    this.items.push({ obj: m, mat, geo, t: 0, life: 0.9, kind: 'beam' });
    this.flash(x, 1, z, 0xffe080, radius * 4, 0.6);
  }
  ring(x, z, color = 0xffffff, radius = 3) {
    const geo = new THREE.RingGeometry(0.7, 1, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    this.scene.add(m);
    this.items.push({ obj: m, mat, geo, t: 0, life: 0.5, size: radius, kind: 'ring' });
  }
  update(dt, followX, followZ) {
    this.items = this.items.filter((it) => {
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        this.scene.remove(it.obj);
        it.mat.dispose();
        if (it.geo) it.geo.dispose();
        return false;
      }
      if (it.kind === 'flash') {
        it.obj.scale.setScalar(it.size * (0.4 + k * 0.8));
        it.mat.opacity = 1 - k;
      } else if (it.kind === 'beam') {
        if (followX !== undefined) it.obj.position.set(followX, 3, followZ);
        it.obj.scale.set(1 + k * 0.3, 0.3 + Math.min(1, k * 3) * 0.9, 1 + k * 0.3);
        it.mat.opacity = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      } else if (it.kind === 'ring') {
        it.obj.scale.setScalar(0.5 + k * it.size);
        it.mat.opacity = 1 - k;
      }
      return true;
    });
  }
  clear() {
    for (const it of this.items) {
      this.scene.remove(it.obj);
      it.mat.dispose();
      if (it.geo) it.geo.dispose();
    }
    this.items = [];
  }
}
