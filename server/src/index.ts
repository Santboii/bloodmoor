import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.ts';
import { Room } from './rooms/Room.ts';
import { GameLoop } from './gameloop/GameLoop.ts';
import { InputFrame, GameState } from '@arena/shared';
import type { GameModeType, ItemRow, FireWallState, Vec2 } from '@arena/shared';
import { DISCONNECT_TIMEOUT_MS, REMATCH_COUNTDOWN_MS, GOLD_PER_MATCH, GOLD_WIN_BONUS, PLAYER_HALF_SIZE } from '@arena/shared';
import { loadSkillsForCharacter, creditMatchResult, loadUserFromToken } from './skills/loadSkills.ts';
import { economyRouter } from './economy/routes.ts';
import { supabase } from './supabase.ts';
import { maybeRollMatchDrop } from './economy/service.ts';

const app = express();
const httpServer = createServer(app);
// Set CLIENT_ORIGIN (comma-separated for multiple) in production to stop
// arbitrary sites from opening game connections; defaults open for local dev.
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map(o => o.trim());
const corsConfig = { origin: allowedOrigins ?? '*' };
const io = new Server(httpServer, { cors: corsConfig });
const roomManager = new RoomManager();
const loops: Map<string, GameLoop> = new Map();
const pauseTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
const rematchVotes: Map<string, Set<string>> = new Map();
const rematchTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Never trust client payloads: a malformed input frame (castSpell: 99,
// missing aimTarget, NaN move) would otherwise throw inside the tick loop.
const AIM_LIMIT = 100_000;
function sanitizeInput(raw: unknown): InputFrame | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as { move?: unknown; castSpell?: unknown; aimTarget?: unknown; seq?: unknown; rest?: unknown };

  const rawMove = r.move as { x?: unknown; y?: unknown } | undefined;
  const clampAxis = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0;
  const move = { x: clampAxis(rawMove?.x), y: clampAxis(rawMove?.y) };

  const rawAim = r.aimTarget as { x?: unknown; y?: unknown } | undefined;
  const finiteCoord = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= AIM_LIMIT;
  const aimValid = finiteCoord(rawAim?.x) && finiteCoord(rawAim?.y);

  const castValid =
    r.castSpell === null ||
    (typeof r.castSpell === 'number' && Number.isInteger(r.castSpell) && r.castSpell >= 1 && r.castSpell <= 11);

  if (!aimValid) return null;

  const input: InputFrame = {
    move,
    // A cast without a valid aim point cannot be resolved — drop the cast.
    castSpell: castValid ? (r.castSpell as InputFrame['castSpell']) : null,
    aimTarget: { x: rawAim!.x as number, y: rawAim!.y as number },
  };
  if (typeof r.seq === 'number' && Number.isFinite(r.seq) && r.seq >= 0) input.seq = r.seq;
  if (r.rest === true) input.rest = true;
  return input;
}

// Round floats for the wire — full-precision doubles ("1023.3333333333334")
// dominate snapshot size and 2 decimals is far below gameplay resolution.
function roundForWire(value: unknown): unknown {
  if (typeof value === 'number') return Math.round(value * 100) / 100;
  if (Array.isArray(value)) return value.map(roundForWire);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = roundForWire(v);
    return out;
  }
  return value;
}

/** Blinding Squall keystone: true if `pos` is standing inside an active
 *  (non-lingering) Blizzard owned by `ownerId` that has the keystone
 *  stamped on it. Excludes Permafrost's lingering (`noDamage`) zone — that
 *  is leftover chilled ground, not an active Blizzard, mirroring the
 *  Absolute Zero dwell exclusion in StateAdvancer.ts. */
function insideBlindingBlizzard(ownerId: string, pos: Vec2, fireWalls: FireWallState[]): boolean {
  return fireWalls.some(fw =>
    fw.kind === 'blizzard' && fw.ownerId === ownerId && fw.blindingSquall && !fw.noDamage &&
    fw.center && fw.radius &&
    (pos.x - fw.center.x) ** 2 + (pos.y - fw.center.y) ** 2 <= (fw.radius + PLAYER_HALF_SIZE) ** 2);
}

