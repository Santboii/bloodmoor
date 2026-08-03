# Rest Aura — Design

Approved 2026-08-02. In-world visual for the rest ability
([2026-08-02-rest-ability-design.md](2026-08-02-rest-ability-design.md)):
green healing motes rising around a resting character, with a converging
low-density variant during the 2s wind-up. Visible to all players — a
resting enemy is deliberately telegraphing an interrupt window.

## Motivation

Rest currently reads only on the caster's own HUD. Opponents see nothing,
so the ability's core counterplay — interrupt the rest — has no tell. This
is also the game's first character-attached status visual; the module
boundary chosen here becomes the template for future ones (burn, poison).

## Constraint that shapes the architecture

Every existing home for this effect — `ParticleSystem.ts`,
`SpellRenderer.ts`, `SpriteCharacter.ts`, `Scene.ts`, `main.ts` — carries
uncommitted work from a parallel session. The effect therefore lives in a
**new self-contained module** touching shared files in exactly two lines
(construct + per-frame update in `main.ts`), so the eventual merge is at
worst one trivial conflict.

## Module

`client/src/renderer/RestAuraRenderer.ts` — owns everything it needs:

- A miniature version of `ParticleSystem`'s SoA pool (capacity 256, one
  `THREE.Points`, same shader idiom: per-particle size/color attributes,
  additive blending, size scaled by remaining life). No gravity — motes
  rise; the shared `ParticleSystem` bakes downward gravity into its update
  and is not reusable here without touching it.
- API: `constructor(scene: THREE.Scene)`,
  `update(state: GameState, delta: number): void`, `dispose(): void`.
- A pure helper `auraPhaseFor(p: PlayerState, tick: number):
  'windup' | 'resting' | null`, exported for unit testing. Returns null for
  dead players (`hp <= 0`) and for invisible players
  (`invisibleUntil > tick`) — the aura must not reveal a shadowstepped
  ranger; `'windup'` when `restCastEndTick !== undefined &&
  restCastEndTick > tick`; `'resting'` when `resting === true`.

`update()` iterates `state.players`, gets each player's phase, and spawns
via a per-player fractional-carry accumulator (`rate × delta` with the
remainder carried) so spawn rates are framerate-independent. Carry state is
keyed by player id and dropped for absent ids.

## The effect

Color `0x7ad97a` — the HUD's `.resting` glow green, deliberately minty and
distinct from poison's harsh `0x44dd44`.

**Resting** (~20 motes/s per player): spawn at foot level within a 16-unit
radius of the player, rise at 20–35 u/s with ±6 u/s lateral wander, live
1.0–1.4s, chunky sizes matching the existing particle look.

**Wind-up** (~12 motes/s per player): spawn on a ring of radius 28 at
mid-body height, velocity aimed inward at the character, live ~0.8s — the
inverse read: gathering, not yet flowing.

World→scene coordinate mapping copies whatever the existing
`SpellRenderer` → `ParticleSystem.emitTrail(x, y, z, …)` call sites do
(implementation pins the exact convention from committed code).

## Wiring

A handful of one-line insertions in `client/src/main.ts`, each directly
adjacent to an existing `spellRenderer` lifecycle line (import, declaration,
per-match construct + dispose, teardown, frame-loop update). These are the
only edits outside the new file, and each is an addition, chosen for minimal
merge surface against the parallel session's dirty `main.ts`.

## Out of scope

Sounds, HUD changes, sprite/animation changes, auras for other status
effects, server changes (the client already receives every field this
needs), and any edit to `ParticleSystem.ts` or `SpellRenderer.ts`.

## Testing

- Unit (client vitest): `auraPhaseFor` — resting yields `'resting'`;
  wind-up yields `'windup'`; dead, invisible, and idle players yield null;
  a player somehow carrying both fields yields `'windup'` (wind-up and
  resting are mutually exclusive server-side; priority order is defensive).
- Manual: in a live match, verify motes rise while resting and converge
  during wind-up, on both your own character and the opponent's; verify
  they stop instantly on interrupt; verify a shadowstepped resting ranger
  shows no aura to the opponent.

## Risks

- **Green-on-green misread:** poison effects are also green. Mitigated by
  the mintier hue and opposite motion (poison has no per-player particles
  today; if it gains them, motion direction is the differentiator).
- **Parallel-session merge:** if the other session lands renderer changes
  first, the two `main.ts` wire-in lines may need re-placing — a one-minute
  fix; the module itself cannot conflict.
