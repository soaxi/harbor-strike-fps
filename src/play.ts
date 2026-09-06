import * as T from 'three';
import {
  DEFAULT_ROSTER,
  normalizeRoster,
  spawnX,
  spawnZ,
  type Roster,
} from './roster';
import { WEAPONS, pelletDamage, blastDamage, loadMagazine } from './weapons';
import { navigation } from './navigation';
import { BattleAudio } from './audio';
export type HUD = {
  hp: number;
  ammo: number;
  reserve: number;
  time: number;
  blue: number;
  red: number;
  score: number[];
  round: number;
  kills: number;
  mode: string;
  message: string;
  feed: string[];
  reload: boolean;
  weapon: number;
  aiming: boolean;
  audioStatus: string;
  fps: number;
};
type Actor = {
  p: T.Vector3;
  hp: number;
  team: number;
  name: string;
  mesh: T.Group;
  cool: number;
  path: T.Vector3[];
  think: number;
  slot: number;
  target?: Actor;
  seen: boolean;
  weapon: number;
};
export function startGame(host: HTMLDivElement, update: (h: HUD) => void) {
  const s = new T.Scene();
  s.background = new T.Color('#93adb8');
  s.fog = new T.Fog('#93adb8', 38, 100);
  const c = new T.PerspectiveCamera(76, innerWidth / innerHeight, 0.06, 180);
  c.rotation.order = 'YXZ';
  const r = new T.WebGLRenderer({ antialias: true });
  r.setSize(innerWidth, innerHeight);
  r.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  r.shadowMap.enabled = true;
  r.shadowMap.type = T.PCFShadowMap;
  r.outputColorSpace = T.SRGBColorSpace;
  host.appendChild(r.domElement);
  s.add(new T.HemisphereLight(0xcfe7f2, 0x55523d, 2.4));
  const sun = new T.DirectionalLight(0xffe5b2, 3.1);
  sun.position.set(-20, 34, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -36,
    right: 36,
    top: 36,
    bottom: -36,
    far: 100,
  });
  sun.shadow.bias = -0.0003;
  s.add(sun);
  const solids: T.Mesh[] = [],
    bounds: T.Box3[] = [];
  const mat = (color: T.ColorRepresentation) =>
    new T.MeshStandardMaterial({ color, roughness: 0.8 });
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: T.ColorRepresentation,
    solid = false,
    parent: T.Object3D = s,
  ) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    if (solid) {
      solids.push(m);
      m.updateMatrixWorld();
      bounds.push(new T.Box3().setFromObject(m));
    }
    return m;
  }
  box(0, -0.25, 0, 56, 0.5, 60, 0x667476);
  box(0, 2, -30, 56, 4, 1, 0x777b73, true);
  box(0, 2, 30, 56, 4, 1, 0x777b73, true);
  box(-28, 2, 0, 1, 4, 60, 0x777b73, true);
  box(28, 2, 0, 1, 4, 60, 0x777b73, true);
  function container(x: number, z: number, w: number, d: number, col: number) {
    box(x, 1.75, z, w, 3.5, d, col, true);
    box(x, 3.55, z, w + 0.12, 0.15, d + 0.12, 0xb7b5a4);
    for (let a = -w / 2 + 0.3; a < w / 2; a += 0.55) {
      box(x + a, 1.8, z + d / 2 + 0.025, 0.07, 3.25, 0.06, col);
      box(x + a, 1.8, z - d / 2 - 0.025, 0.07, 3.25, 0.06, col);
    }
    for (const q of [-1, 1])
      box(x + q * (w / 2 - 0.1), 1.75, z, 0.12, 3.5, d + 0.08, 0x9da59d);
  }
  container(-13, -12, 12, 5, 0x346574);
  container(12, 12, 12, 5, 0xa6613f);
  container(-13, 12, 6, 10, 0x697760);
  container(13, -12, 6, 10, 0x446b73);
  container(-5, 0, 5, 10, 0xa67d47);
  container(7, 0, 5, 7, 0x345b68);
  for (const [x, z] of [
    [-21, 1],
    [20, 3],
    [-5, 20],
    [6, -21],
    [-17, -22],
    [17, 22],
  ]) {
    box(x, 0.65, z, 2.5, 1.3, 2.5, 0x9d9071, true);
    box(x, 0.65, z, 2.6, 0.13, 2.6, 0x565849);
  }
  for (let z = -26; z < 28; z += 4) {
    box(-23, 0.007, z, 0.1, 0.01, 2, 0xd6bb6c);
    box(23, 0.007, z, 0.1, 0.01, 2, 0xd6bb6c);
  }
  for (const z of [-24, 24]) box(0, 0.008, z, 12, 0.01, 0.12, 0xd7c680);
  for (let i = 0; i < 12; i++) {
    const x = -42 + i * 8;
    box(x, 4 + (i % 3), -39, 6, 8 + (i % 3) * 2, 10, 0x687b83);
  }
  for (const x of [-24, 24]) {
    box(x, 7, -27, 0.3, 14, 0.3, 0x38494d);
    box(x, 13.8, -25, 1, 0.3, 4, 0x394649);
    const l = new T.PointLight(0xffe8b0, 22, 14);
    l.position.set(x, 13, -24);
    s.add(l);
  }
  // Port crane silhouettes beyond the playable walls.
  for (const x of [-35, 36]) {
    box(x, 12, 9, 0.8, 24, 0.8, 0x9e7044);
    box(x, 24, 0, 0.8, 0.9, 32, 0x9e7044);
    box(x, 17, -13, 0.1, 13, 0.1, 0x343f42);
  }
  const gun = new T.Group();
  c.add(gun);
  s.add(c);
  const gunModels: T.Group[] = [];
  for (let slot = 0; slot < 4; slot++) {
    const g = new T.Group();
    gun.add(g);
    gunModels.push(g);
    if (slot === 3) {
      const grenade = new T.Mesh(
        new T.SphereGeometry(0.105, 10, 8),
        mat(0x65734b),
      );
      grenade.position.set(0.24, -0.28, -0.42);
      g.add(grenade);
      box(0.24, -0.16, -0.42, 0.04, 0.12, 0.04, 0x2b3539, false, g);
      box(0.28, -0.19, -0.42, 0.03, 0.16, 0.06, 0x808b81, false, g);
    } else {
      const len = slot === 1 ? 0.95 : slot === 2 ? 0.72 : 0.55;
      box(
        0.22,
        -0.22,
        -0.44,
        0.15,
        0.16,
        len,
        slot === 1 ? 0x536653 : 0x27343b,
        false,
        g,
      );
      box(0.22, -0.18, -0.55 - len / 2, 0.055, 0.055, 0.5, 0x131c23, false, g);
      box(0.22, -0.36, -0.4, 0.095, 0.25, 0.14, 0x1b242b, false, g);
      if (slot === 1) {
        box(0.22, -0.06, -0.53, 0.105, 0.1, 0.35, 0x15262b, false, g);
        box(0.22, -0.01, -0.39, 0.11, 0.1, 0.05, 0x5291a0, false, g);
      } else if (slot === 2) {
        box(0.22, -0.28, -0.72, 0.17, 0.1, 0.3, 0x8c6741, false, g);
        box(0.22, -0.24, -1, 0.055, 0.055, 0.3, 0x111b1d, false, g);
      } else box(0.22, -0.105, -0.44, 0.05, 0.04, 0.22, 0x121a20, false, g);
    }
    box(0.3, -0.37, -0.15, 0.14, 0.15, 0.44, 0x54635d, false, g);
    g.traverse((o) => {
      o.castShadow = false;
      o.frustumCulled = false;
    });
    g.visible = slot === 0;
  }
  const flash = new T.PointLight(0xffc766, 0, 4);
  flash.position.set(0.22, -0.18, -1.05);
  gun.add(flash);
  // Twelve instanced batches render up to 100 soldiers without hundreds of draw calls.
  const parts = [
    [0, 1.05, 0, 0.62, 0.75, 0.38],
    [0, 1.64, 0, 0.4, 0.4, 0.4],
    [0, 1.63, -0.22, 0.32, 0.13, 0.03],
    [-0.2, 0.35, 0, 0.22, 0.7, 0.25],
    [0.2, 0.35, 0, 0.22, 0.7, 0.25],
    [0.37, 1.12, -0.3, 0.12, 0.13, 0.65],
  ];
  const batches: T.InstancedMesh[][] = [];
  for (let team = 0; team < 2; team++) {
    batches[team] = parts.map((part, i) => {
      const color =
        i === 0
          ? team === 0
            ? 0x498eae
            : 0xd28558
          : i === 2
            ? team === 0
              ? 0x9addeb
              : 0xffb870
            : 0x344147;
      const m = new T.InstancedMesh(
        new T.BoxGeometry(part[3], part[4], part[5]),
        mat(color),
        50,
      );
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.frustumCulled = false;
      m.castShadow = false;
      s.add(m);
      return m;
    });
  }
  const dummy = new T.Object3D(),
    local = new T.Matrix4();
  function renderActors() {
    for (let team = 0; team < 2; team++)
      for (let i = 0; i < parts.length; i++) {
        const batch = batches[team][i],
          part = parts[i];
        local.makeTranslation(part[0], part[1], part[2]);
        for (let slot = 0; slot < 50; slot++) {
          const a = teams[team][slot];
          if (a && a.hp > 0 && a !== player) {
            dummy.position.copy(a.p);
            dummy.rotation.y = a.mesh.rotation.y;
            dummy.scale.setScalar(1);
          } else {
            dummy.position.set(0, -100, 0);
            dummy.scale.setScalar(0);
          }
          dummy.updateMatrix();
          batch.setMatrixAt(slot, dummy.matrix.clone().multiply(local));
        }
        batch.instanceMatrix.needsUpdate = true;
      }
  }
  let roster = { ...DEFAULT_ROSTER };
  const actors: Actor[] = [];
  const teams: Actor[][] = [[], []];
  let player: Actor;
  let h: HUD = {
    hp: 100,
    ammo: 30,
    reserve: 120,
    time: 120,
    blue: 5,
    red: 5,
    score: [0, 0],
    round: 1,
    kills: 0,
    mode: 'menu',
    message: '',
    feed: [],
    reload: false,
    weapon: 0,
    aiming: false,
    audioStatus: '音效載入中',
    fps: 60,
  };
  let yaw = 0,
    pitch = 0,
    vy = 0,
    jump = 0,
    fire = false,
    aim = false,
    reloadTime = 0,
    shot = 0,
    now = 0,
    raf = 0,
    last = performance.now(),
    hudTimer = 0;
  const keys = new Set<string>();
  const audio = new BattleAudio();
  let ammo: number[] = WEAPONS.map((w) => w.mag),
    reserve: number[] = WEAPONS.map((w) => w.reserve),
    ready = [0, 0, 0, 0],
    weapon = 0,
    aiAccumulator = 0,
    frameAverage = 1 / 60,
    previousFrameTime = performance.now();
  const grenades: { mesh: T.Mesh; v: T.Vector3; fuse: number; owner: Actor }[] =
    [];
  const blasts: { mesh: T.Mesh; life: number }[] = [];
  const ray = new T.Raycaster(),
    effects: { obj: T.Line; life: number }[] = [];
  function actor(team: number, i: number, isPlayer = false) {
    const g = new T.Group();
    const a: Actor = {
      p: new T.Vector3(
        spawnX(i, team === 0 ? roster.allies + 1 : roster.enemies),
        0,
        spawnZ(i, team),
      ),
      hp: 100,
      team,
      name: isPlayer
        ? '你'
        : (team === 0 ? '先鋒 ' : '敵方 ') + String(i + 1).padStart(2, '0'),
      mesh: g,
      cool: 1 + Math.random(),
      path: [],
      think: Math.random() * 0.25,
      slot: i,
      seen: false,
      weapon: i % 8 === 0 ? 1 : i % 5 === 0 ? 2 : 0,
    };
    actors.push(a);
    teams[team].push(a);
    return a;
  }
  function reset() {
    actors.length = 0;
    teams[0].length = 0;
    teams[1].length = 0;
    const playerSlot = Math.floor(Math.min(roster.allies + 1, 10) / 2);
    for (let i = 0; i <= roster.allies; i++) {
      const a = actor(0, i, i === playerSlot);
      if (i === playerSlot) player = a;
    }
    for (let i = 0; i < roster.enemies; i++) actor(1, i);
    h.blue = roster.allies + 1;
    h.red = roster.enemies;
    h.hp = 100;
    h.time = 120;
    h.reload = false;
    h.feed = [];
    h.message = '';
    reloadTime = 0;
    yaw = 0;
    pitch = 0;
    shot = 0;
    jump = 0;
    vy = 0;
    ammo = WEAPONS.map((w) => w.mag);
    reserve = WEAPONS.map((w) => w.reserve);
    ready = [0, 0, 0, 0];
    weapon = 0;
    aiAccumulator = 0;
    fire = false;
    aim = false;
    nav.clear();
    for (const item of [...grenades, ...blasts]) {
      s.remove(item.mesh);
      item.mesh.geometry.dispose();
      (item.mesh.material as T.Material).dispose();
    }
    grenades.length = 0;
    blasts.length = 0;
    syncWeapon();
    r.setPixelRatio(
      Math.min(devicePixelRatio, actors.length > 50 ? 1.25 : 1.7),
    );
    renderActors();
  }
  function syncWeapon() {
    h.weapon = weapon;
    h.ammo = ammo[weapon];
    h.reserve = reserve[weapon];
    gunModels.forEach((m, i) => (m.visible = i === weapon));
  }
  function selectWeapon(slot: number) {
    if (player.hp <= 0 || slot === weapon) return;
    weapon = slot;
    h.reload = false;
    reloadTime = 0;
    fire = false;
    aim = false;
    shot = Math.max(shot, 0.2);
    syncWeapon();
  }
  function free(x: number, z: number) {
    return !bounds.some(
      (b) =>
        x > b.min.x - 0.4 &&
        x < b.max.x + 0.4 &&
        z > b.min.z - 0.4 &&
        z < b.max.z + 0.4,
    );
  }
  function move(a: Actor, x: number, z: number) {
    if (free(a.p.x + x, a.p.z)) a.p.x += x;
    if (free(a.p.x, a.p.z + z)) a.p.z += z;
  }
  const sightRay = new T.Ray(),
    sightHit = new T.Vector3();
  function visible(a: T.Vector3, b: T.Vector3) {
    const distance = a.distanceTo(b);
    sightRay.set(a, b.clone().sub(a).normalize());
    return !bounds.some(
      (box) =>
        sightRay.intersectBox(box, sightHit) &&
        a.distanceTo(sightHit) < distance,
    );
  }
  const nav = navigation(bounds);
  function damage(a: Actor, n: number, from: Actor) {
    if (a.hp <= 0) return;
    a.hp = Math.max(0, a.hp - n);
    if (a === player) {
      h.hp = a.hp;
    }
    if (!a.hp) {
      a.mesh.visible = false;
      h.feed = [`${from.name}  ▸  ${a.name}`, ...h.feed].slice(0, 4);
      if (from === player) h.kills++;
    }
  }
  function tracer(a: T.Vector3, b: T.Vector3, col: number) {
    if (effects.length > 70) return;
    const o = new T.Line(
      new T.BufferGeometry().setFromPoints([a, b]),
      new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 }),
    );
    s.add(o);
    effects.push({ obj: o, life: 0.07 });
  }
  function reload() {
    const w = WEAPONS[weapon];
    if (
      weapon === 3 ||
      h.reload ||
      ammo[weapon] === w.mag ||
      !reserve[weapon] ||
      player.hp <= 0
    )
      return;
    h.reload = true;
    reloadTime = w.reload;
    audio.play('reload', undefined, undefined, 0, 0.5);
  }
  const actorBox = new T.Box3(),
    hitPoint = new T.Vector3();
  function fireRay(origin: T.Vector3, direction: T.Vector3, range: number) {
    ray.set(origin, direction);
    ray.far = range;
    let distance = range,
      point = origin.clone().addScaledVector(direction, range),
      victim: Actor | undefined;
    for (const b of bounds) {
      if (ray.ray.intersectBox(b, hitPoint)) {
        const d = origin.distanceTo(hitPoint);
        if (d < distance) {
          distance = d;
          point.copy(hitPoint);
        }
      }
    }
    for (const a of actors) {
      if (a === player || a.hp <= 0) continue;
      actorBox.min.set(a.p.x - 0.35, 0.1, a.p.z - 0.3);
      actorBox.max.set(a.p.x + 0.35, 1.86, a.p.z + 0.3);
      if (ray.ray.intersectBox(actorBox, hitPoint)) {
        const d = origin.distanceTo(hitPoint);
        if (d < distance) {
          distance = d;
          point.copy(hitPoint);
          victim = a;
        }
      }
    }
    return { point, distance, victim };
  }
  function shoot() {
    if (h.reload || shot > 0 || now < ready[weapon] || player.hp <= 0) return;
    const w = WEAPONS[weapon];
    if (!ammo[weapon]) {
      fire = false;
      reload();
      return;
    }
    ammo[weapon]--;
    syncWeapon();
    ready[weapon] = now + w.delay;
    shot = 0.1;
    if (!w.auto) fire = false;
    if (weapon === 3) {
      const direction = c.getWorldDirection(new T.Vector3());
      const mesh = new T.Mesh(new T.SphereGeometry(0.12, 8, 6), mat(0x627442));
      mesh.position.copy(c.position);
      s.add(mesh);
      grenades.push({
        mesh,
        v: direction.multiplyScalar(14).add(new T.Vector3(0, 4, 0)),
        fuse: 2.2,
        owner: player,
      });
      return;
    }
    audio.play(w.sound);
    flash.intensity = 5;
    const origin = c.position.clone();
    for (let pellet = 0; pellet < w.pellets; pellet++) {
      const spread = weapon === 1 && aim ? 0.0006 : w.spread * (aim ? 0.65 : 1);
      const direction = new T.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        -1,
      )
        .normalize()
        .applyQuaternion(c.quaternion);
      const hit = fireRay(origin, direction, w.range);
      if (hit.victim && hit.victim.team !== player.team)
        damage(
          hit.victim,
          pelletDamage(weapon, hit.distance, hit.point.y > 1.43),
          player,
        );
      tracer(
        origin
          .clone()
          .add(new T.Vector3(0.15, -0.18, 0).applyQuaternion(c.quaternion)),
        hit.point,
        0xffe2a0,
      );
    }
    pitch = Math.min(1.35, pitch + w.recoil);
  }
  function explode(point: T.Vector3, owner: Actor) {
    audio.play('explosion', point, c.position, yaw, 1.8);
    for (const a of actors) {
      if (a.hp <= 0 || (a.team === owner.team && a !== owner)) continue;
      const target = a.p.clone().add(new T.Vector3(0, 0.9, 0));
      damage(
        a,
        blastDamage(point.distanceTo(target), !visible(point, target)),
        owner,
      );
    }
    const mesh = new T.Mesh(
      new T.SphereGeometry(1, 12, 8),
      new T.MeshBasicMaterial({
        color: 0xffbd67,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    mesh.position.copy(point);
    s.add(mesh);
    blasts.push({ mesh, life: 0.65 });
  }
  function updateGrenades(dt: number) {
    for (let i = grenades.length - 1; i >= 0; i--) {
      const g = grenades[i];
      const steps = Math.max(1, Math.ceil(dt / 0.008)),
        step = dt / steps;
      for (let n = 0; n < steps; n++) {
        g.v.y -= 12 * step;
        for (const axis of ['x', 'y', 'z'] as const) {
          const old = g.mesh.position[axis];
          g.mesh.position[axis] += g.v[axis] * step;
          const p = g.mesh.position;
          if (
            p.y < 0.13 ||
            bounds.some(
              (b) =>
                p.x > b.min.x - 0.13 &&
                p.x < b.max.x + 0.13 &&
                p.y > b.min.y - 0.13 &&
                p.y < b.max.y + 0.13 &&
                p.z > b.min.z - 0.13 &&
                p.z < b.max.z + 0.13,
            )
          ) {
            g.mesh.position[axis] = old;
            g.v[axis] *= -0.42;
            g.v.multiplyScalar(0.88);
          }
        }
      }
      g.mesh.rotation.x += dt * 5;
      g.fuse -= dt;
      if (g.fuse <= 0) {
        explode(g.mesh.position.clone(), g.owner);
        s.remove(g.mesh);
        g.mesh.geometry.dispose();
        (g.mesh.material as T.Material).dispose();
        grenades.splice(i, 1);
      }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.life -= dt;
      b.mesh.scale.setScalar(1 + (1 - b.life / 0.65) * 7);
      (b.mesh.material as T.MeshBasicMaterial).opacity =
        Math.max(0, b.life / 0.65) * 0.65;
      if (b.life <= 0) {
        s.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as T.Material).dispose();
        blasts.splice(i, 1);
      }
    }
  }
  function updateAI(dt: number) {
    for (const a of actors) {
      if (a === player || a.hp <= 0) continue;
      a.cool -= dt;
      a.think -= dt;
      if (a.think <= 0 || !a.target || a.target.hp <= 0) {
        let closest: Actor | undefined,
          best = Infinity;
        for (const b of teams[1 - a.team]) {
          if (b.hp <= 0) continue;
          const d = a.p.distanceToSquared(b.p);
          if (d < best) {
            best = d;
            closest = b;
          }
        }
        a.target = closest;
        a.think = 0.22 + Math.random() * 0.15;
        const target = closest?.p
          .clone()
          .add(new T.Vector3(0, closest === player ? 1.3 + jump : 1.3, 0));
        a.seen =
          !!target &&
          best < 1600 &&
          visible(a.p.clone().add(new T.Vector3(0, 1.5, 0)), target);
      }
      const enemy = a.target;
      if (!enemy || enemy.hp <= 0) continue;
      const dist = a.p.distanceTo(enemy.p);
      a.mesh.rotation.y = Math.atan2(a.p.x - enemy.p.x, a.p.z - enemy.p.z);
      const w = WEAPONS[a.weapon];
      if (a.seen && a.cool <= 0 && dist < w.range) {
        a.cool = Math.max(w.delay, 0.5) + Math.random() * 0.55;
        const eye = a.p.clone().add(new T.Vector3(0, 1.5, 0)),
          target = enemy.p
            .clone()
            .add(new T.Vector3(0, enemy === player ? 1.3 + jump : 1.3, 0));
        if (visible(eye, target)) {
          tracer(eye, target, a.team === 0 ? 0x9fe3ff : 0xffbb77);
          audio.play(w.sound, eye, c.position, yaw, 0.48);
          if (
            Math.random() <
            (a.team === 0 ? 0.36 : 0.25) * Math.max(0.35, 1 - dist / 60)
          )
            damage(
              enemy,
              a.weapon === 1
                ? 48
                : a.weapon === 2
                  ? Math.max(8, 40 - dist)
                  : 16,
              a,
            );
        }
      }
      if (!a.seen || dist > (a.weapon === 2 ? 8 : 15)) {
        const next = nav.next(a.p.x, a.p.z, enemy.p.x, enemy.p.z);
        if (next) {
          const dx = next.x - a.p.x,
            dz = next.z - a.p.z,
            len = Math.hypot(dx, dz);
          if (len > 0.05) {
            const step = Math.min(len, dt * 3);
            move(a, (dx / len) * step, (dz / len) * step);
          }
        }
      } else
        move(
          a,
          Math.cos(now + a.slot) * dt * 0.5,
          Math.sin(now + a.slot) * dt * 0.5,
        );
      // Nearby soldiers gently separate; bounded local work prevents a single pile-up.
      for (const b of teams[a.team]) {
        if (a === b || b.hp <= 0) continue;
        const dx = a.p.x - b.p.x,
          dz = a.p.z - b.p.z,
          d = dx * dx + dz * dz;
        if (d > 0 && d < 0.55) {
          const k = (dt * 0.5) / Math.sqrt(d);
          move(a, dx * k, dz * k);
        }
      }
    }
  }
  function end() {
    h.blue = actors.filter((a) => a.team === 0 && a.hp > 0).length;
    h.red = actors.filter((a) => a.team === 1 && a.hp > 0).length;
    if (h.blue && h.red && h.time > 0) return;
    const hp = (t: number) =>
      actors.filter((a) => a.team === t).reduce((n, a) => n + a.hp, 0);
    let win =
      h.blue === h.red
        ? hp(0) === hp(1)
          ? -1
          : hp(0) > hp(1)
            ? 0
            : 1
        : h.blue > h.red
          ? 0
          : 1;
    if (win >= 0) h.score[win]++;
    h.mode = h.score.some((v) => v >= 5) ? 'match' : 'round';
    h.message =
      win === -1 ? '回合平手' : win === 0 ? '先鋒小隊勝利' : '敵方小隊勝利';
    if (h.mode === 'match')
      h.message = h.score[0] >= 5 ? '任務完成' : '任務失敗';
    document.exitPointerLock();
    keys.clear();
    fire = false;
  }
  function tick() {
    const t = performance.now(),
      dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    now += dt;
    frameAverage =
      frameAverage * 0.95 +
      Math.max(0.001, (t - previousFrameTime) / 1000) * 0.05;
    previousFrameTime = t;
    if (h.mode === 'playing') {
      h.time = Math.max(0, h.time - dt);
      shot -= dt;
      flash.intensity *= 0.55;
      if (h.reload) {
        reloadTime -= dt;
        if (reloadTime <= 0) {
          const loaded = loadMagazine(
            ammo[weapon],
            reserve[weapon],
            WEAPONS[weapon].mag,
          );
          ammo[weapon] = loaded.ammo;
          reserve[weapon] = loaded.reserve;
          syncWeapon();
          h.reload = false;
        }
      }
      if (player.hp > 0) {
        const speed = keys.has('ShiftLeft') ? 6.7 : 4.5;
        let x = Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
          z = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
        const len = Math.hypot(x, z) || 1;
        x = (x / len) * speed * dt;
        z = (z / len) * speed * dt;
        move(
          player,
          x * Math.cos(yaw) - z * Math.sin(yaw),
          -x * Math.sin(yaw) - z * Math.cos(yaw),
        );
        if (keys.has('Space') && jump === 0) vy = 5;
        vy -= 14 * dt;
        jump = Math.max(0, jump + vy * dt);
        if (jump === 0) vy = 0;
        c.position.set(player.p.x, 1.65 + jump, player.p.z);
        c.rotation.set(pitch, yaw, 0);
        if (fire) shoot();
        gun.visible = true;
        gun.position.y = h.reload
          ? -0.3 + Math.sin(now * 8) * 0.07
          : Math.sin(now * 9) * 0.008 * (x || z ? 1 : 0);
        gun.rotation.z = h.reload ? -0.35 : 0;
        gun.position.z = shot > 0 ? shot * 0.3 : 0;
        c.fov = T.MathUtils.lerp(c.fov, aim ? WEAPONS[weapon].fov : 76, 0.2);
        c.updateProjectionMatrix();
      } else {
        gun.visible = false;
        const ally = actors.find(
          (a) => a !== player && a.team === 0 && a.hp > 0,
        );
        if (ally) {
          c.position.copy(ally.p).add(new T.Vector3(0, 6, 6));
          c.lookAt(ally.p.clone().add(new T.Vector3(0, 1, 0)));
        }
      }
      aiAccumulator += dt;
      if (aiAccumulator >= 0.05) {
        const step = aiAccumulator;
        aiAccumulator = 0;
        updateAI(step);
      }
      updateGrenades(dt);
      renderActors();
      end();
    } else if (h.mode === 'menu') {
      c.position.set(22, 17, 26);
      c.lookAt(-2, 0, -3);
      gun.visible = false;
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life -= dt;
      if (e.life <= 0) {
        s.remove(e.obj);
        e.obj.geometry.dispose();
        (e.obj.material as T.Material).dispose();
        effects.splice(i, 1);
      }
    }
    hudTimer += dt;
    if (hudTimer > 0.08) {
      h.aiming = aim && player.hp > 0;
      h.audioStatus = audio.status;
      h.fps = Math.round(1 / frameAverage);
      update({ ...h, score: [...h.score], feed: [...h.feed] });
      hudTimer = 0;
    }
    r.render(s, c);
    raf = requestAnimationFrame(tick);
  }
  function lock() {
    if (document.pointerLockElement === r.domElement) {
      h.mode = 'playing';
      h.message = '';
    } else if (h.mode === 'playing') {
      h.mode = 'paused';
      keys.clear();
      fire = false;
      aim = false;
      audio.pause();
    }
  }
  const mouse = (e: MouseEvent) => {
    if (document.pointerLockElement === r.domElement && player.hp > 0) {
      yaw -= e.movementX * 0.002;
      pitch = T.MathUtils.clamp(pitch - e.movementY * 0.002, -1.4, 1.4);
    }
  };
  const down = (e: KeyboardEvent) => {
    if (h.mode !== 'playing') return;
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code))
      e.preventDefault();
    keys.add(e.code);
    if (e.code === 'KeyR') reload();
    if (!e.repeat && /^Digit[1-4]$/.test(e.code))
      selectWeapon(Number(e.code.slice(-1)) - 1);
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const md = (e: MouseEvent) => {
    if (h.mode === 'playing') {
      if (e.button === 0) fire = true;
      if (e.button === 2) aim = true;
    }
  };
  const mu = (e: MouseEvent) => {
    if (e.button === 0) fire = false;
    if (e.button === 2) aim = false;
  };
  const context = (e: Event) => e.preventDefault();
  const resize = () => {
    c.aspect = innerWidth / innerHeight;
    c.updateProjectionMatrix();
    r.setSize(innerWidth, innerHeight);
  };
  const blur = () => {
    if (h.mode === 'playing') {
      document.exitPointerLock();
      h.mode = 'paused';
      keys.clear();
      fire = false;
    }
  };
  document.addEventListener('pointerlockchange', lock);
  document.addEventListener('mousemove', mouse);
  document.addEventListener('keydown', down);
  document.addEventListener('keyup', up);
  document.addEventListener('mousedown', md);
  document.addEventListener('mouseup', mu);
  document.addEventListener('contextmenu', context);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', blur);
  reset();
  tick();
  return {
    begin(settings: Roster = roster) {
      if (h.mode === 'menu' || h.mode === 'match')
        roster = normalizeRoster(settings);
      if (h.mode === 'menu') reset();
      if (h.mode === 'match') {
        h.score = [0, 0];
        h.round = 1;
        h.kills = 0;
        reset();
      } else if (h.mode === 'round') {
        h.round++;
        reset();
      }
      void audio.unlock();
      r.domElement.requestPointerLock()?.catch(() => {
        h.mode = 'paused';
        h.message = '請在獨立瀏覽器視窗開啟遊戲，再按繼續戰鬥以啟用滑鼠。';
      });
    },
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerlockchange', lock);
      document.removeEventListener('mousemove', mouse);
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      document.removeEventListener('mousedown', md);
      document.removeEventListener('mouseup', mu);
      document.removeEventListener('contextmenu', context);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', blur);
      s.traverse((o) => {
        const m = o as T.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material)
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((v) =>
            v.dispose(),
          );
      });
      r.dispose();
      r.domElement.remove();
      audio.dispose();
    },
  };
}
