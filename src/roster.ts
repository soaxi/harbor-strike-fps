export type Roster = { allies: number; enemies: number };
export const DEFAULT_ROSTER: Roster = { allies: 4, enemies: 5 };
export function normalizeRoster(roster: Roster): Roster {
  const limit = (n: number, min: number, max: number, fallback: number) =>
    Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  return {
    allies: limit(roster.allies, 0, 49, 4),
    enemies: limit(roster.enemies, 1, 50, 5),
  };
}
// Five staggered rows stay inside the clear rear apron of the port.
export function spawnX(index: number, total: number) {
  const columns = Math.min(10, total);
  return ((index % columns) - (columns - 1) / 2) * 2.1;
}
export function spawnZ(index: number, team: number) {
  return (24 + Math.floor(index / 10) * 0.95) * (team === 0 ? 1 : -1);
}
