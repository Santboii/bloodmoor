import { GameState, InputFrame, SPAWN_POSITIONS, NodeId, DUEL_MODE, computeLoadout } from '@arena/shared';
import type { GameModeConfig, CharacterClass, Appearance, ItemRow } from '@arena/shared';
import { makeInitialState, advanceState, PlayerInit } from '../gameloop/StateAdvancer.ts';

export type RoomPlayer = { socketId: string; displayName: string; ready: boolean; colorIndex: number };

export type PauseState = {
  disconnectedUserIds: Set<string>;
  pausedAt: number; // Date.now() timestamp
};

export class Room {
  readonly id: string;
  readonly mode: GameModeConfig;
  readonly createdAt = Date.now();
  creatorName: string = '';
  players: Map<string, RoomPlayer> = new Map(); // socketId -> RoomPlayer
  teamAssignments: Map<string, string> = new Map(); // socketId -> teamId
  skillSets: Map<string, Map<NodeId, number>> = new Map();
  charClasses: Map<string, CharacterClass> = new Map();
  appearances: Map<string, Appearance> = new Map();
  userIds: Map<string, string> = new Map();
  characterIds: Map<string, string> = new Map();
  loadouts: Map<string, ItemRow[]> = new Map();
  // Match-scoped merge of tree ranks (skillSets) + item talent ranks, built
  // fresh at startMatch — never mutates the persistent skillSets map. Only
  // populated for players with a real skill set (guests stay absent here
  // too, preserving the tick loop's hasSkillSystem === false gate for them).
  effectiveSkillSets: Map<string, Map<NodeId, number>> = new Map();
  state: GameState | null = null;
  pauseState: PauseState | null = null;
  private pendingInputs: Map<string, InputFrame> = new Map();
  private lastProcessedSeq: Map<string, number> = new Map();
  private ticksSinceInput: Map<string, number> = new Map();

  // Reuse the last input for a short grace window to absorb network jitter,
  // then treat the player as idle so a stalled client doesn't run forever.
  private static readonly INPUT_GRACE_TICKS = 6;

  constructor(id: string, mode: GameModeConfig = DUEL_MODE) {
    this.id = id;
    this.mode = mode;
  }

  get isFull(): boolean { return this.players.size >= this.mode.maxPlayers; }
  get canStart(): boolean { return this.players.size >= this.mode.minPlayers && [...this.players.values()].every(p => p.ready); }
  get allReady(): boolean { return this.canStart; }

  addPlayer(socketId: string, displayName: string, teamId?: string): 'ok' | 'full' | 'team-full' {
    if (this.isFull) return 'full';
    if (this.mode.teamsEnabled && teamId) {
      const teamSize = [...this.teamAssignments.values()].filter(t => t === teamId).length;
      if (teamSize >= (this.mode.playersPerTeam ?? Infinity)) return 'team-full';
      this.teamAssignments.set(socketId, teamId);
    }
    if (this.players.size === 0) this.creatorName = displayName;
    const colorIndex = this.players.size;
    this.players.set(socketId, { socketId, displayName, ready: false, colorIndex });
    return 'ok';
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    this.teamAssignments.delete(socketId);
    this.skillSets.delete(socketId);
    this.charClasses.delete(socketId);
    this.appearances.delete(socketId);
    this.userIds.delete(socketId);
    this.characterIds.delete(socketId);
    this.loadouts.delete(socketId);
    this.effectiveSkillSets.delete(socketId);
  }

  setReady(socketId: string): void {
    const p = this.players.get(socketId);
    if (p) p.ready = true;
  }

