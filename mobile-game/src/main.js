import '@fontsource/lilita-one';
import './styles.css';
import { Game } from './game/Game.js';
import { WEAPONS, WEAPON_ORDER, VEHICLE } from './game/weapons.js';
import { loadSave, writeSave, resetSave, UPGRADES, upgradeCost, modsFromSave, xpForLevel } from './services/save.js';
import { Audio } from './services/audio.js';
import { haptic, setHaptics } from './services/haptics.js';
import { PRODUCTS, initStore, buy, priceOf, restore, isNative } from './services/store.js';
import { mulberry32 } from './game/level.js';
import * as I from './ui/icons.js';

const $ = (s, r = document) => r.querySelector(s);
const fmt = (n) => Math.floor(n).toLocaleString('en-US').replace(/,/g, ' ');

let save = loadSave();
const audio = new Audio();
audio.setSound(save.settings.sound);
audio.music = save.settings.music;
setHaptics(save.settings.haptics);

const ui = {
  menu: $('#menu'),
  hud: $('#hud'),
  modals: $('#modals'),
  fx: $('#fx'),
};

let run = null; // current run info

const game = new Game($('#scene'), {
  audio,
  haptic,
  onHud: updateHud,
  onEnd: endRun,
  onToast: toast,
  onWeapon: (id) => {
    if (!save.weaponsFound.includes(id)) {
      save.weaponsFound.push(id);
      writeSave(save);
    }
  },
});

function persist() {
  writeSave(save);
}

// ------------------------------------------------------------------ audio unlock
window.addEventListener(
  'pointerdown',
  () => {
    audio.unlock();
    if (save.settings.music) audio.startMusic();
  },
  { once: true },
);
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .tab, .toggle, .nav-tile, .profile')) audio.play('click');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (game.state === 'play') openPause();
    audio.stopMusic();
  } else if (save.settings.music && audio.ctx) audio.startMusic();
});

// ------------------------------------------------------------------ daily missions
const MISSION_POOL = [
  { id: 'kills', text: 'Defeat {n} zombies', stat: 'kills', ns: [150, 300, 600], reward: { coins: 800 } },
  { id: 'barrels', text: 'Destroy {n} barrels', stat: 'barrels', ns: [6, 12, 20], reward: { gems: 5 } },
  { id: 'wins', text: 'Clear {n} levels', stat: 'wins', ns: [1, 2, 3], reward: { coins: 1200 } },
  { id: 'gates', text: 'Pass {n} blue gates', stat: 'gatesGood', ns: [5, 10, 15], reward: { coins: 600 } },
  { id: 'weapons', text: 'Grab {n} weapons', stat: 'weapons', ns: [4, 8, 12], reward: { gems: 4 } },
];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureMissions() {
  const t = today();
  if (save.missions.date === t && save.missions.list.length) return;
  const rng = mulberry32(t.split('-').reduce((a, b) => a * 31 + +b, 7));
  const pool = [...MISSION_POOL].sort(() => rng() - 0.5).slice(0, 3);
  save.missions = {
    date: t,
    list: pool.map((m) => {
      const tierIdx = Math.min(2, Math.floor(rng() * 3));
      return { id: m.id, n: m.ns[tierIdx], base: save.stats[m.stat] || 0, claimed: false, mult: tierIdx + 1 };
    }),
  };
  persist();
}

function missionInfo(m) {
  const def = MISSION_POOL.find((d) => d.id === m.id);
  const prog = Math.min(m.n, (save.stats[def.stat] || 0) - m.base);
  const reward = {};
  for (const k in def.reward) reward[k] = def.reward[k] * m.mult;
  return { def, prog, done: prog >= m.n, reward };
}

function claimableMissions() {
  ensureMissions();
  return save.missions.list.filter((m) => !m.claimed && missionInfo(m).done).length;
}

// ------------------------------------------------------------------ daily reward
const DAILY = [
  { coins: 500 }, { gems: 5 }, { coins: 1000 }, { gems: 10 }, { coins: 2000 }, { gems: 20 }, { coins: 5000, gems: 30 },
];
const HOUR = 3600 * 1000;
function dailyReady() {
  return Date.now() - save.daily.last >= 20 * HOUR;
}
function dailyIndex() {
  if (Date.now() - save.daily.last > 48 * HOUR) return 0;
  return save.daily.streak % 7;
}

