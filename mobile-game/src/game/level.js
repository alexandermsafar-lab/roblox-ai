import { BRIDGE_W } from './models.js';
import { WEAPON_ORDER } from './weapons.js';

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

// Builds a level layout: barrels with weapon rewards, +/×/− gate pairs,
// zombie packs in between and a huge horde right before the finish line.
export function generateLevel(level) {
  const rng = mulberry32(level * 7919 + 13);
  const L = Math.min(170 + level * 12, 340);
  const d = Math.min(level - 1, 30); // difficulty step
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

  while (z > -(L - 52)) {
    const kind = pattern % 3 === 1 ? 'gate' : 'barrel';
    pattern++;
    if (kind === 'barrel') {
      const two = rng() < 0.35 + d * 0.02;
      const lanes = [...LANES].sort(() => rng() - 0.5).slice(0, two ? 2 : 1);
      for (const x of lanes) {
        let reward;
        if (level >= 2 && rng() < 0.14) reward = 'car';
        else {
          tier = Math.min(maxTier, tier + 1);
          reward = WEAPON_ORDER[tier];
        }
        const hp = barrelIdx === 0
          ? 6 + d * 3 // first barrel is a quick weapon upgrade
          : Math.round((8 + d * 6) * (1 + barrelIdx * 0.4) * (0.85 + rng() * 0.3));
        barrels.push({ x, z: z - (two ? rng() * 6 : 0), hp, reward });
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

  // Final horde
  const hordeCount = Math.min(25 + level * 20, 480);
  for (let i = 0; i < hordeCount; i++) {
    zombies.push({
      x: (rng() - 0.5) * (BRIDGE_W - 1.2),
      z: -(L - 46) - rng() * 42,
      hp: zHp * (0.9 + rng() * 0.5),
      speed: 1.2 + rng() * 0.8,
      horde: true,
    });
  }
  return { length: L, barrels, gates, zombies, zHp };
}