  startMatch(): void {
    const entries = [...this.players.entries()];
    this.effectiveSkillSets = new Map();
    const inits: PlayerInit[] = entries.map(([id, p], i) => {
      const charClass = this.charClasses.get(id) ?? 'mage';
      const items = this.loadouts.get(id) ?? [];
      const treeRanks = this.skillSets.get(id);
      if (treeRanks) {
        const { talentRanks } = computeLoadout(items, charClass);
        const merged = new Map<NodeId, number>(treeRanks);
        for (const [node, addedRank] of talentRanks) {
          merged.set(node, (merged.get(node) ?? 0) + addedRank);
        }
        this.effectiveSkillSets.set(id, merged);
      }
      return {
        id,
        displayName: p.displayName,
        charClass,
        spawnPos: this.mode.spawnPositions[i],
        appearance: this.appearances.get(id),
        items,
      };
    });
    let teams: Record<string, string[]> | undefined;
    if (this.mode.teamsEnabled) {
      teams = {};
      for (const [socketId, teamId] of this.teamAssignments) {
        if (!teams[teamId]) teams[teamId] = [];
        teams[teamId].push(socketId);
      }
    }
    this.state = makeInitialState(inits, this.mode, teams);
    this.pendingInputs.clear();
  }

  queueInput(socketId: string, input: InputFrame): void {
    const existing = this.pendingInputs.get(socketId);
    if (existing?.castSpell && !input.castSpell) {
      input = { ...input, castSpell: existing.castSpell, aimTarget: existing.aimTarget };
    }
    if (existing?.rest && !input.rest) {
      input = { ...input, rest: true };
    }
    this.pendingInputs.set(socketId, input);
    this.ticksSinceInput.set(socketId, 0);
  }

  tick(): GameState {
    if (!this.state) throw new Error('Room not started');
    if (this.state.phase === 'ended') return this.state;
    const inputs: Record<string, InputFrame> = {};
    for (const [id] of this.players) {
      let pending = this.pendingInputs.get(id) ?? { move: { x: 0, y: 0 }, castSpell: null, aimTarget: { x: 400, y: 400 } };
      const staleness = this.ticksSinceInput.get(id) ?? 0;
      this.ticksSinceInput.set(id, staleness + 1);
      if (staleness > Room.INPUT_GRACE_TICKS && (pending.move.x !== 0 || pending.move.y !== 0)) {
        pending = { ...pending, move: { x: 0, y: 0 } };
        this.pendingInputs.set(id, pending);
      }
      if (pending.seq !== undefined) {
        this.lastProcessedSeq.set(id, pending.seq);
      }
      inputs[id] = pending;
    }
    const skillSetsObj: Record<string, Map<NodeId, number>> = Object.fromEntries(this.effectiveSkillSets.entries());
    this.state = advanceState(this.state, inputs, skillSetsObj, this.mode);
    this.state.ack = Object.fromEntries(this.lastProcessedSeq);
    for (const [id, pending] of this.pendingInputs) {
      if (pending.castSpell || pending.rest) {
        this.pendingInputs.set(id, { ...pending, castSpell: null, rest: undefined });
      }
    }
    return this.state;
  }

  reset(): void {
    for (const p of this.players.values()) p.ready = false;
    this.state = null;
    this.pauseState = null;
    this.pendingInputs.clear();
    this.lastProcessedSeq.clear();
    this.ticksSinceInput.clear();
  }

  pause(userId: string): void {
    if (!this.pauseState) {
      this.pauseState = {
        disconnectedUserIds: new Set([userId]),
        pausedAt: Date.now(),
      };
    } else {
      this.pauseState.disconnectedUserIds.add(userId);
    }
  }

  resume(userId: string): void {
    if (!this.pauseState) return;
    this.pauseState.disconnectedUserIds.delete(userId);
    if (this.pauseState.disconnectedUserIds.size === 0) {
      this.pauseState = null;
    }
  }