// ------------------------------------------------------------------ currencies
function grant(r, fromEl) {
  if (r.coins) save.coins += r.coins;
  if (r.gems) save.gems += r.gems;
  persist();
  refreshCurrency();
  if (r.coins) flyIcons(I.coin(30), fromEl, '#coin-pill');
  if (r.gems) flyIcons(I.gem(30), fromEl, '#gem-pill');
  audio.play('coin');
}

function spend(kind, amount) {
  if (save[kind] < amount) {
    toast(kind === 'coins' ? 'Not enough coins' : 'Not enough gems', '#ff6a5a', 30);
    openShop(kind === 'coins' ? 'coins' : 'gems');
    return false;
  }
  save[kind] -= amount;
  persist();
  refreshCurrency();
  return true;
}

function refreshCurrency() {
  document.querySelectorAll('[data-coins]').forEach((e) => (e.textContent = fmt(save.coins)));
  document.querySelectorAll('[data-gems]').forEach((e) => (e.textContent = fmt(save.gems)));
}

function flyIcons(svg, fromEl, toSel) {
  const to = $(toSel);
  if (!to) return;
  const tr = to.getBoundingClientRect();
  const fr = fromEl ? fromEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  for (let i = 0; i < 8; i++) {
    const d = document.createElement('div');
    d.innerHTML = svg;
    d.style.cssText = `position:absolute;left:${fr.left + fr.width / 2 - 15}px;top:${fr.top + fr.height / 2 - 15}px;transition:transform .7s cubic-bezier(.5,-0.4,.7,1) ${i * 0.04}s, opacity .2s ${0.65 + i * 0.04}s;z-index:50;pointer-events:none`;
    ui.fx.appendChild(d);
    const dx = tr.left + 4 - (fr.left + fr.width / 2 - 15);
    const dy = tr.top + 4 - (fr.top + fr.height / 2 - 15);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        d.style.transform = `translate(${dx + (Math.random() - 0.5) * 30}px, ${dy}px) scale(.8)`;
        d.style.opacity = '0';
      }),
    );
    setTimeout(() => d.remove(), 1200);
  }
}

// ------------------------------------------------------------------ top bar (shared)
function topBarHTML(withGear = true) {
  return `
  <div class="topbar">
    ${withGear ? `<button class="btn blue icon gear" data-act="settings" aria-label="Settings">${I.gear(32)}</button>` : ''}
    <div class="pill" id="gem-pill">${I.gem(42)}<span class="val" data-gems>${fmt(save.gems)}</span>
      <button class="btn add" data-act="shop-gems" aria-label="Buy gems">${I.plus(24)}</button></div>
    <div class="pill" id="coin-pill">${I.coin(42)}<span class="val" data-coins>${fmt(save.coins)}</span>
      <button class="btn add" data-act="shop-coins" aria-label="Buy coins">${I.plus(24)}</button></div>
  </div>`;
}

// ------------------------------------------------------------------ main menu
function showMenu() {
  ui.hud.classList.add('hidden');
  ui.menu.classList.remove('hidden');
  game.showMenu(save.level);
  renderMenu();
}

