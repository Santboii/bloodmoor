import { describe, it, expect, vi, afterEach } from 'vitest';
import { supabase, freshAccessToken } from '../src/supabase';

afterEach(() => vi.restoreAllMocks());

describe('freshAccessToken', () => {
  it('returns the current session access token', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: { access_token: 'fresh-jwt' } },
      error: null,
    } as never);
    expect(await freshAccessToken()).toBe('fresh-jwt');
  });

  it('returns an empty string when signed out', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    expect(await freshAccessToken()).toBe('');
  });
});
