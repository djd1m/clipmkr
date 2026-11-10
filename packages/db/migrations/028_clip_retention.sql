-- Первая готовность не переезжает вместе с датой выкладки или повторным рендером.
ALTER TABLE clip ADD COLUMN ready_at timestamptz;
ALTER TABLE clip ADD COLUMN ready_at_source text NOT NULL DEFAULT 'unknown'
  CHECK (ready_at_source IN ('unknown','render','legacy_render','legacy_video'));
ALTER TABLE clip ADD COLUMN deletion_started_at timestamptz;
ALTER TABLE clip ADD COLUMN media_deleted_at timestamptz;
ALTER TABLE clip ADD COLUMN media_recheck_at timestamptz;
ALTER TABLE clip ADD CONSTRAINT clip_retention_ready_source CHECK ((ready_at IS NULL)=(ready_at_source='unknown'));
ALTER TABLE clip ADD CONSTRAINT clip_retention_claim CHECK
  ((deletion_started_at IS NULL AND media_deleted_at IS NULL AND media_recheck_at IS NULL)
   OR (deletion_started_at IS NOT NULL AND media_recheck_at IS NOT NULL));
WITH facts AS (SELECT c.id,COALESCE((SELECT min(a.finished_at) FROM job_attempt a
  WHERE a.clip_id=c.id AND a.stage='render' AND a.status='succeeded' AND NOT a.rerender),v.finished_at) AS ready,
  CASE WHEN EXISTS(SELECT 1 FROM job_attempt a WHERE a.clip_id=c.id AND a.stage='render'
    AND a.status='succeeded' AND NOT a.rerender AND a.finished_at IS NOT NULL) THEN 'legacy_render'
    WHEN v.finished_at IS NOT NULL THEN 'legacy_video' ELSE 'unknown' END AS provenance
  FROM clip c JOIN video v ON v.id=c.video_id WHERE c.status='done')
UPDATE clip c SET ready_at=f.ready,ready_at_source=f.provenance FROM facts f WHERE f.id=c.id;
CREATE INDEX clip_retention_ready ON clip(ready_at,id) WHERE status='done' AND deletion_started_at IS NULL;
CREATE INDEX clip_retention_recheck ON clip(media_recheck_at,id) WHERE deletion_started_at IS NOT NULL;
CREATE TABLE retention_notice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES video(id) ON DELETE CASCADE,
  expiry_day_msk date NOT NULL,
  deadline timestamptz NOT NULL,
  offset_days integer NOT NULL CHECK (offset_days IN (1,3)),
  clip_count integer NOT NULL CHECK (clip_count>0),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','accepted','failed','unknown','superseded')),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  provider_key text NOT NULL UNIQUE,
  due_at timestamptz NOT NULL,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  provider_receipt text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id,expiry_day_msk,offset_days),
  CHECK ((first_attempt_at IS NULL)=(attempts=0)),
  CHECK ((state='sending')=(lease_until IS NOT NULL))
);
CREATE INDEX retention_notice_due ON retention_notice(due_at,id) WHERE state IN ('pending','failed','unknown','sending');