function renderMenu() {
  const need = xpForLevel(save.rank);
  const xpPct = Math.min(100, (save.xp / need) * 100);
  const missionsDot = claimableMissions() > 0;
  const rewardReady = dailyReady();
  ui.menu.innerHTML = `
    ${topBarHTML()}
    <div class="menu-row2">
      <div class="profile" data-act="profile">
        <span class="pname">${escapeHtml(save.name)}</span>
        ${I.avatar(72)}
        <span class="lvl">${I.star(38, save.rank)}</span>
        <div class="xpbar"><i style="width:${xpPct}%"></i></div>
      </div>
      <button class="btn pink reward-btn ${rewardReady ? 'ready' : ''}" data-act="daily">
        ${I.gift(58)}<span>REWARD</span>${rewardReady ? '<span class="badge"></span>' : ''}
      </button>
    </div>
    <div class="logo">
      <div class="l1">SKY BRIDGE</div>
      <div class="l2">BLITZ</div>
      <div class="tag">LEVEL ${save.level}</div>
    </div>
    <div class="menu-buttons">
      <button class="btn" data-act="new">NEW GAME</button>
      <button class="btn blue" data-act="continue">CONTINUE<span class="sub">LEVEL ${save.level}</span></button>
    </div>
    <div class="bottom-nav">
      <button class="btn orange nav-tile" data-act="shop">${I.shop()}<span>SHOP</span></button>
      <button class="btn orange nav-tile" data-act="missions">${I.missions()}<span>MISSIONS</span>${missionsDot ? '<span class="dot"></span>' : ''}</button>
      <button class="btn orange nav-tile" data-act="ranking">${I.ranking()}<span>RANKING</span></button>
      <button class="btn orange nav-tile" data-act="inventory">${I.inventory()}<span>INVENTORY</span></button>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// global click delegation for data-act
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const actions = {
    settings: openSettings,
    'shop-gems': () => openShop('gems'),
    'shop-coins': () => openShop('coins'),
    shop: () => openShop('coins'),
    missions: openMissions,
    ranking: openRanking,
    inventory: () => openInventory('upgrades'),
    daily: openDaily,
    profile: openProfile,
    continue: () => startRun(save.level),
    new: confirmNewGame,
    pause: openPause,
  };
  if (actions[act]) actions[act](el);
});

// ------------------------------------------------------------------ modal helper
function openModal({ title, color = '', body = '', footer = '', tabs = '', closable = true, bodyClass = '', onClose }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `
    <div class="modal ${color}">
      ${closable ? `<button class="btn red close" aria-label="Close"><span class="outlined-sm">X</span></button>` : ''}
      <h2>${title}</h2>
      <div class="body ${bodyClass}">${body}</div>
      ${tabs}
      ${footer ? `<div class="footer">${footer}</div>` : ''}
    </div>`;
  ui.modals.appendChild(wrap);
  const close = () => {
    wrap.remove();
    onClose && onClose();
  };
  if (closable) {
    $('.close', wrap).onclick = close;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.target === wrap) close();
    });
  }
  wrap.close = close;
  return wrap;
}

function closeAllModals() {
  ui.modals.innerHTML = '';
}

// ------------------------------------------------------------------ shop
function openShop(tab = 'coins') {
  const coinPacks = PRODUCTS.filter((p) => p.kind === 'coins');
  const gemPacks = PRODUCTS.filter((p) => p.kind === 'gems');
  const list = tab === 'coins' ? coinPacks : gemPacks;
  const icon = tab === 'coins' ? I.coin : I.gem;
  const body = list
    .map((p, i) => {
      const stack = Array.from({ length: i + 1 }, () => icon(40)).join('');
      return `
      <div class="row">
        <div class="thumb"><div class="stack">${stack}</div>${fmt(p.amount)}</div>
        ${p.badge ? `<div class="burst ${i % 2 ? 'red' : ''}">${p.badge}<br>OFF</div>` : ''}
        <div class="grow"></div>
        <button class="btn small" data-buy="${p.id}">BUY ${priceOf(p)}</button>
      </div>`;
    })
    .join('');
  const tabs = `
    <div class="tabs">
      <button class="tab ${tab === 'coins' ? 'active' : ''}" data-tab="coins">${I.coin(30)}COINS</button>
      <button class="tab ${tab === 'gems' ? 'active' : ''}" data-tab="gems">${I.gem(30)}DIAMONDS</button>
      <button class="tab" data-tab="exchange">${I.inventory(30)}UPGRADES</button>
    </div>`;
  closeAllModals();
  const m = openModal({
    title: tab === 'coins' ? 'COINS SHOP' : 'DIAMOND SHOP',
    body: body + `<div class="note">${isNative() ? 'Payment is charged to your Apple ID.' : 'Web preview: purchases are test-only and free.'}</div>`,
    tabs,
  });
  m.querySelectorAll('[data-tab]').forEach((t) => {
    t.onclick = () => (t.dataset.tab === 'exchange' ? openInventory('upgrades') : openShop(t.dataset.tab));
  });
  m.querySelectorAll('[data-buy]').forEach((b) => {
    b.onclick = async () => {
      const def = PRODUCTS.find((p) => p.id === b.dataset.buy);
      b.disabled = true;
      const res = await buy(def);
      b.disabled = false;
      if (res === 'test') toast('TEST PURCHASE', '#ffd23a', 30);
      if (res === 'unavailable') toast('Store unavailable', '#ff6a5a', 30);
      lastBuyEl = b;
    };
  });
}

let lastBuyEl = null;
initStore((def) => {
  grant({ [def.kind]: def.amount }, lastBuyEl);
}).catch(() => {});

// ------------------------------------------------------------------ inventory / upgrades
function openInventory(tab = 'upgrades') {
  let body = '';
  if (tab === 'upgrades') {
    body = Object.entries(UPGRADES)
      .map(([id, u]) => {
        const lvl = save.upgrades[id];
        const maxed = lvl >= u.max;
        const cost = upgradeCost(id, lvl);
        const pips = Array.from({ length: u.max }, (_, i) => `<b class="${i < lvl ? 'on' : ''}"></b>`).join('');
        const ic = { squad: I.soldier(40), damage: I.bullet(40), rate: I.bolt(40), coin: I.coin(40) }[id];
        return `
        <div class="row">
          <div class="thumb" style="width:60px">${ic}</div>
          <div class="grow">
            <div class="title">${u.name} <span style="opacity:.6">Lv ${lvl}</span></div>
            <div class="desc">${u.desc}</div>
            <div class="pips">${pips}</div>
          </div>
          <button class="btn small ${maxed ? 'grey' : ''}" data-up="${id}" ${maxed ? 'disabled' : ''}>
            ${maxed ? 'MAX' : `<span style="display:inline-flex;align-items:center;gap:3px">${I.coin(20)}${fmt(cost)}</span>`}
          </button>
        </div>`;
      })
      .join('');
  } else {
    const all = [...WEAPON_ORDER, 'car'];
    body =
      `<div class="weapons-grid">` +
      all
        .map((id) => {
          const w = id === 'car' ? VEHICLE : WEAPONS[id];
          const found = save.weaponsFound.includes(id);
          return `<div class="wcard ${found ? '' : 'locked'}">
            <div class="sw" style="background:${found ? w.css : '#9aa6bd'}">${found ? '' : I.lock(20)}</div>
            ${found ? w.name : '???'}
          </div>`;
        })
        .join('') +
      `</div><div class="note">Destroy barrels in a level to grab the weapon on top. Found weapons are logged here.</div>`;
  }
  const tabs = `
    <div class="tabs">
      <button class="tab ${tab === 'upgrades' ? 'active' : ''}" data-tab="upgrades">${I.star(28)}UPGRADES</button>
      <button class="tab ${tab === 'arsenal' ? 'active' : ''}" data-tab="arsenal">${I.inventory(28)}ARSENAL</button>
    </div>`;
  closeAllModals();
  const m = openModal({ title: 'INVENTORY', color: 'green', body, tabs });
  m.querySelectorAll('[data-tab]').forEach((t) => (t.onclick = () => openInventory(t.dataset.tab)));
  m.querySelectorAll('[data-up]').forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.up;
      const cost = upgradeCost(id, save.upgrades[id]);
      if (!spend('coins', cost)) return;
      save.upgrades[id]++;
      persist();
      audio.play('powerup');
      haptic('medium');
      openInventory('upgrades');
    };
  });
}

// ------------------------------------------------------------------ missions
function openMissions() {
  ensureMissions();
  const body = save.missions.list
    .map((m, i) => {
      const { def, prog, done, reward } = missionInfo(m);
      const rew = reward.coins ? `${I.coin(22)}${fmt(reward.coins)}` : `${I.gem(22)}${reward.gems}`;
      return `
      <div class="row">
        <div class="grow">
          <div class="title">${def.text.replace('{n}', m.n)}</div>
          <div class="bar"><i style="width:${(prog / m.n) * 100}%"></i></div>
          <div class="desc">${prog} / ${m.n}</div>
        </div>
        <button class="btn small ${m.claimed ? 'grey' : done ? '' : 'blue'}" data-claim="${i}" ${m.claimed || !done ? 'disabled' : ''}>
          <span style="display:inline-flex;align-items:center;gap:3px">${m.claimed ? 'DONE' : rew}</span>
        </button>
      </div>`;
    })
    .join('');
  closeAllModals();
  const m = openModal({ title: 'MISSIONS', color: 'blue', body: body + `<div class="note">New missions every day.</div>` });
  m.querySelectorAll('[data-claim]').forEach((b) => {
    b.onclick = () => {
      const mm = save.missions.list[+b.dataset.claim];
      const info = missionInfo(mm);
      if (!info.done || mm.claimed) return;
      mm.claimed = true;
      grant(info.reward, b);
      openMissions();
      renderMenuIfOpen();
    };
  });
}

// ------------------------------------------------------------------ ranking
const BOT_NAMES = [
  'IronVex', 'Kira_77', 'NovaStorm', 'GrimFox', 'BlazeRunner', 'Tundra', 'ZedSlayer', 'Pixelbolt', 'Marrow', 'CaptainRook',
  'Sable', 'Quill', 'Hexa', 'Moxie', 'Vantage', 'Rift', 'Cobalt', 'Juno', 'Brask', 'Echo9', 'Talon', 'Wren', 'Frostbyte',
  'Onyx', 'Gale', 'Marlo', 'Riven', 'Pike', 'Sundae',
];
function openRanking() {
  const week = Math.floor(Date.now() / (7 * 24 * HOUR));
  const rng = mulberry32(week);
  const ref = Math.max(4000, save.score * 1.2);
  const bots = BOT_NAMES.map((n) => ({ name: n, score: Math.round(ref * (0.15 + rng() * 1.6) + rng() * 2000) }));
  const all = [...bots, { name: save.name, score: save.score, me: true }].sort((a, b) => b.score - a.score);
  const medal = (i) =>
    i < 3
      ? `<span class="medal" style="background:${['#ffc23a', '#c9d6e6', '#e08a4a'][i]}">${i + 1}</span>`
      : `<span>${i + 1}</span>`;
  const body = all
    .map(
      (r, i) => `<div class="rank-row ${r.me ? 'me' : ''}" ${r.me ? 'id="me-row"' : ''}>
        <span class="pos">${medal(i)}</span><span class="nm">${escapeHtml(r.name)}</span>
        <span style="display:inline-flex;align-items:center;gap:4px">${I.star(22)}${fmt(r.score)}</span></div>`,
    )
    .join('');
  closeAllModals();
  const m = openModal({
    title: 'RANKING',
    body: body + `<div class="note">Weekly league against AI commanders. Score = levels cleared + zombies defeated.</div>`,
    bodyClass: 'ranking',
  });
  const me = $('#me-row', m);
  if (me) me.scrollIntoView({ block: 'center' });
}

// ------------------------------------------------------------------ daily reward
function openDaily() {
  const idx = dailyIndex();
  const ready = dailyReady();
  const cells = DAILY.map((r, i) => {
    const cls = i < idx ? 'done' : i === idx && ready ? 'today' : '';
    const ic = r.gems && r.coins ? I.gift(36) : r.coins ? I.coin(34) : I.gem(34);
    const amt = r.gems && r.coins ? 'MEGA' : r.coins ? (r.coins >= 1000 ? `${r.coins / 1000}K` : r.coins) : r.gems;
    return `<div class="day ${cls} ${i === 6 ? 'big' : ''}"><span>DAY ${i + 1}</span>${ic}<span>${amt}</span></div>`;
  }).join('');
  let timer = '';
  if (!ready) {
    const left = 20 * HOUR - (Date.now() - save.daily.last);
    const h = Math.floor(left / HOUR);
    const mm = Math.floor((left % HOUR) / 60000);
    timer = `Next reward in ${h}h ${mm}m`;
  }
  closeAllModals();
  const m = openModal({
    title: 'DAILY REWARD',
    color: 'red',
    body: `<div class="daily-grid">${cells}</div>${timer ? `<div class="note" style="font-size:15px">${timer}</div>` : ''}`,
    footer: `<button class="btn" id="claim-daily" ${ready ? '' : 'disabled'}>CLAIM</button>`,
  });
  const b = $('#claim-daily', m);
  b.onclick = () => {
    const i = dailyIndex();
    save.daily.streak = i + 1;
    save.daily.last = Date.now();
    grant(DAILY[i], b);
    openDaily();
    renderMenuIfOpen();
  };
}

// ------------------------------------------------------------------ settings / profile
function openSettings() {
  const row = (k, label) => `<div class="toggle-row"><span>${label}</span><div class="toggle ${save.settings[k] ? 'on' : ''}" data-set="${k}"></div></div>`;
  closeAllModals();
  const m = openModal({
    title: 'SETTINGS',
    color: 'blue',
    bodyClass: 'plain',
    body:
      row('sound', 'Sound FX') +
      row('music', 'Music') +
      row('haptics', 'Vibration') +
      `<div class="footer" style="flex-direction:column;align-items:stretch">
        <button class="btn small blue" id="restore">RESTORE PURCHASES</button>
        <button class="btn small red" id="reset">RESET PROGRESS</button>
      </div>
      <div class="note">Sky Bridge Blitz v1.0.0</div>`,
  });
  m.querySelectorAll('[data-set]').forEach((t) => {
    t.onclick = () => {
      const k = t.dataset.set;
      save.settings[k] = !save.settings[k];
      t.classList.toggle('on', save.settings[k]);
      persist();
      audio.setSound(save.settings.sound);
      audio.setMusic(save.settings.music);
      if (save.settings.music) {
        audio.unlock();
        audio.startMusic();
      }
      setHaptics(save.settings.haptics);
    };
  });
  $('#restore', m).onclick = async () => {
    await restore();
    toast('Purchases restored', '#5ad0ff', 30);
  };
  $('#reset', m).onclick = () => {
    closeAllModals();
    openModal({
      title: 'RESET?',
      color: 'red',
      bodyClass: 'plain',
      body: `<div class="result-big" style="font-size:18px">All progress, coins and upgrades will be erased. This can't be undone.</div>`,
      footer: `<button class="btn grey small" id="no">CANCEL</button><button class="btn red small" id="yes">RESET</button>`,
    });
    $('#no').onclick = openSettings;
    $('#yes').onclick = () => {
      save = resetSave();
      persist();
      closeAllModals();
      showMenu();
    };
  };
}

