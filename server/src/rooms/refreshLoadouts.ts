import { Room } from './Room.ts';
import { loadCharacterState } from '../skills/loadSkills.ts';

/** Re-read every seated character's skills/appearance/gear so a rematch is
 * fought with current state — gear equipped since join-room (another tab, a
 * respec) otherwise neither renders on the model nor applies its stats.
 * A failed refresh keeps the previous loadout: stale beats silently empty. */
export async function refreshRoomLoadouts(room: Room): Promise<void> {
  await Promise.all([...room.characterIds.entries()].map(async ([socketId, characterId]) => {
    const userId = room.userIds.get(socketId);
    if (!userId) return;
    try {
      const res = await loadCharacterState(userId, characterId);
      if (!room.players.has(socketId)) return; // left while the read was in flight
      if (res.ok) room.applyCharacterState(socketId, res.state);
      else console.error(`rematch: loadout refresh failed for character ${characterId}: ${res.error}`);
    } catch (err) {
      console.error(`rematch: loadout refresh failed for character ${characterId}:`, err);
    }
  }));
}
