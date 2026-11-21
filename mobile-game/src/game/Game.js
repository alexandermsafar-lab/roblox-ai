import * as THREE from 'three';
import { CrowdRenderer, soldierParts, zombieParts, zombieColors, soldierColors } from './crowd.js';
import {
  BRIDGE_W, buildEnvironment, buildScenery, makeBarrel, setBarrelLabel, makeGatePanel, drawGate,
  makeCar, makeHologram, Label, gateText,
} from './models.js';
import { Effects } from './fx.js';
import { createLighting } from './lighting.js';
import { generateLevel, mulberry32 } from './level.js';
import { WEAPONS, VEHICLE } from './weapons.js';

const MAX_SOLDIERS = 80;
const MAX_BULLETS = 1600;
const SQUAD_SPEED = 5.6;
const HALF = BRIDGE_W / 2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function slot(i) {
  if (i === 0) return [0, 0];
  const r = 0.46 * Math.sqrt(i + 0.2);
  const a = i * 2.39996;
  return [Math.cos(a) * r, Math.sin(a) * r * 0.8];
}

export class Game {
  constructor(container, hooks = {}) {
    this.container = container;
    this.hooks = hooks;
    this.audio = hooks.audio;
    this.state = 'idle';
    this.time = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 500);
    this.lighting = createLighting(scene, renderer);

    this.scenery = buildScenery(scene);
    this.soldierR = new CrowdRenderer(scene, MAX_SOLDIERS + 40, soldierParts());
    this.zombieR = new CrowdRenderer(scene, 700, zombieParts());
    this.fx = new Effects(scene);
    this.bullets = [];
    this.gunIndex = soldierParts().findIndex((p) => p.name === 'gun');

