// Economy HTTP endpoints: vendor browse/buy, loot box open. Auth is a bearer
// user JWT (validated via loadUserFromToken, same helper /paused-match uses
// in index.ts) — never a game-server session concept, since these are plain
// account actions, not tied to any room/match.
import { Router, type Request, type Response, type NextFunction } from 'express';
import { loadUserFromToken } from '../skills/loadSkills.ts';
import { supabase } from '../supabase.ts';
import { buyerClient, utcDayString, getVendorView, buyVendorSlot, openLootbox } from './service.ts';

type AuthedRequest = Request & { userId: string; accessToken: string };

export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const result = await loadUserFromToken(token);
  if (!result.ok) { res.status(401).json({ error: 'Unauthorized' }); return; }
  (req as AuthedRequest).userId = result.userId;
  (req as AuthedRequest).accessToken = token;
  next();
}

export const economyRouter = Router();

economyRouter.get('/vendor', requireUser, async (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const utcDay = utcDayString();
  const slots = await getVendorView(supabase, userId, utcDay);
  res.json({ utcDay, slots });
});

economyRouter.post('/vendor/buy', requireUser, async (req: Request, res: Response) => {
  const { userId, accessToken } = req as AuthedRequest;
  const result = await buyVendorSlot(supabase, buyerClient(accessToken), userId, req.body?.slotIndex);
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ item: result.item });
});

economyRouter.post('/lootbox/open', requireUser, async (req: Request, res: Response) => {
  const { userId, accessToken } = req as AuthedRequest;
  const result = await openLootbox(supabase, buyerClient(accessToken), userId, req.body?.tier);
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ item: result.item });
});
