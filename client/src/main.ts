import { Scene } from './renderer/Scene';
import { Arena } from './renderer/Arena';
import { CharacterMesh } from './renderer/CharacterMesh';
import { SpellRenderer, ArrowElement } from './renderer/SpellRenderer';
import { StateBuffer } from './network/StateBuffer';
import { Predictor, PredictOpts } from './network/Predictor';
import { SocketClient } from './network/SocketClient';
import { InputHandler } from './input/InputHandler';
import { HUD } from './hud/HUD';
import { LobbyUI } from './lobby/LobbyUI';
import { AuthUI } from './auth/AuthUI';
import { SkillTreeUI } from './skills/SkillTreeUI';
import { GearScreen } from './items/GearScreen';
import { ShopScreen } from './items/ShopScreen';
import { AdminScreen } from './admin/AdminScreen';
import { supabase, fetchProfile, fetchCharacters, fetchItems, fetchGold } from './supabase';
import { GameState, NodeId, SpellId, SPELL_CONFIG, SPELL_BINDINGS, CLASS_DEFAULT_NODE, teleportMaxRange, TICK_RATE, computeLoadout, deriveElement, appearanceFromRow } from '@arena/shared';
import { CharacterSelectUI } from './character/CharacterSelectUI';
import type { CharacterRecord, CharacterClass } from '@arena/shared';
import { AssetLoader } from './renderer/AssetLoader';
import type { LoadedAssets } from './renderer/AssetLoader';
import { LoadingScreen } from './loading/LoadingScreen';
import type { NavContext, NavKey } from './ui/navBar';
import { injectPixelTheme } from './ui/pixelTheme';
import { CreditsScreen } from './ui/CreditsScreen';

injectPixelTheme();

const container = document.getElementById('canvas-container')!;
const uiOverlay = document.getElementById('ui-overlay')!;

const loadingScreen = new LoadingScreen(uiOverlay);
const creditsScreen = new CreditsScreen(uiOverlay);

const scene = new Scene(container);

// The arena renders continuously from boot, so it's on screen unless a menu
// happens to be covering it — and menu swaps await network work between
// hiding one screen and showing the next, which flashes the arena through.
// Tie the canvas to "a match is actually running" instead.
function setArenaVisible(visible: boolean): void {
  container.style.display = visible ? '' : 'none';
}
setArenaVisible(false);

const hud = new HUD(uiOverlay);
hud.hide();

const stateBuffer = new StateBuffer();
// Cast-animation triggers latched at snapshot arrival. The server sets
// castingSpell for exactly one tick, so sampling it from the interpolated
// state can miss the one-tick window entirely on a 60Hz display with frame
// jitter — the spell fires with no cast animation. Latching on arrival is
// immune to render-frame timing; the render loop consumes and clears it.
const pendingCastAnim = new Set<string>();
const socket = new SocketClient();

let myId = '';
let currentRoomId = '';
let currentPlayers: Record<string, string> = {};
let playerMeshes = new Map<string, CharacterMesh>();
let spellRenderer: SpellRenderer | null = null;
let inputHandler: InputHandler | null = null;
let allPlayerNames: Record<string, string> = {};
let currentMode = '1v1';
let myTeamId: string | undefined;
let handlersRegistered = false;
let pendingRejoin: { roomId: string } | null = null;
let deathOrder: string[] = [];
let readyPlayers = new Set<string>();
let predictor: Predictor | null = null;

let accessToken = '';
let activeCharacter: CharacterRecord | null = null;
let ownedSpells = new Set<SpellId>();
let playerElement: ArrowElement = 'none';

function spellsFromNodes(nodes: Set<NodeId>): Set<SpellId> {
  const result = new Set<SpellId>();
  for (const b of SPELL_BINDINGS) {
    if (nodes.has(b.node)) result.add(b.spell);
  }
  return result;
}

let phaseShiftRank = 0;

