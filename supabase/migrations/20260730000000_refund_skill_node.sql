-- Refund a single rank from a skill node (right-click in the tree).
-- The client computes the refund via the shared rankUpCost table (same trust
-- model as unlock_skill_node's p_cost); the server bounds it by total_spent
-- so a node can never pay out more than was ever paid in — this also makes
-- the auto-granted class-default node (total_spent = 0) unrefundable.
CREATE OR REPLACE FUNCTION refund_skill_node(
  p_character_id UUID,
  p_node_id TEXT,
  p_refund INTEGER
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rank INTEGER;
  v_total_spent INTEGER;
BEGIN
  IF p_refund < 0 THEN
    RAISE EXCEPTION 'refund must be non-negative';
  END IF;

  -- Ownership check (newer convention; the older skill RPCs predate it).
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'character not found or not owned by caller';
  END IF;

  SELECT rank, total_spent INTO v_rank, v_total_spent
  FROM skill_unlocks
  WHERE character_id = p_character_id AND node_id = p_node_id;

  IF v_rank IS NULL THEN
    RAISE EXCEPTION 'node not owned';
  END IF;
  IF p_refund > v_total_spent THEN
    RAISE EXCEPTION 'refund exceeds points spent on node';
  END IF;

  IF v_rank > 1 THEN
    UPDATE skill_unlocks
    SET rank = rank - 1, total_spent = total_spent - p_refund
    WHERE character_id = p_character_id AND node_id = p_node_id;
  ELSE
    DELETE FROM skill_unlocks
    WHERE character_id = p_character_id AND node_id = p_node_id;
  END IF;

  UPDATE characters
  SET skill_points_available = skill_points_available + p_refund
  WHERE id = p_character_id;
END;
$$;