function openProfile() {
  closeAllModals();
  const m = openModal({
    title: 'PROFILE',
    color: 'blue',
    bodyClass: 'plain',
    body: `
      <div style="font-size:16px;margin-bottom:6px">Commander name</div>
      <input class="name-input" maxlength="14" value="${escapeHtml(save.name)}">
      <div class="statline">
        <div>${I.skull(30)}<span>${fmt(save.stats.kills)}</span></div>
        <div>${I.star(30)}<span>${fmt(save.stats.wins)}</span></div>
        <div>${I.inventory(30)}<span>${save.weaponsFound.length}/8</span></div>
      </div>`,
    footer: `<button class="btn" id="save-name">SAVE</button>`,
  });
  $('#save-name', m).onclick = () => {
    const v = $('.name-input', m).value.trim().slice(0, 14);
    if (v) save.name = v;
    persist();
    closeAllModals();
    renderMenuIfOpen();
  };
}

function confirmNewGame() {
  if (save.level === 1) return startRun(1);
  openModal({
    title: 'NEW GAME',
    color: 'green',
    bodyClass: 'plain',
    body: `<div class="result-big" style="font-size:18px">Start again from Level 1?<br><br>Your coins, gems and upgrades are kept.</div>`,
    footer: `<button class="btn grey small" id="ng-no">CANCEL</button><button class="btn small" id="ng-yes">START</button>`,
  });
  $('#ng-no').onclick = closeAllModals;
  $('#ng-yes').onclick = () => {
    save.level = 1;
    persist();
    closeAllModals();
    startRun(1);
  };
}

