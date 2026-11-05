# Исполнение ведётся в feature-adr

- [ ] Установить свежий data inventory и конкретные конфликты; root runtime/schema read-only evidence учитывается отдельно.
- [ ] Получить решения по спорной identity/окну и уточнить ADR/model/plan.
- [ ] Пройти независимый QCSD, K1/K2 и настоящий plan checkpoint.
- [ ] После допуска реализовать минимальные изменения, проверить backup/restore и консолидацию.
- [ ] После принятого source выполнить отдельно разрешённый cutover c, проверить полный CJM/данные и сопровождение.

Этот список — ledger, не параллельный implementation plan и не разрешение OpenSpec apply. Детальная последовательность — `features/cloud-data-consolidation/06_implementation_plan.md`.
