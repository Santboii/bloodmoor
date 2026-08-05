// PROTOTYPE — THROWAWAY. Not imported by the game. Delete freely.
//
// Question this answers: does the proposed crate model — server-truth AABB
// (position + velocity only) with a purely cosmetic client-side tumble —
// feel compelling as cover that fireballs blow away?
//
// Everything runs in one local 60Hz loop (no client/server split); the sim
// half is written the way the server tick would be, using the game's real
// tuning constants from @arena/shared so the feel transfers.
//
// Controls: WASD move · click fireball · R reset.
// A turret on the right lobs fireballs at you — hide behind the crates.

import * as THREE from 'three';
import {
  Vec2, PLAYER_SPEED, PLAYER_HALF_SIZE, FIREBALL_SPEED, FIREBALL_RADIUS,
  TICK_RATE, DELTA, Pillar, circleHitsAABB,
} from '@arena/shared';

// ── Sim constants (the knobs a real design doc would tune) ────────────────
const ARENA_W = 1100, ARENA_H = 760;
const CRATE_HALF = 22;
const BLAST_RADIUS = FIREBALL_RADIUS * 7;      // = 70, same as the game's blast
const IMPULSE_RADIUS = BLAST_RADIUS * 2;       // shove reaches past the damage edge
const IMPULSE_SPEED = 520;                     // crate speed at blast center, units/s
const CRATE_FRICTION = 3.2;                    // exponential damping coefficient
const CRATE_STOP_SPEED = 8;                    // below this, a crate settles
const CRATE_RESTITUTION = 0.35;                // bounce off walls/pillars
const PUSH_SPEED = 70;                         // walk-push speed, units/s
const TURRET_INTERVAL = 1.6 * TICK_RATE;       // ticks between turret shots

type Settle = {
  edge: THREE.Vector3;  // horizontal pivot axis (support edge), frozen at start
  tilt: number;         // current tilt of the down-face off vertical (rad)
  angVel: number;       // pendulum velocity, seeded from carried roll momentum
};

type Crate = {
  pos: Vec2; vel: Vec2;
  // render-only tumble state — the "server" never sees these.
  // `quat` is completely free: the crate rolls about up×velocity (full 360°),
  // yaw-spins from blast kicks, and comes to rest with SOME face flat but at
  // ANY yaw — like a real box. No orientation snapping anywhere.
  quat: THREE.Quaternion;
  omega: number;        // roll speed with its own momentum (rad/s)
  lastAxis: THREE.Vector3; // roll axis at the last moving frame — signs the settle seed
  yawVel: number;       // spin about vertical, kicked by blasts, friction-damped
  settle: Settle | null;
  mesh: THREE.Group;
};
type Ball = { pos: Vec2; vel: Vec2; hostile: boolean; mesh: THREE.Mesh };
type Boom = { mesh: THREE.Mesh; age: number };

const PILLAR_LIST: Pillar[] = [
  { x: 380, y: 200, halfSize: 28 },
  { x: 380, y: 560, halfSize: 28 },
];
const CRATE_SPOTS: Vec2[] = [
  { x: 560, y: 330 }, { x: 560, y: 380 }, { x: 560, y: 430 },
  { x: 610, y: 355 }, { x: 610, y: 405 },
  { x: 300, y: 380 }, { x: 780, y: 180 }, { x: 780, y: 600 },
];

// ── Scene (mimics the game: ortho iso camera, same offsets) ───────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11121c);
const FRUSTUM_HALF = 330;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -FRUSTUM_HALF * aspect, FRUSTUM_HALF * aspect, FRUSTUM_HALF, -FRUSTUM_HALF, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x9aa2c8, 1.6));
const moon = new THREE.DirectionalLight(0xbfd0ff, 2.6);
moon.position.set(800, 700, 500);
moon.castShadow = true;
moon.shadow.camera.left = -900; moon.shadow.camera.right = 900;
moon.shadow.camera.top = 900; moon.shadow.camera.bottom = -900;
moon.shadow.mapSize.set(2048, 2048);
scene.add(moon);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_W, ARENA_H),
  new THREE.MeshStandardMaterial({ color: 0x3d4156, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(ARENA_W / 2, 0, ARENA_H / 2);
floor.receiveShadow = true;
scene.add(floor);

for (const p of PILLAR_LIST) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(p.halfSize * 2, 80, p.halfSize * 2),
    new THREE.MeshStandardMaterial({ color: 0x555a77, roughness: 0.9 }));
  m.position.set(p.x, 40, p.y);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}

function makeCrateMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CRATE_HALF * 2, CRATE_HALF * 2, CRATE_HALF * 2),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.95 }));
  body.castShadow = body.receiveShadow = true;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(body.geometry),
    new THREE.LineBasicMaterial({ color: 0x4a3820 }));
  g.add(body, edges);
  return g;
}

const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(PLAYER_HALF_SIZE * 0.8, 28, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x3fa0d0, roughness: 0.6 }));
playerMesh.castShadow = true;
scene.add(playerMesh);

const turretMesh = new THREE.Mesh(
  new THREE.ConeGeometry(18, 50, 6),
  new THREE.MeshStandardMaterial({ color: 0xc04040, roughness: 0.6 }));
turretMesh.castShadow = true;
scene.add(turretMesh);

// ── Sim state ─────────────────────────────────────────────────────────────
let player: Vec2;
let crates: Crate[];
let balls: Ball[];
let booms: Boom[];
let turret: Vec2;
let turretTimer = 0;
let tick = 0;
let lastImpulse = '—';

function reset(): void {
  if (crates) for (const c of crates) scene.remove(c.mesh);
  if (balls) for (const b of balls) scene.remove(b.mesh);
  if (booms) for (const b of booms) scene.remove(b.mesh);
  player = { x: 160, y: ARENA_H / 2 };
  turret = { x: ARENA_W - 90, y: ARENA_H / 2 };
  turretTimer = 60;
  balls = []; booms = [];
  crates = CRATE_SPOTS.map(s => {
    const mesh = makeCrateMesh();
    scene.add(mesh);
    return { pos: { ...s }, vel: { x: 0, y: 0 },
             quat: new THREE.Quaternion(), omega: 0,
             lastAxis: new THREE.Vector3(0, 0, -1), yawVel: 0,
             settle: null, mesh };
  });
}
reset();
// debug hook for inspecting live tumble state from the console / devtools MCP
(window as unknown as Record<string, unknown>).__proto = {
  crates: () => crates.map(c => ({
    pos: { x: Math.round(c.pos.x), y: Math.round(c.pos.y) },
    speed: Math.round(Math.hypot(c.vel.x, c.vel.y) * 10) / 10,
    omega: Math.round(c.omega * 100) / 100,
    yawVel: Math.round(c.yawVel * 100) / 100,
    tilt: Math.round(tiltOf(c) * 100) / 100,
    settling: c.settle !== null,
    meshQuat: c.mesh.quaternion.toArray().map(v => Math.round(v * 100) / 100),
  })),
  fire: (fx: number, fy: number, tx: number, ty: number) => fire({ x: fx, y: fy }, { x: tx, y: ty }, false),
};

// ── Input ─────────────────────────────────────────────────────────────────
const keys = new Set<string>();
addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase());
  if (e.key.toLowerCase() === 'r') reset();
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
addEventListener('mousedown', e => {
  const ndc = new THREE.Vector2(
    (e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;
  fire(player, { x: hit.x, y: hit.z }, false);
});

function fire(from: Vec2, at: Vec2, hostile: boolean): void {
  const dx = at.x - from.x, dy = at.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(FIREBALL_RADIUS, 10, 8),
    new THREE.MeshBasicMaterial({ color: hostile ? 0xff5533 : 0xffaa33 }));
  scene.add(mesh);
  balls.push({
    pos: { ...from },
    vel: { x: (dx / len) * FIREBALL_SPEED, y: (dy / len) * FIREBALL_SPEED },
    hostile, mesh,
  });
}

// ── Sim tick (this half is what the server would run) ─────────────────────
const crateAABB = (c: Crate): Pillar => ({ x: c.pos.x, y: c.pos.y, halfSize: CRATE_HALF });

function explode(at: Vec2): void {
  // Impulse mirrors the game's blast falloff: 1 - dist/radius
  for (const c of crates) {
    const dx = c.pos.x - at.x, dy = c.pos.y - at.y;
    const dist = Math.hypot(dx, dy);
    if (dist > IMPULSE_RADIUS + CRATE_HALF) continue;
    const falloff = 1 - Math.min(dist / IMPULSE_RADIUS, 1);
    // dead-center detonation: no radial direction — shove it +x rather than not at all
    const ux = dist > 0 ? dx / dist : 1;
    const uy = dist > 0 ? dy / dist : 0;
    c.vel.x += ux * IMPULSE_SPEED * falloff;
    c.vel.y += uy * IMPULSE_SPEED * falloff;
    kickYaw(c, falloff); // client-half reaction to the detonation event
    lastImpulse = `${Math.round(IMPULSE_SPEED * falloff)} u/s @ crate ${crates.indexOf(c)}`;
  }
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.8 }));
  mesh.position.set(at.x, 12, at.y);
  scene.add(mesh);
  booms.push({ mesh, age: 0 });
}