    // squad counter badge
    this.countLabel = new Label(1.6, 0.8, 192, 96);
    this.countSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.countLabel.tex, depthTest: false, fog: false }));
    this.countSprite.scale.set(1.7, 0.85, 1);
    this.countSprite.renderOrder = 10;
    scene.add(this.countSprite);
    this.countSprite.visible = false;

    this.levelObjs = [];
    this.soldiers = [];
    this.deadSoldiers = [];
    this.zombies = [];
    this.barrels = [];
    this.gates = [];
    this.pickups = [];
    this.car = null;
    this.sx = 0;
    this.sz = 0;
    this.targetX = 0;
    this.camX = 0;
    this.keys = {};

    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._last = performance.now();
    this._tmpM = new THREE.Matrix4();
    this._tmpQ = new THREE.Quaternion();
    this._tmpV = new THREE.Vector3();
    this._tmpS = new THREE.Vector3();
    this._tmpC = new THREE.Color();
    requestAnimationFrame((t) => this._frame(t));
  }

  // ---------------- setup ----------------
  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the bridge filling the screen on phones; tighten FOV on wide screens
    this.camera.fov = this.camera.aspect > 0.8 ? 44 : 56;
    this.camera.updateProjectionMatrix();
    this.width = w;
  }

  _bindInput() {
    const el = this.container;
    let dragging = false;
    let startX = 0;
    let startTarget = 0;
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      startX = e.clientX;
      startTarget = this.targetX;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const k = (BRIDGE_W * 1.25) / Math.max(320, this.width);
      this.targetX = clamp(startTarget + (e.clientX - startX) * k, -HALF, HALF);
    });
    const up = () => (dragging = false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => (this.keys[e.key] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.key] = false));
  }

  _clearLevel() {
    for (const o of this.levelObjs) {
      this.scene.remove(o);
      o.traverse((c) => {
        if (c.geometry && !c.geometry._shared) c.geometry.dispose();
        if (c.material && c.material.map) c.material.map.dispose();
      });
    }
    this.levelObjs = [];
    for (const b of this.barrels) b.label.dispose();
    for (const g of this.gates) for (const p of g.panels) p.label.dispose();
    if (this.car) this.scene.remove(this.car.obj);
    for (const p of this.pickups) this.scene.remove(p.obj);
    this.car = null;
    this.barrels = [];
    this.gates = [];
    this.zombies = [];
    this.soldiers = [];
    this.deadSoldiers = [];
    this.pickups = [];
    this.bullets = [];
    this.fx.clear();
  }

  _add(obj) {
    this.scene.add(obj);
    this.levelObjs.push(obj);
    return obj;
  }

  loadLevel(levelNum) {
    this._clearLevel();
    this.levelNum = levelNum;
    const lv = generateLevel(levelNum);
    this.lv = lv;
    this.length = lv.length;
    this._add(buildEnvironment(this.scene, lv.length + 140));
    this._add(this._finishArch(-lv.length));
    const rng = mulberry32(levelNum * 31 + 7);

    for (const b of lv.barrels) {
      const m = makeBarrel(b.hp, b.reward);
      m.group.position.set(b.x, 0, b.z);
      this._add(m.group);
      this.barrels.push({ ...b, maxHp: b.hp, obj: m.group, label: m.label, holo: m.holo, alive: true, shake: 0 });
    }
    for (const g of lv.gates) {
      const panels = [];
      const w = HALF - 0.35;
      for (const [side, def] of [[-1, g.left], [1, g.right]]) {
        const p = makeGatePanel(w, def.op, def.val);
        p.group.position.set(side * (HALF / 2), 0, g.z);
        this._add(p.group);
        panels.push({ ...def, start: def.val, side, obj: p.group, label: p.label, acc: 0 });
      }
      this.gates.push({ z: g.z, panels, alive: true });
    }
    for (const z of lv.zombies) {
      this.zombies.push({
        x: z.x, y: 0, z: z.z, hp: z.hp, speed: z.speed, horde: !!z.horde,
        yaw: Math.PI, fall: 0, phase: rng() * 10, scale: 0.95 + rng() * 0.15,
        colors: zombieColors(rng), alive: true, deadT: 0, flash: 0,
      });
    }
  }

  _finishArch(z) {
    const g = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const x = c.getContext('2d');
    for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 4; j++) {
        x.fillStyle = (i + j) % 2 ? '#222' : '#fff';
        x.fillRect(i * 16, j * 16, 16, 16);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE_W + 1, 1, 0.3), new THREE.MeshLambertMaterial({ map: tex }));
    banner.position.y = 5;
    g.add(banner);
    const pm = new THREE.MeshLambertMaterial({ color: 0xd8342c });
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.5, 0.6), pm);
      p.position.set(s * (HALF + 0.3), 2.75, 0);
      g.add(p);
    }
    const line = new THREE.Mesh(new THREE.PlaneGeometry(BRIDGE_W, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.02;
    g.add(line);
    g.position.z = z;
    return g;
  }

  // ---------------- public API ----------------
  showMenu(levelNum) {
    this.loadLevel(levelNum);
    this.state = 'menu';
    this.menuZ = 4;
    this.countSprite.visible = false;
  }

  start(levelNum, mods) {
    this.loadLevel(levelNum);
    this.mods = mods;
    this.weapon = WEAPONS[mods.startWeapon || 'pistol'];
    this.sx = 0;
    this.sz = 0;
    this.targetX = 0;
    this.camX = 0;
    this.stats = { kills: 0, barrels: 0, weapons: 0, gatesGood: 0, coins: 0 };
    this.soldiers = [];
    this._addSoldiers(mods.startSoldiers || 1, true);
    this.state = 'play';
    this.countSprite.visible = true;
    this.fx.pickupBurst(0, 0, 1.6);
    this._shotT = 0;
    this._lastCount = -1;
  }

  pause() {
    if (this.state === 'play') this.state = 'paused';
  }
  resume() {
    if (this.state === 'paused') this.state = 'play';
  }
  quit() {
    this.state = 'idle';
  }

  revive() {
    // clear zombies near the squad and drop in fresh soldiers
    for (const z of this.zombies) {
      if (z.alive && z.z > this.sz - 14) this._killZombie(z, false);
    }
    for (const b of this.barrels) if (b.alive && b.z > this.sz - 6) this._destroyBarrel(b, false);
    this._addSoldiers(Math.max(5, this.mods.startSoldiers || 1), true);
    this.state = 'play';
  }

  // ---------------- squad ----------------
  _addSoldiers(n, quiet) {
    const room = MAX_SOLDIERS - this.soldiers.length;
    n = Math.min(n, room);
    for (let i = 0; i < n; i++) {
      const outfit = Math.floor(Math.random() * 3);
      this.soldiers.push({
        x: this.sx + (Math.random() - 0.5) * 0.6,
        y: 0,
        z: this.sz + (Math.random() - 0.5) * 0.6,
        yaw: 0, fall: 0, phase: Math.random() * 6, scale: 1,
        cd: Math.random() * 0.4,
        outfit,
        colors: soldierColors(outfit, this.weapon.color),
        partScale: { gun: this.weapon.gunScale },
      });
    }
    if (!quiet && n > 0) this.fx.spawnPop(this.sx, this.sz, 4);
  }

  _killSoldiers(n) {
    for (let i = 0; i < n && this.soldiers.length; i++) {
      const s = this.soldiers.pop();
      this._soldierDie(s);
    }
  }

  _soldierDie(s) {
    s.deadT = 0;
    this.deadSoldiers.push(s);
    this.fx.soldierDeath(s.x, s.z);
  }

  _equip(w) {
    this.weapon = w;
    for (const s of this.soldiers) {
      s.colors[this.gunIndex] = w.color;
      s.partScale.gun = w.gunScale;
    }
  }

  // ---------------- main loop ----------------
  _frame(t) {
    requestAnimationFrame((tt) => this._frame(tt));
    let dt = (t - this._last) / 1000;
    this._last = t;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;
    this.time += dt;

    if (this.state === 'play' || this.state === 'won') this._update(dt);
    else if (this.state === 'menu') this._updateMenu(dt);
    if (this.state !== 'paused') {
      this.fx.update(dt, this.sx, this.sz);
    }
    this._render();
  }

  _updateMenu(dt) {
    this.menuZ -= dt * 3;
    if (this.menuZ < -this.length + 20) this.menuZ = 4;
    this.sz = this.menuZ;
    this.camX = Math.sin(this.time * 0.25) * 1.5;
    for (const b of this.barrels) b.holo.rotation.y += dt * 1.5;
    for (const z of this.zombies) {
      if (z.z > this.sz - 50 && z.z < this.sz + 10) z.phase += dt * 4;
    }
  }

  _update(dt) {
    const won = this.state === 'won';
    // steering
    if (this.keys.ArrowLeft || this.keys.a) this.targetX -= dt * 10;
    if (this.keys.ArrowRight || this.keys.d) this.targetX += dt * 10;
    const n = this.soldiers.length;
    const spread = n > 1 ? Math.min(HALF - 0.6, 0.46 * Math.sqrt(n) * 0.9) : 0;
    const lim = Math.max(0, HALF - 0.6 - spread);
    this.targetX = clamp(this.targetX, -lim, lim);
    this.sx += (this.targetX - this.sx) * Math.min(1, dt * 10);
    this.sz -= SQUAD_SPEED * dt * (won ? 0.6 : 1);
    this.camX += (this.sx * 0.3 - this.camX) * Math.min(1, dt * 4);

    this._updateSoldiers(dt);
    this._updateCar(dt);
    this._updateBullets(dt);
    this._updateZombies(dt);
    this._updateBarrels(dt);
    this._updateGates();
    this._updatePickups(dt);

    // HUD
    if (this.hooks.onHud) {
      this.hooks.onHud({
        progress: clamp(-this.sz / this.length, 0, 1),
        count: this.soldiers.length,
        kills: this.stats.kills,
        coins: this.stats.coins,
        weapon: this.weapon,
      });
    }
    if (this._lastCount !== this.soldiers.length) {
      this._lastCount = this.soldiers.length;
      this._drawCount(this.soldiers.length);
    }

    if (!won && this.soldiers.length === 0) {
      this.state = 'lost';
      this.countSprite.visible = false;
      this.audio?.play('lose');
      this.hooks.onEnd?.({ win: false, stats: this.stats, progress: clamp(-this.sz / this.length, 0, 1) });
    } else if (!won && this.sz <= -this.length) {
      this.state = 'won';
      this.audio?.play('win');
      this.fx.pickupBurst(this.sx, this.sz, 3);
      this.fx.confetti(this.sx, this.sz);
      setTimeout(() => {
        this.hooks.onEnd?.({ win: true, stats: this.stats, survivors: this.soldiers.length, progress: 1 });
      }, 1400);
    }
  }

  _drawCount(n) {
    const l = this.countLabel;
    const g = l.ctx;
    g.clearRect(0, 0, 192, 96);
    g.fillStyle = '#1b2b55';
    roundRect(g, 26, 14, 140, 68, 22);
    g.fill();
    g.fillStyle = '#3d8bff';
    roundRect(g, 30, 16, 132, 60, 19);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(g, 38, 20, 116, 16, 8);
    g.fill();
    g.font = "52px 'Lilita One', 'Arial Black', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#1b2b55';
    g.lineJoin = 'round';
    g.strokeText(String(n), 96, 49);
    g.fillStyle = '#fff';
    g.fillText(String(n), 96, 49);
    l.tex.needsUpdate = true;
  }

  _updateSoldiers(dt) {
    const w = this.weapon;
    const n = this.soldiers.length;
    // with huge squads, fewer but stronger bullets keep the frame rate high
    const aggr = n > 40 ? 40 / n : 1;
    const rate = w.rate * (this.mods.rateMul || 1) * aggr;
    const dmg = w.dmg * (this.mods.dmgMul || 1) / aggr;
    const firing = this.state === 'play';
    for (let i = 0; i < n; i++) {
      const s = this.soldiers[i];
      const [ox, oz] = slot(i);
      const tx = clamp(this.sx + ox, -HALF + 0.4, HALF - 0.4);
      const tz = this.sz + oz;
      const k = Math.min(1, dt * 9);
      s.x += (tx - s.x) * k;
      s.z += (tz - s.z) * k;
      s.phase += dt * 13;
      if (firing) {
        s.cd -= dt;
        if (s.cd <= 0) {
          s.cd += 1 / rate;
          this._fire(s.x + 0.1, 1.2, s.z - 1.0, w, dmg, true);
        }
      }
    }
    // dying soldiers
    this.deadSoldiers = this.deadSoldiers.filter((s) => {
      s.deadT += dt;
      s.fall = Math.min(1.5, s.fall + dt * 7);
      if (s.deadT > 0.9) s.y -= dt * 2;
      return s.deadT < 1.6;
    });
  }

  // Light auto-aim: bend the shot toward the nearest zombie/barrel inside a forward cone
  _aim(x, z, range) {
    let best = null;
    let bestD = range;
    const bins = this._bins;
    if (bins) {
      for (let k = Math.floor(z); k >= Math.floor(z - range); k--) {
        const arr = bins.get(k);
        if (!arr) continue;
        for (const zb of arr) {
          if (!zb.alive) continue;
          const dz = z - zb.z;
          if (dz <= 0.5) continue;
          const dx = zb.x - x;
          if (Math.abs(dx) < dz * 0.3 + 0.4 && dz < bestD) {
            bestD = dz;
            best = zb;
          }
        }
        if (best) break;
      }
    }
    if (best && bestD < 13) return best; // nearby zombies are the real threat
    for (const b of this.barrels) {
      if (!b.alive) continue;
      const dz = z - b.z;
      if (dz <= 0.5 || dz > range) continue;
      if (Math.abs(b.x - x) < 1.3 && dz < bestD + 2) return b; // barrel in our lane
    }
    return best;
  }

  _fire(x, y, z, w, dmg, aim) {
    if (this.bullets.length >= MAX_BULLETS) return;
    let vx = 0;
    if (aim) {
      const t = this._aim(x, z, w.range * 0.9);
      if (t) {
        const dz = z - t.z;
        const tx = t.label ? clamp(x, t.x - 1.0, t.x + 1.0) : t.x; // barrels: aim at the nearest point
        vx = ((tx - x) / dz) * w.speed;
      }
    }
    this.bullets.push({
      x, y, z, pz: z, dist: 0, w, dmg, pierce: w.pierce || 0, hit: null, vx,
    });
    this.fx.muzzle(x, y, z, w.color);
    this._shotT -= 1;
    if (this._shotT <= 0) {
      this._shotT = 6;
      this.audio?.play(w.id === 'cannon' || w.id === 'sniper' ? 'heavy' : 'shot');
    }
  }

  _updateCar(dt) {
    const c = this.car;
    if (!c) return;
    const tx = clamp(this.sx, -HALF + 1, HALF - 1);
    c.obj.position.x += (tx - c.obj.position.x) * Math.min(1, dt * 6);
    const cz = this.sz - 2.2 - Math.sqrt(this.soldiers.length) * 0.4;
    c.obj.position.z += (cz - c.obj.position.z) * Math.min(1, dt * 6);
    for (const wh of c.obj.wheels) wh.rotation.x -= dt * 10;
    c.cd -= dt;
    if (c.cd <= 0 && this.state === 'play') {
      c.cd = 1 / VEHICLE.rate;
      this._fire(c.obj.position.x + (Math.random() - 0.5) * 0.2, 2.0, c.obj.position.z - 1.6, VEHICLE, VEHICLE.dmg * (this.mods.dmgMul || 1), true);
    }
    if (c.hp <= 0) {
      const p = c.obj.position;
      this._explode(p.x, 1, p.z, 0xff9a3c);
      this.scene.remove(c.obj);
      this.car = null;
    }
  }

  _updateBullets(dt) {
    const bins = new Map();
    const lo = this.sz - 42;
    const hi = this.sz + 4;
    for (const z of this.zombies) {
      if (!z.alive || z.z < lo || z.z > hi) continue;
      const k = Math.floor(z.z);
      let arr = bins.get(k);
      if (!arr) bins.set(k, (arr = []));
      arr.push(z);
    }
    this._bins = bins;
    const gates = this.gates.filter((g) => g.alive && g.z > lo && g.z < hi);
    const barrels = this.barrels.filter((b) => b.alive && b.z > lo && b.z < hi);
    const out = [];
    for (const b of this.bullets) {
      b.pz = b.z;
      const step = b.w.speed * dt;
      b.z -= step;
      b.x += b.vx * dt;
      b.dist += step;
      if (b.dist > b.w.range) continue;
      let consumed = false;

      // zombies
      const k0 = Math.floor(b.z) - 1;
      const k1 = Math.floor(b.pz) + 1;
      for (let k = k0; k <= k1 && !consumed; k++) {
        const arr = bins.get(k);
        if (!arr) continue;
        for (const z of arr) {
          if (!z.alive) continue;
          if (Math.abs(z.x - b.x) > 0.55) continue;
          if (z.z < b.z - 0.4 || z.z > b.pz + 0.4) continue;
          if (b.hit && b.hit.has(z)) continue;
          if (b.w.splash) {
            this._splash(b.x, z.z, b.w.splash, b.dmg);
            consumed = true;
            break;
          }
          this._hitZombie(z, b.dmg);
          if (b.pierce > 0) {
            b.pierce--;
            (b.hit || (b.hit = new Set())).add(z);
          } else {
            consumed = true;
            break;
          }
        }
      }
      if (consumed) continue;

      // barrels
      for (const br of barrels) {
        if (!br.alive) continue;
        if (Math.abs(b.x - br.x) < 1.4 && b.z < br.z + 1.0 && b.pz > br.z - 1.0) {
          if (b.w.splash) this._splash(b.x, br.z + 0.8, b.w.splash, b.dmg * 0.3);
          br.hp -= b.dmg;
          br.shake = 0.08;
          this.fx.barrelHit(b.x, 1.2, br.z + 1, b.w.color);
          if (br.hp <= 0) this._destroyBarrel(br, true);
          else setBarrelLabel(br.label, br.hp);
          consumed = true;
          break;
        }
      }
      if (consumed) continue;

      // gates
      for (const g of gates) {
        if (b.pz >= g.z && b.z < g.z) {
          const p = b.x < 0 ? g.panels[0] : g.panels[1];
          if (p.op === 'add') {
            p.acc += b.dmg;
            const stepHp = 5 + this.levelNum * 2.5;
            while (p.acc >= stepHp && p.val < p.start + 6) {
              p.acc -= stepHp;
              p.val += 1;
            }
            drawGate(p.label, p.op, p.val);
          }
          this.fx.gateHit(b.x, 1.4, g.z + 0.1);
          consumed = true;
          break;
        }
      }
      if (consumed) continue;
      out.push(b);
    }
    this.bullets = out;
  }

  _hitZombie(z, dmg) {
    z.hp -= dmg;
    z.flash = 0.06;
    if (z.hp <= 0) this._killZombie(z, true);
    else this.fx.zombieHit(z.x, 1.2, z.z);
  }

  _splash(x, z0, r, dmg) {
    this.fx.splash(x, z0, r);
    for (let k = Math.floor(z0 - r) - 1; k <= Math.floor(z0 + r) + 1; k++) {
      const arr = this._bins.get(k);
      if (!arr) continue;
      for (const z of arr) {
        if (!z.alive) continue;
        const dx = z.x - x;
        const dz = z.z - z0;
        if (dx * dx + dz * dz < r * r) this._hitZombie(z, dmg);
      }
    }
  }

  _killZombie(z, credit) {
    if (!z.alive) return;
    z.alive = false;
    z.deadT = 0;
    if (credit) {
      this.stats.kills++;
      this.stats.coins += 1;
      this.audio?.play('hit');
    }
    this.fx.zombieDeath(z.x, z.z, (z._saved || z.colors)[2]);
  }

  _updateZombies(dt) {
    const sx = this.sx;
    const sz = this.sz;
    const nearSoldiers = this.soldiers;
    const car = this.car;
    let removed = false;
    for (const z of this.zombies) {
      if (z.flash > 0) z.flash -= dt;
      if (!z.alive) {
        z.deadT += dt;
        z.fall = Math.min(1.5, z.fall + dt * 7);
        if (z.deadT > 1.3) z.y -= dt * 1.6;
        if (z.deadT > 2.4) {
          z.remove = true;
          removed = true;
        }
        continue;
      }
      const dist = sz - z.z; // >0 when ahead of squad
      if (dist > 32) {
        z.phase += dt * 1.5; // idle shuffle
        continue;
      }
      z.z += z.speed * dt;
      z.phase += dt * z.speed * 4.5;
      if (dist < 16) {
        const dx = sx - z.x;
        z.x += clamp(dx, -1, 1) * dt * (z.horde ? 0.8 : 1.2);
      }
      z.x = clamp(z.x, -HALF + 0.3, HALF - 0.3);
      if (z.z > sz + 5) {
        z.remove = true;
        removed = true;
        continue;
      }
      // contact
      if (car && Math.abs(z.z - car.obj.position.z) < 1.6 && Math.abs(z.x - car.obj.position.x) < 1.2) {
        this._killZombie(z, true);
        car.hp -= 1;
        continue;
      }
      if (Math.abs(z.z - sz) < 7) {
        for (let i = 0; i < nearSoldiers.length; i++) {
          const s = nearSoldiers[i];
          const ddx = s.x - z.x;
          const ddz = s.z - z.z;
          if (ddx * ddx + ddz * ddz < 0.36) {
            this._killZombie(z, false);
            nearSoldiers.splice(i, 1);
            this._soldierDie(s);
            this.hooks.haptic?.('light');
            break;
          }
        }
      }
    }
    if (removed) this.zombies = this.zombies.filter((z) => !z.remove);
  }

  _updateBarrels(dt) {
    for (const b of this.barrels) {
      if (!b.alive) continue;
      b.holo.rotation.y += dt * 1.6;
      b.holo.position.y = 2.9 + Math.sin(this.time * 3 + b.z) * 0.12;
      if (b.shake > 0) {
        b.shake -= dt;
        b.obj.position.x = b.x + (Math.random() - 0.5) * 0.08;
      } else b.obj.position.x = b.x;
      // collision with squad: barrel crushes the soldiers in its lane
      if (b.z > this.sz - 1.5) {
        if (this.car && Math.abs(this.car.obj.position.x - b.x) < 2.2 && b.z > this.car.obj.position.z - 1.5) {
          this.car.hp -= 8;
          this._destroyBarrel(b, false);
          continue;
        }
        let hit = false;
        this.soldiers = this.soldiers.filter((s) => {
          if (Math.abs(s.x - b.x) < 1.6 && Math.abs(s.z - b.z) < 1.2) {
            this._soldierDie(s);
            hit = true;
            return false;
          }
          return true;
        });
        if (hit) {
          this.hooks.haptic?.('heavy');
          this._destroyBarrel(b, false);
        }
      }
      if (b.z > this.sz + 8) {
        b.alive = false;
        b.obj.visible = false;
      }
    }
  }

  _explode(x, y, z, color = 0xff6a2a) {
    this.fx.explosion(x, y, z, color);
    this.audio?.play('boom');
    this.hooks.haptic?.('medium');
  }

  _destroyBarrel(b, reward) {
    if (!b.alive) return;
    b.alive = false;
    b.obj.visible = false;
    this._explode(b.x, 1, b.z);
    if (!reward) return;
    this.stats.barrels++;
    this.stats.coins += 10;
    // weapon flies to the squad
    const holo = makeHologram(b.reward);
    holo.position.set(b.x, 2.9, b.z);
    this.scene.add(holo);
    this.pickups.push({ obj: holo, t: 0, from: holo.position.clone(), id: b.reward });
  }

  _updatePickups(dt) {
    this.pickups = this.pickups.filter((p) => {
      p.t += dt / 0.6;
      const k = Math.min(1, p.t);
      const tx = this.sx;
      const tz = this.sz;
      p.obj.position.set(
        p.from.x + (tx - p.from.x) * k,
        p.from.y + Math.sin(k * Math.PI) * 3 - k * 1.5,
        p.from.z + (tz - p.from.z) * k,
      );
      p.obj.rotation.y += dt * 8;
      if (k >= 1) {
        this.scene.remove(p.obj);
        this._collect(p.id);
        return false;
      }
      return true;
    });
  }

  _collect(id) {
    this.fx.pickupBurst(this.sx, this.sz, 1.4 + Math.sqrt(this.soldiers.length) * 0.35);
    this.audio?.play('powerup');
    this.hooks.haptic?.('medium');
    this.stats.weapons++;
    if (id === 'car') {
      if (this.car) this.car.hp = VEHICLE.hp;
      else {
        const obj = makeCar();
        obj.position.set(this.sx, 0, this.sz - 3);
        this.scene.add(obj);
        this.car = { obj, hp: VEHICLE.hp, cd: 0 };
      }
      this.hooks.onToast?.(VEHICLE.name + '!', VEHICLE.css);
      this.hooks.onWeapon?.('car');
    } else {
      const w = WEAPONS[id];
      this._equip(w);
      this.hooks.onToast?.(w.name + '!', w.css);
      this.hooks.onWeapon?.(id);
    }
  }

  _updateGates() {
    for (const g of this.gates) {
      if (!g.alive) continue;
      if (g.z > this.sz) {
        g.alive = false;
        const p = this.sx < 0 ? g.panels[0] : g.panels[1];
        const before = this.soldiers.length;
        let after = p.op === 'mul' ? before * p.val : before + p.val;
        after = clamp(Math.round(after), 0, MAX_SOLDIERS);
        if (after > before) {
          this._addSoldiers(after - before);
          this.stats.gatesGood++;
          this.audio?.play('gateGood');
        } else if (after < before) {
          this._killSoldiers(before - after);
          this.audio?.play('gateBad');
          this.hooks.haptic?.('heavy');
        }
        const good = p.op === 'mul' || p.val > 0;
        this.hooks.onToast?.(gateText(p.op, p.val), good ? '#5ad0ff' : '#ff5a5a');
        this.fx.gatePass(p.obj.position.x, 1.5, g.z, good);
        for (const q of g.panels) q.obj.visible = false;
      }
    }
  }

  // ---------------- rendering ----------------
  _render() {
    const cam = this.camera;
    const camZ = this.sz;
    // pull the camera back a little as the squad grows
    const grow = this.state === 'menu' ? 0 : Math.min(3.5, Math.sqrt(this.soldiers.length) * 0.35);
    this.camGrow = (this.camGrow || 0) + (grow - (this.camGrow || 0)) * 0.05;
    cam.position.set(this.camX, 12.5 + this.camGrow, camZ + 11.5 + this.camGrow * 0.8);
    cam.lookAt(this.camX, 0, camZ - 13);
    this.scenery.update(camZ);

    // characters
    const visLo = camZ - 100;
    const visHi = camZ + 14;
    const zs = this._zbuf || (this._zbuf = []);
    zs.length = 0;
    for (const z of this.zombies) {
      if (z.z > visLo && z.z < visHi) {
        if (z.flash > 0) {
          z._saved = z._saved || z.colors;
          z.colors = FLASH_COLORS;
        } else if (z._saved) {
          z.colors = z._saved;
          z._saved = null;
        }
        zs.push(z);
      }
    }
    this.zombieR.render(zs);
    const ss = this._sbuf || (this._sbuf = []);
    ss.length = 0;
    for (const s of this.soldiers) ss.push(s);
    for (const s of this.deadSoldiers) ss.push(s);
    this.soldierR.render(ss);

    this.fx.bullets.render(this.bullets);

    if (this.countSprite.visible) {
      const depth = Math.sqrt(this.soldiers.length) * 0.45;
      this.countSprite.position.set(this.sx, 3.0 + depth * 0.3, this.sz - depth * 0.5);
    }
    this.lighting.update(this.sx, this.sz);
    this.renderer.render(this.scene, cam);
  }
}

const FLASH_COLORS = [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff];

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
