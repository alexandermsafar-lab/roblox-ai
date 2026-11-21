// World / chapter definitions: 10 worlds × 20 levels = 200 hand-tuned levels.
// After level 200 the worlds repeat with higher difficulty (endless mode).
export const LEVELS_PER_WORLD = 20;

export const WORLDS = [
  { name: 'Sky Bridge', theme: 'sky' },
  { name: 'Desert Canyon', theme: 'desert' },
  { name: 'Ruined City', theme: 'city' },
  { name: 'Volcano Pass', theme: 'volcano' },
  { name: 'Frozen Peaks', theme: 'sky' },
  { name: 'Dust Storm', theme: 'desert' },
  { name: 'Dead Metro', theme: 'city' },
  { name: 'Magma Core', theme: 'volcano' },
  { name: 'Storm Spire', theme: 'sky' },
  { name: 'Last Stand', theme: 'city' },
];

export const TOTAL_LEVELS = WORLDS.length * LEVELS_PER_WORLD;

export function worldOf(level) {
  const index = Math.floor((level - 1) / LEVELS_PER_WORLD) % WORLDS.length;
  return { index, ...WORLDS[index], first: index * LEVELS_PER_WORLD + 1 };
}

export const BOSS_EVERY = 5;
export function isBossLevel(level) {
  return level % BOSS_EVERY === 0;
}

export const BOSSES = {
  brute: { name: 'BRUTE', color: 0xd06a5a },
  tank: { name: 'IRON TANK', color: 0x7a8696 },
  queen: { name: 'HIVE QUEEN', color: 0x9a5ab0 },
};
const BOSS_CYCLE = ['brute', 'tank', 'queen'];

export function bossTypeFor(level) {
  return BOSS_CYCLE[Math.floor(level / BOSS_EVERY - 1) % BOSS_CYCLE.length];
}