/** Re-derive owned spells, arrow element, and modifier ranks from the DB —
 * merging talent-tree ranks with equipped-item talent affixes so the client
 * predicts off the same effective ranks the server computes at match start. */
async function refreshLoadout(characterId: string, charClass: string): Promise<void> {
  const { data } = await supabase.from('skill_unlocks').select('node_id, rank').eq('character_id', characterId);
  const rows = (data ?? []) as { node_id: string; rank: number | null }[];
  const nodeSet = new Set<NodeId>(rows.map(r => r.node_id as NodeId));
  const defaultNode = CLASS_DEFAULT_NODE[charClass as CharacterClass];
  if (defaultNode) nodeSet.add(defaultNode);

  const effRanks = new Map<NodeId, number>();
  for (const r of rows) effRanks.set(r.node_id as NodeId, r.rank ?? 0);

  const items = (await fetchItems()).filter(i => i.equipped_by === characterId);
  const { talentRanks } = computeLoadout(items, charClass as CharacterClass);
  for (const [node, addedRank] of talentRanks) {
    nodeSet.add(node);
    effRanks.set(node, (effRanks.get(node) ?? 0) + addedRank);
  }

  // Now that this runs in the background off section switches, the two awaits
  // above can straddle a sign-out or a character switch. Committing then would
  // apply a character the user has already left — and after sign-out, would
  // rebuild the spell bar for the previous account. Callers that set
  // activeCharacter before calling (character select) still pass this check.
  if (activeCharacter?.id !== characterId) return;

  ownedSpells = spellsFromNodes(nodeSet);
  playerElement = deriveElement(effRanks);
  phaseShiftRank = effRanks.get('utility.phase_shift' as NodeId) ?? 0;
  hud.buildSpellSlots(ownedSpells);
}

/** Re-deriving the loadout used to be awaited between hiding one screen and
 * showing the next, which put one to three network round trips of blank
 * screen into every section switch. It's queued in the background instead;
 * the in-flight promise is parked here and awaited at match start, which is
 * the only point the derived ranks actually have to be correct. */
let pendingLoadoutSync: Promise<void> = Promise.resolve();
/** True while openSection is hopping between sections, so a background sync
 * knows whether the lobby is the surface currently on screen. */
let inSection = false;

function queueLoadoutSync(): void {
  const character = activeCharacter;
  if (!character) return;
  pendingLoadoutSync = refreshLoadout(character.id, character.class)
    .catch(err => { console.error('loadout sync failed:', err); });
}

/** Skills can spend points, so its exit re-reads the character row too. */
function queueCharacterSync(): void {
  const character = activeCharacter;
  if (!character) return;
  pendingLoadoutSync = (async () => {
    const chars = await fetchCharacters();
    // Same in-flight-staleness guard as refreshLoadout's.
    if (activeCharacter?.id !== character.id) return;
    const updated = chars.find(c => c.id === character.id);
    if (!updated) return;
    const pointsChanged = updated.skill_points_available !== character.skill_points_available;
    activeCharacter = updated;
    await refreshLoadout(updated.id, updated.class);
    // The nav badge and hero plate both show unspent points. Only re-render
    // on an actual change — showHome rebuilds its markup, which would
    // otherwise clobber a half-typed room code for no reason.
    if (pointsChanged && !inSection) renderLobbyHome();
  })().catch(err => { console.error('character sync failed:', err); });
}

/** Fresh profiles.gold read pushed into the lobby's gold pill — gold is
 * never computed client-side (see supabase.ts's fetchGold). Called on every
 * lobby show/return and after duel-ended processing (below), and exposed
 * for Task 5/6's shop and stash-sell flows to call once they mutate gold.
 * With no session, sets the pill to hidden (null) rather than fetching a
 * meaningless 0. */
async function refreshGold(): Promise<void> {
  if (!accessToken) { currentGold = null; lobby.setGold(null); return; }
  const gold = await fetchGold();
  currentGold = gold;
  lobby.setGold(gold);
}

/** Chrome state the shared nav bar shows on every screen. Read at render
 * time by each screen so a section switch never paints stale gold/points. */
