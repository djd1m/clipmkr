-- Existing renders may have written their immutable v1 object already.
-- Keep the standard decision for those rows. New rows are undecided.
ALTER TABLE clip ADD COLUMN initial_layout jsonb DEFAULT 'null'::jsonb;
ALTER TABLE clip ALTER COLUMN initial_layout DROP DEFAULT;
ALTER TABLE clip ADD CONSTRAINT clip_initial_layout_check CHECK ((
  initial_layout IS NULL OR initial_layout = 'null'::jsonb OR (
    jsonb_typeof(initial_layout) = 'object'
    AND initial_layout->'version' = '3'::jsonb
    AND initial_layout->>'mode' = 'screen-face'
    AND initial_layout->>'variant' = '02'
    AND initial_layout->'screen' = '{"x":0,"y":0,"width":1,"height":1}'::jsonb
    AND initial_layout->'focus' = 'null'::jsonb
    AND jsonb_typeof(initial_layout->'camera') IN ('object', 'null')
  )
) IS TRUE);