/** Push `pos` (an entity of half-size `half`) out of one AABB, min axis. */
function pushOut(pos: Vec2, half: number, box: Pillar): { hit: boolean; nx: number; ny: number } {
  const minX = box.x - box.halfSize - half, maxX = box.x + box.halfSize + half;
  const minY = box.y - box.halfSize - half, maxY = box.y + box.halfSize + half;
  if (pos.x <= minX || pos.x >= maxX || pos.y <= minY || pos.y >= maxY)
    return { hit: false, nx: 0, ny: 0 };
  const dl = pos.x - minX, dr = maxX - pos.x, dt = pos.y - minY, db = maxY - pos.y;
  const m = Math.min(dl, dr, dt, db);
  if (m === dl) { pos.x = minX; return { hit: true, nx: -1, ny: 0 }; }
  if (m === dr) { pos.x = maxX; return { hit: true, nx: 1, ny: 0 }; }
  if (m === dt) { pos.y = minY; return { hit: true, nx: 0, ny: -1 }; }
  pos.y = maxY; return { hit: true, nx: 0, ny: 1 };
}

function simTick(): void {
  tick++;

  // Player movement (same speed model as movePlayer in shared/physics.ts)
  const mv = { x: 0, y: 0 };
  if (keys.has('w') || keys.has('arrowup')) mv.y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) mv.y += 1;
  if (keys.has('a') || keys.has('arrowleft')) mv.x -= 1;
  if (keys.has('d') || keys.has('arrowright')) mv.x += 1;
  const mlen = Math.hypot(mv.x, mv.y);
  if (mlen > 0) {
    player.x += (mv.x / mlen) * PLAYER_SPEED * DELTA;
    player.y += (mv.y / mlen) * PLAYER_SPEED * DELTA;
  }
  player.x = Math.max(PLAYER_HALF_SIZE, Math.min(ARENA_W - PLAYER_HALF_SIZE, player.x));
  player.y = Math.max(PLAYER_HALF_SIZE, Math.min(ARENA_H - PLAYER_HALF_SIZE, player.y));
  for (const p of PILLAR_LIST) pushOut(player, PLAYER_HALF_SIZE, p);

  // Player vs crates: walking into a slow crate shoves it. "Blocked" means
  // the crate could not actually yield ALONG THE PUSH AXIS (wall/pillar dead
  // behind it) — grazing a wall sideways doesn't count. The player is pushed
  // out of any remaining overlap unconditionally at the end either way.
  for (const c of crates) {
    const probe = { ...player };
    const r = pushOut(probe, PLAYER_HALF_SIZE, crateAABB(c));
    if (!r.hit) continue;
    // don't grab a crate that's flying faster than we can push
    if (Math.hypot(c.vel.x, c.vel.y) <= PUSH_SPEED) {
      const before = { ...c.pos };
      c.pos.x -= r.nx * PUSH_SPEED * DELTA * 2; // push normal points at the player;
      c.pos.y -= r.ny * PUSH_SPEED * DELTA * 2; // crate moves the other way
      c.vel.x = -r.nx * PUSH_SPEED;
      c.vel.y = -r.ny * PUSH_SPEED;
      resolveCrateStatics(c);
      // displacement projected on the push direction — did it actually yield?
      const moved = (c.pos.x - before.x) * -r.nx + (c.pos.y - before.y) * -r.ny;
      if (moved <= 1e-6) {
        c.pos = before;
        c.vel.x = 0; c.vel.y = 0; // jammed crates must not tumble in place
      }
    }
    pushOut(player, PLAYER_HALF_SIZE, crateAABB(c)); // player yields out of the overlap
  }

  // Crate integration
  for (const c of crates) {
    c.pos.x += c.vel.x * DELTA;
    c.pos.y += c.vel.y * DELTA;
    const damp = Math.exp(-CRATE_FRICTION * DELTA);
    c.vel.x *= damp; c.vel.y *= damp;
    if (Math.hypot(c.vel.x, c.vel.y) < CRATE_STOP_SPEED) { c.vel.x = 0; c.vel.y = 0; }
    resolveCrateStatics(c);
  }

  // Crate vs crate: positional split + velocity transfer along the normal
  for (let i = 0; i < crates.length; i++) {
    for (let j = i + 1; j < crates.length; j++) {
      const a = crates[i], b = crates[j];
      const ox = (CRATE_HALF * 2) - Math.abs(a.pos.x - b.pos.x);
      const oy = (CRATE_HALF * 2) - Math.abs(a.pos.y - b.pos.y);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) {
        const s = a.pos.x < b.pos.x ? -1 : 1;
        a.pos.x += s * ox / 2; b.pos.x -= s * ox / 2;
        const rel = a.vel.x - b.vel.x;
        a.vel.x -= rel * 0.6; b.vel.x += rel * 0.6;
      } else {
        const s = a.pos.y < b.pos.y ? -1 : 1;
        a.pos.y += s * oy / 2; b.pos.y -= s * oy / 2;
        const rel = a.vel.y - b.vel.y;
        a.vel.y -= rel * 0.6; b.vel.y += rel * 0.6;
      }
    }
  }

  // Fireballs: fly, collide with crates (COVER!), pillars, walls, players
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.pos.x += b.vel.x * DELTA;
    b.pos.y += b.vel.y * DELTA;
    let det = false;
    if (b.pos.x < 0 || b.pos.x > ARENA_W || b.pos.y < 0 || b.pos.y > ARENA_H) det = true;
    if (!det) for (const p of PILLAR_LIST)
      if (circleHitsAABB(b.pos, FIREBALL_RADIUS, p)) { det = true; break; }
    if (!det) for (const c of crates)
      if (circleHitsAABB(b.pos, FIREBALL_RADIUS, crateAABB(c))) { det = true; break; }
    if (!det && b.hostile &&
        circleHitsAABB(b.pos, FIREBALL_RADIUS, { x: player.x, y: player.y, halfSize: PLAYER_HALF_SIZE }))
      det = true;
    if (det) {
      explode(b.pos);
      scene.remove(b.mesh);
      balls.splice(i, 1);
    }
  }

  // Turret AI: shoot at the player on a timer
  if (--turretTimer <= 0) {
    turretTimer = TURRET_INTERVAL;
    fire(turret, player, true);
  }
}

