# Ledger задач

Все задачи ещё не выполнены; execution authority — feature-adr plan.

- [ ] Согласовать требования/ADR/план, закрыть независимый QCSD и native K1/K2
- [ ] Реализовать минимальный native capture+wrapper+manifest+unit/timer, bounded own staging/capacity, source-bound valid JSONL prefix и явное исключение rebuildable scratch
- [ ] Проверить отказные сценарии и actual temporary native roundtrip; cross-model QE и code/spec anti-drift
- [ ] Активировать только собственный manifest/timer после gates и подтвердить один scoped/scheduled snapshot в двух offsite copies
- [ ] Извлечь текущий набор, восстановить две БД из offsite в изолированные назначения, проверить Redis/files/строки без оплаты/нарезки/production overwrite
- [ ] Зафиксировать actual age, ключевые ограничения, evidence и целевое обучение
