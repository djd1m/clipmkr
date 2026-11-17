# План возврата попытки

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`,
`03_adr/001-personal-selection-quota-refund.md`, `05_architecture.md`.

1. ADR-001, FR-1. Вернуть день дебета из существующей авторизации выбора.
2. ADR-001, FR-1, FR-2. Возврат в терминальной транзакции под действующим fence, после завершения кредитного резерва.
3. ADR-001, FR-2, FR-3. Классификация типизированного 401/403 и операторское событие.
4. ADR-001, FR-1, FR-2, FR-3, FR-4. RED и проверки PostgreSQL, полночь, барьер pg_blocking_pids для двух завершений,
   порядок кредитного lock в гонке разных видео,
   штатный повтор, условия классификации и отказ БД. Один целевой прогон, типизация и lint.
5. FR-4. Независимый doc-first QE, подтверждение сборки и anti-drift.
   Воспроизводить отказ на изолированной БД и управляемом ответе HTTP.

EXPECTED_CODE_TARGETS:
- packages/db/src/selection.ts
- apps/worker/src/workers/select.ts
- tests/selection.integration.test.ts
- tests/selection-order.test.ts
