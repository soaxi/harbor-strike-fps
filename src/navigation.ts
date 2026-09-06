export type Obstacle = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
};
export function navigation(bounds: Obstacle[]) {
  const size = 57,
    low = -28,
    walk = new Uint8Array(size * size),
    cache = new Map<number, Int32Array>();
  const free = (x: number, z: number) =>
    Math.abs(x) < 27.15 &&
    Math.abs(z) < 29.15 &&
    !bounds.some(
      (b) =>
        x > b.min.x - 0.4 &&
        x < b.max.x + 0.4 &&
        z > b.min.z - 0.4 &&
        z < b.max.z + 0.4,
    );
  const cell = (x: number, z: number) =>
    Math.max(0, Math.min(size - 1, Math.round(z - low))) * size +
    Math.max(0, Math.min(size - 1, Math.round(x - low)));
  for (let i = 0; i < walk.length; i++)
    walk[i] = free((i % size) + low, Math.floor(i / size) + low) ? 1 : 0;
  function nearest(x: number, z: number) {
    let id = cell(x, z);
    if (walk[id]) return id;
    for (let d = 1; d <= 4; d++)
      for (let a = -d; a <= d; a++)
        for (let b = -d; b <= d; b++) {
          const q = cell(x + a, z + b);
          if (walk[q]) return q;
        }
    return id;
  }
  return {
    free,
    clear: () => cache.clear(),
    next(x: number, z: number, tx: number, tz: number) {
      const end = nearest(tx, tz);
      let prev = cache.get(end);
      if (!prev) {
        prev = new Int32Array(walk.length).fill(-1);
        const queue = new Int32Array(walk.length);
        queue[0] = end;
        prev[end] = end;
        let count = 1;
        for (let q = 0; q < count; q++) {
          const n = queue[q];
          for (const m of [n - 1, n + 1, n - size, n + size]) {
            if (
              m < 0 ||
              m >= walk.length ||
              !walk[m] ||
              prev[m] !== -1 ||
              Math.abs((m % size) - (n % size)) > 1
            )
              continue;
            prev[m] = n;
            queue[count++] = m;
          }
        }
        if (cache.size >= 64) cache.clear();
        cache.set(end, prev);
      }
      const current = nearest(x, z),
        next = prev[current];
      return next < 0
        ? null
        : { x: (next % size) + low, z: Math.floor(next / size) + low };
    },
  };
}
