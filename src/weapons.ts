export const WEAPONS = [
  {
    name: 'AR-07 / 突擊步槍',
    short: '步槍',
    sound: 'rifle',
    mag: 30,
    reserve: 150,
    delay: 0.115,
    reload: 1.8,
    damage: 34,
    pellets: 1,
    spread: 0.013,
    range: 90,
    fov: 53,
    recoil: 0.009,
    auto: true,
  },
  {
    name: 'SR-08 / 狙擊步槍',
    short: '狙擊槍',
    sound: 'sniper',
    mag: 5,
    reserve: 25,
    delay: 1.35,
    reload: 2.8,
    damage: 110,
    pellets: 1,
    spread: 0.05,
    range: 120,
    fov: 20,
    recoil: 0.05,
    auto: false,
  },
  {
    name: 'SG-12 / 泵動散彈槍',
    short: '散彈槍',
    sound: 'shotgun',
    mag: 8,
    reserve: 40,
    delay: 0.85,
    reload: 2.5,
    damage: 22,
    pellets: 9,
    spread: 0.105,
    range: 35,
    fov: 62,
    recoil: 0.035,
    auto: false,
  },
  {
    name: 'HE / 破片手榴彈',
    short: '手榴彈',
    sound: 'throw',
    mag: 3,
    reserve: 0,
    delay: 1,
    reload: 0,
    damage: 150,
    pellets: 0,
    spread: 0,
    range: 9,
    fov: 76,
    recoil: 0,
    auto: false,
  },
] as const;
export function pelletDamage(slot: number, distance: number, head: boolean) {
  const w = WEAPONS[slot];
  const falloff = slot === 2 ? Math.max(0.12, 1 - distance / 35) : 1;
  return Math.round(w.damage * falloff * (head ? (slot === 1 ? 2 : 3) : 1));
}
export function blastDamage(distance: number, covered: boolean) {
  return distance >= 9
    ? 0
    : Math.round(150 * Math.max(0, 1 - distance / 9) * (covered ? 0.15 : 1));
}
export function loadMagazine(ammo: number, reserve: number, capacity: number) {
  const n = Math.max(0, Math.min(capacity - ammo, reserve));
  return { ammo: ammo + n, reserve: reserve - n };
}
