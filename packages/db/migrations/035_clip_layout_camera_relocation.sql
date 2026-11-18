ALTER TABLE clip_layout_intent DROP CONSTRAINT clip_layout_intent_layout_check;
ALTER TABLE clip_layout_intent ADD CONSTRAINT clip_layout_intent_layout_check CHECK ((
  jsonb_typeof(layout) = 'object'
  AND layout->>'mode' = 'screen-face'
  AND (
    layout->'version' = '1'::jsonb
    OR (
      layout->'version' IN ('2'::jsonb, '3'::jsonb)
      AND layout->>'variant' IN ('01', '02')
      AND layout->'focus' = 'null'::jsonb
    )
    OR (
      layout->'version' = '3'::jsonb
      AND layout->>'variant' = '03'
      AND jsonb_typeof(layout->'focus') IN ('null', 'object')
    )
  )
) IS TRUE);