  remapPlayer(oldSocketId: string, newSocketId: string): void {
    // Remap players
    const player = this.players.get(oldSocketId);
    if (player) {
      this.players.delete(oldSocketId);
      player.socketId = newSocketId;
      this.players.set(newSocketId, player);
    }

    // Remap userIds
    const userId = this.userIds.get(oldSocketId);
    if (userId !== undefined) {
      this.userIds.delete(oldSocketId);
      this.userIds.set(newSocketId, userId);
    }

    // Remap characterIds
    const characterId = this.characterIds.get(oldSocketId);
    if (characterId !== undefined) {
      this.characterIds.delete(oldSocketId);
      this.characterIds.set(newSocketId, characterId);
    }

    // Remap skillSets
    const skills = this.skillSets.get(oldSocketId);
    if (skills) {
      this.skillSets.delete(oldSocketId);
      this.skillSets.set(newSocketId, skills);
    }

    // Remap loadouts
    const loadout = this.loadouts.get(oldSocketId);
    if (loadout) {
      this.loadouts.delete(oldSocketId);
      this.loadouts.set(newSocketId, loadout);
    }

    // Remap effectiveSkillSets (match-scoped merged ranks)
    const effSkills = this.effectiveSkillSets.get(oldSocketId);
    if (effSkills) {
      this.effectiveSkillSets.delete(oldSocketId);
      this.effectiveSkillSets.set(newSocketId, effSkills);
    }

    // Remap charClasses
    const cls = this.charClasses.get(oldSocketId);
    if (cls) {
      this.charClasses.delete(oldSocketId);
      this.charClasses.set(newSocketId, cls);
    }

    // Remap appearances
    const appearance = this.appearances.get(oldSocketId);
    if (appearance) {
      this.appearances.delete(oldSocketId);
      this.appearances.set(newSocketId, appearance);
    }

    // Remap teamAssignments
    const team = this.teamAssignments.get(oldSocketId);
    if (team !== undefined) {
      this.teamAssignments.delete(oldSocketId);
      this.teamAssignments.set(newSocketId, team);
    }

    // Remap pendingInputs
    const input = this.pendingInputs.get(oldSocketId);
    if (input) {
      this.pendingInputs.delete(oldSocketId);
      this.pendingInputs.set(newSocketId, input);
    }

    // Remap lastProcessedSeq
    const seq = this.lastProcessedSeq.get(oldSocketId);
    if (seq !== undefined) {
      this.lastProcessedSeq.delete(oldSocketId);
      this.lastProcessedSeq.set(newSocketId, seq);
    }

    // Remap input staleness counter
    const staleness = this.ticksSinceInput.get(oldSocketId);
    if (staleness !== undefined) {
      this.ticksSinceInput.delete(oldSocketId);
      this.ticksSinceInput.set(newSocketId, staleness);
    }

    // Remap player ID in GameState
    if (this.state) {
      const playerState = this.state.players[oldSocketId];
      if (playerState) {
        delete this.state.players[oldSocketId];
        playerState.id = newSocketId;
        this.state.players[newSocketId] = playerState;
      }
    }

    // Remap teams in GameState (2v2)
    if (this.state?.teams) {
      for (const [teamId, members] of Object.entries(this.state.teams)) {
        const idx = members.indexOf(oldSocketId);
        if (idx !== -1) {
          members[idx] = newSocketId;
          break;
        }
      }
    }

    // Remap ownerId on every in-flight entity — otherwise a reconnect mid-
    // match leaves projectiles/zones pointing at the stale socket id, which
    // silently drops the reconnected attacker's statMults.damage (and any
    // other ownerId-keyed lookup, e.g. friendly-fire) for anything airborne
    // at the moment of reconnect.
    if (this.state) {
      for (const proj of this.state.projectiles) {
        if (proj.ownerId === oldSocketId) proj.ownerId = newSocketId;
      }
      for (const fw of this.state.fireWalls) {
        if (fw.ownerId === oldSocketId) fw.ownerId = newSocketId;
      }
      for (const m of this.state.meteors) {
        if (m.ownerId === oldSocketId) m.ownerId = newSocketId;
      }
      for (const rain of this.state.rainOfArrows) {
        if (rain.ownerId === oldSocketId) rain.ownerId = newSocketId;
      }
      for (const echo of this.state.echoVolleys ?? []) {
        if (echo.ownerId === oldSocketId) echo.ownerId = newSocketId;
      }
    }
  }
}
