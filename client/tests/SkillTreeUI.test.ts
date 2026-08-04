import { describe, it, expect } from 'vitest';
import { clampedRefund } from '../src/skills/SkillTreeUI';
import { SKILL_NODES, rankUpCost, totalSpentForRanks } from '@arena/shared';

// `arms.leap` and `arms.crushing_landing` are the two nodes the
// gladiator-followups cost rebalance actually touched (leap 2pt -> 1pt,
// crushing_landing 1pt -> 2pt); they're used here as-is so the test reflects
// real prices rather than a synthetic node shape.
const leap = SKILL_NODES.find(n => n.id === 'arms.leap')!;
const crushingLanding = SKILL_NODES.find(n => n.id === 'arms.crushing_landing')!;

describe('clampedRefund', () => {
  it('never asks the RPC for more than was ever paid on the node', () => {
    // leap's rebalance dropped its price 2 -> 1. A legacy owner who paid the
    // old price of 2 must get all 2 back, not today's 1 — the refund_skill_node
    // RPC bounds the payout by `total_spent`, and there is no later rank to
    // hold the remainder once rank 1 is refunded (the row gets deleted).
    expect(clampedRefund(leap, 1, 2)).toBe(2);
  });

  it('drains a rebalanced stackable node to exactly 0 total across all ranks', () => {
    // crushing_landing's rebalance raised its price 1 -> 2. A legacy owner
    // who reached rank 3 by paying the old price only ever paid 3 total
    // (1 pt/rank), but today's price would ask for 2 pts on the way back
    // down. Refunding rank-by-rank must still land on exactly 0 spent left,
    // matching what refund_skill_node's `total_spent` bound allows.
    let spent = 3;
    let rank = 3;

    const step1 = clampedRefund(crushingLanding, rank, spent);
    expect(step1).toBeLessThanOrEqual(spent);
    spent -= step1;
    rank -= 1;

    const step2 = clampedRefund(crushingLanding, rank, spent);
    expect(step2).toBeLessThanOrEqual(spent);
    spent -= step2;
    rank -= 1;

    const step3 = clampedRefund(crushingLanding, rank, spent);
    expect(step3).toBeLessThanOrEqual(spent);
    spent -= step3;
    rank -= 1;

    expect(step1 + step2 + step3).toBe(3);
    expect(spent).toBe(0);
    expect(rank).toBe(0);
  });

  it('leaves refund math unchanged for a node bought entirely at current prices', () => {
    // No rebalance in play: `total_spent` matches what `rankUpCost` would
    // recompute today, so the clamp is a no-op and the result matches the
    // pre-fix `rankUpCost(node, currentRank - 1)` formula exactly.
    const rank = 2;
    const spent = totalSpentForRanks(crushingLanding, rank); // 2 + 2 = 4 at today's price
    expect(clampedRefund(crushingLanding, rank, spent)).toBe(rankUpCost(crushingLanding, rank - 1));
  });

  it('refunds the full remaining balance when the last rank goes, even with nothing rebalanced', () => {
    const spent = totalSpentForRanks(leap, 1); // = leap.cost, no history to disagree with
    expect(clampedRefund(leap, 1, spent)).toBe(spent);
  });
});