/** Resolve one crate against walls and pillars. Returns true if it was touching. */
function resolveCrateStatics(c: Crate): boolean {
  let touched = false;
  if (c.pos.x < CRATE_HALF) { c.pos.x = CRATE_HALF; c.vel.x = Math.abs(c.vel.x) * CRATE_RESTITUTION; touched = true; }
  if (c.pos.x > ARENA_W - CRATE_HALF) { c.pos.x = ARENA_W - CRATE_HALF; c.vel.x = -Math.abs(c.vel.x) * CRATE_RESTITUTION; touched = true; }
  if (c.pos.y < CRATE_HALF) { c.pos.y = CRATE_HALF; c.vel.y = Math.abs(c.vel.y) * CRATE_RESTITUTION; touched = true; }
  if (c.pos.y > ARENA_H - CRATE_HALF) { c.pos.y = ARENA_H - CRATE_HALF; c.vel.y = -Math.abs(c.vel.y) * CRATE_RESTITUTION; touched = true; }
  for (const p of PILLAR_LIST) {
    const r = pushOut(c.pos, CRATE_HALF, p);
    if (r.hit) {
      if (r.nx !== 0) c.vel.x = r.nx * Math.abs(c.vel.x) * CRATE_RESTITUTION;
      if (r.ny !== 0) c.vel.y = r.ny * Math.abs(c.vel.y) * CRATE_RESTITUTION;
      touched = true;
    }
  }
  return touched;
}

