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

/** Express 4 does not catch a rejection from an async handler — nothing
 * awaits or .catches its returned promise, so an unhandled rejection there
 * just leaves the request hanging (no response, no error middleware).
 * buyerClient() throwing synchronously on a misconfigured
 * SUPABASE_URL/SUPABASE_ANON_KEY is exactly that case (the throw happens
 * inside an async function body, so it becomes a rejected promise, not a
 * synchronous throw Express could catch). Wrap every handler below with
 * this so any such failure turns into an explicit 500 instead of a silent
 * hang. Returns the (already-handled) promise so tests can await it. */
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => fn(req, res).catch(err => {
    console.error('economy route handler failed:', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.status(500).json({ error: 'internal error' });
  });
}

export async function getVendorHandler(req: Request, res: Response): Promise<void> {
  const { userId } = req as AuthedRequest;
  const utcDay = utcDayString();
  const slots = await getVendorView(supabase, userId, utcDay);
  res.json({ utcDay, slots });
}

export async function buyVendorHandler(req: Request, res: Response): Promise<void> {
  const { userId, accessToken } = req as AuthedRequest;
  const result = await buyVendorSlot(supabase, buyerClient(accessToken), userId, req.body?.slotIndex);
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ item: result.item });
}

export async function openLootboxHandler(req: Request, res: Response): Promise<void> {
  const { userId, accessToken } = req as AuthedRequest;
  const result = await openLootbox(supabase, buyerClient(accessToken), userId, req.body?.tier);
  if (!result.ok) { res.status(result.status).json({ error: result.error }); return; }
  res.json({ item: result.item });
}

export const economyRouter = Router();

economyRouter.get('/vendor', requireUser, asyncHandler(getVendorHandler));
economyRouter.post('/vendor/buy', requireUser, asyncHandler(buyVendorHandler));
economyRouter.post('/lootbox/open', requireUser, asyncHandler(openLootboxHandler));
