// Persistent player profile (localStorage works inside the iOS/Android WebView).
const KEY = 'sbb_save_v1';

const DEFAULT = {
  name: 'Commander',
  coins: 1500,
  gems: 25,
  level: 1,
  xp: 0,
  rank: 1,
  score: 0,
  upgrades: { squad: 0, damage: 0, rate: 0, coin: 0 },
  weaponsFound: ['pistol'],
  stats: { kills: 0, barrels: 0, wins: 0, gatesGood: 0, weapons: 0 },
  settings: { sound: true, music: true, haptics: true },
  daily: { last: 0, streak: 0 },
  missions: { date: '', list: [] },
  tutorialDone: false,
};

function merge(base, data) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k in data) {
    if (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]) && base[k] && typeof base[k] === 'object') {
      out[k] = merge(base[k], data[k]);
    } else out[k] = data[k];
  }
  return out;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(DEFAULT, JSON.parse(raw));
  } catch (e) {
    /* storage unavailable */
  }
  return structuredClone(DEFAULT);
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    /* ignore */
  }
}

export function resetSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* ignore */
  }
  return structuredClone(DEFAULT);
}

// ---- Upgrades ----
export const UPGRADES = {
  squad: { name: 'Squad Size', desc: '+1 starting soldier', max: 9, base: 400, grow: 1.6 },
  damage: { name: 'Firepower', desc: '+12% bullet damage', max: 20, base: 300, grow: 1.42 },
  rate: { name: 'Fire Rate', desc: '+8% fire rate', max: 20, base: 300, grow: 1.42 },
  coin: { name: 'Coin Bonus', desc: '+10% level coins', max: 15, base: 500, grow: 1.5 },
};

export function upgradeCost(id, lvl) {
  const u = UPGRADES[id];
  return Math.round((u.base * Math.pow(u.grow, lvl)) / 10) * 10;
}

export function modsFromSave(save) {
  const u = save.upgrades;
  return {
    startSoldiers: 3 + u.squad,
    dmgMul: 1 + u.damage * 0.12,
    rateMul: 1 + u.rate * 0.08,
    coinMul: 1 + u.coin * 0.1,
  };
}

export function xpForLevel(l) {
  return 100 + (l - 1) * 60;
}
