import * as THREE from 'three';

// Giant slingshot used for the level-start launch (ad intro).
// Pull the pouch back/down, release → the squad flies onto the bridge.
export function makeSlingshot() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5e3b20, roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0xf0a020, roughness: 0.5, emissive: 0x3a2000 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x6b3d1e, roughness: 0.7 });

  // Y-shaped frame from smooth tubes
  const trunk = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1.2, 0),
    new THREE.Vector3(0, 2.0, 0),
  ]);
  const armL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.9, 0),
    new THREE.Vector3(-0.9, 2.6, 0),
    new THREE.Vector3(-1.5, 3.6, 0),
    new THREE.Vector3(-1.6, 4.3, 0),
  ]);
  const armR = new THREE.CatmullRomCurve3(armL.points.map((p) => new THREE.Vector3(-p.x, p.y, p.z)));
  for (const [curve, r] of [[trunk, 0.32], [armL, 0.24], [armR, 0.24]]) {
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 14, false), wood);
    g.add(m);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), wood);
  knot.position.y = 1.95;
  g.add(knot);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 12), dark);
    cap.position.set(1.6 * s, 4.3, 0);
    g.add(cap);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 10, 24), rubber);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.set(1.58 * s, 4.0, 0);
    g.add(wrap);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.3, 24), dark);
  base.position.y = 0.15;
  g.add(base);

  // bands: unit cylinders stretched between fork tips and the pouch
  const bandGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 10);
  bandGeo.translate(0, 0.5, 0);
  bandGeo.rotateX(Math.PI / 2); // along +Z
  const bandL = new THREE.Mesh(bandGeo, rubber);
  const bandR = new THREE.Mesh(bandGeo, rubber);
  g.add(bandL, bandR);
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), leather);
  pouch.material.side = THREE.DoubleSide;
  g.add(pouch);

  const tipL = new THREE.Vector3(-1.58, 4.05, 0);
  const tipR = new THREE.Vector3(1.58, 4.05, 0);
  const tmp = new THREE.Vector3();
  const pouchPos = new THREE.Vector3(0, 4.0, 0.2);

  function stretch(band, from, to) {
    band.position.copy(from);
    tmp.copy(to).sub(from);
    const len = tmp.length();
    band.scale.set(1, 1, len);
    band.lookAt(tmp.add(from));
  }

  return {
    group: g,
    pouchLocal: pouchPos,
    /** pull: 0..1 back/down; aim: -1..1 sideways */
    setPull(pull, aim) {
      pouchPos.set(-aim * 1.4 * pull, 4.0 - pull * 1.6, 0.2 + pull * 3.2);
      pouch.position.copy(pouchPos);
      pouch.lookAt(0, 4.0, -5);
      stretch(bandL, tipL, pouchPos);
      stretch(bandR, tipR, pouchPos);
    },
  };
}

// Glowing aim arc preview (rebuilt when the aim changes)
export class AimArc {
  constructor(scene) {
    this.scene = scene;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x6dff6a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    });
    this.mesh = null;
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.25, 40),
      new THREE.MeshBasicMaterial({ color: 0x6dff6a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, fog: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    scene.add(this.ring);
    this.ring.visible = false;
  }
  set(from, to, height) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector3(
        from.x + (to.x - from.x) * t,
        from.y + (to.y - from.y) * t + Math.sin(t * Math.PI) * height,
        from.z + (to.z - from.z) * t,
      ));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.09, 8, false);
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = geo;
    } else {
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.scene.add(this.mesh);
    }
    this.mesh.visible = true;
    this.ring.visible = true;
    this.ring.position.set(to.x, 0.06, to.z);
  }
  hide() {
    if (this.mesh) this.mesh.visible = false;
    this.ring.visible = false;
  }
}
