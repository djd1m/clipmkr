-- Ручное напоминание не меняет права и не создаёт платёж.
CREATE TABLE billing_notice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES account(id) ON DELETE CASCADE,
  authoritative_paid_end timestamptz NOT NULL,
  offset_days integer NOT NULL CHECK (offset_days IN (1,3)),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','accepted','failed','unknown','superseded')),
  payload jsonb,
  payload_hash text CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  provider_key text NOT NULL UNIQUE,
  due_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  lease_until timestamptz,
  provider_receipt text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id,authoritative_paid_end,offset_days),
  CHECK ((state='sending')=(lease_until IS NOT NULL)),
  CHECK ((first_attempt_at IS NULL)=(attempts=0)),
  CHECK ((last_attempt_at IS NULL)=(attempts=0)),
  CHECK ((payload IS NULL)=(attempts=0)),
  CHECK ((payload_hash IS NULL)=(attempts=0))
);
CREATE INDEX billing_notice_due ON billing_notice(due_at,id)
  WHERE state IN ('pending','failed','unknown','sending');

-- Native erasure сохраняет tombstone account; frozen получатель удаляется в той же TX.
CREATE FUNCTION erase_billing_notice_on_account_erasure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  DELETE FROM billing_notice WHERE account_id=NEW.id;
  RETURN NEW;
END $$;
CREATE TRIGGER billing_notice_on_account_erasure AFTER UPDATE OF status ON account
  FOR EACH ROW WHEN (NEW.status='deleted' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION erase_billing_notice_on_account_erasure();