function renderMenuIfOpen() {
  if (!ui.menu.classList.contains('hidden')) renderMenu();
}

// ------------------------------------------------------------------ gameplay
function startRun(level) {
  closeAllModals();
  audio.unlock();
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  run = { level, revived: false, doubled: false };
  ui.hud.innerHTML = `
    <div class="hud-top">
      <button class="btn blue icon pause" data-act="pause" aria-label="Pause">${I.pause(28)}</button>
      <div class="progress"><i id="hud-prog" style="width:0%"></i><span>LEVEL ${level}</span></div>
      <div class="pill" style="padding:0 12px 0 36px;height:38px">${I.coin(36)}<span id="hud-coins">0</span></div>
    </div>
    <div class="hud-chips">
      <div class="chip">${I.soldier(26)}<span id="hud-count">1</span></div>
      <div class="chip"><span class="wdot" id="hud-wdot"></span><span id="hud-weapon">Pistol</span></div>
    </div>
    ${level <= 2 || !save.tutorialDone ? `<div class="hint outlined" id="hint"><span class="hand">👆</span>SWIPE TO MOVE</div>` : ''}`;
  hudCache = {};
  game.start(level, modsFromSave(save));
  const hint = $('#hint');
  if (hint) {
    const hide = () => {
      hint.remove();
      save.tutorialDone = true;
      persist();
    };
    setTimeout(hide, 4500);
    $('#scene').addEventListener('pointerdown', () => setTimeout(hide, 900), { once: true });
  }
}

