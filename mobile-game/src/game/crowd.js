import * as THREE from 'three';

// Renders many simple jointed characters with one InstancedMesh per body part.
// Each entity: { x, y, z, yaw, fall, phase, scale, colors: [hex per part], partScale: {name: s}, arms }
const _base = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _rot = new THREE.Matrix4();
const _out = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

function box(w, h, d, tx = 0, ty = 0, tz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(tx, ty, tz);
  return g;
}

export class CrowdRenderer {
  constructor(scene, max, parts) {
    this.max = max;
    this.parts = parts.map((p) => {
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const mesh = new THREE.InstancedMesh(p.geo, mat, max);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, _c.set(0xffffff));
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      return { ...p, mesh };
    });
  }

  render(entities) {
    let i = 0;
    for (let k = 0; k < entities.length && i < this.max; k++) {
      const e = entities[k];
      if (e.hidden) continue;
      _e.set(e.fall || 0, e.yaw || 0, 0);
      _q.setFromEuler(_e);
      const sc = e.scale || 1;
      _base.compose(_p.set(e.x, e.y || 0, e.z), _q, _s.set(sc, sc, sc));
      for (let pi = 0; pi < this.parts.length; pi++) {
        const part = this.parts[pi];
        const angle = part.anim ? part.anim(e) : 0;
        const ps = (e.partScale && e.partScale[part.name]) || 1;
        _rot.makeRotationX(angle);
        _local.makeTranslation(part.offset[0], part.offset[1], part.offset[2]).multiply(_rot);
        if (ps !== 1) _local.multiply(_out.makeScale(ps, ps, ps));
        _out.multiplyMatrices(_base, _local);
        part.mesh.setMatrixAt(i, _out);
        part.mesh.setColorAt(i, _c.setHex(e.colors[pi]));
      }
      i++;
    }
    for (const part of this.parts) {
      part.mesh.count = i;
      part.mesh.instanceMatrix.needsUpdate = true;
      part.mesh.instanceColor.needsUpdate = true;
    }
  }
}

const walkL = (e) => Math.sin(e.phase) * 0.75 * (e.fall ? 0.2 : 1);
const walkR = (e) => -Math.sin(e.phase) * 0.75 * (e.fall ? 0.2 : 1);

// Soldier: faces -Z, rifle held forward.
export function soldierParts() {
  return [
    { name: 'legL', geo: box(0.22, 0.72, 0.24, 0, -0.36, 0), offset: [-0.13, 0.72, 0], anim: walkL },
    { name: 'legR', geo: box(0.22, 0.72, 0.24, 0, -0.36, 0), offset: [0.13, 0.72, 0], anim: walkR },
    { name: 'torso', geo: box(0.56, 0.62, 0.34), offset: [0, 1.04, 0] },
    { name: 'vest', geo: box(0.6, 0.3, 0.38), offset: [0, 1.0, 0] },
    { name: 'head', geo: box(0.36, 0.36, 0.36), offset: [0, 1.55, 0] },
    { name: 'helmet', geo: box(0.44, 0.17, 0.44), offset: [0, 1.76, 0] },
    { name: 'armL', geo: box(0.16, 0.55, 0.16, 0, -0.27, 0), offset: [-0.35, 1.3, 0], anim: () => 1.25 },
    { name: 'armR', geo: box(0.16, 0.55, 0.16, 0, -0.27, 0), offset: [0.35, 1.3, 0], anim: () => 1.35 },
    { name: 'gun', geo: box(0.13, 0.16, 0.8, 0, 0, -0.3), offset: [0.1, 1.17, -0.3] },
  ];
}

// Zombie: arms stretched forward, swaying.
export function zombieParts() {
  return [
    { name: 'legL', geo: box(0.22, 0.7, 0.24, 0, -0.35, 0), offset: [-0.13, 0.7, 0], anim: walkL },
    { name: 'legR', geo: box(0.22, 0.7, 0.24, 0, -0.35, 0), offset: [0.13, 0.7, 0], anim: walkR },
    { name: 'torso', geo: box(0.54, 0.64, 0.32), offset: [0, 1.02, 0] },
    { name: 'head', geo: box(0.36, 0.38, 0.36), offset: [0, 1.55, 0.04] },
    { name: 'armL', geo: box(0.15, 0.58, 0.15, 0, -0.29, 0), offset: [-0.34, 1.28, 0], anim: (e) => (e.fall ? 0.3 : 1.45 + Math.sin(e.phase * 0.5) * 0.15) },
    { name: 'armR', geo: box(0.15, 0.58, 0.15, 0, -0.29, 0), offset: [0.34, 1.28, 0], anim: (e) => (e.fall ? 0.3 : 1.45 - Math.sin(e.phase * 0.5) * 0.15) },
  ];
}

export const SOLDIER_OUTFITS = [
  // [pants, shirt, vest, skin, helmet, sleeves]
  [0x2b3a67, 0x2f6fe0, 0xf2c230, 0xf0c49a, 0xd8342c, 0x2f6fe0],
  [0x2b3a67, 0xd8342c, 0xf2c230, 0xd9a273, 0x2f6fe0, 0xd8342c],
  [0x3b2f5a, 0x2f6fe0, 0xe8e8f0, 0x8d5a3a, 0xf2c230, 0x2f6fe0],
];

const ZOMBIE_SKIN = [0x9fb38a, 0xb5b89a, 0x8ea58f, 0xc2b8a3, 0xa7a08c];
const ZOMBIE_SHIRT = [0x7d3b3b, 0x5b6f8a, 0xb7a98f, 0x6a5a7a, 0x8a4f3a, 0xd0c7b4, 0x4f6b4f, 0xa63a4a];
const ZOMBIE_PANTS = [0x3a3a48, 0x4a3f36, 0x2f3d52, 0x5a5048];

export function zombieColors(rng) {
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const skin = pick(ZOMBIE_SKIN);
  const shirt = pick(ZOMBIE_SHIRT);
  const pants = pick(ZOMBIE_PANTS);
  return [pants, pants, shirt, skin, skin, skin];
}

export function soldierColors(outfitIndex, gunColor) {
  const o = SOLDIER_OUTFITS[outfitIndex % SOLDIER_OUTFITS.length];
  return [o[0], o[0], o[1], o[2], o[3], o[4], o[5], o[5], gunColor];
}
