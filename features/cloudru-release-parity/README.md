# Cloud.ru: кандидат и повторяемое обновление

Статус: revision pending — требования/ADR/план пересмотрены; новые prepare, три focused QCSD и K1/K2 впереди. Старые receipts относятся к прежнему снимку. Указание владельца: действовать автономно,
production не переключать без его отдельного решения.

Последнее owner exception: нынешний общий S3 key сохраняет production-права;
ограничение только SDK namespace tests/cloud/ и tests/site/, без IAM rollout/403.
См. [ADR-003](03_adr/003-same-bucket-prefix.md) и историю в 07_progress.

- [Маршрутизация](00_complexity_assessment.md).
- [Требования](01_requirements.md).
- [План реализации](06_implementation_plan.md).
- [Проверенный промежуточный результат](07_progress.md).
- [План будущего переноса](../../docs/plans/2026-11-03-cloudru-production.md).
- [Рабочий временный SSH](../../docs/runbooks/cloudru-reverse-ssh.md).

Два доказательства завершения: полный CJM на Cloud.ru и повторная правка с
controller workspace с доставкой одного коммита по SSH на `cloud-c` и `site-test`. Ни одно пока не
считается полученным в рамках этого изменения.