let hudCache = {};
function updateHud(h) {
  if (hudCache.p !== Math.round(h.progress * 200)) {
    hudCache.p = Math.round(h.progress * 200);
    const e = $('#hud-prog');
    if (e) e.style.width = `${h.progress * 100}%`;
  }
  if (hudCache.c !== h.count) {
    hudCache.c = h.count;
    const e = $('#hud-count');
    if (e) e.textContent = h.count;
  }
  if (hudCache.coins !== h.coins) {
    hudCache.coins = h.coins;
    const e = $('#hud-coins');
    if (e) e.textContent = fmt(h.coins);
  }
  if (hudCache.w !== h.weapon.id) {
    hudCache.w = h.weapon.id;
    const e = $('#hud-weapon');
    if (e) e.textContent = h.weapon.name;
    const d = $('#hud-wdot');
    if (d) d.style.background = h.weapon.css;
  }
}

function toast(text, color = '#fff', size = 48) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.fontSize = `${size}px`;
  t.innerHTML = `<span class="outlined" style="color:${color}">${escapeHtml(text)}</span>`;
  ui.fx.appendChild(t);
  setTimeout(() => t.remove(), 1150);
}

function openPause() {
  if (game.state !== 'play') return;
  game.pause();
  closeAllModals();
  openModal({
    title: 'PAUSED',
    color: 'blue',
    bodyClass: 'plain',
    closable: false,
    body: row3(),
    footer: `<button class="btn grey small" id="p-home">HOME</button><button class="btn orange small" id="p-restart">RESTART</button><button class="btn small" id="p-resume">RESUME</button>`,
  });
  $('#p-resume').onclick = () => {
    closeAllModals();
    game.resume();
  };
  $('#p-restart').onclick = () => startRun(run.level);
  $('#p-home').onclick = () => {
    closeAllModals();
    game.quit();
    showMenu();
  };
  function row3() {
    return ['sound', 'music', 'haptics']
      .map((k) => `<div class="toggle-row"><span>${{ sound: 'Sound FX', music: 'Music', haptics: 'Vibration' }[k]}</span><div class="toggle ${save.settings[k] ? 'on' : ''}" data-pset="${k}"></div></div>`)
      .join('');
  }
  document.querySelectorAll('[data-pset]').forEach((t) => {
    t.onclick = () => {
      const k = t.dataset.pset;
      save.settings[k] = !save.settings[k];
      t.classList.toggle('on', save.settings[k]);
      persist();
      audio.setSound(save.settings.sound);
      audio.setMusic(save.settings.music);
      if (save.settings.music) audio.startMusic();
      setHaptics(save.settings.haptics);
    };
  });
}