function navContext(): NavContext {
  return {
    username: activeCharacter?.name ?? myDisplayName,
    gold: currentGold,
    skillPoints: activeCharacter?.skill_points_available,
    isAdmin: isAdminFlag,
  };
}

const navAccountHandlers = {
  onCredits: () => { void creditsScreen.show(); },
  onLogout: () => { void handleLogout(); },
};

/** Sign out and return to the auth screen. Shared by the lobby's account
 * menu and every sub-screen's copy of that menu. */
async function handleLogout(): Promise<void> {
    try { await supabase.auth.signOut(); } catch { /* proceed anyway */ }
    stopGame();
    accessToken = '';
    activeCharacter = null;
    handlersRegistered = false;
    myId = '';
    currentRoomId = '';
    currentPlayers = {};
    allPlayerNames = {};
    currentMode = '1v1';
    myTeamId = undefined;
    ownedSpells = new Set();
    pendingRejoin = null;
    // Gear and Shop cache their last read to make the tab switch instant;
    // both are account-scoped, so the cache dies with the session.
    gearScreen.reset();
    shopScreen.reset();
    pendingLoadoutSync = Promise.resolve();
    socket.disconnect();
    lobby.hide();
    isAdminFlag = false;
    lobby.setAdmin(false);
    auth.show();
}

function renderLobbyHome(): void {
  if (activeCharacter) {
    lobby.showHome(
      activeCharacter.name,
      activeCharacter.skill_points_available,
      activeCharacter.class,
      activeCharacter.level,
      appearanceFromRow(activeCharacter.appearance, activeCharacter.class),
    );
  } else {
    lobby.showHome(myDisplayName);
  }
}

/** Open one section and return where the user asked to go next. Screens whose
 * contents can invalidate the derived loadout queue that refresh on the way
 * out rather than awaiting it — see pendingLoadoutSync. */
async function runSection(key: Exclude<NavKey, 'arena'>): Promise<NavKey> {
  if (key === 'skills') {
    if (!activeCharacter) return 'arena';
    const next = await skillTreeUI.show(activeCharacter.id);
    queueCharacterSync();
    return next;
  }
  if (key === 'gear') {
    if (!activeCharacter) return 'arena';
    const next = await gearScreen.show(activeCharacter.id, activeCharacter.class, activeCharacter.level);
    queueLoadoutSync();
    return next;
  }
  if (key === 'shop') {
    if (!activeCharacter) return 'arena';
    return await shopScreen.show();
  }
  return await adminScreen.show();
}

/** Nav-tab navigation: stay out of the lobby while the user hops between
 * sections, and only re-render the lobby once they land back on Arena. */
async function openSection(start: NavKey): Promise<void> {
  if (start === 'arena') return;
  inSection = true;
  lobby.hide();
  let target: NavKey = start;
  // Nothing in this loop may await the network between one screen's hide()
  // and the next one's first paint. Promise resolution is a microtask, so as
  // long as the path stays microtask-only the browser never gets a chance to
  // paint the gap — that gap was the black flash. Both the gold read and the
  // loadout re-derivation are deliberately fire-and-forget for that reason.
  while (target !== 'arena') {
    target = await runSection(target as Exclude<NavKey, 'arena'>);
    void refreshGold();
  }
  lobby.show();
  renderLobbyHome();
  inSection = false;
}

const PLAYER_COLORS: Record<number, number> = {
  0: 0xc8a000,  // gold
  1: 0xc00030,  // red
  2: 0x0080c0,  // blue
  3: 0x00a040,  // green
};
let myColorIndex = 0;
let assets: LoadedAssets;

let myDisplayName = '';
let currentGold: number | null = null;
let isAdminFlag = false;

const skillTreeUI = new SkillTreeUI(uiOverlay, navContext, navAccountHandlers);
const gearScreen = new GearScreen(uiOverlay, navContext, navAccountHandlers);
const shopScreen = new ShopScreen(uiOverlay, navContext, navAccountHandlers);
const adminScreen = new AdminScreen(uiOverlay, navContext, navAccountHandlers);

