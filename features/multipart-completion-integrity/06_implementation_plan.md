# План multipart-completion-integrity (S)

Inputs read: AGENTS.md; CLAUDE.md; docs/acceptance/core-cjm.md; .claude/skills/coding-standards/SKILL.md;
.claude/skills/security-patterns/SKILL.md; 00_complexity_assessment.md; 01_requirements.md;
03_adr — не применяется к S; 05_architecture — не применяется к S; закреплённый feature-adr 1.5.25;
apps/web/src/server/video.ts; apps/web/src/server/upload-contract.ts; tests/upload-fix.test.ts;
tests/upload-fix.integration.test.ts (чтение контракта, запуск не планируется).

## Цель и границы

Принять в очередь только полный файл с заявленным размером, сохранив раннюю идемпотентность.
Текущее состояние: contiguous schema без проверки expected count/declared HEAD.
Целевое: guards до разрушительного Complete и до БД/очереди; старые API/схема неизменны.
Авторский план подготовлен в этой сессии; независимая проверка модели координатором — отдельный этап,
не объявляется выполненной. Нового архитектурного решения и новых production names нет.

## Задачи и порядок

- [x] TASK-1 (NFR-1, NFR-2): Зафиксировать no-new-production-names (K1) и реальные K2 + code-target admission;
  покрывает NFR-1, NFR-2; до PASS никакого test/app кода. Зависимостей нет.
- [x] TASK-2 (FR-1, FR-2, FR-3, FR-5, NFR-2): Добавить meaningful RED в tests/upload-completion-integrity.test.ts: FR-1, FR-2,
  FR-3, FR-5, NFR-2; acid A1, A2, A3, A4, A6, A8. Fake pool фиксирует SQL effects и отказывает
  неожиданным запросам, fake storage/enqueue считает вызовы. Размеры 0/меньше/больше (до MAX) и отдельно >MAX со штатным too_large/refund/cleanup,
  количество до/ровно/выше expected; точная кратность и дробный последний chunk. Зависит TASK-1.
- [x] TASK-3 (FR-1, FR-2, FR-3, NFR-1): Минимально изменить VideoService.complete в apps/web/src/server/video.ts:
  FR-1, FR-2, FR-3, NFR-1. После ownership/admitted/queued/status проверить parts.length;
  после HEAD на обеих ветках сначала сохранить проверку bytes>MAX как too_large со
  штатным refund/cleanup, а для bytes<=MAX сравнить bigint bytes с declared до Range/transaction. Не добавлять
  enum/миграции, не записывать mismatch как not_media. Зависит TASK-2 (наблюдаемый RED).
- [x] TASK-4 (FR-4, FR-5, FR-6, NFR-1, NFR-2): GREEN и регрессия в tests/upload-completion-integrity.test.ts: FR-4, FR-5, FR-6,
  NFR-1, NFR-2; A5, A6, A7, A8. Проверить одинаковый размер (success/lost reply), queued после
  failed publish, admitted statuses, legacy queued, недоступность storage и ownership. Выполнить
  существующие upload unit tests, typecheck/lint подходящего объёма; никакого MinIO/live API.
  Зависит TASK-3. Сохранить точные exit/counts и логи вне Git; pending independent review честно.
- [ ] TASK-5 (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1, NFR-2): Обновить S completion/QE документы и requirement traceability; повторить K2/target
  checks, diff check. Commit только в этом worktree без push; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6,
  NFR-1, NFR-2. Зависит TASK-4. Передать координатору независимое cross-model review/QE.

## Риски и checkpoints

C1: Объект <=MAX уже собран с другим размером — остаётся uploading, ошибка conflict409; данных не
удаляем и автоматическое восстановление этого объекта не выдумываем. C2: Legacy admitted/queued
не должны получить новые validation barriers. C3: Unit harness не заменяет реальные race/E2E.
Расширение UX/schema требует остановки/нового плана. Параллельного coding нет.

K1: no-new-production-names: сохраняются VideoService.complete/UploadError/UploadStorage;
нет новой команды, production module или export. Новое имя только unit test file и локальные
переменные. Соответствие будет проверено реальным git diff перед commit.

## Test-only follow-up: fixture после FR-2

- [ ] TASK-6 (FR-2, FR-3, NFR-1, NFR-2): На actual integration source после реального K2 S/admission
  и witnessed plan checkpoint привести bad-media payload существующего tests/upload.integration.test.ts
  к declared24 через Buffer.alloc(body.declared_bytes), без изменения assertions или production.
  Исходный реальный S3 RED root:35 PASS/1 FAIL из36; actual9 против declared24 правильно даёт409.
  Проверить diff/bytes, существующие upload unit regressions, tests typecheck/lint; сохранить raw logs
  и code/spec anti-drift в08. Root затем запускает real S3 subset с existing private fenced profile
  на isolated test DB, без app DB/MinIO/новых контейнеров. До actual result GREEN остаётся pending.
  Зависит завершённого исходного server integrity fix; новых module/export/production names нет.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/video.ts
- tests/upload-completion-integrity.test.ts
- tests/upload.integration.test.ts