function broadcastState(roomId: string, room: Room, state: GameState): void {
  const wire = roundForWire(state) as GameState;
  // volatile: a stalled client skips snapshots instead of buffering them
  // unboundedly server-side; the next snapshot supersedes anyway. The final
  // 'ended' snapshot has NO successor and carries the last death (FFA
  // placement, death visuals) — it must be delivered reliably.
  const reliable = state.phase === 'ended';
  // Blind Strike meteors must not be visible to opponents, and Blinding
  // Squall hides a caster's meteor impact indicators from anyone standing
  // inside their Blizzard — both filter per recipient.
  const anyHidden = state.meteors.some(m => m.hidden) ||
    state.fireWalls.some(fw => fw.kind === 'blizzard' && fw.blindingSquall && !fw.noDamage);
  if (anyHidden) {
    for (const id of room.players.keys()) {
      const sock = io.sockets.sockets.get(id);
      if (!sock) continue;
      const emitter = reliable ? sock : sock.volatile;
      const recipientPos = state.players[id]?.position;
      emitter.emit('game-state', {
        ...wire,
        meteors: wire.meteors.filter(m => {
          if (m.ownerId === id) return true;
          if (m.hidden) return false;
          return !(recipientPos && insideBlindingBlizzard(m.ownerId, recipientPos, state.fireWalls));
        }),
      });
    }
  } else {
    const emitter = reliable ? io.to(roomId) : io.to(roomId).volatile;
    emitter.emit('game-state', wire);
  }
}

async function settleMatchEnd(roomId: string, room: Room, state: GameState, endedLoop?: GameLoop): Promise<void> {
  const matchResults: Record<string, {
    xpGained: number; levelsGained: number; newLevel: number; newXp: number;
    goldGained: number; droppedItem?: ItemRow;
  }> = {};
  for (const [socketId, userId] of room.userIds.entries()) {
    const characterId = room.characterIds.get(socketId);
    if (!characterId) continue;
    let won: boolean;
    if (state.gameMode === '2v2') {
      const playerTeam = room.teamAssignments.get(socketId);
      won = state.winner === playerTeam;
    } else {
      won = state.winner === socketId;
    }
    const gold = GOLD_PER_MATCH + (won ? GOLD_WIN_BONUS : 0);
    const result = await creditMatchResult(userId, characterId, won, gold);
    // Loot box roll is win-only and free (no gold cost) — a losing match
    // still credits gold above but never rolls a drop.
    const droppedItem = won ? await maybeRollMatchDrop(supabase, userId) : null;
    matchResults[socketId] = {
      xpGained: result.xpGained, levelsGained: result.levelsGained, newLevel: result.newLevel, newXp: result.newXp,
      goldGained: gold, ...(droppedItem ? { droppedItem } : {}),
    };
  }
  io.to(roomId).emit('duel-ended', { winnerId: state.winner, gameMode: state.gameMode, matchResults });

  // Reclaim resources: the loop is done, and players whose sockets are gone
  // will never rematch — without this, mid-match FFA/2v2 disconnects leave
  // ghost entries that keep the room alive forever. The credit awaits above
  // yield, though, so a rematch may have started meanwhile — never touch a
  // successor loop's resources.
  if (!endedLoop || loops.get(roomId) === endedLoop) loops.delete(roomId);
  if (room.state === null || room.state.phase === 'ended') {
    for (const id of [...room.players.keys()]) {
      if (!io.sockets.sockets.get(id)) room.removePlayer(id);
    }
    if (room.players.size === 0) roomManager.deleteRoom(roomId);
  }
}

/**
 * End a match by decree (forfeit, pause timeout, concede) rather than combat.
 * Routes through settleMatchEnd so XP crediting, the duel-ended payload
 * (including matchResults), and room/loop cleanup stay identical to a normal
 * win — forfeits previously skipped matchResults and the client showed no XP.
 */
function forfeitMatch(roomId: string, room: Room, winnerId: string | null): void {
  if (!room.state) return;
  const loop = loops.get(roomId);
  loop?.stop();
  room.state.phase = 'ended';
  room.state.winner = winnerId;
  settleMatchEnd(roomId, room, room.state, loop)
    .then(() => {
      // Every forfeit means the opponent is gone and the room is torn down —
      // tell remaining clients so the result screen disables Rematch (it
      // would otherwise be a silent no-op against a deleted room). Must fire
      // AFTER duel-ended so the client takes its post-match branch.
      io.to(roomId).emit('opponent-disconnected');
    })
    .catch(err => console.error('Match settlement failed:', err));
}

