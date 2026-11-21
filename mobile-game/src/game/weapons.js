// Weapon definitions. Every barrel carries one of these as its reward.
// dmg = damage per bullet, rate = shots per second per soldier.
export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'Pistol', tier: 0, color: 0xffd23a, css: '#ffd23a',
    dmg: 1, rate: 2.6, speed: 36, range: 30, size: 0.14, len: 0.55, pierce: 0, splash: 0, gunScale: 0.8,
  },
  smg: {
    id: 'smg', name: 'SMG', tier: 1, color: 0x4dff6a, css: '#4dff6a',
    dmg: 1, rate: 5.5, speed: 40, range: 30, size: 0.13, len: 0.6, pierce: 0, splash: 0, gunScale: 1,
  },
  rifle: {
    id: 'rifle', name: 'Assault Rifle', tier: 2, color: 0xfff04d, css: '#fff04d',
    dmg: 2.2, rate: 4.4, speed: 44, range: 32, size: 0.14, len: 0.8, pierce: 0, splash: 0, gunScale: 1.15,
  },
  gatling: {
    id: 'gatling', name: 'Gatling', tier: 3, color: 0xc35bff, css: '#c35bff',
    dmg: 1.7, rate: 10, speed: 46, range: 32, size: 0.15, len: 0.7, pierce: 0, splash: 0, gunScale: 1.35,
  },
  sniper: {
    id: 'sniper', name: 'Sniper', tier: 4, color: 0xff8a2b, css: '#ff8a2b',
    dmg: 10, rate: 1.7, speed: 70, range: 36, size: 0.12, len: 1.6, pierce: 4, splash: 0, gunScale: 1.5,
  },
  plasma: {
    id: 'plasma', name: 'Plasma Blaster', tier: 5, color: 0xff5be0, css: '#ff5be0',
    dmg: 3.4, rate: 7.5, speed: 42, range: 32, size: 0.22, len: 0.9, pierce: 1, splash: 0, gunScale: 1.35,
  },
  cannon: {
    id: 'cannon', name: 'Field Cannon', tier: 6, color: 0x63ff3d, css: '#63ff3d',
    dmg: 8, rate: 1.9, speed: 30, range: 32, size: 0.42, len: 0.42, pierce: 0, splash: 2.0, gunScale: 1.6,
  },
};

export const WEAPON_ORDER = ['pistol', 'smg', 'rifle', 'gatling', 'sniper', 'plasma', 'cannon'];

// A vehicle reward: an armored car joins the squad and fires its own turret.
export const VEHICLE = {
  id: 'car', name: 'Armored Car', color: 0xff9a3c, css: '#ff9a3c',
  dmg: 3, rate: 9, speed: 46, range: 34, size: 0.2, len: 0.8, hp: 25,
};
