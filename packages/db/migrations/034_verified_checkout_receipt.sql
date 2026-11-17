-- Historical checkout rows retain a NULL recipient and never generate a receipt.
ALTER TABLE payment_intent ADD COLUMN receipt_recipient_email text;

CREATE OR REPLACE FUNCTION credit_intent_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.account_id,NEW.price_minor,NEW.sku,NEW.offer_version,NEW.grant_seconds,NEW.period_days,NEW.idempotency_key,NEW.receipt_snapshot,NEW.receipt_recipient_email)
 IS DISTINCT FROM (OLD.account_id,OLD.price_minor,OLD.sku,OLD.offer_version,OLD.grant_seconds,OLD.period_days,OLD.idempotency_key,OLD.receipt_snapshot,OLD.receipt_recipient_email)
 THEN RAISE EXCEPTION 'immutable payment offer'; END IF; RETURN NEW; END $$;

CREATE TABLE payment_receipt_delivery (
  intent_id uuid PRIMARY KEY REFERENCES payment_intent(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL UNIQUE REFERENCES payment(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'problem')),
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK ((attempts = 0) = (first_attempt_at IS NULL)),
  CHECK ((attempts = 0) = (payload IS NULL)),
  CHECK (status <> 'accepted' OR (attempts > 0 AND next_attempt_at IS NULL))
);

CREATE INDEX payment_receipt_delivery_due
  ON payment_receipt_delivery (next_attempt_at, intent_id) WHERE next_attempt_at IS NOT NULL;