function applyRunStats(stats) {
  save.stats.kills += stats.kills;
  save.stats.barrels += stats.barrels;
  save.stats.gatesGood += stats.gatesGood;
  save.stats.weapons += stats.weapons;
  save.score += stats.kills;
  // XP / rank
  save.xp += Math.round(stats.kills / 2) + stats.barrels * 5;
}

function levelUpCheck() {
  let ups = 0;
  while (save.xp >= xpForLevel(save.rank)) {
    save.xp -= xpForLevel(save.rank);
    save.rank++;
    save.gems += 5;
    ups++;
  }
  if (ups) setTimeout(() => toast(`RANK UP! +${5 * ups}`, '#ff8ef0', 40), 600);
}

function endRun(res) {
  const mods = modsFromSave(save);
  if (res.win) {
    const base = 150 + run.level * 45;
    const coins = Math.round((base + res.stats.coins + res.survivors * 6) * mods.coinMul);
    const stars = res.survivors >= 15 ? 3 : res.survivors >= 5 ? 2 : 1;
    applyRunStats(res.stats);
    save.stats.wins++;
    save.score += run.level * 100;
    save.xp += 40 + run.level * 5;
    save.level = run.level + 1;
    save.coins += coins;
    levelUpCheck();
    persist();
    confetti();
    showWin(coins, stars, res);
  } else {
    showLose(res);
  }
}