// ── Cosmetic tumble (client-only) ─────────────────────────────────────────
// Driven by pos/vel (what a snapshot carries) plus detonation EVENTS (which
// clients also see — the yaw kick reacts to those, it is not snapshot-
// derivable). The crate rolls freely about up × velocity, yaw-spins from
// blast kicks, and on settle a momentum-seeded pendulum tips it over its
// real support edge — through to the next face or rocking back — so it
// always rests with a face flat at whatever yaw it earned.
const TIP_ACCEL = 34;       // rad/s² — gravity toppling FORWARD onto the next face
const TIP_ACCEL_BACK = 12;  // rad/s² — gentler when rocking back onto the old face
const OMEGA_SPINDOWN = 2.5; // 1/s — how slowly render roll momentum bleeds off
const YAW_SPINDOWN = 1.8;   // 1/s — blast yaw spin friction
const BALANCE = Math.PI / 4;
const UP = new THREE.Vector3(0, 1, 0);

const _dq = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _n = new THREE.Vector3();
const _cand = new THREE.Vector3();

/** Height of the crate's center while its down-face is tilted `t` rad off
 *  vertical (geometry of a square pivoting on its edge; 0 at flat). */
const tipLift = (t: number) =>
  CRATE_HALF * (Math.SQRT2 * Math.sin(Math.PI / 4 + Math.abs(t)) - 1);

/** Client-half reaction to a detonation event: spin the crate. In the real
 *  game this runs on each client when the blast VFX spawns, hashing crate id
 *  + SNAPSHOT position so every client computes the same spin. (Here the sim
 *  pos doubles as the snapshot pos — single-process demo.) */
function kickYaw(c: Crate, falloff: number): void {
  const h = Math.sin(c.pos.x * 12.9898 + c.pos.y * 78.233) * 43758.5453;
  c.yawVel += (h - Math.floor(h) - 0.5) * 8 * falloff;
}

/** World direction of the crate's face-normal currently closest to UP,
 *  written into `out`. This is the face it would rest on (inverted). */
function upmostFace(c: Crate, out: THREE.Vector3): void {
  let best = -Infinity;
  for (let i = 0; i < 3; i++) {
    _cand.set(+(i === 0), +(i === 1), +(i === 2)).applyQuaternion(c.quat);
    const d = _cand.dot(UP);
    if (Math.abs(d) > best) { best = Math.abs(d); out.copy(_cand).multiplyScalar(Math.sign(d) || 1); }
  }
}

/** Current tilt of the resting face off vertical, from the quat alone. */
function tiltOf(c: Crate): number {
  upmostFace(c, _n);
  return Math.acos(Math.min(1, _n.dot(UP)));
}

