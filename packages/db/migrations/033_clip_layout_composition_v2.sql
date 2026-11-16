-- Extend accepted nested composition versions without rewriting immutable published snapshots.
-- Migration 032 and the published envelope version 1 remain unchanged.
ALTER TABLE clip_layout_intent DROP CONSTRAINT clip_layout_intent_layout_check;
ALTER TABLE clip_layout_intent ADD CONSTRAINT clip_layout_intent_layout_check CHECK ((
  jsonb_typeof(layout) = 'object'
  AND layout->>'mode' = 'screen-face'
  AND (
    layout->'version' = '1'::jsonb
    OR (
      layout->'version' = '2'::jsonb
      AND layout->>'variant' IN ('01', '02')
      AND layout->'focus' = 'null'::jsonb
    )
  )
) IS TRUE);
