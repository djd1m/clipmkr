-- Writers must be drained before this migration; no historical classification by config/date.
ALTER TABLE payment_intent ADD COLUMN payment_provider text;
ALTER TABLE payment_intent ADD COLUMN payment_environment text NOT NULL DEFAULT 'unknown';
ALTER TABLE payment_intent ADD COLUMN payment_merchant_id text;
ALTER TABLE payment ADD COLUMN payment_environment text NOT NULL DEFAULT 'unknown';
ALTER TABLE payment ADD COLUMN payment_merchant_id text;
ALTER TABLE payment_intent ADD CONSTRAINT payment_intent_provenance_check CHECK ((
 (payment_environment='unknown' AND payment_provider IS NULL AND payment_merchant_id IS NULL) OR
 (payment_provider='fake' AND payment_environment='test' AND payment_merchant_id IS NULL) OR
 (payment_provider='yookassa' AND payment_environment IN ('test','live') AND payment_merchant_id ~ '^[0-9]{1,64}$')
) IS TRUE);
ALTER TABLE payment ADD CONSTRAINT payment_provenance_check CHECK ((
 (payment_environment='unknown' AND payment_merchant_id IS NULL) OR
 (provider='fake' AND payment_environment='test' AND payment_merchant_id IS NULL) OR
 (provider='yookassa' AND payment_environment IN ('test','live') AND payment_merchant_id ~ '^[0-9]{1,64}$')
) IS TRUE);
CREATE FUNCTION payment_provenance_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.payment_environment <> 'unknown' AND
 (NEW.payment_environment,NEW.payment_merchant_id) IS DISTINCT FROM (OLD.payment_environment,OLD.payment_merchant_id)
 THEN RAISE EXCEPTION 'immutable payment provenance'; END IF;
 IF TG_TABLE_NAME='payment_intent' THEN
  IF OLD.payment_environment <> 'unknown' AND NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
  THEN RAISE EXCEPTION 'immutable payment provider'; END IF;
 ELSE
  IF NEW.provider IS DISTINCT FROM OLD.provider OR NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id
  THEN RAISE EXCEPTION 'immutable provider payment'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER payment_provenance_immutable BEFORE UPDATE ON payment FOR EACH ROW EXECUTE FUNCTION payment_provenance_immutable();
CREATE TRIGGER payment_intent_provenance_immutable BEFORE UPDATE ON payment_intent FOR EACH ROW EXECUTE FUNCTION payment_provenance_immutable();
