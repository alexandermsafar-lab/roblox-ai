// In-app purchases.
// On iOS/Android this uses cordova-plugin-purchase (StoreKit / Google Play Billing).
// In a browser dev build it runs a clearly-labelled test purchase so you can try the flow.
// Products must be created in App Store Connect with exactly these IDs (all Consumable).
export const PRODUCTS = [
  { id: 'coins_10k', kind: 'coins', amount: 10000, price: '$0.99' },
  { id: 'coins_30k', kind: 'coins', amount: 30000, price: '$1.99', badge: '25%' },
  { id: 'coins_50k', kind: 'coins', amount: 50000, price: '$3.99' },
  { id: 'coins_100k', kind: 'coins', amount: 100000, price: '$4.99', badge: '30%' },
  { id: 'gems_100', kind: 'gems', amount: 100, price: '$0.99' },
  { id: 'gems_550', kind: 'gems', amount: 550, price: '$4.99', badge: '10%' },
  { id: 'gems_1200', kind: 'gems', amount: 1200, price: '$9.99', badge: '20%' },
  { id: 'gems_2500', kind: 'gems', amount: 2500, price: '$19.99', badge: '25%' },
];

const GRANTED_KEY = 'sbb_granted_tx';
let onGrant = () => {};
let nativeStore = null;

function grantedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(GRANTED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function markGranted(id) {
  const s = grantedSet();
  s.add(id);
  try {
    localStorage.setItem(GRANTED_KEY, JSON.stringify([...s].slice(-200)));
  } catch {
    /* ignore */
  }
}

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export async function initStore(grantFn) {
  onGrant = grantFn;
  if (!isNative()) return;
  // cordova plugins are ready after 'deviceready'
  await new Promise((res) => {
    if (window.CdvPurchase) res();
    else document.addEventListener('deviceready', res, { once: true });
  });
  const C = window.CdvPurchase;
  if (!C) return;
  const { store, ProductType, Platform } = C;
  const platform = window.Capacitor.getPlatform() === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;
  store.register(PRODUCTS.map((p) => ({ id: p.id, type: ProductType.CONSUMABLE, platform })));
  store.when().approved((tx) => {
    const txId = tx.transactionId;
    if (!grantedSet().has(txId)) {
      for (const p of tx.products) {
        const def = PRODUCTS.find((d) => d.id === p.id);
        if (def) onGrant(def);
      }
      markGranted(txId);
    }
    tx.finish();
  });
  await store.initialize([platform]);
  nativeStore = { store, platform };
}

export function priceOf(def) {
  if (nativeStore) {
    const p = nativeStore.store.get(def.id, nativeStore.platform);
    const price = p && p.pricing && p.pricing.price;
    if (price) return price;
  }
  return def.price;
}

// Resolves to 'ok' | 'cancelled' | 'unavailable'
export async function buy(def) {
  if (nativeStore) {
    const p = nativeStore.store.get(def.id, nativeStore.platform);
    const offer = p && p.getOffer();
    if (!offer) return 'unavailable';
    const err = await offer.order();
    return err ? 'cancelled' : 'ok'; // the grant happens in the approved() handler
  }
  if (import.meta.env.DEV || !isNative()) {
    // Browser / dev: simulated purchase, no money involved.
    onGrant(def);
    return 'test';
  }
  return 'unavailable';
}

export async function restore() {
  if (nativeStore) await nativeStore.store.restorePurchases();
}
