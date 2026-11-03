# Cloud.ru: кандидат и повторяемое обновление

Статус: дизайн сохранения всех существующих данных n5, включая реальные загрузки,
прошёл prepare, три focused verification исходных QCSD-ролей и actual evaluate:
closed, revision ba9cf99c151cce2b7743e94b98e27f0c26d1be98b48080b749b3f5468b2e372f.
K2 и current code target admission прошли; literal coder context проверяется
перед передачей автору. Новых commands/modules/exports в этой поправке нет.
Далее repair controller и повтор QE; прежние receipts сохранены как история.
Указание владельца: действовать автономно,
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
