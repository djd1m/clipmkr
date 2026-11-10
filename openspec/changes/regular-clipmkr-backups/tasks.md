# Ledger задач

Задачи выполнены в указанном ниже объёме; execution authority — feature-adr plan. Доказательства: `features/regular-clipmkr-backups/08_qe_report.md` и `docs/operations/2026-11-10-regular-backups.md`.

- [x] Согласовать требования/ADR/план, закрыть независимый QCSD и native K1/K2
- [x] Реализовать минимальный native capture+wrapper+manifest+unit/timer, bounded own staging/capacity, source-bound valid JSONL prefix и явное исключение rebuildable scratch
- [x] Проверить отказные сценарии и actual temporary native roundtrip; cross-model QE и code/spec anti-drift
- [x] Установить только собственный descriptor `/etc/clipmkr/backup/clipmkr.backup-manifest.json` и timer после gates; без global registry/schema/rescan/daily hooks подтвердить первый реальный запуск service и snapshot в двух offsite copies; включить hourly timer. Первый запуск service выполнен вручную, автоматическое срабатывание ещё не наблюдалось
- [x] Извлечь текущий набор, восстановить две БД из offsite в изолированные назначения, проверить Redis/files/строки без оплаты/нарезки/production overwrite
- [x] Зафиксировать actual age, ключевые ограничения, evidence и целевое обучение
