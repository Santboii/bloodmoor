-- Rename the 'amazon' character class to 'ranger'. Amazons are historically
-- women; the class supports any body type, so the name was misleading.
-- Order matters: widen the constraint, migrate the rows, then tighten.

ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_class_check;
ALTER TABLE characters ADD CONSTRAINT characters_class_check
  CHECK (class IN ('mage', 'amazon', 'ranger'));

UPDATE characters SET class = 'ranger' WHERE class = 'amazon';

ALTER TABLE characters DROP CONSTRAINT characters_class_check;
ALTER TABLE characters ADD CONSTRAINT characters_class_check
  CHECK (class IN ('mage', 'ranger'));

-- create_character validates the class value — accept the new name only.
CREATE OR REPLACE FUNCTION create_character(
  p_user_id UUID,
  p_name TEXT,
  p_class TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
  v_count INTEGER;
BEGIN
  IF p_class NOT IN ('mage', 'ranger') THEN
    RAISE EXCEPTION 'Invalid class: %', p_class;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM characters
  WHERE user_id = p_user_id;

  IF v_count >= 6 THEN
    RAISE EXCEPTION 'Maximum characters reached';
  END IF;

  INSERT INTO characters (user_id, name, class, xp, level, skill_points_available, skill_points_total)
  VALUES (p_user_id, p_name, p_class, 0, 1, 1, 1)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
