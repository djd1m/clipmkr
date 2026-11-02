-- Добавляющая миграция: старые записи сохраняют предел 90 минут.
ALTER TABLE account
  ADD COLUMN is_blogger boolean NOT NULL DEFAULT false,
  ADD COLUMN blogger_source_limit_seconds integer CHECK (blogger_source_limit_seconds BETWEEN 120 AND 86400),
  ADD COLUMN blogger_commission_percent integer CHECK (blogger_commission_percent IN (20,30));
ALTER TABLE video ADD COLUMN source_limit_seconds integer NOT NULL DEFAULT 5400
  CHECK (source_limit_seconds BETWEEN 120 AND 86400);
ALTER TABLE operator_action DROP CONSTRAINT operator_action_action_check;
ALTER TABLE operator_action ADD CONSTRAINT operator_action_action_check
  CHECK (action IN ('set_plan','credit_opt_in','set_owner_unlimited','set_blogger_policy'));