const charSelect = new CharacterSelectUI(uiOverlay, {
  onSelectCharacter: async (character) => {
    activeCharacter = character;
    await refreshLoadout(character.id, character.class);
    charSelect.hide();
    lobby.show();
    lobby.showHome(
      character.name,
      character.skill_points_available,
      character.class,
      character.level,
      appearanceFromRow(character.appearance, character.class),
    );
    void refreshGold();
  },
  onLogout: async () => {
    try { await supabase.auth.signOut(); } catch {}
    stopGame();
    accessToken = '';
    activeCharacter = null;
    handlersRegistered = false;
    myId = '';
    currentRoomId = '';
    currentPlayers = {};
    allPlayerNames = {};
    currentMode = '1v1';
    myTeamId = undefined;
    ownedSpells = new Set();
    pendingRejoin = null;
    // Keep in step with handleLogout above — this path duplicates it.
    gearScreen.reset();
    shopScreen.reset();
    pendingLoadoutSync = Promise.resolve();
    socket.disconnect();
    lobby.hide();
    isAdminFlag = false;
    lobby.setAdmin(false);
    charSelect.hide();
    auth.show();
  },
});
charSelect.hide();

const auth = new AuthUI(uiOverlay, {
  onAuthed: async (username, token) => {
    accessToken = token;
    auth.hide();
    await assetsReady;
    loadingScreen.hide();

    // Cached once per session — the admin button's visibility is cosmetic
    // only (every admin RPC and the items-table RLS policy independently
    // re-check profiles.is_admin server-side), so a single fetch here is
    // enough for the lifetime of this login.
    const profile = await fetchProfile();
    isAdminFlag = profile?.is_admin ?? false;
    lobby.setAdmin(isAdminFlag);

    const pausedRoomId = await checkPausedMatch(token);
    if (pausedRoomId) {
      await attemptAutoRejoin(pausedRoomId, username, undefined);
      return;
    }

    await charSelect.show();
  },
  onShowLogin: async () => {
    await assetsReady;
    loadingScreen.hide();
  },
});

async function checkPausedMatch(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/paused-match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const { roomId } = await res.json();
    return roomId;
  } catch {
    return null;
  }
}

async function attemptAutoRejoin(
  roomId: string,
  username: string,
  skillPoints: number | undefined
): Promise<void> {
  try { await assetsReady; } catch { return; }

  myDisplayName = username;
  currentRoomId = roomId;
  setupSocketHandlers(username);
  socket.connect();

  socket.onRejoinAccepted(payload => {
    myId = payload.yourId;
    myColorIndex = payload.colorIndex;
    currentPlayers = payload.players;
    allPlayerNames = { ...payload.players };
    hud.init(myId);
    lobby.hide();
  });
  socket.onRejoinFailed(() => {
    currentRoomId = '';
    myId = '';
    lobby.show();
    lobby.showHome(username, skillPoints);
    void refreshGold();
  });
  socket.rejoinRoom(roomId, accessToken);
}

