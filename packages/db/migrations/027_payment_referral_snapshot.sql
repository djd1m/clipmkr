ALTER TABLE payment_intent ADD COLUMN referral_partner_code_id uuid
  REFERENCES partner_code(id) ON DELETE SET NULL;

-- Only the current attribution known to precede the intent is defensible history.
UPDATE payment_intent i SET referral_partner_code_id=a.partner_code_id
FROM attribution a JOIN partner_code c ON c.id=a.partner_code_id
JOIN partner p ON p.id=c.partner_id
WHERE a.account_id=i.account_id AND a.status IN ('pending','activated')
  AND p.account_id<>i.account_id AND a.assigned_at<=i.created_at;