function startGameLoop(roomId: string, room: Room): void {
  const loop = new GameLoop();
  loops.set(roomId, loop);
  loop.start(room, state => {
    broadcastState(roomId, room, state);
    if (state.phase === 'ended') {
      settleMatchEnd(roomId, room, state, loop).catch(err => console.error('Match settlement failed:', err));
    }
  });
}

app.use(cors(corsConfig));
app.use(express.json());
app.use('/economy', economyRouter);

app.post('/rooms', (req, res) => {
  const mode = (req.body?.mode as GameModeType) ?? '1v1';
  const room = roomManager.createRoom(mode);
  if (!room) { res.status(503).json({ error: 'Server at capacity' }); return; }
  res.json({ roomId: room.id, mode });
});

app.get('/rooms', (_req, res) => {
  res.json({ rooms: roomManager.listOpenRooms() });
});

app.get('/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  res.json({ exists: !!room, full: room?.isFull ?? false });
});

app.post('/paused-match', async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) { res.status(401).json({ roomId: null }); return; }
  const result = await loadUserFromToken(token);
  if (!result.ok) { res.status(401).json({ roomId: null }); return; }
  const room = roomManager.findPausedMatchForUser(result.userId);
  res.json({ roomId: room?.id ?? null });
});

io.on('connection', socket => {
  let currentRoomId: string | null = null;

  socket.on('join-room', async ({ roomId, displayName, accessToken, teamId, characterId }: {
    roomId: string;
    displayName: string;
    accessToken?: string;
    teamId?: string;
    characterId?: string;
  }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) { socket.emit('room-not-found'); return; }

    displayName = String(displayName ?? '').trim().slice(0, 24) || 'Anonymous';
    const result = room.addPlayer(socket.id, displayName, teamId);
    if (result === 'full') { socket.emit('room-full'); return; }
    if (result === 'team-full') { socket.emit('team-full'); return; }

    if (accessToken && characterId) {
      const skillResult = await loadSkillsForCharacter(accessToken, characterId);
      if (skillResult.ok) {
        room.skillSets.set(socket.id, skillResult.skills);
        room.charClasses.set(socket.id, skillResult.charClass);
        room.appearances.set(socket.id, skillResult.appearance);
        room.userIds.set(socket.id, skillResult.userId);
        room.characterIds.set(socket.id, characterId);
        room.loadouts.set(socket.id, skillResult.items);
      }
    }

    socket.join(roomId);
    currentRoomId = roomId;

    socket.emit('room-joined', {
      roomId,
      yourId: socket.id,
      players: Object.fromEntries([...room.players.entries()].map(([id, p]) => [id, p.displayName])),
      mode: room.mode.type,
      teams: Object.fromEntries(room.teamAssignments),
      readyPlayerIds: [...room.players.entries()].filter(([, p]) => p.ready).map(([id]) => id),
    });
    socket.to(roomId).emit('player-joined', {
      id: socket.id,
      displayName,
      teamId: room.teamAssignments.get(socket.id),
    });
    if (room.players.size >= room.mode.minPlayers) io.to(roomId).emit('game-ready');
  });

  socket.on('chat-message', ({ text }: { text: string }) => {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    if (room.state !== null) return;
    const sanitized = String(text).trim().slice(0, 80);
    if (!sanitized) return;
    io.to(currentRoomId).emit('chat-message', {
      senderId: socket.id,
      displayName: player.displayName,
      text: sanitized,
    });
  });

  socket.on('player-ready', () => {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;
    const readyPlayer = room.players.get(socket.id);
    if (!readyPlayer || readyPlayer.ready) return;
    room.setReady(socket.id);

    io.to(currentRoomId).emit('player-ready-ack', { playerId: socket.id });

    if (room.allReady) {
      room.startMatch();
      startGameLoop(currentRoomId, room);
    }
  });

  socket.on('input', (raw: unknown) => {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.players.has(socket.id) || room.state === null) return;
    const input = sanitizeInput(raw);
    if (input) room.queueInput(socket.id, input);
  });

  socket.on('rematch', () => {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;
    if (room.state?.phase !== 'ended') return;

    const roomId = currentRoomId;
    if (!rematchVotes.has(roomId)) rematchVotes.set(roomId, new Set());
    const votes = rematchVotes.get(roomId)!;
    if (votes.has(socket.id)) return;
    votes.add(socket.id);

    const allVoted = [...room.players.keys()].every(id => votes.has(id));

    if (allVoted) {
      // All players agreed — start new match
      const timer = rematchTimers.get(roomId);
      if (timer) clearTimeout(timer);
      rematchTimers.delete(roomId);
      rematchVotes.delete(roomId);

      loops.get(roomId)?.stop();
      loops.delete(roomId);
      room.reset();
      for (const id of room.players.keys()) room.setReady(id);
      room.startMatch();
      startGameLoop(roomId, room);

      io.to(roomId).emit('rematch-ready');
    } else {
      // First vote — start countdown, notify everyone
      io.to(roomId).emit('rematch-requested', {
        requesterId: socket.id,
        countdown: REMATCH_COUNTDOWN_MS / 1000,
      });

      const timer = setTimeout(() => {
        rematchTimers.delete(roomId);
        rematchVotes.delete(roomId);
        // Kick players who didn't vote
        const currentRoom = roomManager.getRoom(roomId);
        if (!currentRoom) return;
        for (const [id] of currentRoom.players) {
          if (!votes.has(id)) {
            io.sockets.sockets.get(id)?.disconnect(true);
          }
        }
      }, REMATCH_COUNTDOWN_MS);

      rematchTimers.set(roomId, timer);
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoomId) return;

    // Clean up any pending rematch vote for this player
    const votes = rematchVotes.get(currentRoomId);
    if (votes) {
      votes.delete(socket.id);
      if (votes.size === 0) {
        rematchVotes.delete(currentRoomId);
        const rTimer = rematchTimers.get(currentRoomId);
        if (rTimer) clearTimeout(rTimer);
        rematchTimers.delete(currentRoomId);
      }
    }

    const room = roomManager.getRoom(currentRoomId);
    if (!room) return;

    const isMidMatch = room.state !== null && room.state.phase !== 'ended';

    if (isMidMatch) {
      if (room.mode.type === '1v1') {
        const userId = room.userIds.get(socket.id);
        if (!userId) {
          // Guests can't rejoin (rejoin requires an auth token) — treat the
          // disconnect as an immediate forfeit instead of leaking a zombie
          // loop that broadcasts to a half-empty room forever.
          const winnerId = [...room.players.keys()].find(id => id !== socket.id) ?? null;
          forfeitMatch(currentRoomId, room, winnerId);
          roomManager.deleteRoom(currentRoomId);
          return;
        }

        // 1v1 pause logic
        const loop = loops.get(currentRoomId);
        loop?.pause();
        room.pause(userId);

        socket.to(currentRoomId).emit('match-paused', {
          reason: 'opponent-disconnected',
          countdown: 60,
        });

        const roomId = currentRoomId;
        // Only start timer if one isn't already running (second disconnect during pause)
        if (pauseTimers.has(roomId)) return;
        const pauseTimer = setTimeout(() => {
          const r = roomManager.getRoom(roomId);
          if (!r || !r.pauseState) return;

          const connectedSocketId = [...r.players.entries()]
            .find(([sid]) => {
              const uid = r.userIds.get(sid);
              return uid && !r.pauseState!.disconnectedUserIds.has(uid);
            })?.[0];

          if (connectedSocketId) {
            forfeitMatch(roomId, r, connectedSocketId);
          } else {
            // No connected player = no result (both disconnected)
            loops.get(roomId)?.stop();
            loops.delete(roomId);
          }
          pauseTimers.delete(roomId);
          roomManager.deleteRoom(roomId);
        }, 60_000);

        pauseTimers.set(roomId, pauseTimer);
      } else {
        // FFA / 2v2: don't pause, start elimination timer
        const roomId = currentRoomId;
        const disconnectedSocketId = socket.id;
        const timer = setTimeout(() => {
          const r = roomManager.getRoom(roomId);
          if (r?.state && r.state.players[disconnectedSocketId]) {
            r.state.players[disconnectedSocketId].hp = 0;
          }
          pauseTimers.delete(`${roomId}:${disconnectedSocketId}`);
        }, DISCONNECT_TIMEOUT_MS);
        pauseTimers.set(`${roomId}:${disconnectedSocketId}`, timer);

        // Keep player in room so tick() still generates idle inputs for them
        socket.to(roomId).emit('player-disconnected', { playerId: socket.id });
      }
    } else {
      // Lobby phase or ended phase
      const leavingId = socket.id;
      room.removePlayer(leavingId);
      loops.get(currentRoomId)?.stop();
      loops.delete(currentRoomId);
      io.to(currentRoomId).emit('player-left', { playerId: leavingId });
      if (room.players.size === 0) roomManager.deleteRoom(currentRoomId);
    }
  });

  socket.on('rejoin-room', async ({ roomId, accessToken }: {
    roomId: string;
    accessToken: string;
  }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || !room.pauseState) {
      socket.emit('rejoin-failed', { reason: 'Room not found or not paused' });
      return;
    }

    const result = await loadUserFromToken(accessToken);
    if (!result.ok) {
      socket.emit('rejoin-failed', { reason: 'Invalid token' });
      return;
    }

    // Re-check after await — timer may have fired during the Supabase call
    if (!roomManager.getRoom(roomId) || !room.pauseState) {
      socket.emit('rejoin-failed', { reason: 'Match already ended' });
      return;
    }

    const userId = result.userId;
    if (!room.pauseState.disconnectedUserIds.has(userId)) {
      socket.emit('rejoin-failed', { reason: 'Not a disconnected player in this room' });
      return;
    }

    // Find the old socket ID for this user
    const oldSocketId = [...room.userIds.entries()]
      .find(([, uid]) => uid === userId)?.[0];
    if (!oldSocketId) {
      socket.emit('rejoin-failed', { reason: 'Player not found in room' });
      return;
    }

    // Remap socket ID
    room.remapPlayer(oldSocketId, socket.id);
    room.resume(userId);
    socket.join(roomId);
    currentRoomId = roomId;

    // Cancel pause timer if no one is disconnected anymore
    if (!room.pauseState) {
      const timer = pauseTimers.get(roomId);
      if (timer) {
        clearTimeout(timer);
        pauseTimers.delete(roomId);
      }

      // Resume game loop
      loops.get(roomId)?.resume();
    }

    // Send current state to reconnecting client
    const remappedPlayer = room.players.get(socket.id);
    const playersMap = Object.fromEntries(
      [...room.players.entries()].map(([id, p]) => [id, p.displayName])
    );
    socket.emit('rejoin-accepted', {
      yourId: socket.id,
      colorIndex: remappedPlayer?.colorIndex ?? 0,
      players: playersMap,
    });
    if (room.state) {
      socket.emit('game-state', room.state);
    }

    // Notify the other player
    if (!room.pauseState) {
      socket.to(roomId).emit('game-resumed');
    }
  });

  socket.on('leave-paused-match', () => {
    if (!currentRoomId) return;
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.pauseState || !room.state) return;

    // The leaving player concedes — the disconnected player wins
    const disconnectedSocketId = [...room.players.entries()]
      .find(([sid]) => {
        const uid = room.userIds.get(sid);
        return uid && room.pauseState!.disconnectedUserIds.has(uid);
      })?.[0];

    if (disconnectedSocketId) {
      forfeitMatch(currentRoomId, room, disconnectedSocketId);
    } else {
      loops.get(currentRoomId)?.stop();
      loops.delete(currentRoomId);
    }

    // Clean up
    const timer = pauseTimers.get(currentRoomId);
    if (timer) {
      clearTimeout(timer);
      pauseTimers.delete(currentRoomId);
    }
    roomManager.deleteRoom(currentRoomId);
  });
});

const PORT = process.env.PORT ?? 3000;
httpServer.listen(Number(PORT), '0.0.0.0', () => console.log(`Arena server running on :${PORT}`));
