-- Additive immutable receipt; legacy intentions deliberately retain SQL NULL.
ALTER TABLE payment_intent ADD COLUMN receipt_snapshot jsonb;
ALTER TABLE payment_intent ADD CONSTRAINT payment_intent_receipt_snapshot_check CHECK (
 receipt_snapshot IS NULL OR (
  jsonb_typeof(receipt_snapshot) = 'object'
  AND octet_length(receipt_snapshot::text) <= 2048
  AND receipt_snapshot ?& ARRAY['email','description','vatCode','paymentSubject','paymentMode']
  AND receipt_snapshot - ARRAY['email','description','vatCode','paymentSubject','paymentMode'] = '{}'::jsonb
  AND jsonb_typeof(receipt_snapshot->'email') = 'string'
  AND char_length(receipt_snapshot->>'email') BETWEEN 1 AND 254
  AND jsonb_typeof(receipt_snapshot->'description') = 'string'
  AND char_length(receipt_snapshot->>'description') BETWEEN 1 AND 128
  AND jsonb_typeof(receipt_snapshot->'vatCode') = 'number'
  AND receipt_snapshot->'vatCode' IN ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb,'6'::jsonb,'7'::jsonb,'8'::jsonb,'9'::jsonb,'10'::jsonb,'11'::jsonb,'12'::jsonb)
  AND jsonb_typeof(receipt_snapshot->'paymentSubject') = 'string'
  AND receipt_snapshot->>'paymentSubject' IN ('service','intellectual_activity')
  AND jsonb_typeof(receipt_snapshot->'paymentMode') = 'string'
  AND receipt_snapshot->>'paymentMode' = 'full_payment'
 ) IS TRUE
);
CREATE OR REPLACE FUNCTION credit_intent_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.account_id,NEW.price_minor,NEW.sku,NEW.offer_version,NEW.grant_seconds,NEW.period_days,NEW.idempotency_key,NEW.receipt_snapshot)
 IS DISTINCT FROM (OLD.account_id,OLD.price_minor,OLD.sku,OLD.offer_version,OLD.grant_seconds,OLD.period_days,OLD.idempotency_key,OLD.receipt_snapshot)
 THEN RAISE EXCEPTION 'immutable payment offer'; END IF; RETURN NEW; END $$;