const lobby = new LobbyUI(uiOverlay, {
  onCreateRoom: async (displayName, mode) => {
    // Section switches queue the loadout re-derivation instead of awaiting it;
    // this is where it has to have landed.
    await pendingLoadoutSync;
    myDisplayName = displayName;
    currentMode = mode;
    const res = await fetch(`${import.meta.env.VITE_SERVER_URL ?? ''}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const { roomId } = await res.json();
    socket.connect();
    socket.joinRoom(roomId, displayName, accessToken, undefined, activeCharacter?.id);
    socket.onRoomJoined(({ yourId, mode: serverMode, teams, readyPlayerIds }) => {
      myId = yourId;
      currentRoomId = roomId;
      currentPlayers = { [yourId]: displayName };
      currentMode = serverMode ?? mode;
      myTeamId = teams?.[yourId];
      readyPlayers = new Set(readyPlayerIds ?? []);
      myColorIndex = 0;
      hud.init(myId);
      lobby.showReady(roomId, currentPlayers, myId, currentMode, readyPlayers);
      lobby.appendSystemMessage('You have entered the lobby');
    });
    setupSocketHandlers(displayName);
  },
  onJoinRoom: async (roomId, displayName, teamId?) => {
    await pendingLoadoutSync;
    myDisplayName = displayName;
    socket.connect();
    socket.joinRoom(roomId, displayName, accessToken, teamId, activeCharacter?.id);
    socket.onRoomJoined(({ yourId, players, mode: serverMode, teams, readyPlayerIds }) => {
      myId = yourId;
      currentRoomId = roomId;
      currentPlayers = players;
      currentMode = serverMode ?? '1v1';
      myTeamId = teams?.[yourId];
      readyPlayers = new Set(readyPlayerIds ?? []);
      myColorIndex = Object.keys(players).indexOf(yourId);
      hud.init(myId);
      allPlayerNames = { ...players };
      lobby.showReady(roomId, players, yourId, currentMode, readyPlayers);
      lobby.appendSystemMessage('You have entered the lobby');
    });
    setupSocketHandlers(displayName);
  },
  onReady: () => socket.ready(),
  onRematch: () => socket.rematch(),
  onReturnToLobby: () => {
    stopGame();
    socket.disconnect();
    handlersRegistered = false;
    currentRoomId = '';
    currentPlayers = {};
    allPlayerNames = {};
    currentMode = '1v1';
    myTeamId = undefined;
    if (activeCharacter) {
      lobby.showHome(
        activeCharacter.name,
        activeCharacter.skill_points_available,
        activeCharacter.class,
        activeCharacter.level,
        appearanceFromRow(activeCharacter.appearance, activeCharacter.class),
      );
    } else {
      lobby.showHome(myDisplayName);
    }
    void refreshGold();
  },
  onSendChatMessage: (text) => socket.sendChatMessage(text),
  onLogout: () => { void handleLogout(); },
  onOpenSkills: () => { void openSection('skills'); },
  onOpenGear: () => { void openSection('gear'); },
  onOpenShop: () => { void openSection('shop'); },
  onSwitchCharacter: async () => {
    lobby.hide();
    await charSelect.show();
  },
  onShowCredits: () => {
    void creditsScreen.show();
  },
  onOpenAdmin: () => { void openSection('admin'); },
});
lobby.hide();

function setupSocketHandlers(_myDisplayName: string): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  socket.onChatMessage(({ senderId, displayName, text }) =>
    lobby.appendChatMessage(senderId, displayName, text)
  );

  socket.onPlayerJoined(({ id, displayName }) => {
    allPlayerNames[id] = displayName;
    currentPlayers[id] = displayName;
    lobby.showReady(currentRoomId, currentPlayers, myId, currentMode, readyPlayers);
    lobby.appendSystemMessage(`${displayName} has entered the lobby`);
  });

  socket.onGameReady(() => lobby.showReady(currentRoomId, currentPlayers, myId, currentMode, readyPlayers));

  socket.onPlayerReadyAck(({ playerId }) => {
    readyPlayers.add(playerId);
    lobby.showReady(currentRoomId, currentPlayers, myId, currentMode, readyPlayers);
  });

  socket.onRematchRequested(({ requesterId, countdown }) => {
    const isRequester = requesterId === myId;
    lobby.showRematchCountdown(countdown, isRequester);
  });

  socket.onGameState((state: GameState) => {
    if (!spellRenderer) {
      stateBuffer.clear();
      pendingCastAnim.clear();
      startGame();
      lobby.hide();
    }
    const now = performance.now();
    stateBuffer.push(state, now);
    for (const [id, p] of Object.entries(state.players)) {
      if (p.castingSpell !== null) pendingCastAnim.add(id);
    }

    if (!predictor && state.players[myId]) {
      predictor = new Predictor(state.players[myId].position);
    }

    if (predictor && state.players[myId] && state.ack) {
      const ackSeq = state.ack[myId];
      if (ackSeq !== undefined) {
        predictor.reconcile(state.players[myId].position, ackSeq);
      }
    }
  });

  let duelEnded = false;

  socket.onDuelEnded(({ winnerId, gameMode, matchResults }) => {
    duelEnded = true;
    const mode = gameMode ?? currentMode;
    let won: boolean;
    if (mode === '2v2') {
      won = winnerId === myTeamId;
    } else {
      won = winnerId === myId;
    }
    lobby.hidePauseOverlay();
    stopGame();

    const myResult = matchResults?.[myId];
    if (mode === 'ffa' && !won) {
      const myDeathIndex = deathOrder.indexOf(myId);
      const totalPlayers = 4;
      const placement = myDeathIndex >= 0 ? totalPlayers - myDeathIndex : 1;
      lobby.showResult(won, mode, placement, myResult);
    } else {
      lobby.showResult(won, mode, undefined, myResult);
    }
    lobby.show();

    if (activeCharacter && myResult) {
      activeCharacter = {
        ...activeCharacter,
        level: myResult.newLevel || activeCharacter.level,
        xp: myResult.newXp ?? activeCharacter.xp,
      };
    }
    void refreshGold();
  });

  socket.onRematchReady(() => {
    duelEnded = false;
    stateBuffer.clear();
    startGame();
    lobby.hide();
  });

  socket.onOpponentDisconnected(() => {
    if (duelEnded) {
      lobby.disableRematch();
    } else if (currentMode === '1v1') {
      stopGame();
      lobby.showDisconnected();
      lobby.show();
    } else {
      // For FFA/2v2, just show a system message instead of the dramatic overlay
      lobby.appendSystemMessage('A player disconnected');
    }
  });

  socket.onPlayerDisconnected(({ playerId }) => {
    const name = allPlayerNames[playerId] ?? 'A player';
    lobby.appendSystemMessage(`${name} disconnected`);
    delete currentPlayers[playerId];
    lobby.showReady(currentRoomId, currentPlayers, myId, currentMode, readyPlayers);
  });

  socket.onPlayerLeft(({ playerId }) => {
    const name = allPlayerNames[playerId] ?? 'A player';
    lobby.appendSystemMessage(`${name} left the lobby`);
    delete currentPlayers[playerId];
    delete allPlayerNames[playerId];
    lobby.showReady(currentRoomId, currentPlayers, myId, currentMode, readyPlayers);
  });

  socket.onMatchPaused(({ countdown }) => {
    lobby.showPauseOverlay(countdown, () => {
      socket.leavePausedMatch();
    });
  });

  socket.onGameResumed(() => {
    lobby.hidePauseOverlay();
  });

  socket.onDisconnect(() => {
    if (spellRenderer && currentRoomId) {
      pendingRejoin = { roomId: currentRoomId };
    }
  });

  socket.onReconnect(() => {
    if (!pendingRejoin) return;
    socket.onRejoinAccepted(payload => {
      pendingRejoin = null;
      // The server remapped us to a new socket id — without adopting it,
      // every subsequent snapshot keys our player under an id we don't know:
      // prediction stops, the camera loses us, and our mesh renders as remote.
      myId = payload.yourId;
      myColorIndex = payload.colorIndex;
      currentPlayers = payload.players;
      allPlayerNames = { ...allPlayerNames, ...payload.players };
      hud.init(myId);
      // The renderer keys own-spell visuals (Blind Strike indicator, arrow
      // element tint) off the socket id — adopt the new one.
      spellRenderer?.setMyId(myId);
      predictor = null; // re-seeded from the next snapshot under the new id
    });
    socket.onRejoinFailed(() => {
      pendingRejoin = null;
      stopGame();
      lobby.showDisconnected();
      lobby.show();
    });
    socket.rejoinRoom(pendingRejoin.roomId, accessToken);
  });

  socket.onRoomNotFound(() => {
    if (activeCharacter) {
      lobby.showHome(
        activeCharacter.name,
        activeCharacter.skill_points_available,
        activeCharacter.class,
        activeCharacter.level,
        appearanceFromRow(activeCharacter.appearance, activeCharacter.class),
      );
    } else {
      lobby.showHome(myDisplayName);
    }
    void refreshGold();
  });
}

function startGame(): void {
  // Before InputHandler is built — it measures the canvas for mouse→world.
  setArenaVisible(true);
  for (const mesh of playerMeshes.values()) mesh.dispose(uiOverlay);
  playerMeshes.clear();
  spellRenderer?.dispose();
  inputHandler?.dispose();

  spellRenderer = new SpellRenderer(scene.scene, myId);
  spellRenderer.setArrowElement(playerElement);
  inputHandler = new InputHandler(scene, scene.renderer.domElement);
  if (activeCharacter) inputHandler.setCharacterClass(activeCharacter.class);

  // Guests have no skill unlocks but the server lets them cast their class's
  // four bound spells — show those slots rather than an empty bar.
  const slotSpells = ownedSpells.size > 0
    ? ownedSpells
    : new Set(SPELL_BINDINGS.filter(b => b.charClass === (activeCharacter?.class ?? 'mage')).map(b => b.spell));
  hud.buildSpellSlots(slotSpells);
  hud.show();
  lobby.hide();
}

function stopGame(): void {
  setArenaVisible(false);
  inputHandler?.dispose();
  inputHandler = null;
  spellRenderer?.dispose();
  spellRenderer = null;
  for (const mesh of playerMeshes.values()) mesh.dispose(uiOverlay);
  playerMeshes.clear();
  hud.hide();
  stateBuffer.clear();
  // A killing-blow cast latched on the final tick must not survive into a
  // rematch, whose startGame() path bypasses onGameState's clear.
  pendingCastAnim.clear();
  predictor = null;
  predictedTeleportReadyAt = 0;
  deathOrder = [];
  readyPlayers = new Set();
}

let lastFrameTime = performance.now();

// Input/prediction run on a fixed 60Hz step (matching the server tick) so
// simulation speed is independent of display refresh rate; rendering
// interpolates between steps.
const INPUT_STEP_MS = 1000 / 60;
let inputAccumulator = 0;
// Local cooldown gate for predicted teleports: the snapshot's cooldown lags
// one RTT behind, so Space auto-repeat would otherwise predict a second
// teleport the server rejects — a full-length rubber-band on reconcile.
let predictedTeleportReadyAt = 0;

scene.startRenderLoop(() => {
  const now = performance.now();
  const delta = Math.min((now - lastFrameTime) / 1000, 0.1);
  lastFrameTime = now;

  if (!inputHandler || !spellRenderer) return;

  inputAccumulator = Math.min(inputAccumulator + delta * 1000, 100);
  while (inputAccumulator >= INPUT_STEP_MS) {
    inputAccumulator -= INPUT_STEP_MS;
    const frame = inputHandler.buildInputFrame();
    if (predictor) {
      const latest = stateBuffer.getLatest();
      const me = latest?.players[myId];
      const opts: PredictOpts = {};
      if (latest && me) {
        // Mirror the server's movement multiplier exactly
        // (StateAdvancer.ts: `slowMult * p.statMults.moveSpeed`) — omitting
        // the gear multiplier here made every player wearing move-speed
        // affixes mispredict every tick and rubber-band continuously on
        // reconcile.
        const slowMult = (me.rootUntil ?? 0) > latest.tick ? 0 : ((me.slowUntil ?? 0) > latest.tick ? (me.slowFactor ?? 1) : 1);
        opts.speedMult = slowMult * (me.statMults?.moveSpeed ?? 1);
        // Predict teleport locally so it feels instant instead of arriving a
        // round-trip later as a slide. Only when the latest snapshot says the
        // server will actually accept the cast — a mispredicted teleport
        // would rubber-band across the map.
        if (frame.castSpell === 4 && ownedSpells.has(4) && now >= predictedTeleportReadyAt) {
          const phantom = (me.phantomStepUntil ?? 0) > latest.tick;
          const affordable = phantom || me.mana >= SPELL_CONFIG[4].manaCost;
          if ((me.cooldowns[4] ?? 0) <= 0 && affordable && me.hp > 0) {
            opts.teleportTarget = { ...frame.aimTarget };
            // Match the server's Phase-Shift-scaled range or every max-range
            // teleport mispredicts short.
            opts.teleportRange = teleportMaxRange(phaseShiftRank);
            // Phantom Step casts skip the server cooldown too.
            if (!phantom) {
              predictedTeleportReadyAt = now + (SPELL_CONFIG[4].cooldownTicks / TICK_RATE) * 1000;
            }
          }
        }
      }
      frame.seq = predictor.applyInput(frame.move, now, opts);
    }
    socket.sendInput(frame);
  }
  const stepAlpha = inputAccumulator / INPUT_STEP_MS;

  const state = stateBuffer.getInterpolated(now);
  if (!state) return;

  for (const [id, mesh] of playerMeshes) {
    if (!(id in state.players)) {
      mesh.dispose(uiOverlay);
      playerMeshes.delete(id);
    }
  }

  for (const [id, player] of Object.entries(state.players)) {
    if (player.hp <= 0 && !deathOrder.includes(id)) {
      deathOrder.push(id);
    }
    if (!playerMeshes.has(id)) {
      const playerIds = Object.keys(state.players);
      const colorIndex = playerIds.indexOf(id) % Object.keys(PLAYER_COLORS).length;
      const mesh = new CharacterMesh(player.charClass, player.appearance, PLAYER_COLORS[colorIndex], player.displayName, uiOverlay);
      scene.scene.add(mesh.group);
      playerMeshes.set(id, mesh);
    }
    const mesh = playerMeshes.get(id)!;

    if (id === myId && predictor) {
      // Face the live cursor from the predicted position — the snapshot's
      // facing is the same aim a round-trip late, which reads as a laggy
      // turn instead of Core Keeper's instant snap.
      const predicted = predictor.getRenderPosition(stepAlpha, now);
      const aim = inputHandler.getCurrentMouseWorld();
      const facing = Math.atan2(aim.y - predicted.y, aim.x - predicted.x);
      mesh.setPosition(predicted.x, predicted.y, facing);
    } else {
      mesh.setPosition(player.position.x, player.position.y, player.facing);
    }

    mesh.update(delta, pendingCastAnim.has(id));
    if (player.hp <= 0) mesh.die();
    // Shadowstep: invisible to enemies; you still see yourself.
    const invisible = (player.invisibleUntil ?? 0) > state.tick && id !== myId;
    mesh.setVisible(!invisible);
    mesh.updateLabel(scene.camera, scene.getCanvasRect());
  }
  pendingCastAnim.clear();

  if (predictor && state.players[myId]) {
    const predicted = predictor.getRenderPosition(stepAlpha, now);
    scene.updateCamera(predicted.x, predicted.y, delta);
  } else {
    const myPlayer = state.players[myId];
    if (myPlayer) {
      scene.updateCamera(myPlayer.position.x, myPlayer.position.y, delta);
    }
  }

  inputHandler.refreshMouseWorld();

  spellRenderer.update(state);
  hud.update(state, inputHandler.getActiveSpell());
});

// Async init — load assets then build scene
const assetsReady: Promise<void> = (async () => {
  assets = await AssetLoader.load();
  const arena = new Arena(assets.textures);
  arena.addToScene(scene.scene);
  scene.initPostProcessing();
})().catch(err => {
  console.error('Asset load failed:', err);
  throw err;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && predictor) {
    const latest = stateBuffer.getLatest();
    if (latest?.players[myId]) {
      predictor.reset(latest.players[myId].position);
    }
  }
});
