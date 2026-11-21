import { BRIDGE_W } from './models.js';
import { WEAPON_ORDER } from './weapons.js';
import { worldOf, isBossLevel, bossTypeFor, BOSSES } from './worlds.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LANES = [-3.6, 0, 3.6];

// Difficulty grows linearly for the first 30 levels, then more gently so the
// 200-level campaign stays beatable with upgrades.
export function difficulty(level) {
  return level <= 30 ? level - 1 : 29 + (level - 30) * 0.55;
}

/**
 * Level layout:
 *  - barrels: { x, z, hp, reward, count } reward = weapon id | 'car' | 'squad' (count captives stand on top)
 *  - gates:   { z, left: {op,val}, right: {op,val} }
 *  - zombies: { x, z, hp, speed, horde?, brute? }  (brutes = fat mini-bosses with HP bars)
 *  - boss:    { type, name, hp } on every 5th level (fight in an arena at the end)
 */
export function generateLevel(level) {
  const rng = mulberry32(level * 7919 + 13);
  const world = worldOf(level);
  const bossLevel = isBossLevel(level);
  const d = difficulty(level);
  const L = Math.round(Math.min(170 + d * 10, 330));
  const barrels = [];
  const gates = [];
  const zombies = [];

  const zHp = 1 + d * 0.24;
  const maxTier = Math.min(WEAPON_ORDER.length - 1, 3 + Math.floor(d / 2));
  let tier = 0;
  let barrelIdx = 0;

  let z = -24;
  let pattern = 1; // open with a gate so the squad can grow right away
  let first = true;
  const pushZombies = (zc, count, spread = 5) => {
    for (let i = 0; i < count; i++) {
      zombies.push({
        x: (rng() - 0.5) * (BRIDGE_W - 1.4),
        z: zc - rng() * spread,
        hp: zHp * (0.8 + rng() * 0.4),
        speed: 1.3 + rng() * 0.9,
      });
    }
  };

  const endOfObstacles = -(L - 52);
  while (z > endOfObstacles) {
    const kind = pattern % 3 === 1 ? 'gate' : 'barrel';
    pattern++;
    if (kind === 'barrel') {
      const two = rng() < 0.35 + d * 0.02;
      const lanes = [...LANES].sort(() => rng() - 0.5).slice(0, two ? 2 : 1);
      for (const x of lanes) {
        let reward;
        let count = 0;
        const r = rng();
        if (barrelIdx > 0 && r < 0.2) {
          reward = 'squad';
          count = 1 + Math.floor(rng() * Math.min(5, 2 + d * 0.1));
        } else if (level >= 2 && r < 0.32) reward = 'car';
        else {
          tier = Math.min(maxTier, tier + 1);
          reward = WEAPON_ORDER[tier];
        }
        let hp =
          barrelIdx === 0
            ? 6 + d * 3 // first barrel is a quick weapon upgrade
            : Math.round((8 + d * 6) * (1 + barrelIdx * 0.4) * (0.85 + rng() * 0.3));
        if (reward === 'squad') hp = Math.round(hp * 0.6);
        barrels.push({ x, z: z - (two ? rng() * 6 : 0), hp, reward, count });
        barrelIdx++;
      }
      pushZombies(z + 6, 1 + Math.floor(d * 0.6 + rng() * (2 + d * 0.15)), 8);
    } else {
      const neg = -(1 + Math.floor(rng() * (2 + d * 0.4)));
      const pos = 1 + Math.floor(rng() * (3 + d * 0.3));
      const mul = rng() < 0.85 ? 2 : 3;
      const options = [
        [{ op: 'add', val: neg }, { op: 'mul', val: mul }],
        [{ op: 'add', val: neg }, { op: 'add', val: pos }],
        [{ op: 'add', val: pos }, { op: 'mul', val: mul }],
        [{ op: 'add', val: neg }, { op: 'add', val: Math.max(1, pos - 1) }],
      ];
      let pair = options[Math.floor(rng() * options.length)];
      const wasFirst = first;
      if (first) pair = [{ op: 'add', val: 1 + Math.floor(rng() * 2) }, { op: 'mul', val: 2 }];
      first = false;
      if (rng() < 0.5) pair = [pair[1], pair[0]];
      gates.push({ z, left: pair[0], right: pair[1] });
      if (!wasFirst) pushZombies(z + 7, 1 + Math.floor(d * 0.7 + rng() * 2), 6);
    }
    z -= 15 + rng() * 5;
  }

  // Brutes: fat mini-bosses with HP bars, walking down the level
  if (level >= 3) {
    const n = Math.min(4, 1 + Math.floor(d / 8));
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 1);
      zombies.push({
        x: (rng() - 0.5) * (BRIDGE_W - 4),
        z: -40 - f * (L - 100),
        hp: Math.round(35 + d * 26),
        speed: 0.9 + rng() * 0.3,
        brute: true,
      });
    }
  }

  let boss = null;
  if (bossLevel) {
    // Boss levels: a smaller horde, then the boss arena at the end of the bridge
    const type = bossTypeFor(level);
    boss = { type, name: BOSSES[type].name, hp: Math.round(900 + d * 330 + d * d * 3) };
    const n = Math.min(12 + Math.round(d * 6), 160);
    for (let i = 0; i < n; i++) {
      zombies.push({
        x: (rng() - 0.5) * (BRIDGE_W - 1.2),
        z: -(L - 46) - rng() * 30,
        hp: zHp * (0.9 + rng() * 0.5),
        speed: 1.2 + rng() * 0.8,
        horde: true,
      });
    }
  } else {
    const hordeCount = Math.min(25 + Math.round(d * 20), 480);
    for (let i = 0; i < hordeCount; i++) {
      zombies.push({
        x: (rng() - 0.5) * (BRIDGE_W - 1.2),
        z: -(L - 46) - rng() * 42,
        hp: zHp * (0.9 + rng() * 0.5),
        speed: 1.2 + rng() * 0.8,
        horde: true,
      });
    }
  }
  return { length: L, theme: world.theme, world, barrels, gates, zombies, boss, zHp };
}
