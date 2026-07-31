import { describe, it, expect } from 'vitest';
import { accountMenuItems, skillsBadge, heroMetaHtml } from '../src/lobby/LobbyUI';

describe('accountMenuItems', () => {
  it('orders switch, credits, then sign out for non-admins', () => {
    expect(accountMenuItems(false).map(i => i.id)).toEqual(['credits', 'logout']);
  });

  it('slots admin before sign out for admins', () => {
    expect(accountMenuItems(true).map(i => i.id)).toEqual(['credits', 'admin', 'logout']);
  });
});

describe('skillsBadge', () => {
  it('is empty when points are absent or zero', () => {
    expect(skillsBadge(undefined)).toBe('');
    expect(skillsBadge(0)).toBe('');
  });

  it('shows the point count when positive', () => {
    expect(skillsBadge(3)).toBe('✦3');
  });
});

describe('heroMetaHtml', () => {
  it('joins class, level, and points with dividers', () => {
    expect(heroMetaHtml('mage', 6, 3)).toBe('Mage · Lv <b>6</b> · <b>✦3</b> skill pts');
  });

  it('omits missing parts', () => {
    expect(heroMetaHtml('ranger', 2, 0)).toBe('Ranger · Lv <b>2</b>');
    expect(heroMetaHtml(undefined, undefined, undefined)).toBe('');
  });

  it('escapes the class string', () => {
    expect(heroMetaHtml('<img>', 1, 0)).toBe('&lt;img&gt; · Lv <b>1</b>');
  });
});
