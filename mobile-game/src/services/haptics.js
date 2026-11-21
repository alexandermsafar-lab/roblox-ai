import { Haptics, ImpactStyle } from '@capacitor/haptics';

let enabled = true;
let last = 0;

export function setHaptics(on) {
  enabled = on;
}

export function haptic(kind = 'light') {
  if (!enabled) return;
  const now = performance.now();
  if (kind === 'light' && now - last < 80) return;
  last = now;
  const style = kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
  Haptics.impact({ style }).catch(() => {});
}