function updateTumble(c: Crate, dt: number): void {
  const speed = Math.hypot(c.vel.x, c.vel.y);

  if (speed > CRATE_STOP_SPEED) {
    c.settle = null;
    // Roll speed has momentum: it tracks the slide speed instantly on the way
    // up but bleeds off slowly, so a decelerating crate keeps visibly tumbling.
    const target = (speed / CRATE_HALF) * 0.6;     // under-roll: skid + tumble
    c.omega = target > c.omega
      ? target
      : c.omega + (target - c.omega) * Math.min(1, dt * OMEGA_SPINDOWN);
    // Free 360° roll about up × velocity — follows the actual travel direction.
    _axis.set(c.vel.y, 0, -c.vel.x).normalize();
    c.lastAxis.copy(_axis); // survives the sim zeroing vel; signs the settle seed
    _dq.setFromAxisAngle(_axis, c.omega * dt);
    c.quat.premultiply(_dq);
    // Blast-kicked yaw spin, friction-damped.
    _dq.setFromAxisAngle(UP, c.yawVel * dt);
    c.quat.premultiply(_dq);
    c.yawVel *= Math.exp(-YAW_SPINDOWN * dt);
  } else if (!c.settle && speed === 0 && (c.omega > 0.01 || tiltOf(c) > 0.01)) {
    // Slide just stopped, possibly mid-tip. Measure the REAL tilt from the
    // quat, freeze the support edge (horizontal axis ⊥ to the lean), and hand
    // the motion to a pendulum seeded with the carried roll momentum: it
    // either crests the 45° balance point and topples onto the next face, or
    // runs out and rocks back. Yaw is untouched — boxes rest at any angle.
    upmostFace(c, _n);
    const tilt = Math.acos(Math.min(1, _n.dot(UP)));
    const edge = new THREE.Vector3().crossVectors(UP, _n);
    if (edge.lengthSq() < 1e-8) edge.set(1, 0, 0); // perfectly flat: axis moot
    else edge.normalize();
    // SIGNED momentum seed. `edge` comes from the LEAN, so pre-crest it is
    // parallel to the roll axis (+omega keeps rolling forward) but post-crest
    // — stopped just after a face tipped past its edge — it is ANTI-parallel,
    // and an unsigned seed would visibly roll the crate backward, against its
    // own travel. Project the carried momentum onto the edge to keep its
    // true direction; a negative seed correctly drops the crate flat forward.
    const seedSign = Math.sign(edge.dot(c.lastAxis)) || 1;
    c.settle = { edge, tilt, angVel: c.omega * seedSign };
    c.omega = 0;
    c.yawVel = 0;
  }

  if (c.settle) {
    const s = c.settle;
    // +rotation about `edge` tips the box FURTHER (up × n convention).
    s.angVel += (s.tilt >= BALANCE ? TIP_ACCEL : -TIP_ACCEL_BACK) * dt;
    const step = s.angVel * dt;
    _dq.setFromAxisAngle(s.edge, step);
    c.quat.premultiply(_dq);
    s.tilt += step;
    if (s.tilt <= 0.005 || s.tilt >= Math.PI / 2 - 0.005) {
      // Landed (rocked back at ~0, toppled through at ~90°, where the NEXT
      // face is now the down face). Level the resting face exactly — a pure
      // sub-degree tilt correction, yaw untouched, no orientation snapping.
      upmostFace(c, _n);
      _dq.setFromUnitVectors(_n, UP);
      c.quat.premultiply(_dq).normalize();
      c.settle = null;
    }
  }

  const tilt = c.settle ? c.settle.tilt : tiltOf(c);
  c.mesh.position.set(c.pos.x, CRATE_HALF + tipLift(tilt), c.pos.y);
  c.mesh.quaternion.copy(c.quat);
}

// ── Render loop: fixed 60Hz sim, render as fast as the browser wants ──────
const hud = document.getElementById('hud')!;
let acc = 0, last = performance.now();

function frame(now: number): void {
  const frameMs = Math.min(now - last, 100);
  const frameDt = frameMs / 1000; // real render delta — tumble/VFX must not assume 60Hz
  acc += frameMs;
  last = now;
  while (acc >= 1000 / TICK_RATE) { simTick(); acc -= 1000 / TICK_RATE; }

  playerMesh.position.set(player.x, 22, player.y);
  turretMesh.position.set(turret.x, 25, turret.y);
  for (const c of crates) updateTumble(c, frameDt);
  for (const b of balls) b.mesh.position.set(b.pos.x, 12, b.pos.y);
  for (let i = booms.length - 1; i >= 0; i--) {
    const bm = booms[i];
    bm.age += frameDt;
    const s = 1 + bm.age * 260;
    bm.mesh.scale.set(s, s, s);
    (bm.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - bm.age * 2.6);
    if (bm.age > 0.32) { scene.remove(bm.mesh); booms.splice(i, 1); }
  }

  // Same iso offset as CameraController: +200/+600/+200, lookAt target.
  camera.position.set(player.x + 200, 600, player.y + 200);
  camera.lookAt(player.x, 0, player.y);

  const moving = crates.filter(c => Math.hypot(c.vel.x, c.vel.y) > 0).length;
  hud.textContent =
    `WASD move · click fireball · R reset\n` +
    `tick ${tick}  crates moving: ${moving}/${crates.length}\n` +
    `last impulse: ${lastImpulse}\n` +
    `player ${Math.round(player.x)},${Math.round(player.y)}`;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  const a = window.innerWidth / window.innerHeight;
  camera.left = -FRUSTUM_HALF * a; camera.right = FRUSTUM_HALF * a;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
