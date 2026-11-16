ALTER TABLE clip ADD COLUMN rendered_layout jsonb;
ALTER TABLE clip ADD CONSTRAINT clip_rendered_layout_shape CHECK
  (rendered_layout IS NULL OR (jsonb_typeof(rendered_layout)='object'
    AND rendered_layout->>'version'='1' AND jsonb_typeof(rendered_layout->'requested')='object'
    AND jsonb_typeof(rendered_layout->'resolved')='object') IS TRUE);

CREATE TABLE clip_layout_intent (
  clip_id uuid NOT NULL REFERENCES clip(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  source_revision text NOT NULL CHECK (source_revision ~ '^[a-f0-9]{64}$'),
  base_render_version integer NOT NULL CHECK (base_render_version>=1),
  render_version integer NOT NULL CHECK (render_version>base_render_version),
  series_no integer NOT NULL CHECK (series_no>=1),
  layout jsonb NOT NULL CHECK ((jsonb_typeof(layout)='object' AND layout->>'version'='1' AND layout->>'mode'='screen-face') IS TRUE),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clip_id,request_key), UNIQUE (clip_id,render_version), UNIQUE (clip_id,series_no)
);
CREATE TABLE clip_layout_seed (
  clip_id uuid PRIMARY KEY REFERENCES clip(id) ON DELETE CASCADE,
  source_revision text NOT NULL CHECK (source_revision ~ '^[a-f0-9]{64}$'),
  seed_revision text NOT NULL CHECK (seed_revision ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('pending','running','ready','unavailable')),
  lease_epoch integer NOT NULL DEFAULT 0 CHECK (lease_epoch>=0),
  lease_until timestamptz,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 2),
  payload jsonb,
  reason text CHECK (reason IN ('camera_unavailable','camera_ambiguous','source_access_unavailable','analysis_timeout')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status='running')=(lease_until IS NOT NULL)),
  CHECK ((status='ready')=(payload IS NOT NULL)),
  CHECK ((status='unavailable')=(reason IS NOT NULL))
);