function showWin(coins, stars, res) {
  const starHtml = [1, 2, 3].map((i) => `<span class="${i <= stars ? '' : 'off'}">${I.star(i === 2 ? 64 : 50)}</span>`).join('');
  closeAllModals();
  const m = openModal({
    title: 'VICTORY!',
    color: 'green',
    closable: false,
    body: `
      <div class="stars">${starHtml}</div>
      <div class="result-big"><span class="amount" id="win-amt">${I.coin(48)}<span>${fmt(coins)}</span></span></div>
      <div class="statline">
        <div>${I.skull(28)}<span>${fmt(res.stats.kills)}</span></div>
        <div>${I.soldier(28)}<span>${res.survivors}</span></div>
        <div>${I.inventory(28)}<span>${res.stats.weapons}</span></div>
      </div>`,
    footer: `<button class="btn pink small" id="w-double">${I.gem(22)} 10 = x2</button><button class="btn" id="w-next">NEXT</button>`,
  });
  $('#w-double', m).onclick = (e) => {
    if (!spend('gems', 10)) return;
    save.coins += coins;
    persist();
    refreshCurrency();
    $('#win-amt span', m).textContent = fmt(coins * 2);
    flyIcons(I.coin(30), e.currentTarget, '#win-amt');
    audio.play('coin');
    e.currentTarget.disabled = true;
  };
  $('#w-next', m).onclick = () => startRun(save.level);
  const home = document.createElement('button');
  home.className = 'btn grey small';
  home.textContent = 'HOME';
  home.onclick = () => {
    closeAllModals();
    game.quit();
    showMenu();
  };
  $('.footer', m).prepend(home);
}

function showLose(res) {
  closeAllModals();
  const cost = 15;
  const m = openModal({
    title: 'SQUAD DOWN!',
    color: 'red',
    closable: false,
    body: `
      <div class="result-big">You made it <b>${Math.round(res.progress * 100)}%</b> of the way.</div>
      <div class="statline">
        <div>${I.skull(28)}<span>${fmt(res.stats.kills)}</span></div>
        <div>${I.coin(28)}<span>${fmt(res.stats.coins)}</span></div>
      </div>
      <div class="note">Tip: upgrade your squad in INVENTORY and aim for the blue gates.</div>`,
    footer: `
      ${run.revived ? '' : `<button class="btn pink" id="l-revive" style="width:100%">REVIVE ${I.gem(24).replace('class="ico"', 'class="ico" style="display:inline;vertical-align:-5px"')} ${cost}</button>`}
      <button class="btn grey small" id="l-home">HOME</button>
      <button class="btn orange small" id="l-retry">RETRY</button>`,
  });
  const bankCoins = () => {
    applyRunStats(res.stats);
    save.coins += res.stats.coins;
    levelUpCheck();
    persist();
  };
  const rv = $('#l-revive', m);
  if (rv)
    rv.onclick = () => {
      if (!spend('gems', cost)) return;
      run.revived = true;
      closeAllModals();
      game.revive();
    };
  $('#l-retry', m).onclick = () => {
    bankCoins();
    startRun(run.level);
  };
  $('#l-home', m).onclick = () => {
    bankCoins();
    closeAllModals();
    game.quit();
    showMenu();
  };
}

function confetti() {
  const colors = ['#ff4d6d', '#ffd23a', '#4dd2ff', '#6dff6a', '#c35bff', '#ff9a3c'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    ui.fx.appendChild(c);
    setTimeout(() => c.remove(), 4200);
  }
}

// ------------------------------------------------------------------ native shell
async function nativeSetup() {
  if (!isNative()) return;
  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {
    /* plugin missing */
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* plugin missing */
  }
}

// ------------------------------------------------------------------ boot
ensureMissions();
// Make sure the game font is ready before drawing canvas labels (barrel HP, gates)
Promise.race([
  document.fonts ? document.fonts.load("40px 'Lilita One'") : Promise.resolve(),
  new Promise((r) => setTimeout(r, 2500)),
]).finally(showMenu);
nativeSetup();
window.__game = game; // handy for debugging
